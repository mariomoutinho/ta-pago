import path from "node:path";
export function runtimeConfig(env: Record<string, string | undefined> = process.env) {
  const production = env.NODE_ENV === "production";
  const port = Number(env.PORT ?? env.PERSONAL_API_PORT ?? 3003);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT/PERSONAL_API_PORT inválida");
  if (production) {
    const origin = new URL(
      env.PERSONAL_ENROLLMENT_ORIGIN ?? "http://localhost",
    );
    if (
      origin.protocol !== "https:" ||
      origin.hostname === "localhost" ||
      origin.hostname.endsWith(".localhost") ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      throw new Error(
        "Configure PERSONAL_ENROLLMENT_ORIGIN com a origem HTTPS de produção",
      );
    if (!/^[a-f0-9]{64}$/i.test(env.PERSONAL_ENROLLMENT_KEY ?? ""))
      throw new Error(
        "Configure PERSONAL_ENROLLMENT_KEY no gerenciador de segredos",
      );
    const file = env.PERSONAL_DATABASE_URL?.startsWith("file:")
      ? env.PERSONAL_DATABASE_URL.slice(5)
      : "";
    if (!path.isAbsolute(file))
      throw new Error(
        "Produção requer PERSONAL_DATABASE_URL=file:/caminho/absoluto/persistente/tapago.db",
      );
    const relative = path.relative(process.cwd(), file);
    if (
      relative === "" ||
      (!relative.startsWith(".." + path.sep) &&
        relative !== ".." &&
        !path.isAbsolute(relative))
    )
      throw new Error(
        "O banco de produção deve ficar fora da pasta da release para sobreviver aos deploys",
      );
  }
  return {
    port,
    host: env.PERSONAL_API_HOST ?? (production ? "0.0.0.0" : "127.0.0.1"),
  };
}
