export type NewsItem = {
  id: string;
  kind: "enrollment" | "workout_completed" | "feedback";
  title: string;
  createdAt: string;
  url: string;
  read: boolean;
};
export const brazilToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
