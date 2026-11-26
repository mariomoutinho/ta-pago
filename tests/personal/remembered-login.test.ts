import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as web from '../../src/features/personal/remembered-login';
import * as native from '../../src/features/personal/remembered-login.native';
const secure = vi.hoisted(()=>new Map<string,string>());
vi.mock('expo-secure-store',()=>({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY:'unlocked-device-only',
  getItemAsync:async(key:string)=>secure.get(key)??null,
  setItemAsync:async(key:string,value:string)=>{secure.set(key,value);},
  deleteItemAsync:async(key:string)=>{secure.delete(key);},
}));
let storage:Map<string,string>;
let store:ReturnType<typeof vi.fn>;
beforeEach(()=>{
  secure.clear();storage=new Map();store=vi.fn(async(value:unknown)=>value);
  vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)});
  vi.stubGlobal('navigator',{credentials:{store,get:async()=>null}});
  vi.stubGlobal('PasswordCredential',class {type='password';id:string;password:string;constructor(data:{id:string;password:string}){this.id=data.id;this.password=data.password;}});
});
afterEach(()=>vi.unstubAllGlobals());
it('lembra cinco contas distintas, atualiza a ordem e deixa senhas somente com o gerenciador',async()=>{
  for(let i=0;i<6;i++)await web.rememberLogin(`user${i}@example.test`,'SomenteTeste123!');
  await web.rememberLogin(' USER3@example.test ','NovaSenha123!');
  expect(await web.rememberedEmails()).toEqual(['user3@example.test','user5@example.test','user4@example.test','user2@example.test','user1@example.test']);
  expect(JSON.stringify([...storage])).not.toContain('Senha');
  expect(store).toHaveBeenCalledTimes(7);
  await web.forgetLogin('user3@example.test');
  expect(await web.rememberedEmails()).not.toContain('user3@example.test');
});
it('trata armazenamento bloqueado e recusa senha de outra conta',async()=>{
  vi.stubGlobal('navigator',{credentials:{get:async()=>({type:'password',id:'outra@example.test',password:'NaoUsar'})}});
  expect(await web.recalledPassword('minha@example.test')).toBeNull();
  vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});
  await expect(web.rememberLogin('user@example.test','SomenteTeste123!')).resolves.toBeUndefined();
  expect(await web.rememberedEmails()).toEqual([]);
});
it('ignora lista inválida e mantém fallback sem Credential Management API',async()=>{
  storage.set('tapago.login.emails.v1','{"password":"invalid"}');
  expect(await web.rememberedEmails()).toEqual([]);
  vi.stubGlobal('PasswordCredential',undefined);vi.stubGlobal('navigator',{});
  await web.rememberLogin('user@example.test','SomenteTeste123!');
  expect(await web.rememberedEmails()).toEqual(['user@example.test']);
  expect(await web.recalledPassword('user@example.test')).toBeNull();
});
it('guarda contas nativas no SecureStore e remove credenciais esquecidas ou excedentes',async()=>{
  for(let i=0;i<6;i++)await native.rememberLogin(`user${i}@example.test`,'Senha'+i);
  expect(await native.rememberedEmails()).toHaveLength(5);
  expect(await native.recalledPassword('user0@example.test')).toBeNull();
  expect(await native.recalledPassword('user5@example.test')).toBe('Senha5');
  await native.forgetLogin('user5@example.test');
  expect(await native.recalledPassword('user5@example.test')).toBeNull();
  expect(await native.rememberedEmails()).not.toContain('user5@example.test');
});
