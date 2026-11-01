import { Linking, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
export const enrollmentMessage = (url: string) =>
  `Olá! Estou utilizando o Tá Pago para acompanhar meus alunos. Preencha sua ficha de cadastro pelo link abaixo para começarmos seu acompanhamento: ${url}`;
export const whatsappEnrollmentUrl = (url: string) =>
  `https://wa.me/?text=${encodeURIComponent(enrollmentMessage(url))}`;
export async function copyEnrollmentLink(url: string) {
  if (!(await Clipboard.setStringAsync(url)))
    throw new Error(
      "Cópia indisponível. Selecione e copie o endereço exibido.",
    );
}
export async function shareEnrollmentLink(url: string) {
  if (Platform.OS === "web") {
    const webNavigator = navigator as unknown as {
      share?: (data: { title: string; text: string }) => Promise<void>;
    };
    if (typeof webNavigator.share === "function") {
      await webNavigator.share({
        title: "Cadastro Tá Pago",
        text: enrollmentMessage(url),
      });
      return "Compartilhamento aberto.";
    }
    await copyEnrollmentLink(url);
    return "Link copiado. Cole na conversa de sua preferência.";
  }
  await Share.share({ message: enrollmentMessage(url) });
  return "Compartilhamento aberto.";
}
export async function whatsappEnrollment(url: string) {
  await Linking.openURL(whatsappEnrollmentUrl(url));
}
export type StudentAccessMessage={name:string;email:string;phone:string;url:string;linked:boolean};
export function studentAccessMessage(data:StudentAccessMessage){
  return `Olá, ${data.name}! Seu cadastro no Tá Pago foi aprovado.\n\nLogin: ${data.email}\n${data.linked?'Acesse com a senha da sua conta:':'Abra o link para definir sua senha e ativar seu acesso. Se já tem conta, entre com sua senha atual. O link é válido por 48 horas:'}\n${data.url}\n\nSeus treinos estarão disponíveis assim que forem liberados pelo seu personal.`;
}
export function studentAccessWhatsAppUrl(data:StudentAccessMessage){
  let phone=data.phone.replace(/\D/g,'');if(phone.length===10||phone.length===11)phone='55'+phone;
  return `https://wa.me/${phone}?text=${encodeURIComponent(studentAccessMessage(data))}`;
}
export {prepareWhatsAppWindow} from './whatsapp-window';
