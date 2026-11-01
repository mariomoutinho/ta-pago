import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';

const root=process.cwd(),project=path.join(root,'native-android');
const firebaseFile=path.join(root,'data/firebase/google-services.json');
const firebase=fs.existsSync(firebaseFile)?JSON.parse(fs.readFileSync(firebaseFile,'utf8')):null;
const applicationId='br.com.coletivopindorama.tapago';
const client=firebase?.client?.find(value=>value.client_info?.android_client_info?.package_name===applicationId);
if(firebase&&(!client||!/^\d+$/.test(firebase.project_info?.project_number)||!client.api_key?.[0]?.current_key||!client.client_info?.mobilesdk_app_id))throw Error('Configuração Firebase Android inválida ou para outro pacote.');
if(!client&&!process.argv.includes('--without-push'))throw Error('Conecte o Firebase e salve google-services.json em data/firebase antes de gerar o APK com notificações. --without-push serve somente para validar o contêiner sem envio.');
const gradle=fs.readFileSync(path.join(project,'app/build.gradle'),'utf8');
const version=gradle.match(/versionName '([^']+)'/)?.[1],versionCode=Number(gradle.match(/versionCode (\d+)/)?.[1]);
if(!version||!versionCode)throw Error('Versão Android inválida.');
const javaHome=process.env.TAPAGO_JAVA_HOME||process.env.JAVA_HOME||(process.platform==='win32'?'C:/Program Files/Android/Android Studio/jbr':'');
const java=path.join(javaHome,'bin',process.platform==='win32'?'java.exe':'java');
const keytool=path.join(javaHome,'bin',process.platform==='win32'?'keytool.exe':'keytool');
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||(process.platform==='win32'?path.join(process.env.LOCALAPPDATA,'Android/Sdk'):'');
if(!fs.existsSync(java)||!fs.existsSync(path.join(sdk,'platforms/android-36/android.jar')))throw Error('Configure JDK 17+ e Android SDK 36 antes de gerar o APK.');
const signingDir=path.join(root,'data/android-signing'),settingsFile=path.join(signingDir,'release.json');fs.mkdirSync(signingDir,{recursive:true});
const run=(command,args,options={})=>{const result=spawnSync(command,args,{cwd:project,windowsHide:true,stdio:'inherit',...options});if(result.status!==0)throw Error('Falha ao executar a ferramenta Android.');};
if(!fs.existsSync(settingsFile)){
 const password=randomBytes(32).toString('hex'),storeFile=path.join(signingDir,'tapago-release.p12');
 if(fs.existsSync(storeFile))throw Error('Keystore existente sem configuração; preservar e recuperar a configuração antes de continuar.');
 run(keytool,['-genkeypair','-noprompt','-keystore',storeFile,'-storetype','PKCS12','-alias','tapago-release','-keyalg','RSA','-keysize','3072','-validity','36500','-dname','CN=Ta Pago, OU=Android, O=Ta Pago, C=BR','-storepass:env','TAPAGO_SIGN_STORE_PASSWORD','-keypass:env','TAPAGO_SIGN_STORE_PASSWORD'],{env:{...process.env,TAPAGO_SIGN_STORE_PASSWORD:password}});
 fs.writeFileSync(settingsFile,JSON.stringify({storeFile,storePassword:password,keyAlias:'tapago-release',keyPassword:password},null,2),{mode:0o600});
}
fs.writeFileSync(path.join(project,'local.properties'),'sdk.dir='+sdk.replaceAll('\\','/').replaceAll(':','\\:')+'\n');
const wrapper=path.join(project,'gradle/wrapper/gradle-wrapper.jar');if(!fs.existsSync(wrapper))throw Error('Wrapper Gradle ausente.');
run(java,['-classpath',wrapper,'org.gradle.wrapper.GradleWrapperMain',...(process.argv.includes('--offline')?['--offline']:[]),'--no-daemon','testReleaseUnitTest','lintRelease','assembleRelease'],{env:{...process.env,JAVA_HOME:javaHome,ANDROID_HOME:sdk}});
const output=path.join(root,'data/android-release');fs.mkdirSync(output,{recursive:true});
const apk=path.join(project,'app/build/outputs/apk/release/app-release.apk');if(!fs.existsSync(apk))throw Error('APK assinado não encontrado.');
const name='ta-pago-android-'+version+(client?'':'-sem-push')+'.apk',bytes=fs.readFileSync(apk),hash=createHash('sha256').update(bytes).digest('hex');
fs.writeFileSync(path.join(output,name),bytes);fs.writeFileSync(path.join(output,name+'.sha256'),hash+'  '+name+'\n');
fs.writeFileSync(path.join(output,'release.json'),JSON.stringify({version,versionCode,applicationId,apk:name,sha256:hash,bytes:bytes.length,nativePushConfigured:!!client},null,2));
console.log('APK Android assinado: '+path.join(output,name));
