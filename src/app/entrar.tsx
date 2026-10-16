import { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSession } from "@/features/personal/auth";
import { message } from "@/features/personal/api";
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
export default function SignIn() {
  const { authenticate } = useSession();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("personal");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await authenticate(register ? "register" : "login", {
        name,
        email,
        password,
        role,
      });
      router.replace("/");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <View style={{ paddingVertical: 24 }}>
        <Brand />
      </View>
      <View
        style={[
          s.grid,
          { alignItems: "center", marginTop: width > 700 ? 50 : 10 },
        ]}
      >
        <View
          style={[
            s.column,
            {
              padding: 24,
              backgroundColor: "#0B0B0D",
              borderRadius: 24,
              minHeight: 350,
              justifyContent: "center",
            },
          ]}
        >
          <View
            style={{
              backgroundColor: "#CF1026",
              height: 5,
              width: 60,
              marginBottom: 30,
            }}
          />
          <TextHero />
          <View style={{ marginTop: 28 }}>
            <View style={s.row}>
              {[
                "33 perguntas",
                "13 critérios técnicos",
                "Histórico preservado",
              ].map((text) => (
                <View
                  key={text}
                  style={{
                    borderWidth: 1,
                    borderColor: "#38383E",
                    borderRadius: 20,
                    padding: 10,
                  }}
                >
                  <WhiteText text={text} />
                </View>
              ))}
            </View>
          </View>
        </View>
        <Card style={[s.column, { padding: 32 }]}>
          <Label size={26} bold>
            {register ? "Crie sua conta" : "Seu treino começa aqui."}
          </Label>
          <Label muted>
            {register
              ? "Uma identidade para acompanhar sua evolução."
              : "Entre no seu espaço Tá Pago Personal."}
          </Label>
          <View style={{ marginTop: 24 }}>
            {register && (
              <>
                <Field label="Seu nome" value={name} onChangeText={setName} />
                <Choices
                  label="Tipo de conta"
                  options={[
                    { value: "personal", label: "Sou personal" },
                    { value: "student", label: "Sou aluno" },
                  ]}
                  value={role}
                  onChange={setRole}
                />
              </>
            )}
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={register ? "new-password" : "current-password"}
            />
            <Label size={11} muted>
              Mínimo de 12 caracteres.
            </Label>
            <Notice error>{error}</Notice>
            <Button disabled={busy} onPress={() => void submit()}>
              {busy ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
            </Button>
            <View style={{ marginTop: 12 }}>
              <Button
                variant="secondary"
                onPress={() => {
                  setRegister(!register);
                  setError("");
                }}
              >
                {register ? "Já tenho uma conta" : "Criar minha conta"}
              </Button>
            </View>
          </View>
        </Card>
      </View>
    </Page>
  );
}
import { Text } from "react-native";
function TextHero() {
  return (
    <>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: "#FF4C61",
          letterSpacing: 2,
        }}
      >
        ACOMPANHAMENTO DE VERDADE
      </Text>
      <Text
        style={{
          fontSize: 42,
          fontWeight: "800",
          color: "#fff",
          lineHeight: 49,
          marginVertical: 18,
        }}
      >
        Cada presença.{"\n"}Uma conquista.
      </Text>
      <Text style={{ color: "#A7A7B1", fontSize: 15, lineHeight: 24 }}>
        Alunos, treinos e avaliações no mesmo lugar.{"\n"}Evolução que vai além
        dos números.
      </Text>
    </>
  );
}
function WhiteText({ text }: { text: string }) {
  return <Text style={{ color: "#D5D5DD", fontSize: 11 }}>{text}</Text>;
}
