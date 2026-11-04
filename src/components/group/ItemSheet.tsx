import { useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  ReceiptText,
  ShoppingBag,
} from 'lucide-react';
import { itemGradient } from '../../lib/cardTheme';
import { formatMoney, toCents, centsToInput } from '../../lib/money';
import { amountProgress, dueInfo, isItemDone, itemProgress } from '../../lib/items';
import { recordPayment } from '../../services/items';
import { useSafeWrite } from '../../hooks/useToast';
import type { Group, Item, PaymentRecord, ShareStatus } from '../../lib/types';
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

/** Everything about one item, plus transaction payment history & installment breakdowns. */
export function ItemSheet({ item, group, uid, onClose, onEdit, onPay, onSetStatus }: Props) {
  const write = useSafeWrite();
  const [recordOpen, setRecordOpen] = useState(false);
  const [recUid, setRecUid] = useState<string>('');
  const [recAmount, setRecAmount] = useState('');
  const [recRef, setRecRef] = useState('');
  const [recNote, setRecNote] = useState('');

  const installmentMonthly =
    item?.installmentsCount && item.installmentsCount > 1 && item.splitCents > 0
      ? Math.round(item.splitCents / item.installmentsCount)
      : null;

  const people = useMemo(() => {
    if (!item?.shares) return [];
    const rank = (pid: string, status?: ShareStatus) =>
      pid === uid ? 0 : pid === group.ownerId ? 3 : status === 'paid' ? 2 : 1;
    return Object.entries(item.shares).sort(
      ([a, sa], [b, sb]) =>
        rank(a, sa?.status) - rank(b, sb?.status) ||
        (sa?.name ?? '').localeCompare(sb?.name ?? ''),
    );
  }, [item, uid, group.ownerId]);

  // Auto-record borrower payments in Transaction History: includes recorded payments AND any borrower claimed payments
  const payments = useMemo(() => {
    if (!item) return [];
    const list: PaymentRecord[] = Array.isArray(item.payments) ? [...item.payments] : [];
    const existingUidsWithPending = new Set(list.filter((p) => p && p.status === 'pending').map((p) => p.uid));
    const existingUidsWithConfirmed = new Set(list.filter((p) => p && p.status === 'confirmed').map((p) => p.uid));

    const shares = item.shares ?? {};
    for (const [pid, share] of Object.entries(shares)) {
      if (!share || pid === group.ownerId) continue;
      if (share.status === 'claimed' && !existingUidsWithPending.has(pid)) {
        const borrowerName = group.members[pid]?.name ?? share.name ?? 'Borrower';
        const amt =
          share.claimCents && share.claimCents > 0
            ? share.claimCents
            : Math.max(0, item.splitCents - (share.paidCents ?? 0));
        list.unshift({
          id: `claim-${pid}`,
          uid: pid,
          payerName: borrowerName,
          amountCents: amt,
          refNumber: share.refNumber || 'Pending verification',
          note: share.refNumber ? `Ref: ${share.refNumber}` : 'Submitted via Pay now',
          status: 'pending',
          paidAt: share.updatedAt && !isNaN(share.updatedAt) && share.updatedAt > 0 ? share.updatedAt : Date.now(),
        });
      } else if (share.status === 'paid' && !existingUidsWithConfirmed.has(pid)) {
        const borrowerName = group.members[pid]?.name ?? share.name ?? 'Borrower';
        const amt = share.paidCents && share.paidCents > 0 ? share.paidCents : item.splitCents;
        list.push({
          id: `confirmed-${pid}`,
          uid: pid,
          payerName: borrowerName,
          amountCents: amt,
          refNumber: share.refNumber || 'Paid in full',
          note: share.refNumber ? `Ref: ${share.refNumber}` : 'Payment confirmed',
          status: 'confirmed',
          paidAt: share.updatedAt && !isNaN(share.updatedAt) && share.updatedAt > 0 ? share.updatedAt : (item.updatedAt || Date.now()),
        });
      }
    }
    return list;
  }, [item, installmentMonthly, group.members, group.ownerId]);

  if (!item) return null;
  const isOwner = group.ownerId === uid;
  const done = isItemDone(item, group.ownerId);
  const due = dueInfo(item.dueDate, done);
  const { total } = itemProgress(item, group.ownerId);
  const moneyProgress = amountProgress(item, group.ownerId);
  const mine = item.shares ? item.shares[uid] : undefined;

  const myPaid = mine?.paidCents ?? (mine?.status === 'paid' ? item.splitCents : 0);
  const myRemaining = Math.max(0, item.splitCents - myPaid);
  const canPay = !isOwner && myRemaining > 0;

  const handleRecordPaymentSubmit = () => {
    const targetUid = recUid || (people[0] ? people[0][0] : '');
    const amountCents = toCents(recAmount) ?? (installmentMonthly || item.splitCents);
    if (!targetUid || amountCents <= 0) return;

    const borrowerName = group.members[targetUid]?.name ?? item.shares[targetUid]?.name ?? 'Borrower';
    write(
      recordPayment(group.id, item, {
        uid: targetUid,
        payerName: borrowerName,
        amountCents,
        refNumber: recRef.trim() || 'Manual',
        note: recNote.trim() || 'Cut-off payment',
        status: 'confirmed',
      }),
      `Recorded payment of ${formatMoney(amountCents)} for ${borrowerName}`,
    );

    setRecordOpen(false);
    setRecAmount('');
    setRecRef('');
    setRecNote('');
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={item.description}
      footer={
        isOwner ? (
          <Button size="lg" variant="secondary" full icon={<Pencil className="size-4" />} onClick={() => onEdit(item)}>
            Edit item
          </Button>
        ) : canPay ? (
          <Button size="lg" full onClick={() => onPay(item)}>
            Pay {formatMoney(myRemaining)} now
          </Button>
        ) : undefined
      }
    >
      <WalletCard seed={item.id} background={itemGradient(item, group)} className="p-5">
        {/* Top Header: Store on left, Cycle on top right, Due Date directly below it */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur">
              <ShoppingBag className="size-3.5 text-white" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold tracking-[0.08em] text-white uppercase drop-shadow-sm">
                {(item.store || '').trim() || 'Credit Card'}
              </p>
              {item.installmentsCount && item.installmentsCount > 1 && (
                <p className="text-[11px] text-white/80 font-medium">
                  {item.installmentsCount} mos installment
                </p>
              )}
            </div>
          </div>

          {/* Upper Right Corner: Cycle on top, Due Date below */}
          <div className="flex flex-col items-end gap-1 shrink-0 text-right">
            {item.billingCycle && (
              <span className="inline-flex items-center rounded-full bg-black/25 px-2.5 py-0.5 text-[11px] font-medium text-white/95 backdrop-blur">
                {item.billingCycle}
              </span>
            )}
            {due && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  due.tone === 'slate' ? 'bg-white/15 text-white' : 'bg-white text-bad-ink'
                }`}
              >
                <CalendarClock className="size-3" />
                {due.text}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row: Total Charge on left, Monthly Cutoff small & aligned right */}
        <div className="mt-8 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/70 uppercase tracking-wider">Total Charge</p>
            <p className="truncate text-[26px] leading-tight font-bold tracking-tight tabular-nums text-white drop-shadow sm:text-[30px]">
              {formatMoney(item.priceCents)}
            </p>
          </div>

          {(item.monthlyCents || installmentMonthly) && (
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium text-white/70 uppercase tracking-wider">Monthly cutoff</p>
              <p className="text-[17px] font-bold text-white tabular-nums">
                {formatMoney(item.monthlyCents || installmentMonthly!)}
                <span className="text-[12px] font-normal text-white/80">/mo</span>
              </p>
            </div>
          )}
        </div>

        {!isOwner && (
          <div className="mt-4 rounded-xl bg-black/20 p-3 backdrop-blur">
            <div className="flex justify-between text-[12px] font-semibold text-white">
              <span>Your payment progress</span>
              <span>{Math.round((myPaid / item.splitCents) * 100)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${Math.min(100, (myPaid / item.splitCents) * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-white/80">
              <span>Paid: {formatMoney(myPaid)}</span>
              <span>Remaining: {formatMoney(myRemaining)}</span>
            </div>
          </div>
        )}

        {isOwner && total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-medium text-white/80">
              <span>
                {formatMoney(moneyProgress.paid)} of {formatMoney(moneyProgress.total)} collected
              </span>
              <span>{moneyProgress.percent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${moneyProgress.percent}%` }} />
            </div>
          </div>
        )}
      </WalletCard>

      {/* Split With People List */}
      {people.length === 0 ? (
        <div className="mt-5 rounded-[20px] bg-white p-5 text-center ring-1 ring-hairline shadow-sm">
          <p className="text-[14px] font-semibold text-ink">Waiting for members</p>
          <p className="mt-1 text-[12px] text-muted">
            No members have been assigned to this item yet. Tap <span className="font-semibold text-ink">Edit item</span> below or share invite code <span className="font-mono font-bold text-ink">{group.inviteCode}</span>.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-5 mb-2 px-1 text-[13px] font-medium text-muted">
            Split with {people.length} {people.length === 1 ? 'person' : 'people'}
          </p>
          <div className="overflow-hidden rounded-[20px] bg-white ring-1 ring-hairline shadow-sm">
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
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* TRANSACTION & PAYMENT HISTORY SECTION */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <ReceiptText className="size-4 text-ink" />
            <span className="text-[14px] font-bold text-ink">Transaction History</span>
            <span className="grid size-5 place-items-center rounded-full bg-fill text-[11px] font-bold text-muted">
              {payments.length}
            </span>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => {
                setRecordOpen((prev) => !prev);
                if (!recUid && people[0]) setRecUid(people[0][0]);
                if (installmentMonthly) setRecAmount(centsToInput(installmentMonthly));
              }}
              className="inline-flex items-center gap-1 rounded-full bg-fill px-3 py-1 text-[12px] font-semibold text-accent transition hover:bg-black/5 active:scale-95"
            >
              <Plus className="size-3.5" />
              <span>Manual entry (optional)</span>
            </button>
          )}
        </div>

        {/* Lender Record Payment Form */}
        {recordOpen && isOwner && (
          <div className="animate-fade-in rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-hairline space-y-3">
            <p className="text-[13px] font-bold text-ink">Record Cash / Installment Payment</p>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase">Borrower</label>
              <select
                value={recUid || (people[0] ? people[0][0] : '')}
                onChange={(e) => setRecUid(e.target.value)}
                className="mt-1 w-full rounded-xl bg-fill px-3 py-2 text-[14px] font-medium text-ink outline-none ring-1 ring-hairline"
              >
                {people.map(([pid, share]) => (
                  <option key={pid} value={pid}>
                    {group.members[pid]?.name ?? share.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase">Amount (₱)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={recAmount}
                  onChange={(e) => setRecAmount(e.target.value)}
                  placeholder={centsToInput(installmentMonthly || item.splitCents)}
                  className="mt-1 w-full rounded-xl bg-fill px-3 py-2 text-[14px] font-medium text-ink outline-none ring-1 ring-hairline"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase">Reference #</label>
                <input
                  type="text"
                  value={recRef}
                  onChange={(e) => setRecRef(e.target.value)}
                  placeholder="e.g. GCash 100238"
                  className="mt-1 w-full rounded-xl bg-fill px-3 py-2 text-[14px] font-medium text-ink outline-none ring-1 ring-hairline"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase">Note (optional)</label>
              <input
                type="text"
                value={recNote}
                onChange={(e) => setRecNote(e.target.value)}
                placeholder="e.g. Cut-off 1 payment, 1st month"
                className="mt-1 w-full rounded-xl bg-fill px-3 py-2 text-[13px] text-ink outline-none ring-1 ring-hairline"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRecordOpen(false)}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPaymentSubmit}
                className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-bold text-white shadow-sm transition active:scale-95"
              >
                Save payment
              </button>
            </div>
          </div>
        )}

        {/* Payments List */}
        {payments.length === 0 ? (
          <div className="rounded-[20px] bg-white p-5 text-center shadow-sm ring-1 ring-hairline">
            <ReceiptText className="mx-auto size-7 text-muted/60" />
            <p className="mt-2 text-[13px] font-medium text-ink">No payment records yet</p>
            <p className="mt-0.5 text-[12px] text-muted">
              When cut-off or installment payments are made with reference numbers, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-hairline">
            <div className="divide-y divide-hairline">
              {payments.map((p) => {
                const isConfirmed = p.status === 'confirmed';
                const validTs = typeof p.paidAt === 'number' && !isNaN(p.paidAt) && p.paidAt > 0 ? p.paidAt : Date.now();
                let dateStr = 'Recent';
                try {
                  dateStr = new Date(validTs).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                } catch {
                  dateStr = 'Recent';
                }

                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-bold text-ink">{p.payerName}</span>
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-ok/10 px-2 py-0.5 text-[11px] font-bold text-ok-ink">
                            <CheckCircle2 className="size-3 text-ok" />
                            Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-bold text-warn-ink">
                            <Clock className="size-3 text-warn" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                        <span>{dateStr}</span>
                        {p.refNumber && (
                          <span className="font-mono text-[11px] font-semibold text-accent">
                            Ref: {p.refNumber}
                          </span>
                        )}
                      </div>

                      {p.note && <p className="mt-0.5 text-[12px] text-ink/80 italic">{p.note}</p>}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[15px] font-bold text-ok-ink tabular-nums">
                        +{formatMoney(p.amountCents)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!isOwner && mine?.status === 'claimed' && (
        <p className="mt-3 px-1 text-[13px] text-muted">
          You sent a payment confirmation. Waiting for {group.members[group.ownerId]?.name ?? 'the lender'} to confirm it.
        </p>
      )}
    </Sheet>
  );
}
