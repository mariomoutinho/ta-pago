import {useEffect,useState} from 'react';
import {View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Brand,Page} from '@/components/personal/shell';
import {Button,Card,Field,Label,Notice} from '@/components/personal/ui';
import {api,message} from '@/features/personal/api';
import {useSession} from '@/features/personal/auth';
import {passwordHasMinimum,PASSWORD_MINIMUM_MESSAGE} from '../../shared/password';
export default function ActivateStudent(){
  const {convite}=useLocalSearchParams<{convite:string}>(),{authenticate}=useSession();
  const [info,setInfo]=useState<{name:string;email:string;existingAccount:boolean}|null>(null);
  const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let alive=true;setInfo(null);setError('');api<typeof info>(`/public/student-access/${encodeURIComponent(convite??'')}`).then(result=>{if(alive)setInfo(result);}).catch(e=>{if(alive)setError(message(e));});return()=>{alive=false;};},[convite]);
  async function submit(){
    if(!info)return;
    if(!info.existingAccount&&!passwordHasMinimum(password)){setError(PASSWORD_MINIMUM_MESSAGE);return;}
    if(!info.existingAccount&&password!==confirmation){setError('A confirmação deve ser igual à senha.');return;}
    setBusy(true);setError('');
    try{
      if(!info.existingAccount)await api(`/public/student-access/${encodeURIComponent(convite)}`,'POST',{password});
      await authenticate('login',{email:info.email,password});
      if(info.existingAccount)await api('/me/claim','POST',{code:convite});
      router.replace('/');
    }catch(e){setError(message(e));}finally{setBusy(false);}
  }
  return <Page><View style={{maxWidth:520,width:'100%',alignSelf:'center',gap:20}}><Brand/><Card>
    <Label size={24} bold>Seu acesso ao Tá Pago</Label><Notice error>{error}</Notice>
    {info&&<><Label>Olá, {info.name}! Seu cadastro foi aprovado.</Label><Field label="E-mail de acesso" value={info.email} editable={false}/>
      <Label>{info.existingAccount?'Entre com a senha da sua conta para conectar seu acompanhamento.':'Defina sua senha para acessar seus treinos e seu acompanhamento.'}</Label>
      <Field label={info.existingAccount?'Sua senha':'Crie sua senha'} value={password} onChangeText={setPassword} secureTextEntry autoComplete={info.existingAccount?'current-password':'new-password'}/>
      {!info.existingAccount&&<><Label size={12} muted>Mínimo de 6 caracteres. Pode usar letras, números ou símbolos.</Label><Field label="Confirme sua senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password"/></>}
      <Button disabled={busy} onPress={()=>void submit()}>{busy?'Aguarde…':info.existingAccount?'Entrar e conectar':'Ativar meu acesso'}</Button></>}
  </Card></View></Page>;
}
