import type { CSSProperties, ReactNode } from 'react';
import { cardGradient } from '../../lib/cardTheme';
import { useTiltReflection } from '../../hooks/useTiltReflection';

interface Props {
  seed: string;
  name?: string;
  /** Use a ready-made background instead of the seed color. */
  background?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Enable dynamic 3D tilt and specular reflection when moving phone / mouse */
  interactive?: boolean;
}

/**
 * Clean, glossy Apple Wallet style loan card:
 * - Dynamic 3D tilt from gyroscope (tilting phone) or cursor drag
 * - Holographic foil sheen and specular light reflection
 * - Multi-layer soft card shadow
 * - Strict user-select: none to prevent iPhone select-all loupe
 */
export function WalletCard({
  seed,
  background,
  className = '',
  style,
  children,
  interactive = true,
}: Props) {
  const tilt = useTiltReflection(interactive);

  return (
    <div
      ref={tilt.ref}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      className="relative select-none touch-manipulation perspective-[1000px] [-webkit-touch-callout:none] [-webkit-user-select:none]"
      style={{
        ...style,
        ...(interactive ? tilt.style : {}),
      }}
    >
      <div
        className={`relative isolate flex flex-col overflow-hidden rounded-[22px] text-white apple-card-shadow transition-[filter,transform] duration-200 select-none ${className}`}
        style={{
          backgroundImage: background ?? cardGradient(seed),
        }}
      >
        {/* Ambient atmospheric lighting */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 -z-10 size-64 rounded-full bg-white/20 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 -z-10 size-60 rounded-full bg-black/35 blur-2xl"
        />

        {/* Diagonal metallic brushed shimmer */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(125deg,transparent_20%,rgba(255,255,255,0.12)_45%,transparent_65%)]"
        />

        {/* DYNAMIC HOLOGRAPHIC FOIL LAYER (Reacts to tilting phone) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300"
          style={{
            opacity: interactive ? 'var(--glare-opacity, 0.4)' : 0.2,
            background:
              'linear-gradient(var(--shine-angle, 125deg), rgba(255,0,128,0.2) 0%, rgba(0,240,255,0.22) 30%, rgba(255,220,0,0.22) 65%, rgba(160,32,240,0.2) 100%)',
            mixBlendMode: 'color-dodge',
          }}
        />

        {/* DYNAMIC SPECULAR GLARE REFLECTION (Moves with phone tilt or mouse) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-200"
          style={{
            opacity: interactive ? 'var(--glare-opacity, 0.5)' : 0.25,
            background:
              'radial-gradient(circle 300px at var(--shine-x, 50%) var(--shine-y, 50%), rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.12) 35%, transparent 70%)',
            mixBlendMode: 'overlay',
          }}
        />

        {/* Inner rim lighting (subtle border) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-white/18 ring-inset"
        />

        {/* Card content */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col select-none">
          {children}
        </div>
      </div>
    </div>
  );
}
