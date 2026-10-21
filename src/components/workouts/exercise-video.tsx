import { useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { Notice } from "@/components/personal/ui";
import { apiBase } from "@/features/personal/api";
import type { ExerciseVideoSource } from "@/features/personal/exercise-video";
export function ExerciseVideo({
  source,
  title,
}: {
  source: ExerciseVideoSource;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  const origin = new URL(apiBase()).origin;
  const escaped = source.url
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const element =
    source.kind === "youtube"
      ? `<iframe src="${escaped}" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
      : `<video src="${escaped}" controls playsinline preload="metadata"></video>`;
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          width: "100%",
          aspectRatio: 16 / 9,
          minHeight: 200,
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        <WebView
          accessibilityLabel={`Vídeo: ${title}`}
          source={{
            html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe,video{width:100%;height:100%;border:0}</style></head><body>${element}</body></html>`,
            baseUrl: `${origin}/`,
          }}
          originWhitelist={["*"]}
          onShouldStartLoadWithRequest={(request) =>
            request.url === "about:blank" ||
            request.url === `${origin}/` ||
            request.url === source.url
          }
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          onError={() => setFailed(true)}
          onHttpError={() => setFailed(true)}
          style={{ flex: 1, backgroundColor: "#000" }}
        />
      </View>
      {failed && (
        <Notice error>
          Não foi possível carregar o vídeo. Verifique a conexão e o link
          cadastrado.
        </Notice>
      )}
    </View>
  );
}
