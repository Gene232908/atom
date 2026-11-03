import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react';

interface TiltState {
  rotateX: number;
  rotateY: number;
  shineX: number;
  shineY: number;
  shineAngle: number;
  glareOpacity: number;
}

const REST_STATE: TiltState = {
  rotateX: 0,
  rotateY: 0,
  shineX: 50,
  shineY: 50,
  shineAngle: 125,
  glareOpacity: 0.25,
};

// Global tracker for iOS DeviceOrientation permission
let hasRequestedIosPermission = false;

export function requestGyroPermission() {
  if (typeof window === 'undefined' || hasRequestedIosPermission) return;
  hasRequestedIosPermission = true;

  try {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DOE?.requestPermission === 'function') {
      DOE.requestPermission().catch(() => {});
    }
  } catch {
    // ignore
  }
}

/**
 * 3D Card Tilt & Holographic Specular Shine Hook.
 * ONLY reacts when physically tilting the phone (gyroscope) or moving/dragging the card.
 * NO automatic/idle live animation.
 *
 * - Tilting phone left: card tilts left and specular shine glides to the LEFT.
 * - Tilting phone right: card tilts right and specular shine glides to the RIGHT.
 * - Tilting phone up/down: card tilts vertically.
 * - Touching/Swiping on mobile: follows the user's finger directly.
 */
export function useTiltReflection(enabled = true) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TiltState>(REST_STATE);
  const targetRef = useRef<TiltState>(REST_STATE);
  const rafRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);

  // Smooth lerp loop strictly towards physical targets
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

    const tick = () => {
      if (!mounted) return;

      setState((prev) => {
        const target = targetRef.current;
        const speed = isInteractingRef.current ? 0.25 : 0.12;

        const rx = lerp(prev.rotateX, target.rotateX, speed);
        const ry = lerp(prev.rotateY, target.rotateY, speed);
        const sx = lerp(prev.shineX, target.shineX, speed + 0.04);
        const sy = lerp(prev.shineY, target.shineY, speed + 0.04);
        const sa = lerp(prev.shineAngle, target.shineAngle, speed);
        const go = lerp(prev.glareOpacity, target.glareOpacity, speed);

        if (
          Math.abs(rx - target.rotateX) < 0.03 &&
          Math.abs(ry - target.rotateY) < 0.03 &&
          Math.abs(sx - target.shineX) < 0.1 &&
          Math.abs(sy - target.shineY) < 0.1
        ) {
          return prev;
        }

        return {
          rotateX: Math.round(rx * 100) / 100,
          rotateY: Math.round(ry * 100) / 100,
          shineX: Math.round(sx * 10) / 10,
          shineY: Math.round(sy * 10) / 10,
          shineAngle: Math.round(sa),
          glareOpacity: Math.round(go * 100) / 100,
        };
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  // Physical Phone Tilt (Gyroscope / DeviceOrientation)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // If user is directly dragging on screen with finger, finger takes priority
      if (isInteractingRef.current) return;
      if (e.gamma === null && e.beta === null) return;

      const gamma = e.gamma ?? 0; // Left (-90) to Right (+90)
      const beta = e.beta ?? 45;   // Normal portrait phone hold is ~45deg

      // Clamp to natural phone holding angles
      const clampedGamma = Math.max(-45, Math.min(45, gamma));
      const clampedBeta = Math.max(10, Math.min(80, beta)) - 45;

      // Tilting left (negative gamma) -> shine moves left (lower X%), tilts left
      // Tilting right (positive gamma) -> shine moves right (higher X%), tilts right
      const ratioX = clampedGamma / 45; // -1 (full left) to +1 (full right)
      const ratioY = clampedBeta / 35;  // -1 to +1

      const rotateY = ratioX * 16;
      const rotateX = -ratioY * 14;

      const shineX = 50 + ratioX * 45; // 5% to 95%
      const shineY = 50 + ratioY * 45; // 5% to 95%
      const shineAngle = 125 + ratioX * 45;
      const glareOpacity = 0.35 + Math.min(0.5, (Math.abs(ratioX) + Math.abs(ratioY)) * 0.4);

      targetRef.current = {
        rotateX,
        rotateY,
        shineX,
        shineY,
        shineAngle,
        glareOpacity,
      };
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    // Also listen to deviceorientationabsolute if available
    window.addEventListener('deviceorientationabsolute' as unknown as keyof WindowEventMap, handleOrientation as EventListener, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('deviceorientationabsolute' as unknown as keyof WindowEventMap, handleOrientation as EventListener, true);
    };
  }, [enabled]);

  // Map coordinates from user touch or mouse drag
  const updateFromCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const px = Math.max(0, Math.min(1, x / rect.width));
    const py = Math.max(0, Math.min(1, y / rect.height));

    const rotateX = (0.5 - py) * 20;
    const rotateY = (px - 0.5) * 22;
    const shineX = px * 100;
    const shineY = py * 100;
    const shineAngle = 90 + px * 90;

    targetRef.current = {
      rotateX,
      rotateY,
      shineX,
      shineY,
      shineAngle,
      glareOpacity: 0.85,
    };
  };

  // Pointer & Touch handlers
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    requestGyroPermission();
    isInteractingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateFromCoords(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || !isInteractingRef.current) return;
    updateFromCoords(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    isInteractingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    targetRef.current = REST_STATE;
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    requestGyroPermission();
    isInteractingRef.current = true;
    if (e.touches[0]) {
      updateFromCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!enabled || !isInteractingRef.current) return;
    if (e.touches[0]) {
      updateFromCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchEnd = () => {
    isInteractingRef.current = false;
    targetRef.current = REST_STATE;
  };

  const style: CSSProperties = {
    ['--rx' as string]: `${state.rotateX}deg`,
    ['--ry' as string]: `${state.rotateY}deg`,
    ['--shine-x' as string]: `${state.shineX}%`,
    ['--shine-y' as string]: `${state.shineY}%`,
    ['--shine-angle' as string]: `${state.shineAngle}deg`,
    ['--glare-opacity' as string]: state.glareOpacity,
    transform: `perspective(1000px) rotateX(${state.rotateX}deg) rotateY(${state.rotateY}deg)`,
    transformStyle: 'preserve-3d',
    willChange: 'transform',
    touchAction: 'none',
  };

  return {
    ref: containerRef,
    style,
    state,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
  };
}
