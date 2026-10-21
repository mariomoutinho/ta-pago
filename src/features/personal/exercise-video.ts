export type ExerciseVideoSource = { kind: "youtube" | "file"; url: string };
/** Converte somente hosts/formatos conhecidos; nunca incorpora páginas arbitrárias. */
export function exerciseVideoSource(value: string): ExerciseVideoSource | null {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (["youtu.be", "www.youtu.be"].includes(host))
      id = url.pathname.split("/")[1];
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      const parts = url.pathname.split("/");
      id =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : ["embed", "shorts", "live"].includes(parts[1])
            ? parts[2]
            : null;
    }
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return {
        kind: "youtube",
        url: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`,
      };
    }
    if (/\.(mp4|webm|ogv|m4v|mov)$/i.test(url.pathname))
      return { kind: "file", url: url.href };
    return null;
  } catch {
    return null;
  }
}
