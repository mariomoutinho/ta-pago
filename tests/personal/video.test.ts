import { expect, it } from "vitest";
import request from "supertest";
import { exerciseVideoSource } from "../../src/features/personal/exercise-video";
import { createApp } from "../../server/app";
import { createDb } from "../../server/db";
it.each([
  "https://www.youtube.com/watch?v=M7lc1UVf-VE&feature=shared",
  "https://youtu.be/M7lc1UVf-VE?si=ignored",
  "https://m.youtube.com/shorts/M7lc1UVf-VE",
  "https://www.youtube.com/embed/M7lc1UVf-VE",
  "https://youtube.com/live/M7lc1UVf-VE",
])("incorpora link YouTube %s", (url) => {
  expect(exerciseVideoSource(url)).toEqual({
    kind: "youtube",
    url: "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1&rel=0",
  });
});
it("reconhece vídeo direto e mantém a query de acesso", () => {
  expect(
    exerciseVideoSource("https://example.com/demo.MP4?download=1"),
  ).toEqual({ kind: "file", url: "https://example.com/demo.MP4?download=1" });
});
it.each([
  "",
  "javascript:alert(1)",
  "https://youtube.com.evil.example/watch?v=M7lc1UVf-VE",
  "https://youtube.com/watch?v=invalid",
  "https://youtube.com/watch?v=%22%3E%3Cscript%3E",
  "https://user:pass@example.com/demo.mp4",
  "https://example.com/page",
])("não incorpora URL não suportada %s", (url) => {
  expect(exerciseVideoSource(url)).toBeNull();
});
it("CSP permite o player e mantém restrição de frames", async () => {
  const db = createDb("file::memory:");
  try {
    const result = await request(createApp(db)).get("/");
    expect(result.headers["content-security-policy"]).toContain(
      "frame-src 'self' https://www.youtube-nocookie.com;",
    );
    expect(result.headers["content-security-policy"]).toContain(
      "media-src 'self' https: http:",
    );
  } finally {
    await db.$disconnect();
  }
});
