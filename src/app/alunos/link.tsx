import { useState, useEffect } from "react";
import { View, Linking } from "react-native";
import { router, type Href } from "expo-router";
import { Page } from "@/components/personal/shell";
import {
  Button,
  Card,
  Choices,
  Confirm,
  Dialog,
  Field,
  Heading,
  Label,
  Notice,
  Badge,
  s,
} from "@/components/personal/ui";
import {
  EnrollmentSummaryView,
  ChainIcon,
} from "@/components/personal/enrollment-fields";
import { api, message, formatDate } from "@/features/personal/api";
import { useResource } from "@/features/personal/use-resource";
import { useSession } from "@/features/personal/auth";
import {
  copyEnrollmentLink,
  shareEnrollmentLink,
  whatsappEnrollment,
} from "@/features/personal/enrollment-sharing";
import {
  enrollmentStatus,
  type LinkInfo,
  type EnrollmentSummary,
  type EnrollmentDetail,
} from "../../../shared/enrollment";
export default function EnrollmentLinkPage() {
  const { user } = useSession();
  const link = useResource<LinkInfo | null>("/enrollment/link");
  const contacts = useResource<EnrollmentSummary[]>("/enrollment/requests");
  const [tab, setTab] = useState("Link"),
    [name, setName] = useState(user?.name ?? ""),
    [contact, setContact] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState<EnrollmentDetail | null>(null),
    [confirmation, setConfirmation] = useState<{
      title: string;
      description: string;
      run: () => Promise<void>;
    } | null>(null);
  useEffect(() => {
    if (link.data) {
      setName(link.data.publicName);
      setContact(link.data.contact);
    }
  }, [link.data]);
  useEffect(() => {
    const timer = setInterval(() => void contacts.reload(), 15000);
    return () => clearInterval(timer);
  }, [contacts.reload]);
  async function action(run: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await run();
      if (success) setFeedback(success);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    await Promise.all([contacts.reload(), link.reload()]);
  }
  async function change(
    row: EnrollmentSummary | EnrollmentDetail,
    status: string,
  ) {
    await api(`/enrollment/requests/${row.id}/status`, "POST", { status });
    setDetail(null);
    await reload();
  }
  const rows = (contacts.data ?? []).filter(
    (x) =>
      (!status || x.status === status) &&
      x.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <Page>
      <Button
        variant="secondary"
        onPress={() => router.push("/alunos" as Href)}
      >
        ← Meus alunos
      </Button>
      <Heading
        title="Link de Cadastro"
        subtitle="Receba fichas e aprove cada novo acompanhamento."
      />
      <Choices
        label="Seção"
        value={tab}
        onChange={setTab}
        options={["Link", "Contatos"].map((value) => ({ value, label: value }))}
      />
      <Notice error>{error || link.error || contacts.error}</Notice>
      <Notice>{feedback}</Notice>
      {tab === "Link" ? (
        <Card>
          <ChainIcon />
          <Label size={22} bold>
            Seu próximo aluno começa aqui
          </Label>
          <Label>
            Compartilhe o formulário para receber os dados diretamente no seu
            painel. Cada cadastro aguarda sua aprovação.
          </Label>
          <Notice>
            {contacts.data?.length ?? 0} cadastros recebidos ·{" "}
            {contacts.data?.filter((x) => x.status === "pending").length ?? 0}{" "}
            pendentes
          </Notice>
          {link.data ? (
            <>
              <Badge>
                {link.data.active ? "Link ativo" : "Link desativado"}
              </Badge>
              <Field
                label="URL de cadastro"
                value={link.data.url}
                editable={false}
                selectTextOnFocus
              />
              <Label muted>
                Responsável: {link.data.publicName} · Contato:{" "}
                {link.data.contact}
              </Label>
              {link.data.local && (
                <Notice>
                  Modo local: este endereço funciona no computador que executa o
                  Tá Pago. Para acesso por outro dispositivo, configure o
                  endereço da rede local.
                </Notice>
              )}
              <View style={s.row}>
                <Button
                  disabled={busy || !link.data.active}
                  onPress={() =>
                    void action(
                      () => copyEnrollmentLink(link.data!.url),
                      "Link copiado.",
                    )
                  }
                >
                  Copiar link
                </Button>
                <Button
                  disabled={busy || !link.data.active}
                  variant="secondary"
                  onPress={() =>
                    void action(() => whatsappEnrollment(link.data!.url))
                  }
                >
                  Enviar pelo WhatsApp
                </Button>
                <Button
                  disabled={busy || !link.data.active}
                  variant="secondary"
                  onPress={() =>
                    void action(async () =>
                      setFeedback(await shareEnrollmentLink(link.data!.url)),
                    )
                  }
                >
                  Compartilhar
                </Button>
                <Button
                  disabled={!link.data.active}
                  variant="secondary"
                  onPress={() =>
                    void action(() => Linking.openURL(link.data!.url))
                  }
                >
                  Visualizar formulário
                </Button>
              </View>
              <View style={{ marginTop: 20 }}>
                {link.data.active && (
                  <Button
                    variant="danger"
                    onPress={() =>
                      setConfirmation({
                        title: "Desativar link",
                        description:
                          "O formulário deixará de aceitar novos cadastros. As fichas recebidas serão preservadas.",
                        run: async () => {
                          await api("/enrollment/link", "DELETE");
                          await reload();
                        },
                      })
                    }
                  >
                    Desativar link
                  </Button>
                )}
              </View>
            </>
          ) : (
            <Notice>
              Defina seu nome público e um contato para dúvidas sobre a ficha.
              Ambos aparecerão no formulário.
            </Notice>
          )}
          <View style={{ marginTop: 24 }}>
            <Field
              label="Nome público do personal"
              value={name}
              onChangeText={setName}
            />
            <Field
              label="Contato público para privacidade (e-mail ou telefone)"
              value={contact}
              onChangeText={setContact}
            />
            <Button
              disabled={busy || !name.trim() || !contact.trim()}
              onPress={() => {
                const run = async () => {
                  await api("/enrollment/link", "POST", {
                    publicName: name,
                    contact,
                  });
                  await reload();
                };
                if (link.data)
                  setConfirmation({
                    title: "Gerar novo link",
                    description:
                      "O endereço anterior será invalidado imediatamente. Os cadastros já recebidos serão preservados.",
                    run,
                  });
                else void action(run, "Link criado.");
              }}
            >
              {link.data ? "Gerar novo link" : "Gerar meu link"}
            </Button>
          </View>
        </Card>
      ) : (
        <>
          <Field
            label="Buscar cadastro por nome"
            value={search}
            onChangeText={setSearch}
          />
          <Choices
            label="Status do relacionamento"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Todos" },
              ...Object.entries(enrollmentStatus).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          {contacts.loading ? (
            <Notice>Carregando cadastros…</Notice>
          ) : !rows.length ? (
            <Notice>Nenhum cadastro encontrado.</Notice>
          ) : (
            rows.map((row) => (
              <Card key={row.id}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Label size={20} bold>
                    {row.name}
                  </Label>
                  <Badge>{enrollmentStatus[row.status]}</Badge>
                </View>
                <Label muted>
                  {formatDate(row.createdAt)} · {row.goals.join(", ")}
                </Label>
                <Label>
                  {row.email} · {row.phone}
                </Label>
                <View style={[s.row, { marginTop: 14 }]}>
                  <Button
                    variant="secondary"
                    onPress={() =>
                      void action(async () =>
                        setDetail(
                          await api<EnrollmentDetail>(
                            `/enrollment/requests/${row.id}`,
                          ),
                        ),
                      )
                    }
                  >
                    Ver ficha
                  </Button>
                  {row.status === "pending" && (
                    <>
                      <Button
                        disabled={busy}
                        onPress={() =>
                          void action(
                            () => change(row, "active"),
                            "Aluno aprovado.",
                          )
                        }
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant="danger"
                        onPress={() =>
                          setConfirmation({
                            title: "Recusar cadastro",
                            description:
                              "A solicitação será marcada como recusada. Nenhuma conta será criada.",
                            run: () => change(row, "rejected"),
                          })
                        }
                      >
                        Recusar
                      </Button>
                    </>
                  )}
                  {row.status === "active" && (
                    <>
                      <Button
                        variant="secondary"
                        onPress={() =>
                          router.push(`/alunos/${row.studentId}` as Href)
                        }
                      >
                        Abrir acompanhamento
                      </Button>
                      <Button
                        variant="danger"
                        onPress={() =>
                          setConfirmation({
                            title: "Desativar vínculo",
                            description:
                              "Seu acesso ao acompanhamento será encerrado. O histórico da conta do aluno será preservado.",
                            run: () => change(row, "inactive"),
                          })
                        }
                      >
                        Desativar vínculo
                      </Button>
                    </>
                  )}
                </View>
              </Card>
            ))
          )}
        </>
      )}
      {detail && (
        <Dialog title="Ficha cadastral" onClose={() => setDetail(null)}>
          <EnrollmentSummaryView form={detail.form} />
          <Notice>
            Política {detail.policyVersion} · Autorização em{" "}
            {formatDate(detail.consentAt)} · Saúde:{" "}
            {detail.healthConsentAt ? "autorizada" : "não autorizada"}
          </Notice>
          <Label bold>Histórico de status</Label>
          {detail.events.map((event, i) => (
            <Label key={i}>
              {formatDate(event.createdAt)} · {enrollmentStatus[event.status]}
            </Label>
          ))}
          {detail.status !== "active" && (
            <Button
              variant="danger"
              onPress={() =>
                setConfirmation({
                  title: "Excluir ficha",
                  description:
                    "Exclui definitivamente a solicitação, seus consentimentos e informações de saúde. Um acompanhamento existente não será apagado por esta ação.",
                  run: async () => {
                    await api(`/enrollment/requests/${detail.id}`, "DELETE");
                    setDetail(null);
                    await reload();
                  },
                })
              }
            >
              Excluir ficha
            </Button>
          )}
        </Dialog>
      )}
      {confirmation && (
        <Confirm
          title={confirmation.title}
          description={confirmation.description}
          onConfirm={confirmation.run}
          onClose={() => setConfirmation(null)}
        />
      )}
    </Page>
  );
}
