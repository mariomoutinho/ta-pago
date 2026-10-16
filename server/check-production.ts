import "dotenv/config";
import { runtimeConfig } from "./runtime";
runtimeConfig({ ...process.env, NODE_ENV: "production" });
console.log(
  "Configuração de produção válida. Confirme persistência, backup, proxy e HTTPS na hospedagem.",
);
