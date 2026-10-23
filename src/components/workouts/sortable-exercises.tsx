import { useRef, useState, type ReactNode } from "react";
import { PanResponder, Pressable, View } from "react-native";
import { Label } from "@/components/personal/ui";
import { useTheme } from "@/hooks/use-theme";
export type SortableProps = { ids: string[]; disabled: boolean; reorder: (from: number, to: number) => void; children: (id: string, handle: ReactNode) => ReactNode };
type Box = { y: number; height: number };
function Handle({ id, disabled, begin, move, end }: { id: string; disabled: boolean; begin: () => void; move: (dy: number) => void; end: (cancel: boolean) => void }) {
  const armed = useRef(false), dragging = useRef(false);
  const latest = useRef({ disabled, begin, move, end }); latest.current = { disabled, begin, move, end };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: () => { if (armed.current && !latest.current.disabled) { dragging.current = true; return true; } return false; },
    onPanResponderGrant: () => { dragging.current = true; latest.current.begin(); },
    onPanResponderMove: (_, gesture) => latest.current.move(gesture.dy),
    onPanResponderRelease: () => { latest.current.end(false); dragging.current = false; armed.current = false; },
    onPanResponderTerminate: () => { latest.current.end(true); dragging.current = false; armed.current = false; },
    onPanResponderTerminationRequest: () => false,
  })).current;
  return <View {...pan.panHandlers}><Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={"Arrastar exercício " + id} delayLongPress={200} onLongPress={() => { armed.current = true; }} onPressOut={() => { if (!dragging.current) armed.current = false; }} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Label size={22}>☰</Label></Pressable></View>;
}
export function SortableExercises({ ids, disabled, reorder, children }: SortableProps) {
  const t = useTheme();
  const positions = useRef<Record<string, Box>>({});
  const gesture = useRef<{ id: string; boxes: Record<string, Box>; target: number } | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  return <View>{(preview ?? ids).map(id => <View key={id} onLayout={event => { positions.current[id] = event.nativeEvent.layout; }} style={{ borderWidth: active === id ? 2 : 0, borderRadius: 18, borderColor: t.accent, opacity: active === id ? .8 : 1 }}>
    {children(id, <Handle id={id} disabled={disabled} begin={() => { gesture.current = { id, boxes: { ...positions.current }, target: ids.indexOf(id) }; setActive(id); }} move={dy => {
      const current = gesture.current, origin = current?.boxes[id]; if (!current || !origin) return;
      const y = origin.y + origin.height / 2 + dy;
      const target = ids.reduce((best, key, index) => { const box = current.boxes[key], previous = current.boxes[ids[best]]; return box && previous && Math.abs(box.y + box.height / 2 - y) < Math.abs(previous.y + previous.height / 2 - y) ? index : best; }, ids.indexOf(id));
      current.target = target;
      const next = ids.filter(key => key !== id); next.splice(target, 0, id); setPreview(next);
    }} end={cancel => { const current = gesture.current; if (current && !cancel) reorder(ids.indexOf(id), current.target); gesture.current = null; setActive(null); setPreview(null); }} />)}
  </View>)}</View>;
}
