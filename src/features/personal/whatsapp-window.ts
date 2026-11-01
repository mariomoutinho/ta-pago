import {Linking} from 'react-native';
export function prepareWhatsAppWindow(){return {close:()=>{},open:async(url:string)=>{await Linking.openURL(url);}};}
