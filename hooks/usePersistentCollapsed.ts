import { useCallback, useState } from 'react';

function getInitialCollapsedValue(storageKey: string, defaultValue: boolean) {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === null) return defaultValue;
    return stored === 'true';
  } catch {
    return defaultValue;
  }
}

export function usePersistentCollapsed(storageKey: string, defaultValue = false) {
  const [collapsed, setCollapsed] = useState<boolean>(() => getInitialCollapsedValue(storageKey, defaultValue));

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next.toString());
      } catch {
        // Ignore storage write failures and keep UI responsive.
      }
      return next;
    });
  }, [storageKey]);

  return { collapsed, setCollapsed, toggleCollapsed };
}
