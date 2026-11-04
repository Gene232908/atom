import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { itemGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { rowStatus, shortDue } from '../../lib/itemStatus';
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
  /** Show which list each item belongs to (home dashboard). */
  showList?: boolean;
  amountLabel: string;
  onOpen: (row: TableRow) => void;
  onPay?: (row: TableRow) => void;
  empty?: ReactNode;
}

const COLS = 'grid grid-cols-[minmax(0,1fr)_96px_112px_112px_52px] items-center gap-3 xl:gap-4';

const DUE_TONE = { red: 'text-bad-ink font-semibold', amber: 'text-warn-ink font-semibold', slate: 'text-muted' };

/** Clean transactions table for laptops and PCs. */
export function ItemTable({ rows, uid, focusUid = null, showList = false, amountLabel, onOpen, onPay, empty }: Props) {
  if (rows.length === 0) return <div className="px-5 py-12">{empty}</div>;

  return (
    <div role="table" className="min-w-0">
      <div role="row" className={`${COLS} border-b border-hairline bg-canvas/60 px-5 py-2.5 text-[11px] font-semibold tracking-wide text-muted uppercase`}>
        <span>Item</span>
        <span>Due</span>
        <span className="text-right">{amountLabel}</span>
        <span className="text-right">Status</span>
        <span />
      </div>
      <div className="divide-y divide-hairline">
        {rows.map((row) => {
          const { item, group } = row;
          const st = rowStatus(item, group.ownerId, uid, focusUid);
          const due = shortDue(item.dueDate, st.done);
          const store = (item.store || '').trim();
          const sub = [
            store,
            showList ? group.name : '',
            item.installmentsCount && item.installmentsCount > 1 ? `${item.installmentsCount} mos` : '',
          ]
            .filter(Boolean)
            .join(' · ');
          const canPay = Boolean(onPay) && group.ownerId !== uid && item.shares?.[uid] && item.shares[uid].status === 'unpaid';

          return (
            <div
              key={`${group.id}-${item.id}`}
              role="row"
              tabIndex={0}
              onClick={() => onOpen(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpen(row);
              }}
              className={`${COLS} cursor-pointer px-5 py-3 outline-none transition hover:bg-canvas/70 focus-visible:bg-canvas`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl text-[14px] font-bold text-white shadow-sm ${st.done ? 'opacity-60' : ''}`}
                  style={{ backgroundImage: itemGradient(item, group) }}
                  aria-hidden
                >
                  {(store || group.name || item.description || '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">{item.description}</p>
                  <p className="truncate text-[12px] text-muted">{sub || 'No store set'}</p>
                </div>
              </div>
              <span className={`truncate text-[13px] ${due ? DUE_TONE[due.tone] : 'text-muted/60'}`}>{due ? due.text : '—'}</span>
              <span className={`truncate text-right text-[14px] font-semibold tabular-nums ${st.done ? 'text-muted' : 'text-ink'}`}>
                {formatMoney(st.amount)}
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
                    className="h-8 rounded-full bg-ink px-3.5 text-[12px] font-semibold text-white transition hover:bg-black active:scale-95"
                  >
                    Pay
                  </button>
                ) : (
                  <ChevronRight className="size-4 text-muted/50" strokeWidth={2.5} />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
