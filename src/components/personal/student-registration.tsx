import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { studentCreateSchema } from "../../../shared/validation";
import { api, apiBase, message, today } from "@/features/personal/api";
import type { Student } from "@/features/personal/types";
import { phoneCountries, internationalPhone, registrationGroups } from "@/features/personal/student-registration";
import { copyEnrollmentLink, prepareWhatsAppWindow, studentAccessWhatsAppUrl } from "@/features/personal/enrollment-sharing";
import { Button, Field, Label, Notice, s } from "./ui";
import { Check } from "./enrollment-fields";
import { FormattedField } from "./formatted-field";
import { SelectField } from "./select-field";

type CreatedStudent = Student & { accessCode?: string };
export function StudentRegistration({ onSaved }: { onSaved: (student: Student) => void }) {
  const theme = useTheme();
  const [values, setValues] = useState({ name: "", email: "", trainingGroup: "", birthDate: "", sex: "", phone: "+55" });
  const [country, setCountry] = useState("BR");
  const [groups, setGroups] = useState<string[]>([]);
  const [newGroup, setNewGroup] = useState("");
  const [sendAccess, setSendAccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [groupError, setGroupError] = useState("");
  const [saved, setSaved] = useState<CreatedStudent | null>(null);
  const dial = phoneCountries.find((item) => item.value === country)!.dial;
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    let active = true;
    api<string[]>("/student-groups").then((rows) => { if (active) setGroups(rows); })
      .catch(() => { if (active) setGroupError("Não foi possível carregar os grupos existentes. Presencial e Online continuam disponíveis."); });
    return () => { active = false; };
  }, []);

  function accessUrl(student: CreatedStudent) {
    return `${apiBase()}/ativar?convite=${encodeURIComponent(student.accessCode!)}`;
  }
  async function save() {
    if (busy) return;
    setError("");
    const trainingGroup = values.trainingGroup === "__new__" ? newGroup.trim() : values.trainingGroup;
    if (!trainingGroup) { setError("Selecione ou crie um grupo."); return; }
    const result = studentCreateSchema.safeParse({ ...values, email: values.email.trim().toLowerCase(), trainingGroup, startDate: today(), sendAccess,
      phone: values.phone === `+${dial}` ? "" : values.phone });
    if (!result.success) { setError(result.error.issues.map((issue) => issue.message).join("; ")); return; }
    if (!result.data.email) { setError("Informe o e-mail do aluno."); return; }
    const whatsapp = sendAccess ? prepareWhatsAppWindow() : null;
    setBusy(true);
    try {
      const created = await api<CreatedStudent>("/students", "POST", result.data);
      setSaved(created);
      if (sendAccess) {
        if (!created.accessCode) throw new Error("Aluno salvo, mas o servidor não retornou o link de acesso. Atualize o servidor antes de enviar o acesso.");
        await whatsapp!.open(studentAccessWhatsAppUrl({ ...created, url: accessUrl(created), linked: false }));
      }
      onSaved(created);
    } catch (e) {
      whatsapp?.close();
      setError(message(e));
    } finally { setBusy(false); }
  }

  if (saved) return <View style={{ gap: 12 }}>
    <Notice>{saved.accessCode ? "Aluno salvo. Confirme o envio das informações na conversa do WhatsApp." : "Aluno salvo."}</Notice>
    <Notice error>{error}</Notice>
    {saved.accessCode && <>
      <Field label="Link de acesso do aluno" value={accessUrl(saved)} editable={false} />
      <Button variant="secondary" onPress={() => {
        const whatsapp = prepareWhatsAppWindow();
        void whatsapp.open(studentAccessWhatsAppUrl({ ...saved, url: accessUrl(saved), linked: false })).catch((e) => { whatsapp.close(); setError(message(e)); });
      }}>Abrir WhatsApp</Button>
      <Button variant="secondary" onPress={() => void copyEnrollmentLink(accessUrl(saved)).catch((e) => setError(message(e)))}>Copiar link de acesso</Button>
    </>}
    <Button onPress={() => onSaved(saved)}>Concluir</Button>
  </View>;

  return <View>
    <Field label="Nome completo" value={values.name} onChangeText={(value) => update("name", value)} autoComplete="name" editable={!busy} />
    <Field label="E-mail" value={values.email} onChangeText={(value) => update("email", value)} autoComplete="email" keyboardType="email-address" autoCapitalize="none" editable={!busy} />
    <SelectField label="Selecione grupo" value={values.trainingGroup} disabled={busy}
      options={[{ value: "", label: "Selecione grupo" }, ...registrationGroups(groups).map((group) => ({ value: group, label: group })), { value: "__new__", label: "Criar novo grupo" }]}
      onChange={(value) => update("trainingGroup", value)} />
    {values.trainingGroup === "__new__" && <Field label="Nome do novo grupo" value={newGroup} onChangeText={setNewGroup} maxLength={120} editable={!busy} />}
    <Notice error>{groupError}</Notice>
    <FormattedField label="Data de nascimento" format="date" value={values.birthDate} onChangeText={(value) => update("birthDate", value)} editable={!busy} />
    <SelectField label="Gênero" value={values.sex} disabled={busy} onChange={(value) => update("sex", value)}
      options={[{ value: "", label: "Selecione" }, ...["Feminino", "Masculino", "Não binário", "Outro", "Prefiro não informar"].map((value) => ({ value, label: value }))]} />
    <Label size={12} muted>WhatsApp</Label>
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <View style={{ flex: 1 }}><SelectField label="País / DDI" value={country} disabled={busy}
        options={phoneCountries.map((item) => ({ value: item.value,
          label: `${item.value === "BR" ? "Brasil" : item.label} +${item.dial}`,
          icon: item.value === "BR" ? <View accessibilityRole="image" accessibilityLabel="Bandeira do Brasil"
            style={{ width: 22, height: 16, backgroundColor: "#009739", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <View style={{ width: 12, height: 12, backgroundColor: "#ffdf00", transform: [{ rotate: "45deg" }], position: "absolute" }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#012169" }} />
          </View> : undefined,
        }))}
        onChange={(value) => {
          const nextDial = phoneCountries.find((item) => item.value === value)!.dial;
          const national = values.phone.slice(dial.length + 1);
          setCountry(value); update("phone", `+${nextDial}${national}`.slice(0, 16));
        }} /></View>
      <View style={{ flex: 1, gap: 7, marginBottom: 14 }}>
        <Label size={12} muted>Número com DDI</Label>
        <View style={[s.input, { flexDirection: "row", alignItems: "center", gap: 6, borderColor: theme.border, backgroundColor: theme.background }]}>
          <Label>+{dial}</Label>
          <TextInput accessibilityLabel="Número com DDI" value={values.phone.slice(dial.length + 1)}
            onChangeText={(value) => update("phone", internationalPhone(value, dial))}
            style={{ color: theme.text, flex: 1, minWidth: 0, fontSize: 14, padding: 0 }}
            keyboardType="phone-pad" autoComplete="tel-national" editable={!busy} />
        </View>
      </View>
    </View>
    <Check label="Enviar informações de acesso ao aluno" checked={sendAccess} onChange={() => { if (!busy) setSendAccess(!sendAccess); }} />
    <Notice error>{error}</Notice>
    <Button disabled={busy} onPress={() => void save()}>{busy ? "Salvando…" : "Salvar"}</Button>
  </View>;
}
