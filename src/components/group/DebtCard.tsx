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

/** ATM style card for one thing you owe, with a Pay now button. */
export function DebtCard({ item, personUid, onPay, onOpen }: Props) {
  const share = item.shares[personUid];
  if (!share) return null;
  const status = share.status;
  const due = dueInfo(item.dueDate, status === 'paid');
  const count = Object.keys(item.shares).length;
  const store = item.store.trim();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(item);
      }}
      className="block cursor-pointer outline-none transition-transform duration-200 active:scale-[0.98]"
    >
      <WalletCard
        seed={item.id}
        background={storeGradient(store, item.id, item.color)}
        className={`flex h-[248px] flex-col p-5 ${status === 'paid' ? 'opacity-80 saturate-50' : ''}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur">
            <ShoppingBag className="size-4" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-bold tracking-[0.12em] uppercase">
            {store || 'Item'}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
            {status === 'paid' ? (
              <Check className="size-3" strokeWidth={3} />
            ) : status === 'claimed' ? (
              <Clock className="size-3" strokeWidth={3} />
            ) : (
              <span className="size-1.5 rounded-full bg-white" />
            )}
            {status === 'paid' ? 'Paid' : status === 'claimed' ? 'Waiting' : 'Unpaid'}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-[15px] leading-snug font-medium text-white/95">{item.description}</p>
        {due && (
          <span
            className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              due.tone === 'slate' ? 'bg-white/15' : 'bg-white text-bad-ink'
            }`}
          >
            <CalendarClock className="size-3" />
            {due.text}
          </span>
        )}

        <div className="mt-auto min-w-0">
          <p className="text-[11px] font-medium text-white/70">Your share</p>
          <p className="truncate text-[30px] leading-tight font-bold tracking-tight tabular-nums">
            {formatMoney(item.splitCents)}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[11px] text-white/75">
              of {formatMoney(item.priceCents)}
              {count > 1 ? ` · split by ${count}` : ''}
            </p>
            {status === 'unpaid' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPay(item);
                }}
                className="h-10 shrink-0 rounded-full bg-white px-5 text-[14px] font-semibold text-ink shadow-lg shadow-black/20 transition active:scale-95"
              >
                Pay now
              </button>
            ) : (
              <span className="shrink-0 rounded-full bg-white/20 px-4 py-2 text-[13px] font-semibold backdrop-blur">
                {status === 'paid' ? 'Done ✓' : 'Sent'}
              </span>
            )}
          </div>
        </div>
      </WalletCard>
    </div>
  );
}
