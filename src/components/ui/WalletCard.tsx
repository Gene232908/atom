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
  /** Let the shine follow the mouse on laptops. On phones it always follows the gyroscope. */
  interactive?: boolean;
}

// The card itself never moves. Only the light reads --tx / --ty (-1..1) from lib/motion.ts.
const SHADOW = '0 18px 36px -16px rgba(0,0,0,0.45), 0 4px 10px -4px rgba(0,0,0,0.18)';

const MOVE = 'calc(50% + var(--tx, 0) * 30%) calc(50% + var(--ty, 0) * 25%)';

// Wide glossy light: overlay makes the card's own color glow brighter, like light on a real card.
const GLOSS: CSSProperties = {
  background:
    'linear-gradient(115deg, transparent 26%, rgba(255,255,255,0.25) 38%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.25) 62%, transparent 74%)',
  backgroundSize: '220% 220%',
  backgroundPosition: MOVE,
  backgroundRepeat: 'no-repeat',
  mixBlendMode: 'overlay',
};

// Soft white glow on top so the shine is still visible on dark cards.
const SHEEN: CSSProperties = {
  background:
    'linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.08) 58%, transparent 68%)',
  backgroundSize: '220% 220%',
  backgroundPosition: MOVE,
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
      style={style}
    >
      <div
        className={`relative isolate flex flex-col overflow-hidden rounded-[22px] text-white select-none ${className}`}
        style={{ backgroundImage: background ?? cardGradient(seed), boxShadow: SHADOW }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={DEPTH} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={GLOSS} />
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
