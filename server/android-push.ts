import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes,sign} from 'node:crypto';
import {Router} from 'express';
import type {Db} from './db';
import {HttpError} from './evaluations';
import {seal,unseal} from './enrollment-crypto';
import {newsEvents} from './news';
import type {NewsItem} from '../shared/notifications';

type Credentials={type:string;project_id:string;client_email:string;private_key:string};
type State={owner:string;token:string;binding:string;since:string;sent:string[];attempts:number;retryAt:number;testAt?:number;lastTestAt?:number;lastAcceptedAt?:string};
export type AndroidMessage={message:{token:string;data:{binding:string;id:string;title:string;body:string};android:{priority:'HIGH';ttl:string}}};
type Transport=(message:AndroidMessage)=>Promise<'sent'|'failed'|'expired'>;
const root=()=>path.resolve(process.env.PERSONAL_PUSH_DIRECTORY??'data/push','android');
const directory=()=>fs.mkdirSync(root(),{recursive:true,mode:0o700});
export const androidInstallation=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
export const androidToken=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_:.-]{20,4096}$/.test(value);
const fileFor=(installation:string)=>path.join(root(),createHash('sha256').update(installation).digest('hex')+'.json');
function credentials():Credentials|null{
 const file=process.env.PERSONAL_FCM_SERVICE_ACCOUNT_FILE;
 if(!file||!fs.existsSync(file))return null;
 const value=JSON.parse(fs.readFileSync(file,'utf8')) as Credentials;
 if(value.type!=='service_account'||!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(value.project_id)||!/^\S+@\S+\.\S+$/.test(value.client_email)||!value.private_key?.includes('PRIVATE KEY'))throw Error('FCM configuration');
 return value;
}
export const androidPushConfigured=()=>credentials()!==null;
function save(file:string,state:State){const temp=file+'.'+randomBytes(8).toString('hex');fs.writeFileSync(temp,JSON.stringify(state),{mode:0o600});fs.renameSync(temp,file);}
async function locked<T>(file:string,action:()=>Promise<T>):Promise<T>{
 directory();const lock=file+'.lock';if(fs.existsSync(lock)&&Date.now()-fs.statSync(lock).mtimeMs>120000){try{fs.unlinkSync(lock);}catch{}}
 let descriptor:number;try{descriptor=fs.openSync(lock,'wx',0o600);}catch{throw new HttpError(409,'Tente novamente em alguns instantes');}
 try{return await action();}finally{fs.closeSync(descriptor);fs.unlinkSync(lock);}
}
export function androidMessage(token:string,binding:string,event?:Pick<NewsItem,'id'|'kind'>):AndroidMessage{
 const texts={enrollment:['Novo cadastro no Tá Pago','Um aluno enviou um cadastro. Toque para analisar.'],workout_completed:['Treino concluído','Um aluno concluiu um treino. Toque para acompanhar.'],feedback:['Novo feedback','Um aluno enviou um feedback. Toque para abrir.'],test:['Teste do Tá Pago','Notificação enviada pelo servidor. Toque para abrir o Tá Pago.']};
 const [title,body]=texts[event?.kind??'test'];return {message:{token,data:{binding,id:event?.id??'',title,body},android:{priority:'HIGH',ttl:'86400s'}}};
}
export function fcmAssertion(value:Credentials){
 const b64=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const input=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:value.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});
 return input+'.'+sign('sha256',Buffer.from(input),value.private_key).toString('base64url');
}
let cache:{key:string;token:string;expires:number}|undefined;
async function send(message:AndroidMessage):Promise<'sent'|'failed'|'expired'>{
 const value=credentials();if(!value)return 'failed';
 const key=createHash('sha256').update(value.client_email+value.private_key).digest('hex');
 if(!cache||cache.key!==key||cache.expires<Date.now()+90000){
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:fcmAssertion(value)}).toString(),redirect:'error',signal:AbortSignal.timeout(8000) as NonNullable<Parameters<typeof fetch>[1]>['signal']});
  const body=await response.json() as {access_token?:string;expires_in?:number};if(!response.ok||!body.access_token)throw Error('FCM authorization');
  cache={key,token:body.access_token,expires:Date.now()+Math.min(3600,body.expires_in??3600)*1000};
 }
 const response=await fetch('https://fcm.googleapis.com/v1/projects/'+value.project_id+'/messages:send',{method:'POST',headers:{Authorization:'Bearer '+cache.token,'Content-Type':'application/json'},body:JSON.stringify(message),redirect:'error',signal:AbortSignal.timeout(8000) as NonNullable<Parameters<typeof fetch>[1]>['signal']});
 const body=await response.json() as {name?:string;error?:{details?:{errorCode?:string}[]}};
 if(response.ok&&body.name)return 'sent';if(body.error?.details?.some(detail=>detail.errorCode==='UNREGISTERED'))return 'expired';
 if(response.status===401)cache=undefined;return 'failed';
}
export async function subscribeAndroid(owner:string,installation:string,token:string){
 if(!androidInstallation(installation)||!androidToken(token))throw new HttpError(400,'Inscrição Android inválida');
 if(!androidPushConfigured())throw new HttpError(503,'O envio de notificações Android ainda não está configurado');
 const file=fileFor(installation);return locked(file,async()=>{
  const old:State|null=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
  if(old?.owner===owner){old.token=seal({token});save(file,old);return {binding:old.binding};}
  const count=fs.readdirSync(root()).filter(name=>/^[a-f0-9]{64}\.json$/.test(name)).map(name=>JSON.parse(fs.readFileSync(path.join(root(),name),'utf8')) as State).filter(state=>state.owner===owner).length;
  if(count>=10)throw new HttpError(409,'Limite de aparelhos Android atingido');
  const binding=randomBytes(16).toString('hex');save(file,{owner,token:seal({token}),binding,since:new Date().toISOString(),sent:[],attempts:0,retryAt:0});return {binding};
 });
}
export async function dispatchAndroidPush(db:Db,owner?:string,transport?:Transport,authorizedIds=(process.env.PERSONAL_AUTHORIZED_IDS??'').split(',').map(v=>v.trim())){
 const counts={sent:0,failed:0,expired:0};if(!transport&&!androidPushConfigured())return counts;directory();
 for(const name of fs.readdirSync(root()).filter(name=>/^[a-f0-9]{64}\.json$/.test(name))){const file=path.join(root(),name);
  await locked(file,async()=>{
   if(!fs.existsSync(file))return;const state:State=JSON.parse(fs.readFileSync(file,'utf8'));
   if((owner&&state.owner!==owner)||state.retryAt>Date.now())return;
   if(!authorizedIds.includes(state.owner)){fs.unlinkSync(file);return;}
   const since=Math.max(Date.parse(state.since),Date.now()-86400000);
   const events=(await newsEvents(db,state.owner)).filter(event=>Date.parse(event.createdAt)>=since);
   state.sent=state.sent.filter(id=>events.some(event=>event.id===id));
   const pending:(NewsItem|undefined)[]=events.filter(event=>!state.sent.includes(event.id)).reverse().map(event=>({...event,read:false}));
   if(state.testAt!==undefined&&state.testAt<=Date.now())pending.push(undefined);
   if(!pending.length)return;const token=unseal<{token:string}>(state.token).token;
   for(const event of pending.slice(0,20)){
    let result:'sent'|'failed'|'expired';try{result=await(transport??send)(androidMessage(token,state.binding,event));}catch{result='failed';}
    if(result==='expired'){fs.unlinkSync(file);counts.expired++;return;}
    if(result==='failed'){state.attempts++;state.retryAt=Date.now()+Math.min(3600000,60000*2**Math.min(6,state.attempts-1));counts.failed++;break;}
    if(event)state.sent.push(event.id);else delete state.testAt;
    state.attempts=0;state.retryAt=0;state.lastAcceptedAt=new Date().toISOString();counts.sent++;save(file,state);
   }save(file,state);
  }).catch(error=>{if(!(error instanceof HttpError&&error.status===409))counts.failed++;});
 }return counts;
}
export function androidNotificationRoutes(){
 const router=Router();router.use((_req,res,next)=>{if(res.locals.user.role!=='personal')throw new HttpError(403,'Acesso exclusivo do personal');next();});
 router.get('/settings',(_req,res)=>res.json({configured:androidPushConfigured()}));
 router.post('/subscribe',async(req,res)=>res.json(await subscribeAndroid(res.locals.user.id,req.body.installation,req.body.token)));
 router.post('/unsubscribe',async(req,res)=>{
  if(!androidInstallation(req.body.installation))throw new HttpError(400,'Inscrição Android inválida');
  const file=fileFor(req.body.installation);await locked(file,async()=>{if(!fs.existsSync(file))return;const state:State=JSON.parse(fs.readFileSync(file,'utf8'));if(state.owner===res.locals.user.id)fs.unlinkSync(file);});res.json({ok:true});
 });
 router.post('/test',async(req,res)=>{
  if(!androidInstallation(req.body.installation))throw new HttpError(400,'Inscrição Android inválida');
  const file=fileFor(req.body.installation);await locked(file,async()=>{
   if(!fs.existsSync(file))throw new HttpError(409,'Ative as notificações neste aparelho antes de testar');
   const state:State=JSON.parse(fs.readFileSync(file,'utf8'));if(state.owner!==res.locals.user.id)throw new HttpError(404,'Inscrição não encontrada');
   if(Date.now()-(state.lastTestAt??0)<90000)throw new HttpError(429,'Aguarde o teste anterior antes de tentar novamente');
   state.testAt=Date.now()+15000;state.lastTestAt=Date.now();save(file,state);
  });res.json({ok:true});
 });return router;
}
