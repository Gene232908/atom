import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { enableMotion, isMotionActive, needsMotionPermission, onMotionChange } from '../lib/motion';

/**
 * Mouse support for laptops: the card follows the cursor.
 * Phones and tablets use the shared motion sensor (see lib/motion.ts) instead,
 * so touch scrolling is never blocked.
 */
export function useTiltReflection(enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!enabled || e.pointerType !== 'mouse' || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      ref.current.style.setProperty('--tx', Math.max(-1, Math.min(1, x)).toFixed(3));
      ref.current.style.setProperty('--ty', Math.max(-1, Math.min(1, y)).toFixed(3));
    },
    [enabled],
  );

  const onPointerLeave = useCallback(() => {
    ref.current?.style.removeProperty('--tx');
    ref.current?.style.removeProperty('--ty');
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}

/** For the "Turn on card shine" button on iPhone and iPad. */
export function useMotionPrompt() {
  const [active, setActive] = useState(isMotionActive);
  useEffect(() => onMotionChange(setActive), []);
  const show = needsMotionPermission() && !active;
  return { show, enable: enableMotion };
}
