import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, View, useWindowDimensions } from "react-native";
import Check from "lucide-react-native/icons/check";
import X from "lucide-react-native/icons/x";
import { useTheme } from "@/hooks/use-theme";
import { rememberedEmails, rememberLogin, forgetLogin, recalledPassword } from "@/features/personal/remembered-login";
import { PasswordField } from "@/components/personal/password-field";
import { LoginForm } from "@/components/personal/login-form";
import { router, type Href } from "expo-router";
import { useSession } from "@/features/personal/auth";
import { message } from "@/features/personal/api";
import { Brand, Page } from "@/components/personal/shell";
import { WelcomeCarousel } from "@/components/personal/welcome-carousel";
import {
  Button,
  Card,
  Field,
  Label,
  Notice,
  s,
} from "@/components/personal/ui";
export default function SignIn({ afterLogin = "/" }: { afterLogin?: Href } = {}) {
  const { authenticate } = useSession();
  const t = useTheme();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), selection = useRef(0);
  const [remember, setRemember] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [passwordVersion, setPasswordVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void rememberedEmails().then(values => { if (active) setAccounts(values); });
    return () => { active = false; };
  }, []);
  async function selectAccount(account: string) {
    const version = ++selection.current;
    setEmail(account); setPassword(""); setRemember(true); setPasswordVersion(current => current + 1); setError("");
    const saved = await recalledPassword(account).catch(() => null);
    if (version === selection.current && saved) setPassword(saved);
  }
  const { width, height } = useWindowDimensions();
  const compact = width < 700;
  const smallPhone = compact && height < 620;
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await authenticate(register ? "register" : "login", {
        name,
        email,
        password,
        role: "student",
      }, register ? undefined : async () => {
        if (remember) await rememberLogin(email, password);
        else await forgetLogin(email.trim().toLowerCase());
      });
      router.replace(afterLogin);
    } catch (e) {
      setError(message(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Page>
      <View style={{ paddingVertical: smallPhone ? 0 : compact ? 6 : 24 }}>
        <Brand compact={compact} />
      </View>
      <View
        style={[
          s.grid,
          { alignItems: "center", marginTop: smallPhone ? 0 : compact ? 4 : 50 },
          smallPhone && { gap: 8 },
        ]}
      >
        <View style={s.column}>
          <WelcomeCarousel />
        </View>
        <Card style={[s.column, { padding: smallPhone ? 12 : compact ? 16 : 32 }]}>
          <Label size={compact ? 20 : 26} bold>
            {register ? "Crie sua conta" : "Seu treino começa aqui."}
          </Label>
          <Label muted>
            {register
              ? "Uma identidade para acompanhar sua evolução."
              : "Entre no seu espaço Tá Pago Personal."}
          </Label>
          <View style={{ marginTop: compact ? 12 : 24 }}><LoginForm submit={() => void submit()}>
            {!register && accounts.length > 0 && <View style={{ gap: 8, marginBottom: 16 }}>
              <Label size={12} muted>Contas lembradas neste dispositivo</Label>
              {accounts.map(account => <View key={account} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ flex: 1, minWidth: 0 }}><Button variant="secondary" disabled={busy} label={`Usar acesso ${account}`} onPress={() => void selectAccount(account)}>{account}</Button></View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Esquecer e-mail ${account}`} disabled={busy} onPress={() => {
                  ++selection.current;
                  void forgetLogin(account).then(() => {
                    setAccounts(current => current.filter(value => value !== account));
                    if (email === account) { setEmail(""); setPassword(""); setRemember(false); }
                  }).catch(() => setError("Não foi possível esquecer este acesso. Tente novamente."));
                }} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><X size={18} color={t.textSecondary} strokeWidth={1.75} /></Pressable>
              </View>)}
            </View>}
            {register && (
              <>
                <Field label="Seu nome" value={name} onChangeText={setName} />
                <Label size={12} muted>
                  Cadastro para alunos. O acesso de personal depende de autorização.
                </Label>
              </>
            )}
            <Field
              label="E-mail"
              value={email}
              onChangeText={value => { ++selection.current; setEmail(value); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete={register ? "email" : "username"}
              textContentType="username"
              nativeID="login-email"
              editable={!busy}
            />
            <PasswordField
              key={`${register}:${passwordVersion}`}
              label="Senha"
              value={password}
              onChangeText={value => { ++selection.current; setPassword(value); }}
              autoComplete={register ? "new-password" : "current-password"}
              textContentType={register ? "newPassword" : "password"}
              nativeID="login-password"
              editable={!busy}
              onSubmitEditing={() => void submit()}
            />
            <Label size={11} muted>
              Mínimo de 6 caracteres.
            </Label>
            {!register && <View style={{ gap: 4, marginBottom: 14 }}>
              <Pressable accessibilityRole="checkbox" accessibilityLabel="Lembrar e-mail e senha" accessibilityState={{ checked: remember, disabled: busy }} disabled={busy} onPress={() => setRemember(current => !current)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
                <View style={{ width: 22, height: 22, borderWidth: 1, borderRadius: 5, borderColor: remember ? t.accent : t.border, backgroundColor: remember ? t.accent : t.background, alignItems: "center", justifyContent: "center" }}>
                  {remember && <Check size={16} color="#ffffff" strokeWidth={2} />}
                </View>
                <Label size={13}>Lembrar e-mail e senha</Label>
              </Pressable>
              <Label size={11} muted>{Platform.OS === "web" ? "As senhas são salvas pelo gerenciador do navegador, conforme sua confirmação e configurações." : "O acesso será salvo no armazenamento seguro deste dispositivo."}</Label>
            </View>}
            <Notice error>{error}</Notice>
            <Button disabled={busy} onPress={() => void submit()}>
              {busy ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
            </Button>
            <View style={{ marginTop: 12 }}>
              <Button
                variant="secondary"
                onPress={() => {
                  setRegister(!register);
                  ++selection.current; setPassword(""); setPasswordVersion(current => current + 1);
                  setError("");
                }}
              >
                {register ? "Já tenho uma conta" : "Criar minha conta"}
              </Button>
            </View>
          </LoginForm></View>
        </Card>
      </View>
    </Page>
  );
}
