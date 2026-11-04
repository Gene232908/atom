import { useCallback, useRef, type MouseEvent, type PointerEvent } from 'react';

const HOLD_MS = 500;
const MOVE_LIMIT = 10;

/**
 * Press and hold (phones, tablets) or right-click (mouse) to open options.
 * - After 0.5s the phone gives a small buzz; the options open when the finger is lifted,
 *   so lifting the finger cannot accidentally tap the menu behind it.
 * - Moving the finger (scrolling or swiping) cancels it.
 * - After a long press, the normal tap is ignored so the card does not also open.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const ready = useRef(false);
  const fired = useRef(false);

  const reset = useCallback(() => {
    window.clearTimeout(timer.current);
    start.current = null;
    ready.current = false;
  }, []);

  const open = useCallback(() => {
    fired.current = true;
    reset();
    onLongPress();
  }, [onLongPress, reset]);

  const release = useCallback(() => {
    if (ready.current && !fired.current) open();
    else reset();
  }, [open, reset]);

  return {
    onPointerDown: (e: PointerEvent) => {
      fired.current = false;
      reset();
      if (e.pointerType === 'mouse') return; // mouse uses right-click instead
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        ready.current = true;
        try {
          navigator.vibrate?.(12);
        } catch {
          // Some browsers block vibration. Not important.
        }
      }, HOLD_MS);
    },
    onPointerMove: (e: PointerEvent) => {
      if (!start.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_LIMIT) reset();
    },
    onPointerUp: release,
    onPointerCancel: release,
    onClickCapture: (e: MouseEvent) => {
      if (!fired.current) return;
      e.preventDefault();
      e.stopPropagation();
      fired.current = false;
    },
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault();
      if (start.current) {
        // Finger still down (Android shows this during a long press): open when lifted.
        ready.current = true;
      } else if (!fired.current) {
        open(); // right-click with a mouse
      }
    },
  };
}
