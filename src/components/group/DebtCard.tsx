import { CalendarClock, Check, Clock, ShoppingBag } from 'lucide-react';
import { storeGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { dueInfo } from '../../lib/items';
import type { Item } from '../../lib/types';
import { WalletCard } from '../ui/WalletCard';

interface Props {
  item: Item;
  personUid: string;
  onPay: (item: Item) => void;
  onOpen: (item: Item) => void;
}

/** Clean loan card with dynamic tilt reflection */
export function DebtCard({ item, personUid, onPay, onOpen }: Props) {
  const share = item.shares[personUid];
  if (!share) return null;
  const status = share.status;
  const paidCents = share.paidCents ?? (status === 'paid' ? item.splitCents : 0);
  const remainingCents = Math.max(0, item.splitCents - paidCents);
  const due = dueInfo(item.dueDate, status === 'paid');
  const count = Object.keys(item.shares).length;
  const store = item.store.trim();
  const last4 = item.id.slice(-4).toUpperCase();

  const isPartial = paidCents > 0 && status !== 'paid';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(item);
      }}
      className="block cursor-pointer outline-none transition-transform duration-200 select-none active:scale-[0.98]"
    >
      <WalletCard
        seed={item.id}
        background={storeGradient(store, item.id, item.color)}
        interactive={true}
        className={`flex h-[240px] flex-col p-5 sm:h-[250px] ${status === 'paid' ? 'opacity-75 saturate-50' : ''}`}
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur">
              <ShoppingBag className="size-3.5 text-white" />
            </span>
            <p className="min-w-0 truncate text-[14px] font-bold tracking-[0.08em] text-white uppercase drop-shadow-sm">
              {store || 'Card'}
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {status === 'paid' ? (
              <Check className="size-3 text-ok" strokeWidth={3} />
            ) : status === 'claimed' ? (
              <Clock className="size-3 text-warn" strokeWidth={3} />
            ) : isPartial ? (
              <span className="size-1.5 rounded-full bg-accent" />
            ) : (
              <span className="size-1.5 rounded-full bg-bad" />
            )}
            {status === 'paid'
              ? 'Paid'
              : status === 'claimed'
                ? 'Waiting'
                : isPartial
                  ? 'Partial'
                  : 'Unpaid'}
          </span>
        </div>

        <p className="mt-2.5 line-clamp-2 text-[14px] leading-snug font-medium text-white/95 drop-shadow-sm">
          {item.description}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {due && (
            <span
              className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                due.tone === 'slate' ? 'bg-white/15 text-white' : 'bg-white text-bad-ink'
              }`}
            >
              <CalendarClock className="size-3" />
              {due.text}
            </span>
          )}
          {item.billingCycle && (
            <span className="inline-flex w-fit items-center rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur">
              {item.billingCycle}
            </span>
          )}
        </div>

        <div className="mt-auto min-w-0 pt-2">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
                {isPartial ? 'Remaining Balance' : 'Your share'}
              </p>
              <p className="truncate text-[28px] leading-tight font-bold tracking-tight text-white drop-shadow tabular-nums sm:text-[32px]">
                {formatMoney(remainingCents > 0 ? remainingCents : item.splitCents)}
              </p>
            </div>
            <p className="font-mono text-[13px] tracking-[0.2em] text-white/80">
              •••• {last4}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[11px] text-white/75">
              {isPartial
                ? `Paid ${formatMoney(paidCents)} of ${formatMoney(item.splitCents)}`
                : `of ${formatMoney(item.priceCents)}${count > 1 ? ` · split by ${count}` : ''}`}
            </p>
            {status === 'unpaid' && remainingCents > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPay(item);
                }}
                className="h-9 shrink-0 rounded-full bg-white px-5 text-[13px] font-bold text-ink shadow-lg shadow-black/25 transition active:scale-95 hover:bg-white/90"
              >
                Pay now
              </button>
            ) : (
              <span className="shrink-0 rounded-full bg-white/20 px-3.5 py-1 text-[12px] font-semibold backdrop-blur text-white">
                {status === 'paid' ? 'Done ✓' : 'Sent'}
              </span>
            )}
          </div>
        </div>
      </WalletCard>
    </div>
  );
}
