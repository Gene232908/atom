import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

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
 * High-performance 3D Card Tilt & Holographic Specular Shine Hook.
 * - Mobile: Uses phone gyroscope (DeviceOrientation) automatically without intercepting page scroll.
 * - Desktop: Responds to mouse hover smoothly.
 * - Scrolling: 100% natural, never blocks or traps touch scrolling on iPhone or Android.
 */
export function useTiltReflection(enabled = true) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TiltState>(REST_STATE);
  const targetRef = useRef<TiltState>(REST_STATE);
  const rafRef = useRef<number | null>(null);

  // Smooth lerp loop towards target orientation
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

    const tick = () => {
      if (!mounted) return;

      setState((prev) => {
        const target = targetRef.current;
        const rx = lerp(prev.rotateX, target.rotateX, 0.12);
        const ry = lerp(prev.rotateY, target.rotateY, 0.12);
        const sx = lerp(prev.shineX, target.shineX, 0.14);
        const sy = lerp(prev.shineY, target.shineY, 0.14);
        const sa = lerp(prev.shineAngle, target.shineAngle, 0.12);
        const go = lerp(prev.glareOpacity, target.glareOpacity, 0.12);

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

  // Physical Phone Tilt (Gyroscope)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null && e.beta === null) return;

      const gamma = e.gamma ?? 0; // Left (-90) to Right (+90)
      const beta = e.beta ?? 45;   // Normal portrait hold ~45deg

      const clampedGamma = Math.max(-45, Math.min(45, gamma));
      const clampedBeta = Math.max(10, Math.min(80, beta)) - 45;

      const ratioX = clampedGamma / 45; // -1 (tilt left) to +1 (tilt right)
      const ratioY = clampedBeta / 35;  // -1 to +1

      const rotateY = ratioX * 15;
      const rotateX = -ratioY * 12;

      // When tilting left, shine shifts left; when tilting right, shine shifts right
      const shineX = 50 + ratioX * 45;
      const shineY = 50 + ratioY * 45;
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
    window.addEventListener('deviceorientationabsolute' as unknown as keyof WindowEventMap, handleOrientation as EventListener, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('deviceorientationabsolute' as unknown as keyof WindowEventMap, handleOrientation as EventListener, true);
    };
  }, [enabled]);

  // Desktop Mouse Hover (only fires for mouse, NEVER blocks touch scroll)
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || !containerRef.current || e.pointerType === 'touch') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = Math.max(0, Math.min(1, x / rect.width));
    const py = Math.max(0, Math.min(1, y / rect.height));

    const rotateX = (0.5 - py) * 16;
    const rotateY = (px - 0.5) * 18;
    const shineX = px * 100;
    const shineY = py * 100;
    const shineAngle = 90 + px * 90;

    targetRef.current = {
      rotateX,
      rotateY,
      shineX,
      shineY,
      shineAngle,
      glareOpacity: 0.75,
    };
  };

  const onPointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    targetRef.current = REST_STATE;
  };

  const onPointerDown = () => {
    requestGyroPermission();
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
    // DO NOT set touchAction: 'none'! Normal scrolling must always work.
  };

  return {
    ref: containerRef,
    style,
    state,
    onPointerDown,
    onPointerMove,
    onPointerLeave,
  };
}
