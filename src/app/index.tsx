import { useState } from "react";
import { View, Text } from "react-native";
import { router, type Href } from "expo-router";
import { useSession } from "@/features/personal/auth";
import { useResource } from "@/features/personal/use-resource";
import { api, message, today, formatDate } from "@/features/personal/api";
import type { Student } from "@/features/personal/types";
import { Page } from "@/components/personal/shell";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Heading,
  Label,
  Notice,
  s,
} from "@/components/personal/ui";
export default function Home() {
  const { user } = useSession();
  return user?.role === "student" ? <StudentHome /> : <PersonalHome />;
}
function PersonalHome() {
  const { data, error, loading } = useResource<Student[]>("/students");
  const students = data ?? [];
  const active = students.filter((x) => x.status === "ativo");
  const due = active.filter(
    (x) => x.nextEvaluationDate && x.nextEvaluationDate <= today(),
  );
  return (
    <Page>
      <Heading
        title="Seu trabalho. Cada evolução."
        subtitle="Acompanhe as pessoas, reconheça as conquistas e planeje o próximo passo."
        action={
          <Button onPress={() => router.push("/alunos" as Href)}>
            Meus alunos →
          </Button>
        }
      />
      <View
        style={{
          backgroundColor: "#101013",
          borderRadius: 22,
          padding: 30,
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            color: "#FF4C61",
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 2,
          }}
        >
          TÁ PAGO PERSONAL
        </Text>
        <Text
          style={{
            color: "#fff",
            fontSize: 32,
            lineHeight: 39,
            fontWeight: "700",
            marginVertical: 16,
          }}
        >
          Mais presença.{"\n"}Mais evolução.
        </Text>
        <Text style={{ color: "#AAAAB5", fontSize: 14, lineHeight: 23 }}>
          Força, confiança e autonomia. Um acompanhamento completo para cada
          trajetória.
        </Text>
      </View>
      <Notice error>{error}</Notice>
      <View style={s.grid}>
        {[
          ["Alunos ativos", active.length, "Trajetórias em acompanhamento"],
          [
            "Avaliações pendentes",
            due.length,
            "Previstas para hoje ou em atraso",
          ],
          [
            "Sessões / semana",
            active.reduce((sum, x) => sum + x.weeklyFrequency, 0),
            "Soma das frequências planejadas",
          ],
        ].map(([label, value, caption]) => (
          <Card key={String(label)} style={s.column}>
            <Label muted>{label}</Label>
            <Label size={32} bold>
              {value}
            </Label>
            <Label size={11} muted>
              {caption}
            </Label>
          </Card>
        ))}
      </View>
      <View style={s.grid}>
        <Card style={s.column}>
          <Label size={18} bold>
            Seus alunos
          </Label>
          {loading ? (
            <Notice>Carregando…</Notice>
          ) : students.length ? (
            students.slice(0, 5).map((x) => (
              <View key={x.id} style={{ gap: 8, marginTop: 18 }}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Label bold>{x.name}</Label>
                  <Badge>{x.status}</Badge>
                </View>
                <Label muted>{x.mainGoal}</Label>
                <Button
                  variant="secondary"
                  onPress={() => router.push(`/alunos/${x.id}` as Href)}
                >
                  Abrir acompanhamento
                </Button>
              </View>
            ))
          ) : (
            <Empty
              title="Comece pelo primeiro aluno"
              description="Registre os dados essenciais para começar."
              action={
                <Button onPress={() => router.push("/alunos" as Href)}>
                  Cadastrar aluno
                </Button>
              }
            />
          )}
        </Card>
        <Card style={s.column}>
          <Label size={18} bold>
            Próximos cuidados
          </Label>
          {due.length ? (
            due.map((x) => (
              <View key={x.id} style={{ marginTop: 18, gap: 8 }}>
                <Label bold>{x.name}</Label>
                <Label muted>
                  Avaliação · {formatDate(x.nextEvaluationDate)}
                </Label>
                <Button
                  variant="secondary"
                  onPress={() => router.push(`/alunos/${x.id}` as Href)}
                >
                  Ver prontuário
                </Button>
              </View>
            ))
          ) : (
            <Empty
              title="Nenhuma avaliação pendente"
              description="As próximas datas aparecem aqui ao concluir um ciclo ou editar o cadastro."
            />
          )}
        </Card>
      </View>
    </Page>
  );
}
type LinkSummary = {
  id: string;
  name: string;
  mainGoal: string;
  linkStatus: string;
  personal: { name: string };
};
function StudentHome() {
  const { data, error, reload } = useResource<LinkSummary[]>("/me/students");
  const [code, setCode] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Page>
      <Heading
        title="Minha evolução"
        subtitle="Seu histórico de acompanhamento, com acesso privado e controle dos vínculos."
      />
      <Notice error>{error || failure}</Notice>
      <Card>
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
              await reload();
            } catch (e) {
              setFailure(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Aceitar convite
        </Button>
      </Card>
      {data?.length ? (
        data.map((x) => (
          <Card key={x.id}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Label size={20} bold>
                {x.personal.name}
              </Label>
              <Badge>
                {x.linkStatus === "active"
                  ? "Vínculo ativo"
                  : "Vínculo encerrado"}
              </Badge>
            </View>
            <Label muted>{x.mainGoal}</Label>
            <View style={{ marginTop: 16 }}>
              <Button
                onPress={() => router.push(`/acompanhamento/${x.id}` as Href)}
              >
                Abrir meu acompanhamento
              </Button>
            </View>
          </Card>
        ))
      ) : (
        <Card>
          <Empty
            title="Seu histórico começa com um vínculo"
            description="Peça ao seu personal o código de convite para acessar suas avaliações e treinos."
          />
        </Card>
      )}
    </Page>
  );
}
