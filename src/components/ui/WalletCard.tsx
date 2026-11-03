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
      onPointerDown={tilt.onPointerDown}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      className="relative select-none touch-manipulation perspective-[1000px] [-webkit-touch-callout:none] [-webkit-user-select:none] rounded-[22px]"
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
        {/* Diagonal metallic brushed shimmer */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(125deg,transparent_20%,rgba(255,255,255,0.08)_45%,transparent_65%)]"
        />

        {/* DYNAMIC HOLOGRAPHIC FOIL LAYER (Reacts to tilting phone and touch drag) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200"
          style={{
            opacity: interactive ? 'var(--glare-opacity, 0.45)' : 0.25,
            background:
              'linear-gradient(var(--shine-angle, 125deg), rgba(255,0,128,0.28) 0%, rgba(0,240,255,0.3) 30%, rgba(255,220,0,0.3) 65%, rgba(160,32,240,0.28) 100%)',
            mixBlendMode: 'color-dodge',
          }}
        />

        {/* DYNAMIC SPECULAR GLARE REFLECTION (Moves with touch drag or phone tilt) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-150"
          style={{
            opacity: interactive ? 'var(--glare-opacity, 0.65)' : 0.35,
            background:
              'radial-gradient(circle 260px at var(--shine-x, 50%) var(--shine-y, 45%), rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.2) 30%, transparent 65%)',
            mixBlendMode: 'overlay',
          }}
        />

        {/* Subtle glassmorphism border without harsh white corner glare */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/10 ring-inset"
        />

        {/* Card content */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col select-none">
          {children}
        </div>
      </div>
    </div>
  );
}
