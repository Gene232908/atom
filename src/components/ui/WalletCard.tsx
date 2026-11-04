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
  /** Tilt the card in 3D with the phone (or mouse). Light effects always follow the phone. */
  interactive?: boolean;
}

// Every value below reads --tx / --ty (-1..1) written by lib/motion.ts, so it moves with the phone.
const TILT = 'perspective(900px) rotateX(calc(var(--ty, 0) * -6deg)) rotateY(calc(var(--tx, 0) * 8deg))';

const SHADOW =
  'calc(var(--tx, 0) * -10px) calc(16px + var(--ty, 0) * -6px) 34px -12px rgba(0,0,0,0.45), 0 4px 10px -4px rgba(0,0,0,0.18)';

// One wide, soft sheen that glides across the card as the phone tilts. No lines, no spots.
const SHEEN: CSSProperties = {
  background:
    'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.10) 38%, rgba(255,255,255,0.20) 48%, rgba(255,255,255,0.10) 58%, transparent 76%)',
  backgroundSize: '250% 100%',
  backgroundPosition: 'calc(50% - var(--tx, 0) * 45%) 0',
  backgroundRepeat: 'no-repeat',
};

// Soft light from the top-left and a gentle shade at the bottom, for depth.
const DEPTH: CSSProperties = {
  background:
    'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, transparent 45%), linear-gradient(to top, rgba(0,0,0,0.14), transparent 45%)',
};

/** Glossy, Apple Wallet style card. The shine moves when you tilt your phone. */
export function WalletCard({ seed, background, className = '', style, children, interactive = true }: Props) {
  const tilt = useTiltReflection(interactive);

  return (
    <div
      ref={tilt.ref}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      className="relative rounded-[22px] select-none [-webkit-touch-callout:none]"
      style={{ ...style, transform: interactive ? TILT : undefined, willChange: interactive ? 'transform' : undefined }}
    >
      <div
        className={`relative isolate flex flex-col overflow-hidden rounded-[22px] text-white select-none ${className}`}
        style={{ backgroundImage: background ?? cardGradient(seed), boxShadow: SHADOW }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={DEPTH} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={SHEEN} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/12 ring-inset"
        />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col select-none">{children}</div>
      </div>
    </div>
  );
}
