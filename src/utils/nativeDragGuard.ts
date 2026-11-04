/**
 * Chrome starts a native HTML5 drag for any <a> or <img> (and selected text)
 * once the pointer moves a few px while the button is down. On Linux/X11 that
 * drag runs in a nested browser event loop with a pointer+keyboard grab. If the
 * source node is removed mid-drag (React re-rendering nav links on route change)
 * Chrome can stay in that grab: clicks and F12 stop working, :hover sticks,
 * while wheel scroll and JS timers keep going. Esc releases it.
 *
 * We never rely on native drag except where an element opts in with
 * `draggable="true"` (MUI DataGrid column reorder). dnd-kit and react-toastify
 * use pointer events, so they are unaffected.
 */
export function shouldAllowNativeDrag(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('[draggable="true"]') !== null;
}

export function installNativeDragGuard(doc: Document = document): () => void {
  const onDragStart = (event: DragEvent) => {
    if (shouldAllowNativeDrag(event.target)) return;
    event.preventDefault();
  };
  doc.addEventListener("dragstart", onDragStart, true);
  return () => doc.removeEventListener("dragstart", onDragStart, true);
}
