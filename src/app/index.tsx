import { useState } from "react";
import { View } from "react-native";
import { router, type Href } from "expo-router";
import { useSession } from "@/features/personal/auth";
import { useResource } from "@/features/personal/use-resource";
import { api, message } from "@/features/personal/api";
import { PersonalDashboard } from "@/components/personal/dashboard";
import type { Plan } from "../../shared/workouts";
import { Page } from "@/components/personal/shell";
import {
  Badge,
  Button,
  Card,
  Field,
  Heading,
  Label,
  Notice,
} from "@/components/personal/ui";
export default function Home() {
  const { user } = useSession();
  return user?.role === "student" ? <StudentHome /> : <PersonalDashboard />;
}
type LinkSummary = {
  id: string;
  name: string;
  mainGoal: string;
  linkStatus: string;
  personal: { name: string };
};
function StudentHome() {
  const { user } = useSession();
  const { data, error, loading, reload } = useResource<LinkSummary[]>("/me/students");
  const plans = useResource<Plan[]>("/me/workout-plans");
  const [showInvitation, setShowInvitation] = useState(false);
  const [code, setCode] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Page>
      <Heading
        eyebrow="ÁREA DO ALUNO / TÁ PAGO"
        title={`Olá, ${user?.name.split(" ")[0] ?? "aluno"}`}
        subtitle="Seu professor, seus treinos e sua evolução em um só lugar."
      />
      <Notice error>{error || failure}</Notice>
      {loading && <Notice>Carregando seu perfil…</Notice>}
      {error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
      <Card>
        <View style={{ gap: 12 }}>
          <Label size={20} bold>Meus treinos</Label>
          <Notice error>{plans.error}</Notice>
          {plans.loading ? <Label muted>Carregando treinos…</Label> : plans.error ? (
            <Button variant="secondary" onPress={() => void plans.reload()}>Tentar carregar treinos</Button>
          ) : plans.data?.some(plan => plan.status === "ativo") ? (
            <Label muted>Consulte as rotinas e as orientações que seu professor liberou para você.</Label>
          ) : (
            <Label muted>{data?.some(link => link.linkStatus === "active")
              ? "Aguardando liberação do professor. Seus treinos aparecerão aqui assim que forem publicados."
              : "Conecte-se ao seu professor para receber seus treinos. Rotinas já publicadas continuam no seu histórico."}</Label>
          )}
          <Button onPress={() => router.push("/treinos" as Href)}>Ver meus treinos</Button>
        </View>
      </Card>
      {data?.map(x => (
        <Card key={x.id}>
          <View style={{ gap: 12 }}>
            <Label size={12} muted>MEU PROFESSOR</Label>
            <Label size={20} bold>{x.personal.name}</Label>
            <View style={{ alignSelf: "flex-start" }}><Badge>{x.linkStatus === "active" ? "Vínculo ativo" : "Vínculo encerrado"}</Badge></View>
            <Label muted>Seu objetivo: {x.mainGoal}</Label>
            <Button variant="secondary" onPress={() => router.push(`/acompanhamento/${x.id}` as Href)}>Abrir meu acompanhamento</Button>
          </View>
        </Card>
      ))}
      {!loading && !error && (showInvitation || !data?.length) && <Card>
        <Label size={18} bold>
          Conectar com meu personal
        </Label>
        <Notice>
          Ao aceitar o convite, você autoriza o profissional indicado no seu
          acompanhamento a acessar seus registros. Você pode encerrar esse
          vínculo a qualquer momento.
        </Notice>
        <Field
          label="Código de convite"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
        />
        <Button
          disabled={busy}
          onPress={async () => {
            setFailure("");
            setBusy(true);
            try {
              await api("/me/claim", "POST", { code });
              setCode("");
              setShowInvitation(false);
              await reload();
              await plans.reload();
            } catch (e) {
              setFailure(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Aceitar convite
        </Button>
      </Card>}
      {!!data?.length && <Button variant="secondary" onPress={() => setShowInvitation(value => !value)}>
        {showInvitation ? "Fechar convite" : "Conectar com outro professor"}
      </Button>}
    </Page>
  );
}
