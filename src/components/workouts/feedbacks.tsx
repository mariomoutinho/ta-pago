import { useState } from "react";
import { View } from "react-native";
import { api, message } from "@/features/personal/api";
import { Button, Card, Dialog, Field, Label, Notice } from "@/components/personal/ui";
import { workoutFeedbackSchema, type WorkoutData } from "../../../shared/workouts";

export function WorkoutFeedbacks({ workout, canSend, reload }: {
  workout: WorkoutData; canSend: boolean; reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Identifica uma tentativa de envio, inclusive quando a resposta se perde na rede.
  const [requestId, setRequestId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const feedbacks = workout.feedbacks ?? [];
  async function send() {
    const parsed = workoutFeedbackSchema.safeParse({ comment, requestId });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    setError("");
    try {
      await api(`/me/workouts/${workout.id}/feedbacks`, "POST", parsed.data);
      setComment("");
      setRequestId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
      setSuccess("Feedback registrado e disponível para o personal.");
      await reload();
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  return <>
    <Button variant="secondary" onPress={() => { setOpen(true); setSuccess(""); }}>
      Feedbacks ({feedbacks.length})
    </Button>
    {canSend && <Button onPress={() => { setOpen(true); setSuccess(""); }}>Terminei: enviar feedback</Button>}
    {open && <Dialog title={`Feedbacks · ${workout.name}`} onClose={() => { if (!busy) setOpen(false); }}>
      <View style={{ gap: 12 }}>
        {canSend && <>
          <Label>Após terminar o treino, conte ao personal como foi sua experiência.</Label>
          <Field label="Seu feedback" value={comment} onChangeText={setComment} multiline maxLength={2000} editable={!busy} />
          <Button disabled={busy || !comment.trim()} onPress={() => void send()}>{busy ? "Enviando…" : "Registrar feedback"}</Button>
        </>}
        <Notice error>{error}</Notice>
        <Notice>{success}</Notice>
        {!feedbacks.length && <Notice>Nenhum feedback registrado para este treino.</Notice>}
        {feedbacks.map(feedback => <Card key={feedback.id}>
          <Label size={12} muted>{new Date(feedback.createdAt).toLocaleString("pt-BR")}</Label>
          <Label>{feedback.comment}</Label>
        </Card>)}
      </View>
    </Dialog>}
  </>;
}
