import { useEffect, useRef, type ReactNode } from "react";
import { ScrollView, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/personal/auth";
import { ProfessionalLayout } from "../studio/professional-layout";
import { StudentLayout } from "../student/layout";
import { Studio } from "@/constants/studio";
export { Brand } from "./brand";
export function PersonalShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const t = useTheme();
  if (!user) return <View style={{ flex: 1, backgroundColor: t.backgroundElement }}>{children}</View>;
  if (user.role === "personal") return <ProfessionalLayout>{children}</ProfessionalLayout>;
  return <StudentLayout>{children}</StudentLayout>;
}

export function Page({
  children,
  resetKey,
  contentStyle,
}: {
  children: ReactNode;
  resetKey?: string | number;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [resetKey]);
  const { width } = useWindowDimensions();
  const { user } = useSession();
  const professional = user?.role === "personal";
  const t = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: t.canvas ?? t.backgroundElement }}
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{
        padding: width < 600 ? 20 : professional ? 48 : 32,
        paddingTop: professional && width >= 1000 ? 56 : width < 600 ? 24 : 32,
        paddingBottom: 60,
        width: "100%",
        maxWidth: professional ? Studio.contentWidth : 1240,
        alignSelf: "center",
        flexGrow: 1,
      }, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}
