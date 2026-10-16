import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  platform: { OS: "web" },
  copy: vi.fn(),
  open: vi.fn(),
  share: vi.fn(),
}));
vi.mock("react-native", () => ({
  Platform: mocks.platform,
  Linking: { openURL: mocks.open },
  Share: { share: mocks.share },
}));
vi.mock("expo-clipboard", () => ({ setStringAsync: mocks.copy }));
import {
  copyEnrollmentLink,
  shareEnrollmentLink,
  whatsappEnrollment,
  whatsappEnrollmentUrl,
} from "../../src/features/personal/enrollment-sharing";
const url = "http://localhost:3003/cadastro/token-de-teste";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.copy.mockResolvedValue(true);
  mocks.platform.OS = "web";
  vi.stubGlobal("navigator", {});
});
it("copia URL completa e oferece alternativa web", async () => {
  await copyEnrollmentLink(url);
  expect(mocks.copy).toHaveBeenCalledWith(url);
  expect(await shareEnrollmentLink(url)).toContain("Link copiado");
});
it("usa compartilhamento web disponível", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { share });
  await shareEnrollmentLink(url);
  expect(share).toHaveBeenCalledWith(
    expect.objectContaining({ text: expect.stringContaining(url) }),
  );
});
it("abre WhatsApp com mensagem codificada sem enviar automaticamente", async () => {
  await whatsappEnrollment(url);
  expect(mocks.open).toHaveBeenCalledWith(whatsappEnrollmentUrl(url));
  expect(
    new URL(whatsappEnrollmentUrl(url)).searchParams.get("text"),
  ).toContain(url);
});
it.each(["android", "ios"])("compartilha pelo sistema no %s", async (os) => {
  mocks.platform.OS = os;
  await shareEnrollmentLink(url);
  expect(mocks.share).toHaveBeenCalledWith({
    message: expect.stringContaining(url),
  });
});
it("propaga indisponibilidade da cópia para mensagem na interface", async () => {
  mocks.copy.mockResolvedValue(false);
  await expect(copyEnrollmentLink(url)).rejects.toThrow("Cópia indisponível");
});
