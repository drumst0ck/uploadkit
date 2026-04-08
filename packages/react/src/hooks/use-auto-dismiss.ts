import { useState, useEffect, useCallback } from 'react';

/**
 * useAutoDismiss — manages a list of items that auto-remove after a duration.
 *
 * Each item is given a stable id at add-time. A timeout is set per-item;
 * on unmount all pending timers are cleared to prevent memory leaks.
 *
 * @param duration - Auto-dismiss delay in ms (default 5000)
 * @returns [visibleItems, addItem, removeItem]
 */
export function useAutoDismiss<T extends { id: string }>(
  duration = 5000,
): [T[], (item: T) => void, (id: string) => void] {
  const [items, setItems] = useState<T[]>([]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const addItem = useCallback(
    (item: T) => {
      setItems((prev) => [...prev, item]);
    },
    [],
  );

  // Set up auto-dismiss timer for every item that enters the list
  useEffect(() => {
    if (items.length === 0) return;

    const timers = items.map((item) =>
      setTimeout(() => {
        removeItem(item.id);
      }, duration),
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  // Re-run only when the item ids change, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join(','), duration, removeItem]);

  return [items, addItem, removeItem];
}
