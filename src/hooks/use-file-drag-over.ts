import { useCallback, useRef, useState, type RefObject } from "react";

function isFileDragEvent(event: React.DragEvent) {
  return event.dataTransfer.types.includes("Files");
}

export function useFileDragOver(
  containerRef: RefObject<HTMLElement | null>,
  options?: { onFileDragStart?: () => void }
) {
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const depthRef = useRef(0);
  const onFileDragStart = options?.onFileDragStart;

  const clearFileDragOver = useCallback(() => {
    depthRef.current = 0;
    setIsFileDragOver(false);
  }, []);

  const onDragEnter = useCallback(
    (event: React.DragEvent) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      depthRef.current += 1;
      if (depthRef.current === 1) {
        setIsFileDragOver(true);
        onFileDragStart?.();
      }
    },
    [onFileDragStart]
  );

  const onDragLeave = useCallback(
    (event: React.DragEvent) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();

      const container = containerRef.current;
      if (
        container &&
        event.relatedTarget instanceof Node &&
        container.contains(event.relatedTarget)
      ) {
        return;
      }

      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) {
        setIsFileDragOver(false);
      }
    },
    [containerRef]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!isFileDragEvent(event)) return;
    event.preventDefault();
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
      clearFileDragOver();
    },
    [clearFileDragOver]
  );

  const onDragEnd = useCallback(() => {
    clearFileDragOver();
  }, [clearFileDragOver]);

  return {
    isFileDragOver,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onDragEnd,
    clearFileDragOver,
  };
}
