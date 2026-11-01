import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const slides = [
  {
    eyebrow: "ACOMPANHAMENTO DE VERDADE",
    title: "Cada presença.\nUma conquista.",
    description: "O seu próximo passo começa aqui.",
  },
  {
    eyebrow: "TUDO CONECTADO",
    title: "Alunos, treinos\ne avaliações.",
    description: "No mesmo lugar. Mais perto de quem acompanha você.",
  },
  {
    eyebrow: "CADA PASSO CONTA",
    title: "Evolução que vai\nalém dos números.",
    description: "Seu ritmo, sua trajetória, suas conquistas.",
  },
];

export function WelcomeCarousel() {
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === "active");

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const app = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);

  useEffect(() => {
    if (!width || paused || reduceMotion || !foreground) return;
    const timer = setTimeout(() => {
      const next = (active + 1) % slides.length;
      scroll.current?.scrollTo({ x: next * width, animated: true });
    }, 5500);
    return () => clearTimeout(timer);
  }, [active, width, paused, reduceMotion, foreground]);

  useEffect(() => {
    scroll.current?.scrollTo({ x: active * width, animated: false });
    // Manter o slide atual ao mudar a largura, sem interromper o deslize manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  function select(index: number) {
    setPaused(true);
    scroll.current?.scrollTo({ x: index * width, animated: !reduceMotion });
  }

  return (
    <View style={styles.carousel} accessibilityLabel="Apresentação do Tá Pago">
      <View style={styles.accent} />
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onScrollBeginDrag={() => setPaused(true)}
        onScroll={(event) => {
          if (width) setActive(Math.max(0, Math.min(slides.length - 1,
            Math.round(event.nativeEvent.contentOffset.x / width))));
        }}
        scrollEventThrottle={32}
      >
        {slides.map((slide, index) => (
          <View
            key={slide.eyebrow}
            style={[styles.slide, { width: width || 280 }]}
            aria-hidden={active !== index}
            accessibilityElementsHidden={active !== index}
            importantForAccessibility={active === index ? "auto" : "no-hide-descendants"}
          >
            <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
            <Text accessibilityRole="header" style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.controls}>
        <View style={styles.dots} accessibilityRole="tablist" accessibilityLabel="Mensagens de apresentação">
          {slides.map((slide, index) => (
            <Pressable
              key={slide.eyebrow}
              accessibilityRole="tab"
              accessibilityLabel={`Mostrar mensagem ${index + 1} de ${slides.length}`}
              accessibilityState={{ selected: active === index }}
              aria-selected={active === index}
              onPress={() => select(index)}
              onFocus={() => setPaused(true)}
              style={styles.dotTarget}
            >
              <View style={[styles.dot, active === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
        {!reduceMotion && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? "Retomar carrossel" : "Pausar carrossel"}
            onPress={() => setPaused((value) => !value)}
            style={styles.pause}
          >
            <Text style={styles.pauseText}>{paused ? "Reproduzir" : "Pausar"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carousel: { backgroundColor: "#0B0B0D", borderRadius: 24, overflow: "hidden", paddingTop: 28 },
  accent: { height: 4, width: 48, borderRadius: 2, backgroundColor: "#CF1026", marginLeft: 24, marginBottom: 24 },
  slide: { paddingHorizontal: 24, paddingBottom: 12, minHeight: 244, justifyContent: "center" },
  eyebrow: { fontSize: 10, fontWeight: "700", color: "#FF7182", letterSpacing: 1.5 },
  title: { fontSize: 32, lineHeight: 39, fontWeight: "800", color: "#FFFFFF", marginVertical: 16 },
  description: { color: "#B5B5BF", fontSize: 15, lineHeight: 24 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 12 },
  dots: { flexDirection: "row" },
  dotTarget: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#686872" },
  dotActive: { width: 24, backgroundColor: "#F13B52" },
  pause: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  pauseText: { color: "#B5B5BF", fontSize: 12 },
});
