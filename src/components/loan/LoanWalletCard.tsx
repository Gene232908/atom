import { CalendarClock, CheckCircle2, ShoppingBag } from 'lucide-react';
import { storeGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { computeLoanStats, formatDueDateReadable } from '../../lib/loanUtils';
import type { Group, Item } from '../../lib/types';
import { WalletCard } from '../ui/WalletCard';

interface Props {
  group: Group;
  item: Item;
  index?: number;
  onOpen: (group: Group, item: Item) => void;
  interactive?: boolean;
}

export function LoanWalletCard({ group, item, index = 0, onOpen, interactive = true }: Props) {
  const stats = computeLoanStats(item);
  const provider = group.name || item.store || 'Personal Loan';
  const last4 = (group.inviteCode || item.id).slice(-4).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onOpen(group, item)}
      className="block w-full animate-rise text-left transition-transform duration-300 select-none hover:-translate-y-1.5 active:scale-[0.98] focus:outline-none"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <WalletCard
        seed={item.id || group.id}
        background={storeGradient(provider, item.id || group.id, group.color || item.color)}
        interactive={interactive}
        className="flex min-h-[195px] sm:min-h-[215px] flex-col p-4 sm:p-5"
      >
        {/* Header: Provider & Due Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-6 sm:size-7 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur">
              <ShoppingBag className="size-3 sm:size-3.5 text-white" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] sm:text-[14px] font-bold tracking-[0.06em] text-white uppercase drop-shadow-sm">
                {provider}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-white/80 leading-tight">
                Personal Loan · {stats.totalTerms} mos
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 text-right">
            {stats.isFullyPaid ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-ok shadow-sm">
                <CheckCircle2 className="size-3 text-ok" />
                Fully Paid
              </span>
            ) : stats.nextDueDate ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-white backdrop-blur">
                <CalendarClock className="size-2.5 sm:size-3" />
                Due {formatDueDateReadable(stats.nextDueDate)}
              </span>
            ) : null}

            <span className="inline-flex items-center rounded-full bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white/90 backdrop-blur">
              {stats.termsLeft} mos left
            </span>
          </div>
        </div>

        {/* Item / Loan Title */}
        <p className="mt-2 sm:mt-2.5 truncate text-[14.5px] sm:text-[16px] font-semibold text-white drop-shadow-sm">
          {item.description}
        </p>

        {/* Amount & Monthly Breakdown */}
        <div className="mt-auto pt-2 sm:pt-2.5">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9.5px] sm:text-[10px] font-semibold tracking-wider text-white/70 uppercase">
                {stats.isFullyPaid ? 'Completed' : 'Remaining Balance'}
              </p>
              <p className="truncate text-[21px] sm:text-[25px] leading-tight font-bold tracking-tight text-white drop-shadow tabular-nums">
                {formatMoney(stats.remainingCents)}
              </p>
            </div>

            {stats.monthlyCents > 0 && (
              <div className="shrink-0 text-right">
                <p className="text-[9.5px] sm:text-[10px] font-semibold tracking-wider text-white/70 uppercase">Cut-off</p>
                <p className="text-[13px] sm:text-[15px] font-bold text-white tabular-nums">
                  {formatMoney(stats.monthlyCents)}
                  <span className="text-[10px] sm:text-[11px] font-normal text-white/80">/mo</span>
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar & Subtext */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-white/85">
              <span className="truncate">
                {stats.isFullyPaid
                  ? `All ${stats.totalTerms} months paid in full ✓`
                  : `${stats.currentPaidTerms} of ${stats.totalTerms} months paid (${stats.progressPercent}%)`}
              </span>
              <span className="shrink-0 ml-1.5 font-semibold text-white">
                {formatMoney(stats.totalPaidCents)} paid
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Bottom Card Footer */}
          <div className="mt-2 flex items-center justify-between text-white/70">
            <span className="font-mono text-[11px] sm:text-[12px] tracking-[0.14em]">•••• {last4}</span>
            <span className="text-[10px] sm:text-[11px] text-white/80 font-medium">
              Tap for history & payments →
            </span>
          </div>
        </div>
      </WalletCard>
    </button>
  );
}
