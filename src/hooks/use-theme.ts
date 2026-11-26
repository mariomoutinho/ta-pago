/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createContext, useContext } from 'react';

export type ThemeColors = { [K in keyof typeof Colors.light]: string } & { canvas?: string; sidebar?: string; subtle?: string };
export const ThemeOverrideContext = createContext<ThemeColors | null>(null);

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  const override = useContext(ThemeOverrideContext);
  return override ?? Colors[scheme];
}
