import { useState } from "react";
import { View } from "react-native";
import { Notice } from "@/components/personal/ui";
import type { ExerciseVideoSource } from "@/features/personal/exercise-video";
export function ExerciseVideo({
  source,
  title,
}: {
  source: ExerciseVideoSource;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      {source.kind === "youtube" ? (
        <iframe
          title={`Vídeo: ${title}`}
          src={source.url}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            minHeight: 200,
            border: 0,
            borderRadius: 10,
            background: "#000",
          }}
        />
      ) : (
        <video
          aria-label={`Vídeo: ${title}`}
          src={source.url}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: 10,
            background: "#000",
          }}
        />
      )}
      {failed && (
        <Notice error>
          Não foi possível carregar o vídeo. Verifique a conexão e o link
          cadastrado.
        </Notice>
      )}
    </View>
  );
}
