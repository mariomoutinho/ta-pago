import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
function key() {
  const configured = process.env.PERSONAL_ENROLLMENT_KEY;
  if (configured) {
    if (!/^[a-f0-9]{64}$/i.test(configured))
      throw new Error(
        "PERSONAL_ENROLLMENT_KEY deve conter 64 caracteres hexadecimais",
      );
    return Buffer.from(configured, "hex");
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Configure PERSONAL_ENROLLMENT_KEY em produção");
  const file = path.resolve(
    process.env.PERSONAL_ENROLLMENT_KEY_FILE ?? "data/enrollment.key",
  );
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  try {
    writeFileSync(file, randomBytes(32), { flag: "wx", mode: 0o600 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  const result = readFileSync(file);
  if (result.length !== 32) throw new Error("Chave de cadastro inválida");
  return result;
}
export function seal(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const content = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), content]
    .map((x) => x.toString("base64"))
    .join(".");
}
export function unseal<T>(value: string): T {
  const [iv, tag, content] = value
    .split(".")
    .map((x) => Buffer.from(x, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([decipher.update(content), decipher.final()]).toString(
      "utf8",
    ),
  );
}
export function emailFingerprint(email: string) {
  return createHmac("sha256", key())
    .update(email.trim().toLowerCase())
    .digest("hex");
}
