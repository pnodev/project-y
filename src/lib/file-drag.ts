/** Allow file drops to reach child dropzones inside modals (e.g. Radix Dialog). */
export function allowFileDropPropagation(event: React.DragEvent) {
  if (!event.dataTransfer.types.includes("Files")) return;
  event.preventDefault();
}
