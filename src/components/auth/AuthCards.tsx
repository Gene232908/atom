import { storeGradient } from '../../lib/cardTheme';
import { WalletCard } from '../ui/WalletCard';

const DEMO = [
  { store: 'Lazada', amount: '₱2,150.00', label: 'Phone case', rotate: -9, x: -34, y: 10 },
  { store: 'Atome', amount: '₱899.50', label: 'Grocery', rotate: 7, x: 34, y: 2 },
  { store: 'Shopee', amount: '₱1,500.00', label: 'Rubber shoes', rotate: -1, x: 0, y: 38 },
];

/** Fanned example cards shown on the sign-in screen. */
export function AuthCards({ className = '' }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-md ${className}`} aria-hidden>
      <div className="absolute inset-x-0 top-6 mx-auto h-60 w-60 rounded-full bg-[#5e5ce6]/40 blur-[90px]" />
      {DEMO.map((c, i) => (
        <div
          key={c.store}
          className="absolute top-10 left-1/2 w-[270px]"
          style={{ transform: `translateX(calc(-50% + ${c.x}px)) translateY(${c.y}px) rotate(${c.rotate}deg)` }}
        >
          <div className="animate-rise" style={{ animationDelay: `${i * 120}ms` }}>
            <WalletCard seed={c.store} background={storeGradient(c.store, c.store)} className="flex h-[168px] flex-col p-4">
              <p className="text-[12px] font-semibold tracking-[0.14em] uppercase">{c.store}</p>
              <p className="text-[12px] text-white/75">{c.label}</p>
              <div className="mt-auto flex items-end justify-between">
                <p className="text-[20px] font-semibold tabular-nums">{c.amount}</p>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-ink">Pay</span>
              </div>
            </WalletCard>
          </div>
        </div>
      ))}
    </div>
  );
}
