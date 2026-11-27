import { StudioColors } from "./studio";

export const FocusColors = {
  dark: { ...StudioColors.dark, background: "#101013", backgroundElement: "#141417", accent: "#FF2D55" },
  light: StudioColors.light,
} as const;
export const Focus = { width: 480, padding: 24, header: 88, navigation: 76, calendarRadius: 18 } as const;
