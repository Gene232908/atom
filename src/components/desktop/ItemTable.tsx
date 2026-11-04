import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { effectiveDueDate, rowStatus, shortDue } from '../../lib/itemStatus';
import type { Group, Item } from '../../lib/types';
import { StatusPill } from './Panel';

export interface TableRow {
  item: Item;
  group: Group;
}

interface Props {
  rows: TableRow[];
  uid: string;
  focusUid?: string | null;
  /** Show which card each item belongs to (overview page). */
  showList?: boolean;
  amountLabel: string;
  onOpen: (row: TableRow) => void;
  onPay?: (row: TableRow) => void;
  empty?: ReactNode;
}

const COLS = 'grid grid-cols-[minmax(0,1fr)_110px_120px_120px_56px] items-center gap-4';
const DUE_TONE = { red: 'text-bad-ink', amber: 'text-warn-ink', slate: 'text-muted' };

/** Clean transactions table for laptops and PCs. */
export function ItemTable({ rows, uid, focusUid = null, showList = false, amountLabel, onOpen, onPay, empty }: Props) {
  if (rows.length === 0) return <div className="border-t border-hairline px-6 py-12">{empty}</div>;

  return (
    <div role="table" className="min-w-0 border-t border-hairline">
      <div role="row" className={`${COLS} px-6 py-3 text-[12px] font-medium text-muted`}>
        <span>Item</span>
        <span>Due</span>
        <span className="text-right">{amountLabel}</span>
        <span className="text-right">Status</span>
        <span />
      </div>
      <div className="divide-y divide-hairline border-t border-hairline">
        {rows.map((row) => {
          const { item, group } = row;
          const st = rowStatus(item, group.ownerId, uid, focusUid);
          const due = shortDue(effectiveDueDate(item, group.ownerId, uid, focusUid), st.done);
          const store = (item.store || '').trim();
          const sub = [
            showList ? group.name : store,
            showList && store && store.toLowerCase() !== group.name.toLowerCase() ? store : '',
            item.installmentsCount && item.installmentsCount > 1 ? `${item.installmentsCount} months` : '',
          ]
            .filter(Boolean)
            .join(' · ');
          const canPay = Boolean(onPay) && group.ownerId !== uid && item.shares?.[uid]?.status === 'unpaid';

          return (
            <div
              key={`${group.id}-${item.id}`}
              role="row"
              tabIndex={0}
              onClick={() => onOpen(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpen(row);
              }}
              className={`${COLS} group cursor-pointer px-6 py-3.5 outline-none transition hover:bg-canvas/70 focus-visible:bg-canvas`}
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-ink">{item.description}</p>
                {sub && <p className="truncate text-[12px] text-muted">{sub}</p>}
              </div>
              <span className={`truncate text-[13px] ${due ? DUE_TONE[due.tone] : 'text-muted/50'}`}>{due ? due.text : '—'}</span>
              <span className={`truncate text-right text-[14px] tabular-nums ${st.done ? 'text-muted/60' : 'font-medium text-ink'}`}>
                {st.done ? '—' : formatMoney(st.amount)}
              </span>
              <span className="flex justify-end">
                <StatusPill label={st.label} tone={st.tone} />
              </span>
              <span className="flex justify-end">
                {canPay ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPay?.(row);
                    }}
                    className="h-7 rounded-lg bg-accent/10 px-3 text-[12px] font-semibold text-accent transition hover:bg-accent/15 active:scale-95"
                  >
                    Pay
                  </button>
                ) : (
                  <ChevronRight className="size-4 text-muted/40 transition group-hover:translate-x-0.5 group-hover:text-muted" />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
