import {it,expect} from 'vitest';
import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('backend-php/public/notifications-sw.js','utf8');
function worker(options:{openFails?:boolean;clients?:any[];fetchFails?:boolean;showFails?:boolean}={}){
 const handlers:Record<string,(event:any)=>void>={},calls:string[]=[],notices:any[]=[],receipts:any[]=[];
 const origin='https://app.example.test';
 const self={location:{origin},addEventListener:(type:string,handler:any)=>handlers[type]=handler,clients:{claim:async()=>{},openWindow:async(url:string)=>{calls.push(url);if(options.openFails)throw Error('cannot open');return {};},matchAll:async()=>options.clients??[]},registration:{pushManager:{getSubscription:async()=>({endpoint:'https://fcm.googleapis.com/synthetic'})},showNotification:async(title:string,data:any)=>{if(options.showFails)throw Error('display failed');notices.push({title,...data});}}};
 vm.runInNewContext(source,{self,URL,AbortController,setTimeout,clearTimeout,encodeURIComponent,fetch:async(url:string,request:any)=>{receipts.push({url,body:JSON.parse(request.body),noticesAlreadyShown:notices.length});if(options.fetchFails)throw Error('offline');return {ok:true};}});
 async function emit(type:string,event:any){let pending:Promise<unknown>|undefined;handlers[type]({...event,waitUntil:(promise:Promise<unknown>)=>pending=promise});await pending;}
 return {emit,calls,notices,receipts,origin};
}
it('apresenta antes da rede e abre URL absoluta quando o aplicativo está fechado',async()=>{
 const w=worker();await w.emit('push',{});expect(w.notices[0].data.url).toBe('/notificacao');
 expect(w.receipts[0].noticesAlreadyShown).toBe(1);expect(w.receipts[0].body.shown).toBe(true);
 let closed=false;await w.emit('notificationclick',{notification:{data:w.notices[0].data,close:()=>closed=true}});
 expect(closed).toBe(true);expect(w.calls).toEqual([w.origin+'/notificacao']);
});
it('registra falha de apresentação sem mascará-la como entrega no aparelho',async()=>{
 const w=worker({showFails:true});await expect(w.emit('push',{})).rejects.toThrow('display failed');
 expect(w.receipts[0].body.shown).toBe(false);expect(w.notices).toHaveLength(0);
});
it('retoma janela existente se openWindow falha, focando antes de navegar',async()=>{
 const actions:string[]=[];const w=worker({openFails:true,clients:[{url:'https://app.example.test/',focus:async()=>actions.push('focus'),navigate:async(url:string)=>actions.push(url)}]});
 await w.emit('notificationclick',{notification:{data:{url:'/notificacao?aviso=completion-fixture'},close(){}}});
 expect(actions).toEqual(['focus','https://app.example.test/notificacao?aviso=completion-fixture']);
});
it('mantém abertura com sessão expirada/offline e rejeita destino externo',async()=>{
 const w=worker({fetchFails:true});await w.emit('push',{});expect(w.notices[0].data.url).toBe('/notificacao');
 await w.emit('notificationclick',{notification:{data:{url:'https://evil.example/steal'},close(){}}});expect(w.calls).toEqual([w.origin+'/notificacao']);
});
