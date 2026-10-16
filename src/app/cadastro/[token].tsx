import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api, message } from "@/features/personal/api";
import { Brand, Page } from "@/components/personal/shell";
import {
  Button,
  Card,
  Choices,
  Field,
  Label,
  Notice,
  s,
} from "@/components/personal/ui";
import {
  Check,
  EnrollmentSummaryView,
} from "@/components/personal/enrollment-fields";
import {
  enrollmentGoals,
  enrollmentSchema,
  policyVersion,
  type EnrollmentInput,
  type EnrollmentDraft,
  type PublicEnrollment,
} from "../../../shared/enrollment";
const steps = [
  "Dados pessoais",
  "Objetivos",
  "Experiência",
  "Saúde e adaptações",
  "Revisar e enviar",
];
const initial: EnrollmentDraft = {
  name: "",
  email: "",
  phone: "",
  birthDate: "",
  city: "",
  state: "",
  gender: "Não informar",
  goals: [],
  specificGoals: "",
  practicing: "Não",
  daysPerWeek: 0,
  experienceDuration: "",
  previousTrainer: "Não",
  preferredActivity: "",
  availability: "",
  health: { restrictions: "", injuries: "", adaptations: "" },
  consent: false,
  healthConsent: false,
  policyVersion,
};
export default function EnrollmentForm() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [info, setInfo] = useState<PublicEnrollment | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [step, setStep] = useState(0),
    [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [website, setWebsite] = useState("");
  useEffect(() => {
    setLoading(true);
    setError("");
    setInfo(null);
    setSent(false);
    setForm(initial);
    setStep(0);
    api<PublicEnrollment>(`/public/enrollment/${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch((e) => setError(message(e)))
      .finally(() => setLoading(false));
  }, [token]);
  const field = (
    key: keyof EnrollmentInput,
    label: string,
    extra: object = {},
  ) => (
    <Field
      label={label}
      value={String(form[key] ?? "")}
      onChangeText={(value) => setForm({ ...form, [key]: value })}
      {...extra}
    />
  );
  function next() {
    const parsed = enrollmentSchema.safeParse({ ...form, consent: true });
    const keys = [
      ["name", "email", "phone", "birthDate", "city", "state", "gender"],
      ["goals", "specificGoals"],
      [
        "practicing",
        "daysPerWeek",
        "experienceDuration",
        "previousTrainer",
        "preferredActivity",
        "availability",
      ],
      ["health", "healthConsent"],
    ][step];
    const failures = parsed.success
      ? []
      : parsed.error.issues.filter((x) => keys.includes(String(x.path[0])));
    if (failures.length) {
      setError(failures.map((x) => x.message).join("; "));
      return;
    }
    setError("");
    setStep(step + 1);
  }
  async function submit() {
    const parsed = enrollmentSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues.map((x) => x.message).join("; "));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/public/enrollment/${encodeURIComponent(token)}`, "POST", {
        ...parsed.data,
        challenge: info?.challenge,
        website,
      });
      setSent(true);
      setForm(initial);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page resetKey={sent ? "sent" : step}>
      <View
        style={{ maxWidth: 760, width: "100%", alignSelf: "center", gap: 20 }}
      >
        <Brand />
        {loading ? (
          <Notice>Carregando formulário…</Notice>
        ) : !info ? (
          <Notice error>{error}</Notice>
        ) : sent ? (
          <Card>
            <Label size={26} bold>
              Cadastro enviado!
            </Label>
            <Label>
              Seu cadastro foi enviado a {info.personalName}. Aguarde o contato
              do profissional para os próximos passos.
            </Label>
            <Notice>
              O envio não cria uma conta nem libera acesso ao acompanhamento. A
              aprovação será feita pelo personal.
            </Notice>
          </Card>
        ) : (
          <>
            <Card>
              <Label size={26} bold>
                Vamos começar?
              </Label>
              <Label>
                Boas-vindas! Preencha sua ficha para {info.personalName}{" "}
                conhecer seus objetivos.
              </Label>
              <Label muted>
                Etapa {step + 1} de 5 · {steps[step]}
              </Label>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 5, now: step + 1 }}
                style={{
                  height: 6,
                  backgroundColor: "#ddd",
                  borderRadius: 4,
                  marginTop: 12,
                }}
              >
                <View
                  style={{
                    height: 6,
                    width: `${(step + 1) * 20}%`,
                    backgroundColor: "#D4142C",
                    borderRadius: 4,
                  }}
                />
              </View>
            </Card>
            <Card>
              {step === 0 && (
                <>
                  {field("name", "Nome completo *", { autoComplete: "name" })}
                  {field("birthDate", "Data de nascimento", {
                    placeholder: "AAAA-MM-DD",
                  })}
                  {field("email", "E-mail *", {
                    keyboardType: "email-address",
                    autoCapitalize: "none",
                    autoComplete: "email",
                  })}
                  {field("phone", "WhatsApp *", {
                    keyboardType: "phone-pad",
                    placeholder: "DDD + número",
                  })}
                  {field("city", "Cidade")}
                  {field("state", "Estado")}
                  <Choices
                    label="Gênero (opcional)"
                    value={form.gender}
                    options={[
                      "Não informar",
                      "Feminino",
                      "Masculino",
                      "Outro",
                    ].map((value) => ({ value, label: value }))}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        gender: value as EnrollmentInput["gender"],
                      })
                    }
                  />
                </>
              )}
              {step === 1 && (
                <>
                  <Label size={20} bold>
                    Qual é seu principal objetivo?
                  </Label>
                  <Label muted>Você pode selecionar mais de uma opção.</Label>
                  {enrollmentGoals.map((goal) => (
                    <Check
                      key={goal}
                      label={goal}
                      checked={form.goals.includes(goal)}
                      onChange={() =>
                        setForm({
                          ...form,
                          goals: form.goals.includes(goal)
                            ? form.goals.filter((x) => x !== goal)
                            : [...form.goals, goal],
                        })
                      }
                    />
                  ))}
                  {field("specificGoals", "Objetivos específicos", {
                    multiline: true,
                  })}
                </>
              )}
              {step === 2 && (
                <>
                  {(["practicing", "previousTrainer"] as const).map(
                    (key, i) => (
                      <Choices
                        key={key}
                        label={
                          i
                            ? "Já teve acompanhamento com personal?"
                            : "Atualmente pratica atividade física?"
                        }
                        value={form[key]}
                        options={["Sim", "Não"].map((value) => ({
                          value,
                          label: value,
                        }))}
                        onChange={(value) => setForm({ ...form, [key]: value })}
                      />
                    ),
                  )}
                  <Choices
                    label="Dias de atividade por semana"
                    value={String(form.daysPerWeek)}
                    options={Array.from({ length: 8 }, (_, i) => ({
                      value: String(i),
                      label: String(i),
                    }))}
                    onChange={(value) =>
                      setForm({ ...form, daysPerWeek: Number(value) })
                    }
                  />
                  {field("experienceDuration", "Há quanto tempo pratica?")}
                  {field("preferredActivity", "Modalidade preferida")}
                  {field("availability", "Disponibilidade semanal *", {
                    multiline: true,
                  })}
                </>
              )}
              {step === 3 && (
                <>
                  <Notice>
                    Preenchimento opcional. Informe apenas o necessário para o
                    profissional adaptar o treinamento. Não inclua diagnósticos
                    detalhados ou exames. Este formulário não realiza avaliação
                    médica.
                  </Notice>
                  {(["restrictions", "injuries", "adaptations"] as const).map(
                    (key, i) => (
                      <Field
                        key={key}
                        label={
                          [
                            "Restrições ou recomendações para exercício",
                            "Lesões ou limitações físicas",
                            "Adaptações necessárias",
                          ][i]
                        }
                        multiline
                        value={form.health[key]}
                        onChangeText={(value) =>
                          setForm({
                            ...form,
                            health: { ...form.health, [key]: value },
                          })
                        }
                      />
                    ),
                  )}
                  <Check
                    label="Autorizo o tratamento das informações de saúde que decidi informar, exclusivamente para adaptar meu acompanhamento."
                    checked={form.healthConsent}
                    onChange={() =>
                      setForm({ ...form, healthConsent: !form.healthConsent })
                    }
                  />
                </>
              )}
              {step === 4 && (
                <>
                  <Label size={20} bold>
                    Confira sua ficha
                  </Label>
                  <EnrollmentSummaryView form={form} />
                  <View style={{ marginVertical: 20, gap: 12 }}>
                    <Label size={20} bold>
                      Privacidade e finalidade
                    </Label>
                    <Label>
                      Responsável pelo acompanhamento e tratamento:{" "}
                      {info.personalName}. Contato para dúvidas, correção,
                      revogação ou exclusão: {info.contact}.
                    </Label>
                    <Label>
                      A ficha será usada para avaliar seu cadastro e organizar o
                      acompanhamento. Somente o profissional responsável terá
                      acesso à solicitação. Informações de saúde são opcionais,
                      com autorização separada. Não há publicação social ou uso
                      desses dados por IA.
                    </Label>
                    <Label>
                      Solicitações pendentes ou recusadas serão removidas após{" "}
                      {info.retentionDays} dias sem atualização. Se aprovadas,
                      serão mantidas durante o acompanhamento, com possibilidade
                      de solicitar exclusão ao responsável, observadas as
                      obrigações aplicáveis. O cadastro não cria automaticamente
                      uma conta. Política {info.policyVersion}.
                    </Label>
                    <Check
                      label="Li a política e autorizo o envio dos meus dados cadastrais ao profissional indicado para avaliar e organizar meu acompanhamento."
                      checked={form.consent}
                      onChange={() =>
                        setForm({ ...form, consent: !form.consent })
                      }
                    />
                  </View>
                </>
              )}
              <View
                style={{ height: 0, overflow: "hidden" }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Field
                  label="Deixe este campo vazio"
                  value={website}
                  onChangeText={setWebsite}
                  tabIndex={-1}
                />
              </View>
              <Notice error>{error}</Notice>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                {step > 0 && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onPress={() => {
                      setStep(step - 1);
                      setError("");
                    }}
                  >
                    Voltar
                  </Button>
                )}
                {step < 4 ? (
                  <Button onPress={next}>Avançar</Button>
                ) : (
                  <Button disabled={busy} onPress={() => void submit()}>
                    {busy ? "Enviando…" : "Concluir cadastro"}
                  </Button>
                )}
              </View>
            </Card>
          </>
        )}
      </View>
    </Page>
  );
}
