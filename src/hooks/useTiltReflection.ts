import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react';

interface TiltState {
  rotateX: number;
  rotateY: number;
  shineX: number;
  shineY: number;
  shineAngle: number;
  glareOpacity: number;
}

const DEFAULT_STATE: TiltState = {
  rotateX: 0,
  rotateY: 0,
  shineX: 50,
  shineY: 45,
  shineAngle: 125,
  glareOpacity: 0.45,
};

/**
 * High-performance 3D card tilt & Apple Card holographic reflection hook.
 * Features:
 * 1. Mobile Gyroscope / DeviceOrientation with automatic iOS permission request.
 * 2. Mobile Touch Screen Drag / Swipe: user can drag finger directly across the card.
 * 3. Desktop Mouse / Pointer move and tilt.
 * 4. Ambient idle gleam / shimmer so card is continuously vibrant and alive.
 */
export function useTiltReflection(enabled = true) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TiltState>(DEFAULT_STATE);
  const targetRef = useRef<TiltState>(DEFAULT_STATE);
  const rafRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const gyroActiveRef = useRef(false);
  const requestedIosRef = useRef(false);

  // Request iOS 13+ gyroscope permission on first user touch / pointer down
  const maybeRequestIosGyro = () => {
    if (requestedIosRef.current || typeof window === 'undefined') return;
    requestedIosRef.current = true;
    try {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof DOE?.requestPermission === 'function') {
        DOE.requestPermission()
          .then((res) => {
            if (res === 'granted') {
              gyroActiveRef.current = true;
            }
          })
          .catch(() => {});
      } else {
        gyroActiveRef.current = true;
      }
    } catch {
      // ignore
    }
  };

  // Smooth lerp loop (60-120fps) + ambient breathing shimmer when idle
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let t = 0;
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

    const tick = () => {
      if (!mounted) return;
      t += 0.02;

      // When resting (no touch, no tilt), add a subtle ambient shimmer
      if (!isInteractingRef.current && !gyroActiveRef.current) {
        targetRef.current = {
          rotateX: Math.sin(t * 0.7) * 2.5,
          rotateY: Math.cos(t * 0.9) * 3,
          shineX: 50 + Math.sin(t) * 28,
          shineY: 45 + Math.cos(t * 0.8) * 22,
          shineAngle: 120 + Math.sin(t * 0.5) * 35,
          glareOpacity: 0.5 + Math.sin(t * 1.2) * 0.15,
        };
      }

      setState((prev) => {
        const target = targetRef.current;
        const speed = isInteractingRef.current ? 0.22 : 0.08;
        const rx = lerp(prev.rotateX, target.rotateX, speed);
        const ry = lerp(prev.rotateY, target.rotateY, speed);
        const sx = lerp(prev.shineX, target.shineX, speed + 0.04);
        const sy = lerp(prev.shineY, target.shineY, speed + 0.04);
        const sa = lerp(prev.shineAngle, target.shineAngle, speed);
        const go = lerp(prev.glareOpacity, target.glareOpacity, speed + 0.04);

        if (
          Math.abs(rx - target.rotateX) < 0.04 &&
          Math.abs(ry - target.rotateY) < 0.04 &&
          Math.abs(sx - target.shineX) < 0.15 &&
          Math.abs(sy - target.shineY) < 0.15
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

  // Hardware Gyroscope (DeviceOrientation) listener
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (isInteractingRef.current) return;
      if (e.gamma === null && e.beta === null) return;
      gyroActiveRef.current = true;

      const gamma = e.gamma ?? 0; // Left-to-right tilt (-90 to 90)
      const beta = e.beta ?? 45;   // Front-to-back tilt (-180 to 180). Normal phone hold is ~45deg

      // Clamp to natural phone holding angles
      const clampedGamma = Math.max(-40, Math.min(40, gamma));
      const clampedBeta = Math.max(10, Math.min(80, beta)) - 45; // Center around 45deg hold

      // Map to 3D rotation
      const rotateY = (clampedGamma / 40) * 16;
      const rotateX = -(clampedBeta / 35) * 14;

      // Map to glossy reflection coordinates
      const shineX = 50 + (clampedGamma / 40) * 45;
      const shineY = 50 + (clampedBeta / 35) * 45;
      const shineAngle = 125 + (clampedGamma / 40) * 45;

      targetRef.current = {
        rotateX,
        rotateY,
        shineX,
        shineY,
        shineAngle,
        glareOpacity: 0.72,
      };
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [enabled]);

  // Update target from element client coordinates (for both mouse and finger touch)
  const updateFromCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const px = Math.max(0, Math.min(1, x / rect.width));
    const py = Math.max(0, Math.min(1, y / rect.height));

    const rotateX = (0.5 - py) * 22;
    const rotateY = (px - 0.5) * 24;
    const shineX = px * 100;
    const shineY = py * 100;
    const shineAngle = 90 + px * 90;

    targetRef.current = {
      rotateX,
      rotateY,
      shineX,
      shineY,
      shineAngle,
      glareOpacity: 0.9,
    };
  };

  // Pointer / Mouse events
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    maybeRequestIosGyro();
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
    targetRef.current = DEFAULT_STATE;
  };

  // Touch Screen events (for mobile swiping/dragging directly across the card)
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    maybeRequestIosGyro();
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
    targetRef.current = DEFAULT_STATE;
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
    touchAction: 'none', // Allows fluid swiping & dragging across the card on touchscreens
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
