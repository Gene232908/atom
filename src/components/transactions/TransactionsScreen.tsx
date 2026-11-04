import { useMemo, useState } from 'react';
import { ChevronLeft, ReceiptText, Search, X } from 'lucide-react';
import { groupByMonth, matchesQuery, type Direction, type Transaction } from '../../lib/transactions';
import { FullScreen } from '../ui/FullScreen';
import { TransactionRow } from './TransactionRow';

interface Props {
  transactions: Transaction[];
  onClose: () => void;
  onOpen: (tx: Transaction) => void;
}

type Filter = 'all' | Direction;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'Received' },
  { key: 'out', label: 'Sent' },
];

/** Every payment, grouped by month, with search and a Received / Sent filter. */
export function TransactionsScreen({ transactions, onClose, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const shown = useMemo(
    () => transactions.filter((tx) => (filter === 'all' || tx.direction === filter) && matchesQuery(tx, query)),
    [transactions, filter, query],
  );
  const months = useMemo(() => groupByMonth(shown), [shown]);
  const searching = query.trim() !== '' || filter !== 'all';

  return (
    <FullScreen label="Transactions" onClose={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Back"
        className="grid size-9 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-hairline transition active:scale-90"
      >
        <ChevronLeft className="size-5" strokeWidth={2.4} />
      </button>

      <h1 className="mt-3 text-[26px] leading-tight font-bold tracking-tight text-ink">Transactions</h1>
      <p className="mt-0.5 text-[13px] text-muted">
        {shown.length} {shown.length === 1 ? 'payment' : 'payments'}
      </p>

      <div className="sticky top-0 z-10 -mx-4 mt-3 space-y-2.5 bg-canvas/90 px-4 pt-1 pb-3 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <label className="flex h-10 items-center gap-2 rounded-xl bg-fill px-3 focus-within:ring-2 focus-within:ring-accent">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Search name, card, date or amount"
            aria-label="Search transactions"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="grid size-5 shrink-0 place-items-center rounded-full bg-muted/40 text-white"
            >
              <X className="size-3" strokeWidth={3} />
            </button>
          )}
        </label>

        <div role="tablist" aria-label="Filter" className="flex rounded-xl bg-fill p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`h-8 flex-1 rounded-[10px] text-[13px] font-semibold transition ${
                filter === f.key ? 'bg-white text-ink shadow-sm' : 'text-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {months.length === 0 ? (
        <div className="mt-10 flex flex-col items-center px-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-fill text-muted">
            <ReceiptText className="size-6" />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-ink">{searching ? 'No matching payments' : 'No payments yet'}</p>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            {searching ? 'Try another name, date or amount.' : 'Payments you confirm or make will show up here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {months.map((m) => (
            <section key={m.label}>
              <h2 className="mb-1.5 px-1 text-[13px] font-semibold text-muted">{m.label}</h2>
              <div className="divide-y divide-hairline overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-hairline/80">
                {m.items.map((tx) => (
                  <TransactionRow key={tx.key} tx={tx} onClick={() => onOpen(tx)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </FullScreen>
  );
}
