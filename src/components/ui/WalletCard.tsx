import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cardGradient } from '../../lib/cardTheme';
import { useTiltReflection } from '../../hooks/useTiltReflection';
import { trackCardPosition } from '../../lib/motion';

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
  /** 'off' for cards tucked behind another card. 'wide-only' hides it on phones but keeps it in wide grids. */
  shine?: 'on' | 'off' | 'wide-only';
}

// The card itself never moves. The light reads --tx / --ty (-1..1) and --shine (0 = still, 1 = moving)
// from lib/motion.ts, so the shine only shows while the phone is moving.
// Soft lift plus a hairline edge under the card, so it reads as a thin, real card with a little depth.
const SHADOW = '0 1px 0 rgba(0,0,0,0.1), 0 10px 24px -14px rgba(0,0,0,0.22), 0 1px 2px rgba(0,0,0,0.06)';

// Full sweep from edge to edge. --py is where this card sits on screen, so cards higher or lower
// on the page catch the same light at different spots, like one real lamp above the phone.
const MOVE = 'calc(50% + var(--tx, 0) * 45% + var(--py, 0) * 12%) calc(50% + var(--ty, 0) * 30%)';
const lit = (max: number) => `calc(${max} * var(--shine, 0))`;

// What a still card shows: one faint, wide sheen across the whole card.
const REST: CSSProperties = {
  background:
    'linear-gradient(115deg, transparent 5%, rgba(255,255,255,0.07) 35%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 70%, transparent 95%)',
};

// Wide glossy light: overlay makes the card's own color glow brighter, like light on a real card.
const GLOSS: CSSProperties = {
  background:
    'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.04) 38%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.04) 62%, transparent 70%)',
  backgroundSize: '220% 220%',
  backgroundPosition: MOVE,
  backgroundRepeat: 'no-repeat',
  mixBlendMode: 'overlay',
  opacity: lit(0.75),
};

// Soft white glow on top so the shine is still visible on dark cards.
const SHEEN: CSSProperties = {
  background:
    'linear-gradient(115deg, transparent 34%, rgba(255,255,255,0.02) 42%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 58%, transparent 66%)',
  backgroundSize: '220% 220%',
  backgroundPosition: MOVE,
  backgroundRepeat: 'no-repeat',
  opacity: lit(1),
};

// Soft light from the top-left and a gentle shade at the bottom, for depth.
const DEPTH: CSSProperties = {
  background:
    'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, transparent 45%), linear-gradient(to top, rgba(0,0,0,0.14), transparent 45%)',
};

// Fine diagonal hairlines pressed into the card. Invisible at rest: they only show
// inside the band of light, as a darker shade of the card color with a thin bright edge.
const hairline = (color: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='3' height='3'><path d='M-1 1L1-1M0 3L3 0M2 4L4 2' stroke='${color}' stroke-width='0.45'/></svg>`,
  )}")`;
const LIGHT_MASK =
  'linear-gradient(115deg, transparent 30%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.6) 47%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.6) 53%, rgba(0,0,0,0.25) 60%, transparent 70%)';
const IN_LIGHT: CSSProperties = {
  backgroundSize: '3px 3px',
  maskImage: LIGHT_MASK,
  WebkitMaskImage: LIGHT_MASK,
  maskSize: '220% 220%',
  WebkitMaskSize: '220% 220%',
  maskPosition: MOVE,
  WebkitMaskPosition: MOVE,
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
};
// Multiply with dark lines gives a deeper shade of whatever color the card is.
const GROOVE: CSSProperties = { ...IN_LIGHT, backgroundImage: hairline('black'), opacity: lit(0.12), mixBlendMode: 'multiply' };
// The same lines one pixel over, lit, so each groove catches the light on one side.
const RIDGE: CSSProperties = {
  ...IN_LIGHT,
  backgroundImage: hairline('white'),
  backgroundPosition: '1px 0',
  opacity: lit(0.12),
  mixBlendMode: 'soft-light',
};

// A soft round light that follows the tilt, so the light seems to come from a real source.
const SPOT: CSSProperties = {
  background:
    'radial-gradient(55% 75% at calc(50% - var(--tx, 0) * 55%) calc(30% - var(--ty, 0) * 45% - var(--py, 0) * 25%), rgba(255,255,255,0.1), transparent 72%)',
  mixBlendMode: 'overlay',
  opacity: lit(1),
};

// Glare: the bright core of the reflection as it crosses the card.
const GLINT: CSSProperties = {
  background:
    'linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.15) 46%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.15) 54%, transparent 62%)',
  backgroundSize: '220% 220%',
  backgroundPosition: MOVE,
  backgroundRepeat: 'no-repeat',
  opacity: lit(1),
};

const SHINE_HIDE = { on: '', off: 'hidden', 'wide-only': 'max-sm:hidden' } as const;

/** Glossy, Apple Wallet style card. The shine moves when you tilt your phone. */
export function WalletCard({ seed, background, className = '', style, children, interactive = true, shine = 'on' }: Props) {
  const tilt = useTiltReflection(interactive && shine !== 'off');
  const light = `pointer-events-none absolute inset-0 ${SHINE_HIDE[shine]}`;
  const face = useRef<HTMLDivElement | null>(null);
  useEffect(() => (shine === 'off' || !face.current ? undefined : trackCardPosition(face.current)), [shine]);

  return (
    <div
      ref={tilt.ref}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      className="relative rounded-[22px] select-none [-webkit-touch-callout:none]"
      style={style}
    >
      <div
        ref={face}
        className={`relative isolate flex flex-col overflow-hidden rounded-[22px] text-white select-none ${className}`}
        style={{ backgroundImage: background ?? cardGradient(seed), boxShadow: SHADOW }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={DEPTH} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={REST} />
        <div aria-hidden className={light} style={SPOT} />
        <div aria-hidden className={light} style={GLOSS} />
        <div aria-hidden className={light} style={SHEEN} />
        <div aria-hidden className={light} style={GROOVE} />
        <div aria-hidden className={light} style={RIDGE} />
        <div
          aria-hidden
          className="liquid-rim pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-black/5 ring-inset [--rim:0.45]"
        />
        <div aria-hidden className={`${light} rounded-[inherit]`} style={GLINT} />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col select-none">{children}</div>
      </div>
    </div>
  );
}
