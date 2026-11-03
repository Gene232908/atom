import type { CSSProperties, ReactNode } from 'react';
import { cardGradient } from '../../lib/cardTheme';

interface Props {
  seed: string;
  /** Use a ready-made background instead of the seed color. */
  background?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** A glossy, Apple Wallet / ATM style card. */
export function WalletCard({ seed, background, className = '', style, children }: Props) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-[22px] text-white shadow-[0_14px_34px_-14px_rgba(0,0,0,0.55)] ${className}`}
      style={{ backgroundImage: background ?? cardGradient(seed), ...style }}
    >
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 -z-10 size-72 rounded-full bg-white/18 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 -z-10 size-64 rounded-full bg-black/25 blur-2xl" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.10)_48%,transparent_62%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-white/12 ring-inset" />
      {children}
    </div>
  );
}
