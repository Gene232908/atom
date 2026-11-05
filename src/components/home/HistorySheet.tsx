import { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  FolderCheck,
} from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { computeLoanStats } from '../../lib/loanUtils';
import type { Group, Item } from '../../lib/types';
import type { GroupItem } from '../../hooks/useAllItems';
import { Sheet } from '../ui/Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  items: GroupItem[];
  uid: string;
  onOpenLoan?: (group: Group, item: Item) => void;
  onOpenItem?: (item: GroupItem) => void;
}

type HistoryTab = 'all' | 'loans' | 'owe' | 'lend';

export function HistorySheet({ open, onClose, items, uid, onOpenLoan, onOpenItem }: Props) {
  const [tab, setTab] = useState<HistoryTab>('all');

  // 1. Completed Personal Loans (100% paid)
  const completedLoans = useMemo(() => {
    return items
      .filter((it) => (it.isPersonalLoan || it.group.groupType === 'loan') && it.group.ownerId === uid)
      .filter((it) => computeLoanStats(it).isFullyPaid)
      .map((it) => {
        const stats = computeLoanStats(it);
        const lastPayment = stats.confirmedPayments[0];
        return {
          id: it.id,
          type: 'loan' as const,
          title: it.description,
          provider: it.group.name || it.store || 'Personal Loan',
          totalAmount: it.priceCents,
          completedAt: lastPayment ? lastPayment.paidAt : it.updatedAt,
          termsLabel: `${stats.totalTerms} of ${stats.totalTerms} months paid`,
          item: it,
          group: it.group,
        };
      });
  }, [items, uid]);

  // 2. Completed Debts You Owed (100% paid)
  const completedOwe = useMemo(() => {
    return items
      .filter(
        (it) =>
          !it.isPersonalLoan &&
          it.group.groupType !== 'loan' &&
          it.group.ownerId !== uid &&
          it.shares &&
          it.shares[uid] &&
          it.shares[uid].status === 'paid',
      )
      .map((it) => {
        const ownerName = it.group.members[it.group.ownerId]?.name || 'Lender';
        return {
          id: it.id,
          type: 'owe' as const,
          title: it.description,
          provider: `Paid to ${ownerName}`,
          totalAmount: it.splitCents,
          completedAt: it.shares[uid]?.updatedAt || it.updatedAt,
          termsLabel: 'Fully settled debt',
          item: it,
          group: it.group,
        };
      });
  }, [items, uid]);

  // 3. Completed Debts People Owed You (100% collected)
  const completedLend = useMemo(() => {
    return items
      .filter(
        (it) =>
          !it.isPersonalLoan &&
          it.group.groupType !== 'loan' &&
          it.group.ownerId === uid &&
          it.shares &&
          Object.values(it.shares).length > 0 &&
          Object.values(it.shares).every((s) => s.status === 'paid'),
      )
      .map((it) => {
        const borrowerNames = Object.values(it.shares)
          .map((s) => s.name)
          .join(', ');
        return {
          id: it.id,
          type: 'lend' as const,
          title: it.description,
          provider: `Collected from ${borrowerNames || 'borrowers'}`,
          totalAmount: it.priceCents,
          completedAt: it.updatedAt,
          termsLabel: 'All shares collected',
          item: it,
          group: it.group,
        };
      });
  }, [items, uid]);

  // Combined all completed records sorted newest first
  const allCompleted = useMemo(() => {
    const list = [...completedLoans, ...completedOwe, ...completedLend];
    list.sort((a, b) => b.completedAt - a.completedAt);
    return list;
  }, [completedLoans, completedOwe, completedLend]);

  const displayedList = useMemo(() => {
    if (tab === 'loans') return completedLoans;
    if (tab === 'owe') return completedOwe;
    if (tab === 'lend') return completedLend;
    return allCompleted;
  }, [tab, completedLoans, completedOwe, completedLend, allCompleted]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Completed History"
      description="All completed loans, settled debts, and finished collections."
    >
      <div id="tour-history-content" className="space-y-4 pt-1">
        {/* Filter Pills */}
        <div className="grid grid-cols-4 rounded-[14px] bg-fill p-1 ring-1 ring-hairline text-center">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`rounded-[10px] py-1.5 text-[11.5px] font-semibold transition ${
              tab === 'all'
                ? 'bg-white text-ink shadow-xs ring-1 ring-hairline/80'
                : 'text-muted hover:text-ink'
            }`}
          >
            All ({allCompleted.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('loans')}
            className={`rounded-[10px] py-1.5 text-[11.5px] font-semibold transition ${
              tab === 'loans'
                ? 'bg-white text-ink shadow-xs ring-1 ring-hairline/80'
                : 'text-muted hover:text-ink'
            }`}
          >
            Loans ({completedLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('owe')}
            className={`rounded-[10px] py-1.5 text-[11.5px] font-semibold transition ${
              tab === 'owe'
                ? 'bg-white text-ink shadow-xs ring-1 ring-hairline/80'
                : 'text-muted hover:text-ink'
            }`}
          >
            You Owe ({completedOwe.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('lend')}
            className={`rounded-[10px] py-1.5 text-[11.5px] font-semibold transition ${
              tab === 'lend'
                ? 'bg-white text-ink shadow-xs ring-1 ring-hairline/80'
                : 'text-muted hover:text-ink'
            }`}
          >
            Lent ({completedLend.length})
          </button>
        </div>

        {/* List of Completed Items */}
        {displayedList.length === 0 ? (
          <div className="rounded-[18px] bg-fill p-8 text-center text-muted">
            <FolderCheck className="mx-auto size-8 opacity-40 mb-2" />
            <p className="text-[13.5px] font-semibold text-ink">No completed items yet</p>
            <p className="text-[12px] text-muted/80 mt-0.5">
              When a loan is 100% paid off or a debt is fully settled, it automatically transfers here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-hairline rounded-[18px] bg-fill ring-1 ring-hairline overflow-hidden">
            {displayedList.map((entry) => {
              const formattedDate = new Date(entry.completedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const isLoan = entry.type === 'loan';

              return (
                <div
                  key={`${entry.type}-${entry.id}`}
                  onClick={() => {
                    if (isLoan && onOpenLoan) {
                      onClose();
                      onOpenLoan(entry.group, entry.item);
                    } else if (onOpenItem) {
                      onClose();
                      onOpenItem(entry.item);
                    }
                  }}
                  className="p-3.5 flex items-center justify-between gap-3 transition cursor-pointer hover:bg-canvas active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-full text-white shadow-xs ${
                        entry.type === 'loan'
                          ? 'bg-accent'
                          : entry.type === 'owe'
                            ? 'bg-bad'
                            : 'bg-ok'
                      }`}
                    >
                      {entry.type === 'loan' ? (
                        <CheckCircle2 className="size-4.5" />
                      ) : entry.type === 'owe' ? (
                        <ArrowUpRight className="size-4.5" />
                      ) : (
                        <ArrowDownLeft className="size-4.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[13.5px] font-bold text-ink truncate">{entry.title}</p>
                        <span className="rounded-full bg-ok/10 px-2 py-0.2 text-[10px] font-bold text-ok">
                          Fully Paid ✓
                        </span>
                      </div>
                      <p className="text-[11.5px] text-muted mt-0.5 truncate">
                        {entry.provider} · {entry.termsLabel}
                      </p>
                      <p className="text-[10.5px] text-muted/75 mt-0.5">
                        Finished on {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-bold text-ink tabular-nums">
                      {formatMoney(entry.totalAmount)}
                    </p>
                    {isLoan && (
                      <span className="text-[10.5px] font-medium text-accent">
                        View history →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
