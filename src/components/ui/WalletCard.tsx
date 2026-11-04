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

const GLARE: CSSProperties = {
  background:
    'radial-gradient(circle at calc(50% + var(--tx, 0) * 60%) calc(30% + var(--ty, 0) * 60%), rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.08) 26%, transparent 55%)',
  mixBlendMode: 'overlay',
};

const FOIL: CSSProperties = {
  background:
    'linear-gradient(calc(115deg + var(--tx, 0) * 40deg), transparent 18%, rgba(255,105,180,0.55) 32%, rgba(110,220,255,0.55) 44%, rgba(255,236,140,0.55) 56%, rgba(170,120,255,0.5) 66%, transparent 80%)',
  backgroundSize: '260% 260%',
  backgroundPosition: 'calc(50% + var(--tx, 0) * 45%) calc(50% + var(--ty, 0) * 45%)',
  backgroundRepeat: 'no-repeat',
  mixBlendMode: 'color-dodge',
  opacity: 0.2,
};

const BAND: CSSProperties = {
  background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.30) 49%, rgba(255,255,255,0.06) 54%, transparent 60%)',
  backgroundSize: '320% 100%',
  backgroundPosition: 'calc(50% - var(--tx, 0) * 48%) 0',
  backgroundRepeat: 'no-repeat',
  mixBlendMode: 'overlay',
};

const TEXTURE: CSSProperties = {
  background:
    'repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 5px)',
};

const DEPTH: CSSProperties = {
  background:
    'radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.12), transparent 55%), linear-gradient(to top, rgba(0,0,0,0.16), transparent 50%)',
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
        <div aria-hidden className="pointer-events-none absolute inset-0" style={TEXTURE} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={FOIL} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={BAND} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={GLARE} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/12 ring-inset"
        />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col select-none">{children}</div>
      </div>
    </div>
  );
}
