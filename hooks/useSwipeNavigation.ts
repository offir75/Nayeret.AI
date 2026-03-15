import { useRef, useCallback } from 'react';

/**
 * Touch swipe handler for horizontal navigation (left/right).
 * RTL-aware: swipe direction maps to prev/next based on `isRtl`.
 */
export function useSwipeNavigation(onPrev: () => void, onNext: () => void, isRtl: boolean) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) { if (isRtl) onPrev(); else onNext(); }
    else        { if (isRtl) onNext(); else onPrev(); }
  }, [onPrev, onNext, isRtl]);

  return { onTouchStart, onTouchEnd };
}
