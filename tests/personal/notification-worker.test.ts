import {it,expect} from 'vitest';
import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('backend-php/public/notifications-sw.js','utf8');
function worker(options:{openFails?:boolean;clients?:any[];fetchFails?:boolean}={}){
 const handlers:Record<string,(event:any)=>void>={},calls:string[]=[],notices:any[]=[];
 const origin='https://app.example.test';
 const self={location:{origin},addEventListener:(type:string,handler:any)=>handlers[type]=handler,clients:{claim:async()=>{},openWindow:async(url:string)=>{calls.push(url);if(options.openFails)throw Error('cannot open');return {};},matchAll:async()=>options.clients??[]},registration:{showNotification:async(title:string,data:any)=>notices.push({title,...data})}};
 vm.runInNewContext(source,{self,URL,AbortController,setTimeout,clearTimeout,encodeURIComponent,fetch:async()=>{if(options.fetchFails)throw Error('offline');return {ok:true,json:async()=>[{id:'enrollment-fixture'}]};}});
 async function emit(type:string,event:any){let pending:Promise<unknown>|undefined;handlers[type]({...event,waitUntil:(promise:Promise<unknown>)=>pending=promise});await pending;}
 return {emit,calls,notices,origin};
}
it('guarda o aviso autenticado e abre URL absoluta quando o aplicativo está fechado',async()=>{
 const w=worker();await w.emit('push',{});expect(w.notices[0].data.url).toBe('/notificacao?aviso=enrollment-fixture');
 let closed=false;await w.emit('notificationclick',{notification:{data:w.notices[0].data,close:()=>closed=true}});
 expect(closed).toBe(true);expect(w.calls).toEqual([w.origin+'/notificacao?aviso=enrollment-fixture']);
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
