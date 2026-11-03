import { useEffect, useRef, useState, type CSSProperties } from 'react';

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
  shineY: 50,
  shineAngle: 125,
  glareOpacity: 0.35,
};

/**
 * High-performance hook for 3D card tilt and holographic reflection.
 * Responds to:
 * 1. Mobile Gyroscope / DeviceOrientation (tilting phone left/right/up/down)
 * 2. Pointer / Mouse Movement (hovering / dragging over card)
 * 3. Touch Drag (sliding finger across the card)
 * 4. Ambient idle gleam when resting
 */
export function useTiltReflection(enabled = true) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TiltState>(DEFAULT_STATE);
  const targetRef = useRef<TiltState>(DEFAULT_STATE);
  const rafRef = useRef<number | null>(null);
  const activePointerRef = useRef(false);

  // Smooth lerp loop for 60fps buttery animations
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
        const go = lerp(prev.glareOpacity, target.glareOpacity, 0.14);

        // Check if movement is negligible to save re-renders
        if (
          Math.abs(rx - target.rotateX) < 0.05 &&
          Math.abs(ry - target.rotateY) < 0.05 &&
          Math.abs(sx - target.shineX) < 0.2 &&
          Math.abs(sy - target.shineY) < 0.2
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

  // Device orientation / Gyroscope listener
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // If user is actively touching or hovering with mouse, let pointer take priority
      if (activePointerRef.current) return;

      const gamma = e.gamma ?? 0; // Left-to-right tilt (-90 to 90)
      const beta = e.beta ?? 45;   // Front-to-back tilt (-180 to 180). Normal phone hold is ~45deg

      // Clamp values to natural phone viewing range
      const clampedGamma = Math.max(-35, Math.min(35, gamma));
      const clampedBeta = Math.max(15, Math.min(75, beta)) - 45; // Center around 45deg hold

      // Map to card rotation (degrees)
      const rotateY = (clampedGamma / 35) * 12;
      const rotateX = -(clampedBeta / 30) * 10;

      // Map to specular shine position (0% - 100%)
      const shineX = 50 + (clampedGamma / 35) * 42;
      const shineY = 50 + (clampedBeta / 30) * 42;
      const shineAngle = 125 + (clampedGamma / 35) * 35;

      targetRef.current = {
        rotateX,
        rotateY,
        shineX,
        shineY,
        shineAngle,
        glareOpacity: 0.55,
      };
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [enabled]);

  // Pointer / Mouse move handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !containerRef.current) return;
    activePointerRef.current = true;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = Math.max(0, Math.min(1, x / rect.width));
    const py = Math.max(0, Math.min(1, y / rect.height));

    const rotateX = (0.5 - py) * 16;
    const rotateY = (px - 0.5) * 18;
    const shineX = px * 100;
    const shineY = py * 100;
    const shineAngle = 100 + px * 50;

    targetRef.current = {
      rotateX,
      rotateY,
      shineX,
      shineY,
      shineAngle,
      glareOpacity: 0.65,
    };
  };

  const handlePointerLeave = () => {
    activePointerRef.current = false;
    targetRef.current = DEFAULT_STATE;
  };

  const style: CSSProperties = {
    // Custom CSS properties for the card
    ['--rx' as string]: `${state.rotateX}deg`,
    ['--ry' as string]: `${state.rotateY}deg`,
    ['--shine-x' as string]: `${state.shineX}%`,
    ['--shine-y' as string]: `${state.shineY}%`,
    ['--shine-angle' as string]: `${state.shineAngle}deg`,
    ['--glare-opacity' as string]: state.glareOpacity,
    transform: `perspective(1000px) rotateX(${state.rotateX}deg) rotateY(${state.rotateY}deg)`,
    transformStyle: 'preserve-3d',
    transition: activePointerRef.current ? 'none' : 'transform 0.4s ease-out',
  };

  return {
    ref: containerRef,
    style,
    state,
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
  };
}
