import {afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({api:vi.fn(),native:vi.fn()}));
vi.mock('../../../src/features/personal/api',()=>({api:mocks.api}));
vi.mock('../../../src/features/personal/android-push.web',()=>({isAndroidApp:()=>true,androidPush:mocks.native}));
import {enablePush,clearNotificationsDevice} from '../../../src/features/personal/push-device.web';

const state={supported:true,nativeApp:true,enabled:false,blocked:false,permission:true,wanted:false,installation:'01234567-89ab-cdef-0123-456789abcdef',token:'synthetic-device-token:1234567890'};
afterEach(()=>{vi.clearAllMocks();vi.unstubAllGlobals();});
it('sair enquanto o Google obtém o token impede registro e reativação tardios',async()=>{
 vi.stubGlobal('navigator',{userAgent:'TaPagoAndroid/1.1.1'});
 let complete!:(value:typeof state)=>void;
 mocks.native.mockImplementation((action:string)=>action==='pushEnable'?new Promise(resolve=>{complete=resolve;}):Promise.resolve({...state,token:''}));
 const enabling=enablePush();const rejection=expect(enabling).rejects.toThrow('desativadas');
 await clearNotificationsDevice();complete(state);await rejection;
 expect(mocks.api).not.toHaveBeenCalled();expect(mocks.native.mock.calls.some(([action])=>action==='pushConfirm')).toBe(false);
});
it('sair durante a resposta do servidor impede confirmação nativa tardia',async()=>{
 vi.stubGlobal('navigator',{userAgent:'TaPagoAndroid/1.1.1'});
 let complete!:(value:{binding:string})=>void;
 mocks.native.mockResolvedValue(state);
 mocks.api.mockImplementation((url:string)=>url.endsWith('/subscribe')?new Promise(resolve=>{complete=resolve;}):Promise.resolve({ok:true}));
 const enabling=enablePush();const rejection=expect(enabling).rejects.toThrow('desativadas');
 await vi.waitFor(()=>expect(complete).toBeTypeOf('function'));
 await clearNotificationsDevice();complete({binding:'0123456789abcdef0123456789abcdef'});await rejection;
 expect(mocks.api.mock.calls.some(([url])=>url.endsWith('/unsubscribe'))).toBe(true);expect(mocks.native.mock.calls.some(([action])=>action==='pushConfirm')).toBe(false);
});
