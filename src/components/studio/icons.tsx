import { Image } from "expo-image";
import { useTheme } from "@/hooks/use-theme";

const assets = {
  more: require("../../../assets/studio/more.svg"),
  dumbbell: require("../../../assets/studio/dumbbell.svg"),
  search: require("../../../assets/studio/search.svg"),
  bell: require("../../../assets/studio/bell.svg"),
  sun: require("../../../assets/studio/sun.svg"),
};
export function StudioIcon({ name, accent = false }: { name: keyof typeof assets; accent?: boolean }) {
  const t = useTheme();
  return <Image source={assets[name]} style={{ width: 20, height: 20 }} contentFit="contain" tintColor={accent ? t.accent : t.textSecondary} accessibilityElementsHidden importantForAccessibility="no" />;
}
