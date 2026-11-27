import { useState } from 'react';
import { View } from 'react-native';
import { Button, Dialog, Field, Label, Notice } from './ui';
import { PasswordField } from './password-field';
import { api, message } from '@/features/personal/api';
import { adminTeacherSchema, adminPasswordSchema, type AdminProfile } from '../../../shared/admin';

export function AdminAccountDialog({ profile, close, done }: { profile?: AdminProfile; close: () => void; done: () => Promise<void> }) {
  const [name, setName] = useState(''), [email, setEmail] = useState('');
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save() {
    if (busy) return;
    setError('');
    try {
      if (password !== confirmation) throw new Error('As senhas devem ser iguais.');
      const data = profile ? adminPasswordSchema.parse({ password }) : adminTeacherSchema.parse({ name, email: email.trim(), password });
      setBusy(true);
      await api(profile ? `/admin/profiles/${encodeURIComponent(profile.id)}/password` : '/admin/teachers', profile ? 'PUT' : 'POST', data);
      await done(); close();
    } catch (e) { setError(e instanceof Error && e.name === 'ZodError' ? 'Confira nome, e-mail e senha com pelo menos 6 caracteres.' : message(e)); }
    finally { setBusy(false); }
  }
  return <Dialog title={profile ? 'Redefinir senha' : 'Adicionar professor'} onClose={() => { if (!busy) close(); }}>
    <View style={{ gap: 12 }}>
      {profile ? <><Label bold>{profile.name}</Label><Label>As sessões desta conta serão encerradas. Informe a nova senha ao titular por um canal privado.</Label></> : <>
        <Field label="Nome do professor" value={name} onChangeText={setName} editable={!busy} />
        <Field label="E-mail do professor" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!busy} />
        <Label>A nova conta terá acesso de professor. Não receberá permissão de administrador.</Label>
      </>}
      <PasswordField label="Nova senha" value={password} onChangeText={setPassword} editable={!busy} autoComplete="new-password" />
      <PasswordField label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} editable={!busy} autoComplete="new-password" />
      <Label muted size={12}>Mínimo de 6 caracteres.</Label>
      <Notice error>{error}</Notice>
      <Button disabled={busy} onPress={() => void save()}>{busy ? 'Salvando…' : profile ? 'Salvar nova senha' : 'Cadastrar professor'}</Button>
      <Button variant="secondary" disabled={busy} onPress={close}>Cancelar</Button>
    </View>
  </Dialog>;
}
