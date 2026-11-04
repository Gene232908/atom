import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Pencil, Plus, ReceiptText } from 'lucide-react';
import { itemGradient } from '../../lib/cardTheme';
import { centsToInput, cleanMoneyInput, formatMoney, toCents } from '../../lib/money';
import { amountProgress, cleanRef, confirmedPaid, itemProgress } from '../../lib/items';
import { nextDueInfo } from '../../lib/itemStatus';
import { recordPayment, rejectPayment } from '../../services/items';
import { useSafeWrite } from '../../hooks/useToast';
import { confirmedHistory } from '../../lib/transactions';
import type { Group, Item, ShareStatus } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { WalletCard } from '../ui/WalletCard';
import { ShareRow } from './ShareRow';

interface Props {
  item: Item | null;
  group: Group;
  uid: string;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onPay: (item: Item) => void;
  onSetStatus: (item: Item, personUid: string, status: ShareStatus, amountCents?: number) => void;
}

const label = 'mb-1 block text-[12px] font-medium text-muted';
const input = 'w-full rounded-xl bg-canvas px-3 py-2.5 text-[14px] text-ink outline-none ring-1 ring-hairline focus:ring-2 focus:ring-accent';

/** One item: summary card, who owes what, and confirmed payment history. */
export function ItemSheet({ item, group, uid, onClose, onEdit, onPay, onSetStatus }: Props) {
  const write = useSafeWrite();
  const [recordOpen, setRecordOpen] = useState(false);
  const [recUid, setRecUid] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recRef, setRecRef] = useState('');

  const people = useMemo(() => {
    if (!item?.shares) return [];
    const rank = (pid: string, status?: ShareStatus) =>
      pid === uid ? 0 : pid === group.ownerId ? 3 : status === 'claimed' ? 1 : status === 'paid' ? 2.5 : 2;
    return Object.entries(item.shares).sort(
      ([a, sa], [b, sb]) => rank(a, sa?.status) - rank(b, sb?.status) || (sa?.name ?? '').localeCompare(sb?.name ?? ''),
    );
  }, [item, uid, group.ownerId]);

  // Only payments the lender has confirmed. Waiting payments are shown on each person instead.
  const history = useMemo(() => (item ? confirmedHistory(item, group) : []), [item, group]);

  if (!item) return null;
  const isOwner = group.ownerId === uid;
  const due = nextDueInfo(item, group.ownerId, uid);
  const { total } = itemProgress(item, group.ownerId);
  const progress = amountProgress(item, group.ownerId);
  const mine = item.shares?.[uid];
  const myPaid = confirmedPaid(item, uid);
  const myLeft = Math.max(0, item.splitCents - myPaid);
  const myPct = item.splitCents > 0 ? Math.min(100, Math.round((myPaid / item.splitCents) * 100)) : 0;
  const canPay = !isOwner && !!mine && myLeft > 0 && mine.status !== 'claimed';
  const monthly =
    item.monthlyCents ||
    (item.installmentsCount && item.installmentsCount > 1 ? Math.round(item.splitCents / item.installmentsCount) : 0);
  const cardName = (item.store || '').trim() || group.name;

  const borrowers = people.filter(([pid]) => pid !== group.ownerId);
  const recordFor = recUid || borrowers[0]?.[0] || '';

  const saveRecord = () => {
    const amountCents = toCents(recAmount) ?? 0;
    if (!recordFor || amountCents <= 0) return;
    const name = group.members[recordFor]?.name ?? item.shares[recordFor]?.name ?? 'Borrower';
    write(
      recordPayment(group.id, item, {
        uid: recordFor,
        payerName: name,
        amountCents,
        refNumber: recRef.trim(),
        note: 'Recorded by lender',
        status: 'confirmed',
      }),
      `Recorded ${formatMoney(amountCents)} from ${name}`,
    );
    setRecordOpen(false);
    setRecAmount('');
    setRecRef('');
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={item.description}
      footer={
        isOwner ? (
          <Button variant="secondary" full icon={<Pencil className="size-4" />} onClick={() => onEdit(item)}>
            Edit item
          </Button>
        ) : canPay ? (
          <Button size="lg" full onClick={() => onPay(item)}>
            Pay
          </Button>
        ) : undefined
      }
    >
      {/* Summary */}
      <WalletCard seed={item.id} background={itemGradient(item, group)} className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold tracking-[0.1em] text-white/90 uppercase">{cardName}</p>
            {item.installmentsCount && item.installmentsCount > 1 ? (
              <p className="text-[11px] text-white/75">{item.installmentsCount} months installment</p>
            ) : null}
          </div>
          {due && (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                due.tone === 'slate' ? 'bg-white/20 text-white' : 'bg-white text-bad-ink'
              }`}
            >
              <CalendarClock className="size-3" />
              {due.text}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-white/75">{isOwner ? 'Total price' : 'Your balance'}</p>
            <p className="truncate text-[22px] leading-tight font-bold tabular-nums">
              {formatMoney(isOwner ? item.priceCents : myLeft)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-white/75">{monthly ? 'Monthly' : 'Each person'}</p>
            <p className="text-[14px] font-semibold tabular-nums">{formatMoney(monthly || item.splitCents)}</p>
          </div>
        </div>

        {(isOwner ? total > 0 : !!mine) && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-white/80">
              <span>
                {isOwner
                  ? `${formatMoney(progress.paid)} of ${formatMoney(progress.total)} collected`
                  : `${formatMoney(myPaid)} of ${formatMoney(item.splitCents)} paid`}
              </span>
              <span>{isOwner ? progress.percent : myPct}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${isOwner ? progress.percent : myPct}%` }} />
            </div>
          </div>
        )}
      </WalletCard>

      {/* People */}
      <p className="mt-5 mb-1.5 px-1 text-[12px] font-medium text-muted">
        {people.length ? `Split with ${people.length} ${people.length === 1 ? 'person' : 'people'}` : 'No one added yet'}
      </p>
      {people.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-hairline">
          <div className="divide-y divide-hairline">
            {people.map(([pid, share]) => (
              <ShareRow
                key={pid}
                personUid={pid}
                share={share}
                item={item}
                group={group}
                viewerUid={uid}
                onSetStatus={(personUid, status, amountCents) => onSetStatus(item, personUid, status, amountCents)}
                onReject={(personUid) =>
                  write(
                    rejectPayment(group.id, item, personUid),
                    `Marked as not received. ${group.members[personUid]?.name?.split(' ')[0] ?? 'They'} will see it.`,
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirmed payments only */}
      <div className="mt-5 mb-1.5 flex items-center gap-1.5 px-1">
        <ReceiptText className="size-3.5 text-muted" />
        <p className="flex-1 text-[12px] font-medium text-muted">Payment history</p>
        {history.length > 0 && <span className="text-[12px] text-muted">{history.length}</span>}
      </div>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-hairline">
        {history.length === 0 ? (
          <p className="px-4 py-4 text-center text-[13px] text-muted">No confirmed payments yet.</p>
        ) : (
          <div className="divide-y divide-hairline">
            {history.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <CheckCircle2 className="size-4 shrink-0 text-ok" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{p.payerName}</p>
                  <p className="truncate text-[11px] text-muted">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Earlier'}
                    {cleanRef(p.refNumber) ? ` · ${cleanRef(p.refNumber)}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-[13px] font-semibold text-ok-ink tabular-nums">+{formatMoney(p.amountCents)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lender: record cash or a different amount */}
        {isOwner && borrowers.length > 0 && !recordOpen && (
          <button
            type="button"
            onClick={() => {
              setRecordOpen(true);
              if (monthly) setRecAmount(centsToInput(monthly));
            }}
            className="flex w-full items-center gap-2 border-t border-hairline px-4 py-3 text-left text-[13px] font-medium text-accent active:bg-fill"
          >
            <Plus className="size-4" />
            Record a payment
            <span className="ml-auto text-[11px] font-normal text-muted">optional</span>
          </button>
        )}
        {isOwner && recordOpen && (
          <div className="space-y-3 border-t border-hairline p-4">
            <p className="text-[13px] font-semibold text-ink">Record a payment you received</p>
            <div>
              <label className={label} htmlFor="rec-who">From</label>
              <select id="rec-who" value={recordFor} onChange={(e) => setRecUid(e.target.value)} className={input}>
                {borrowers.map(([pid, share]) => (
                  <option key={pid} value={pid}>
                    {group.members[pid]?.name ?? share.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label} htmlFor="rec-amount">Amount (₱)</label>
                <input
                  id="rec-amount"
                  inputMode="decimal"
                  value={recAmount}
                  onChange={(e) => setRecAmount(cleanMoneyInput(e.target.value))}
                  placeholder={centsToInput(Math.max(0, item.splitCents - confirmedPaid(item, recordFor)))}
                  className={input}
                />
              </div>
              <div>
                <label className={label} htmlFor="rec-ref">Reference (optional)</label>
                <input id="rec-ref" value={recRef} onChange={(e) => setRecRef(e.target.value)} placeholder="GCash ref" className={input} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" full onClick={() => setRecordOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" full onClick={saveRecord} disabled={(toCents(recAmount) ?? 0) <= 0}>
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
