import { useEffect, useRef } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import Trash2 from "lucide-react-native/icons/trash-2";
import Copy from "lucide-react-native/icons/copy";
import CopyPlus from "lucide-react-native/icons/copy-plus";
import FolderInput from "lucide-react-native/icons/folder-input";
import { useTheme } from "@/hooks/use-theme";
import { Label } from "../personal/ui";
import { IconButton, studioWebProps } from "./controls";
import { StudioIcon } from "./icons";

export function DropdownMenu({ label, open, setOpen, remove, clone, duplicate, move }: { label: string; open: boolean; setOpen: (value: boolean) => void; remove: () => void; clone: () => void; duplicate: () => void; move: () => void }) {
  const t = useTheme(), { width, height } = useWindowDimensions();
  const anchor = useRef<View>(null), action = useRef<View>(null);
  const position = useRef({ left: width - 232, top: 80 });
  useEffect(() => { if (open) { const timer = setTimeout(() => action.current?.focus(), 30); return () => clearTimeout(timer); } }, [open]);
  return <View ref={anchor} collapsable={false}>
    <IconButton label={`Ações do treino ${label}`} expanded={open} onPress={() => {
      anchor.current?.measureInWindow((x, y, _w, h) => { position.current = { left: Math.max(12, Math.min(x - 156, width - 224)), top: Math.max(12, Math.min(y + h + 8, height - 208)) }; setOpen(!open); });
    }}><StudioIcon name="more" /></IconButton>
    {open && <Modal visible transparent animationType="none" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Fechar ações do treino" accessibilityRole="button" onPress={() => setOpen(false)} style={{ position: "absolute", inset: 0 }} />
        <View accessibilityRole="menu" accessibilityViewIsModal style={{ position: "absolute", ...position.current, width: 212, padding: 6, borderRadius: 12, backgroundColor: t.background, borderWidth: 1, borderColor: t.border, boxShadow: "0 12px 36px #00000028" }}>
          {[
            { text: "Clonar", icon: CopyPlus, run: clone },
            { text: "Duplicar", icon: Copy, run: duplicate },
            { text: "Trocar de pasta", icon: FolderInput, run: move },
            { text: "Excluir", icon: Trash2, run: remove },
          ].map(({ text, icon: Icon, run }, index) => <Pressable key={text} ref={index === 0 ? action : undefined} {...studioWebProps} accessibilityRole="menuitem" accessibilityLabel={`${text} treino ${label}`} onPress={() => { setOpen(false); run(); }}
            style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, backgroundColor: pressed ? t.accentSoft : "transparent", borderRadius: 8 })}>
            <Icon size={16} color={text === "Excluir" ? t.danger : t.text} strokeWidth={1.75} /><Label size={13}>{text}</Label>
          </Pressable>)}
        </View>
      </View>
    </Modal>}
  </View>;
}
