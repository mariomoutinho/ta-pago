import { useState } from "react";
import { View } from "react-native";
import { router, type Href } from "expo-router";
import { useSession } from "@/features/personal/auth";
import { useResource } from "@/features/personal/use-resource";
import { api, message } from "@/features/personal/api";
import { PersonalDashboard } from "@/components/personal/dashboard";
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
