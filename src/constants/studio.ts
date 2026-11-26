import { Colors } from "./theme";

// Tokens da área profissional. O tema e o layout do aluno continuam independentes.
export const StudioColors = {
  dark: { ...Colors.dark, text: "#F5F5F7", textSecondary: "#A3A3AD", background: "#141417", backgroundElement: "#1C1C21", backgroundSelected: "#24242B", border: "#28282E", accent: "#FF3655", accentSoft: "#32151E", canvas: "#08080A", sidebar: "#101013", subtle: "#686871" },
  light: { ...Colors.light, text: "#19191F", textSecondary: "#686872", background: "#FFFFFF", backgroundElement: "#F1F1F5", backgroundSelected: "#E8E8EF", border: "#E5E5EB", accent: "#D4142C", accentSoft: "#FFF0F2", canvas: "#F7F7FA", sidebar: "#FFFFFF", subtle: "#82828D" },
} as const;
export const Studio = { sidebar: 244, collapsedSidebar: 76, header: 88, breakpoint: 1000, contentWidth: 1120, radius: 16, iconSize: 20, strokeWidth: 1.75, transitionMs: 180 } as const;
