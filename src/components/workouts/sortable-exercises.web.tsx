import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/hooks/use-theme";
export type SortableProps = { ids: string[]; labels?: Record<string, string>; disabled: boolean; reorder: (from: number, to: number) => void; children: (id: string, handle: ReactNode) => ReactNode };
function Row({ id, disabled, keyboardMove, children }: { id: string; disabled: boolean; keyboardMove: (step: number) => void; children: (handle: ReactNode) => ReactNode }) {
  const button = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useRef(false);
  useEffect(() => { if (!disabled && restoreFocus.current) { button.current?.focus({ preventScroll: true }); restoreFocus.current = false; } }, [disabled]);
  const t = useTheme();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? undefined : transition, position: "relative", zIndex: isDragging ? 2 : undefined, outline: isDragging ? '2px solid ' + t.accent : undefined, borderRadius: 18, opacity: isDragging ? .25 : 1 }}>
    {children(<button ref={node => { button.current = node; setActivatorNodeRef(node); }} {...attributes} {...listeners} disabled={disabled} onKeyDown={event => { if (event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); restoreFocus.current = true; keyboardMove(event.key === "ArrowUp" ? -1 : 1); } }} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" aria-label={"Arrastar exercício " + id} style={{ flexShrink: 0, width: 44, height: 44, border: 0, borderRadius: 8, color: t.text, background: t.backgroundElement, fontSize: 22, touchAction: "none", userSelect: "none", cursor: isDragging ? "grabbing" : "grab" }}>☰</button>)}
  </div>;
}
export function SortableExercises({ ids, labels, disabled, reorder, children }: SortableProps) {
  const t = useTheme();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));
  return <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[({ transform }) => ({ ...transform, x: 0 })]} onDragStart={({ active }) => setActiveId(String(active.id))} onDragCancel={() => setActiveId(null)} onDragEnd={({ active, over }) => { setActiveId(null); if (over && active.id !== over.id) reorder(ids.indexOf(String(active.id)), ids.indexOf(String(over.id))); }} accessibility={{ screenReaderInstructions: { draggable: "Use Alt e seta para cima ou para baixo para mover um exercício pelo teclado." } }}>
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>{ids.map(id => <Row key={id} id={id} disabled={disabled} keyboardMove={step => { const from = ids.indexOf(id), to = from + step; if (to >= 0 && to < ids.length) reorder(from, to); }}>{handle => children(id, handle)}</Row>)}</SortableContext>
    {typeof document !== "undefined" && createPortal(<DragOverlay dropAnimation={window.matchMedia("(prefers-reduced-motion: reduce)").matches ? null : { duration: 160, easing: "ease-out" }}>
      {activeId && <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 16, borderRadius: 18, border: "2px solid " + t.accent, background: t.background, color: t.text, boxShadow: "0 10px 32px #0004", cursor: "grabbing", userSelect: "none", whiteSpace: "pre-line", overflowWrap: "anywhere" }}><span aria-hidden="true">☰</span><strong>{labels?.[activeId] ?? "Exercício"}</strong></div>}
    </DragOverlay>, document.body)}
  </DndContext>;
}
