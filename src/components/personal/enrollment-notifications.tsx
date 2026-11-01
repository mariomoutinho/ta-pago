import { useCallback, useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { router } from "expo-router";
import { api, message } from "@/features/personal/api";
import { pushState, enablePush, clearNotificationsDevice, type PushState } from "@/features/personal/push-device";
import { Button, Dialog, Label, Notice, s } from "./ui";

export function EnrollmentNotifications() {
  const [pending, setPending] = useState(0), [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [device, setDevice] = useState<PushState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(value => value + 1), []);
  useEffect(() => {
    let active = true, inFlight = false, timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (inFlight || (AppState.currentState && AppState.currentState !== "active")) return;
      inFlight = true;
      try { const data = await api<{ pending: number }>("/notifications/summary"); if (active) { setPending(data.pending); setError(""); } }
      catch { if (active) setError("Não foi possível atualizar os avisos. Tente novamente."); }
      finally { inFlight = false; if (active) timer = setTimeout(() => void poll(), 15000); }
    };
    void poll();
    const listener = AppState.addEventListener("change", state => { if (state === "active") { clearTimeout(timer); void poll(); } });
    return () => { active = false; clearTimeout(timer); listener.remove(); };
  }, [refreshKey]);
  useEffect(() => { let active = true; void pushState().then(value => { if (active) setDevice(value); }).catch(() => { if (active) setError("Não foi possível verificar as notificações deste aparelho."); });return () => { active = false; }; }, []);
  return <View style={{ width: "100%", maxWidth: 1320, alignSelf: "center", paddingHorizontal: 18, paddingVertical: 6, gap: 6 }}>
    <View style={[s.row, { justifyContent: "space-between" }]}>
      <View style={{ flex: 1 }} accessibilityLiveRegion="polite">
        {pending > 0 ? <Label bold>{pending === 1 ? "Você recebeu um novo cadastro de aluno." : `Você recebeu ${pending} cadastros de alunos.`}</Label> : <Label muted size={12}>Avisos de cadastro</Label>}
      </View>
      <Button variant="secondary" label={`Notificações de cadastro${pending ? `: ${pending} pendentes` : ""}`} onPress={() => setOpen(true)}>{pending ? `🔔 ${pending}` : "🔔"}</Button>
    </View>
    {pending > 0 && <Button variant="secondary" onPress={() => router.push("/alunos/link")}>Analisar cadastros recebidos</Button>}
    {open && <Dialog title="Notificações de cadastro" onClose={() => setOpen(false)}>
      <Label>{pending ? `${pending} cadastro(s) aguardando sua aprovação.` : "Nenhum cadastro pendente no momento."}</Label>
      <Button onPress={() => { setOpen(false); router.push("/alunos/link"); }}>Ver cadastros recebidos</Button>
      <Notice>{device?.enabled ? "Notificações ativadas neste aparelho. Você receberá um aviso quando um aluno enviar sua ficha, mesmo com o Tá Pago fechado." : "Ative as notificações neste aparelho para receber avisos com o Tá Pago fechado. No iPhone, abra pelo ícone instalado na tela inicial (iOS 16.4 ou superior)."}</Notice>
      {device?.blocked && <Notice>As notificações estão bloqueadas. Libere a permissão nas configurações do navegador ou do celular e tente novamente.</Notice>}
      {device && !device.supported && <Notice>Este ambiente não oferece notificações. Abra o Tá Pago pelo ícone da tela inicial em um navegador compatível. Os avisos dentro do aplicativo continuam disponíveis.</Notice>}
      <Button disabled={busy || !device?.supported} variant={device?.enabled ? "secondary" : "primary"} onPress={async () => {
        setBusy(true);setError("");
        try { if (device?.enabled) { await clearNotificationsDevice();setDevice(await pushState()); } else setDevice(await enablePush()); }
        catch (error) { setError(message(error)); } finally { setBusy(false); }
      }}>{busy ? "Aguarde…" : device?.enabled ? "Desativar neste aparelho" : "Ativar notificações neste aparelho"}</Button>
      <Notice error>{error}</Notice>
      <Button variant="secondary" onPress={refresh}>Atualizar avisos</Button>
    </Dialog>}
  </View>;
}
