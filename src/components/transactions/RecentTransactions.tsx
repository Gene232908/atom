import { ReceiptText } from 'lucide-react';
import type { Transaction } from '../../lib/transactions';
import { TransactionRow } from './TransactionRow';

interface Props {
  transactions: Transaction[];
  onOpen: (tx: Transaction) => void;
  onViewAll: () => void;
  limit?: number;
}

/** The latest few payments across all cards, shown under the wallet on phones. */
export function RecentTransactions({ transactions, onOpen, onViewAll, limit = 3 }: Props) {
  const recent = transactions.slice(0, limit);

  return (
    <section aria-label="Recent transactions" className="pt-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-bold tracking-tight text-ink">Recent transactions</h2>
        {transactions.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="-mr-1 rounded-full px-2 py-1 text-[13px] font-semibold text-accent transition active:opacity-60"
          >
            View all
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-hairline/80">
        {recent.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fill text-muted">
              <ReceiptText className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink">No payments yet</p>
              <p className="text-[12px] leading-snug text-muted">Payments you confirm or make will show up here.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {recent.map((tx) => (
              <TransactionRow key={tx.key} tx={tx} onClick={() => onOpen(tx)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
