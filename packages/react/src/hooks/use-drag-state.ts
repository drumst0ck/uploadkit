import { useState, useCallback } from 'react';

/**
 * useDragState — tracks drag-over state using an integer counter.
 *
 * Why counter instead of boolean:
 * When dragging over child elements, the browser fires dragenter on the child
 * and dragleave on the parent simultaneously. A boolean would flicker to false.
 * Incrementing on enter and decrementing on leave keeps the state stable
 * across the entire subtree. (Pattern 3 from RESEARCH.md.)
 *
 * @param onFiles - Callback receiving accepted File[] on drop
 */
export function useDragState(onFiles: (files: File[]) => void) {
  const [counter, setCounter] = useState(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setCounter((c) => c + 1);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setCounter((c) => Math.max(0, c - 1));
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    // Must preventDefault to allow the drop event to fire
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setCounter(0);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFiles(files);
      }
    },
    [onFiles],
  );

  return {
    isDragging: counter > 0,
    handlers: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
}
