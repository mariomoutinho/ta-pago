import {Linking} from 'react-native';
// Reservar durante o toque evita o bloqueio após a aprovação assíncrona.
export function prepareWhatsAppWindow(){
  const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;
  return {close:()=>tab?.close(),open:async(url:string)=>{if(tab&&!tab.closed)tab.location.replace(url);else await Linking.openURL(url);}};
}
