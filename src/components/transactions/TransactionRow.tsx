import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { firstName } from '../../lib/items';
import { whenLabel, type Transaction } from '../../lib/transactions';

interface Props {
  tx: Transaction;
  onClick: () => void;
  /** More side space, for the laptop dashboard. */
  roomy?: boolean;
}

/** One payment: who, which card, how much, and when. */
export function TransactionRow({ tx, onClick, roomy }: Props) {
  const received = tx.direction === 'in';
  const Icon = received ? ArrowDownLeft : ArrowUpRight;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 py-3 text-left transition active:bg-fill ${
        roomy ? 'px-6 hover:bg-canvas/70' : 'px-4'
      }`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full ${
          received ? 'bg-ok/12 text-ok-ink' : 'bg-fill text-ink/70'
        }`}
      >
        <Icon className="size-[18px]" strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{tx.item.description}</span>
        <span className="block truncate text-[12px] text-muted">
          {received ? 'From' : 'To'} {firstName(tx.otherName)} · {tx.item.group.name}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`block text-[14px] font-semibold tabular-nums ${received ? 'text-ok-ink' : 'text-ink'}`}>
          {received ? '+' : '−'}
          {formatMoney(tx.payment.amountCents)}
        </span>
        <span className="block text-[11.5px] text-muted">{whenLabel(tx.at)}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted/50" />
    </button>
  );
}
