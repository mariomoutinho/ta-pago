import { useState } from "react";
import { View } from "react-native";
import { Page } from "@/components/personal/shell";
import { Badge, Button, Card, Choices, Empty, Label, Notice } from "@/components/personal/ui";
import { PageHeader } from "@/components/studio/page-header";
import { SearchInput } from "@/components/studio/search-input";
import { useResource } from "@/features/personal/use-resource";
import type { AdminProfiles } from "../../shared/admin";
export default function AdministrationPage() {
  const [search, setSearch] = useState(""), [role, setRole] = useState("all"), [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource<AdminProfiles>(`/admin/profiles?q=${encodeURIComponent(search)}&role=${role}&page=${page}`);
  return <Page><View style={{ gap: 24 }}>
    <PageHeader title="Administração" description="Consulte os perfis de alunos e professores cadastrados no aplicativo." />
    {!!data && <Label>{data.counts.personal} professores · {data.counts.student} alunos · {data.counts.withoutLogin} alunos sem acesso de login</Label>}
    <SearchInput label="Buscar nome ou e-mail" value={search} onChange={value => { setSearch(value); setPage(1); }} />
    <Choices label="Tipo de perfil" value={role} onChange={value => { setRole(value); setPage(1); }} options={[{ value: "all", label: "Todos" }, { value: "personal", label: "Professores" }, { value: "student", label: "Alunos" }]} />
    <Notice error>{error}</Notice>{error && <Button onPress={() => void reload()}>Tentar novamente</Button>}
    {loading && <Label>Carregando perfis…</Label>}
    {!loading && !error && !data?.items.length && <Empty title="Nenhum perfil encontrado" description="Ajuste o nome, e-mail ou filtro de perfil." />}
    {!loading && !error && data?.items.map(profile => <Card key={profile.id}>
      <Label bold size={18}>{profile.name}</Label><Label>{profile.email || "E-mail não informado"}</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Badge>{profile.role === "personal" ? "Professor" : "Aluno"}</Badge>{profile.isAdmin && <Badge>Administrador</Badge>}<Badge>{profile.hasLogin ? "Conta com login" : "Cadastro sem login"}</Badge></View>
      {!!profile.teachers.length && <Label muted>Professor: {profile.teachers.join(", ")}</Label>}
    </Card>)}
    {!!data && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <Button variant="secondary" disabled={loading || page === 1} onPress={() => setPage(current => current - 1)}>Anterior</Button>
      <Label>Página {page} de {Math.max(1, Math.ceil(data.total / data.pageSize))} · {data.total} perfis</Label>
      <Button variant="secondary" disabled={loading || page * data.pageSize >= data.total} onPress={() => setPage(current => current + 1)}>Próxima</Button>
    </View>}
  </View></Page>;
}
