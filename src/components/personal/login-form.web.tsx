import type { ReactNode } from "react";
export function LoginForm({ children, submit }: { children: ReactNode; submit: () => void }) {
  return <form method="post" onSubmit={event => { event.preventDefault(); submit(); }} style={{ display: "flex", flexDirection: "column", margin: 0 }}>
    {children}
    <input type="submit" tabIndex={-1} aria-hidden style={{ display: "none" }} />
  </form>;
}
