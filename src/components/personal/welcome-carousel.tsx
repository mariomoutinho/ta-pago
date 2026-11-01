import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const compact = screenWidth < 700;
  const short = compact && screenHeight < 740;
  const smallPhone = compact && screenHeight < 620;
  const offset = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const [foreground, setForeground] = useState(AppState.currentState === "active");

  useEffect(() => {
    const app = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => app.remove();
  }, []);

  useEffect(() => {
    if (!width || !foreground) return;
    const timer = setInterval(() => {
      setActive((index) => (index + 1) % slides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [width, foreground]);

  useEffect(() => {
    const animation = Animated.timing(offset, {
      toValue: -active * width,
      duration: 650,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [active, width, offset]);

  function select(index: number) {
    setActive(index);
  }

  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 35) {
        setActive((index) => (index + (gesture.dx < 0 ? 1 : slides.length - 1)) % slides.length);
      }
    },
  }), []);

  return (
    <View style={[styles.carousel, compact && styles.compactCarousel, smallPhone && { paddingTop: 8 }]} accessibilityLabel="Apresentação do Tá Pago">
      {!smallPhone && <View style={[styles.accent, compact && styles.compactAccent]} />}
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ overflow: "hidden" }}
        {...swipe.panHandlers}
      >
        <Animated.View style={{ flexDirection: "row", width: (width || 280) * slides.length, transform: [{ translateX: offset }] }}>
        {slides.map((slide, index) => (
          <View
            key={slide.eyebrow}
            style={[styles.slide, compact && styles.compactSlide, { width: width || 280 }]}
            aria-hidden={active !== index}
            accessibilityElementsHidden={active !== index}
            importantForAccessibility={active === index ? "auto" : "no-hide-descendants"}
          >
            {!smallPhone && <Text style={styles.eyebrow}>{slide.eyebrow}</Text>}
            <Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle, smallPhone && styles.smallTitle]}>{slide.title}</Text>
            {!short && <Text style={[styles.description, compact && styles.compactDescription]}>{slide.description}</Text>}
          </View>
        ))}
        </Animated.View>
      </View>
      <View style={[styles.controls, compact && styles.compactControls]}>
        <View style={styles.dots} accessibilityRole="tablist" accessibilityLabel="Mensagens de apresentação">
          {slides.map((slide, index) => (
            <Pressable
              key={slide.eyebrow}
              accessibilityRole="tab"
              accessibilityLabel={`Mostrar mensagem ${index + 1} de ${slides.length}`}
              accessibilityState={{ selected: active === index }}
              aria-selected={active === index}
              onPress={() => select(index)}
              style={styles.dotTarget}
            >
              <View style={[styles.dot, active === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carousel: { backgroundColor: "#0B0B0D", borderRadius: 24, overflow: "hidden", paddingTop: 20 },
  compactCarousel: { paddingTop: 12, borderRadius: 18 },
  accent: { height: 3, width: 40, borderRadius: 2, backgroundColor: "#CF1026", marginLeft: 24, marginBottom: 12 },
  compactAccent: { height: 2, marginLeft: 18, marginBottom: 8 },
  slide: { paddingHorizontal: 24, paddingBottom: 8, minHeight: 158, justifyContent: "center" },
  compactSlide: { paddingHorizontal: 18, minHeight: 0, paddingBottom: 0 },
  eyebrow: { fontSize: 10, fontWeight: "700", color: "#FF7182", letterSpacing: 1.5 },
  title: { fontSize: 32, lineHeight: 39, fontWeight: "800", color: "#FFFFFF", marginVertical: 16 },
  compactTitle: { fontSize: 23, lineHeight: 27, marginVertical: 6 },
  smallTitle: { fontSize: 20, lineHeight: 23, marginVertical: 2 },
  description: { color: "#B5B5BF", fontSize: 15, lineHeight: 24 },
  compactDescription: { fontSize: 12, lineHeight: 17 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 12 },
  compactControls: { paddingHorizontal: 6, paddingBottom: 0 },
  dots: { flexDirection: "row" },
  dotTarget: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#686872" },
  dotActive: { width: 24, backgroundColor: "#F13B52" },
});
