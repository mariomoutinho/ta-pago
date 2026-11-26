import type { ReactNode } from "react";
import { View } from "react-native";
export function LoginForm({ children }: { children: ReactNode; submit: () => void }) { return <View>{children}</View>; }
