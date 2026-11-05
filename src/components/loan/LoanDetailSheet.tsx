import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Pencil,
  Plus,
  ReceiptText,
  Settings,
  Trash2,
} from 'lucide-react';
import { storeGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { computeLoanStats, formatDueDateReadable } from '../../lib/loanUtils';
import { deleteGroup } from '../../services/groups';
import { useToast } from '../../hooks/useToast';
import type { Group, Item, PaymentRecord } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { WalletCard } from '../ui/WalletCard';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { PayLoanSheet } from './PayLoanSheet';
import { EditLoanSheet } from './EditLoanSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  group: Group;
  item: Item;
  onUpdated?: () => void;
}

export function LoanDetailSheet({ open, onClose, group, item, onUpdated }: Props) {
  const toast = useToast();
  const stats = useMemo(() => computeLoanStats(item), [item]);

  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [gearMenuOpen, setGearMenuOpen] = useState(false);
  const gearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gearMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setGearMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [gearMenuOpen]);

  const provider = group.name || item.store || 'Personal Loan';
  const payments = stats.confirmedPayments;

  const handleDelete = async () => {
    try {
      await deleteGroup(group);
      toast(`Deleted loan "${item.description}"`);
      setConfirmDelete(false);
      onClose();
      onUpdated?.();
    } catch (err: any) {
      toast(err?.message || 'Failed to delete loan.', 'error');
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={item.description}
        description={`Personal Loan · ${provider}`}
        headerAction={
          <div className="relative" ref={gearRef}>
            <button
              type="button"
              onClick={() => setGearMenuOpen((v) => !v)}
              aria-label="Loan options"
              title="Loan options"
              className={`grid size-8 place-items-center rounded-full transition active:scale-90 ${
                gearMenuOpen
                  ? 'bg-ink text-white'
                  : 'bg-fill text-muted hover:bg-black/5 hover:text-ink'
              }`}
            >
              <Settings className="size-4" strokeWidth={2.2} />
            </button>

            {gearMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 origin-top-right overflow-hidden rounded-[20px] bg-white/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.08] backdrop-blur-xl animate-pop z-30 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setGearMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-black/[0.04] transition active:scale-[0.98]"
                >
                  <Pencil className="size-3.5 text-accent" strokeWidth={2.2} />
                  <span>Edit details</span>
                </button>

                <div className="my-1 h-px bg-black/[0.06] mx-1.5" />

                <button
                  type="button"
                  onClick={() => {
                    setGearMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left text-[13px] font-medium text-bad hover:bg-bad/8 transition active:scale-[0.98]"
                >
                  <Trash2 className="size-3.5" strokeWidth={2.2} />
                  <span>Delete loan</span>
                </button>
              </div>
            )}
          </div>
        }
        footer={
          !stats.isFullyPaid ? (
            <Button
              size="lg"
              full
              icon={<Plus className="size-4" strokeWidth={2.2} />}
              onClick={() => setPayOpen(true)}
            >
              Pay
            </Button>
          ) : (
            <Button size="lg" full variant="secondary" disabled>
              Loan Completed ✓
            </Button>
          )
        }
      >
        <div className="space-y-4 pt-1">
          {/* Card Presentation */}
          <WalletCard
            seed={item.id}
            background={storeGradient(provider, item.id, group.color || item.color)}
            className="flex min-h-[190px] flex-col justify-between p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase backdrop-blur">
                  Personal Loan
                </span>
                <p className="mt-1 truncate text-[16px] font-bold text-white drop-shadow">
                  {provider}
                </p>
                <p className="truncate text-[13px] font-medium text-white/90">
                  {item.description}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[10px] font-semibold tracking-wider text-white/75 uppercase">Remaining</p>
                <p className="text-[20px] font-bold text-white tabular-nums drop-shadow">
                  {formatMoney(stats.remainingCents)}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-white/85">
                <span>
                  {stats.isFullyPaid
                    ? 'All paid in full ✓'
                    : `${stats.currentPaidTerms} of ${stats.totalTerms} mos paid (${stats.progressPercent}%)`}
                </span>
                <span>{stats.termsLeft} mos left</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
            </div>
          </WalletCard>

          {/* Key Loan Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-[16px] bg-fill p-3 ring-1 ring-hairline/80">
              <p className="text-[10.5px] font-bold text-muted uppercase tracking-wider">Total Loan</p>
              <p className="mt-1 text-[15.5px] font-bold text-ink tabular-nums">
                {formatMoney(stats.totalPriceCents)}
              </p>
            </div>

            {/* Paid so far: high contrast, modern emerald design */}
            <div className="rounded-[16px] bg-emerald-500/10 p-3 ring-1 ring-emerald-500/25">
              <p className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider">Paid so far</p>
              <p className="mt-1 text-[16px] font-extrabold text-emerald-950 tabular-nums">
                {formatMoney(stats.totalPaidCents)}
              </p>
            </div>

            <div className="rounded-[16px] bg-fill p-3 ring-1 ring-hairline/80">
              <p className="text-[10.5px] font-bold text-muted uppercase tracking-wider">Monthly Bill</p>
              <p className="mt-1 text-[15.5px] font-bold text-ink tabular-nums">
                {formatMoney(stats.monthlyCents)}
              </p>
            </div>

            <div className="rounded-[16px] bg-fill p-3 ring-1 ring-hairline/80">
              <p className="text-[10.5px] font-bold text-muted uppercase tracking-wider">Next Bill Due</p>
              <p className="mt-1 text-[13.5px] font-bold text-accent truncate">
                {stats.isFullyPaid ? 'Done ✓' : formatDueDateReadable(stats.nextDueDate || item.dueDate)}
              </p>
            </div>
          </div>

          {/* Terms Logic Box: e.g. 18 - 4 = 14 months left */}
          <div className="rounded-[16px] bg-accent/5 p-3.5 ring-1 ring-accent/20 space-y-1">
            <div className="flex items-center justify-between text-[11.5px] font-medium text-accent">
              <span className="tracking-wide">INSTALLMENT PROGRESS</span>
              <span>{stats.progressPercent}% complete</span>
            </div>
            <p className="mt-1 text-[13px] font-normal text-ink">
              <span className="font-semibold">{stats.totalTerms} total months</span> -{' '}
              <span className="font-semibold">{stats.currentPaidTerms} months paid</span> ={' '}
              <span className="font-semibold text-accent">{stats.termsLeft} months left</span>.
            </p>
            {stats.initialPaidTerms > 0 && (
              <p className="text-[11px] text-muted">
                * Started with {stats.initialPaidTerms} pre-paid months ({formatMoney(stats.totalPriceCents - stats.remainingCents)} credited).
              </p>
            )}
            {stats.totalInterestPaidCents > 0 && (
              <p className="text-[11px] font-medium text-amber-700">
                * Total late interest fees paid: {formatMoney(stats.totalInterestPaidCents)} (tracked separately, original loan principal is untouched).
              </p>
            )}
          </div>

          {/* Payment & Transaction History */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[11.5px] font-semibold text-muted uppercase tracking-wider">
                Payment History ({payments.length})
              </h3>
              {!stats.isFullyPaid && (
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className="text-[12px] font-semibold text-accent hover:underline"
                >
                  + Record payment
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="rounded-[16px] bg-fill p-6 text-center text-muted">
                <ReceiptText className="mx-auto size-7 opacity-40 mb-1.5" />
                <p className="text-[13px] font-medium">No recorded payments yet</p>
                <p className="text-[11.5px] text-muted/80 mt-0.5">
                  Tap "Pay Month #{stats.nextTermNumber}" to record your first cut-off payment.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-hairline rounded-[16px] bg-fill ring-1 ring-hairline overflow-hidden">
                {payments.map((p: PaymentRecord, idx: number) => {
                  const isAdvance = (p.termsCovered ?? 1) > 1;
                  const termStart = p.termNumber ?? 1;
                  const termEnd = termStart + (p.termsCovered ?? 1) - 1;
                  const termLabel = isAdvance
                    ? `Months #${termStart}–#${termEnd} (${p.termsCovered} mos)`
                    : p.termNumber
                      ? `Month #${p.termNumber} of ${stats.totalTerms}`
                      : `Payment #${payments.length - idx}`;

                  const payDate = new Date(p.paidAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const payTime = new Date(p.paidAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  return (
                    <div key={p.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CheckCircle2 className="size-3.5 text-ok shrink-0" />
                          <p className="text-[13px] font-semibold text-ink truncate">{termLabel}</p>
                          {isAdvance && (
                            <span className="rounded-full bg-accent/10 px-1.5 py-0.2 text-[10px] font-semibold text-accent">
                              Advance
                            </span>
                          )}
                          {p.interestCents && p.interestCents > 0 ? (
                            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700">
                              +{formatMoney(p.interestCents)} late fee
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          {payDate} at {payTime} {p.refNumber ? `· Ref: ${p.refNumber}` : ''}
                        </p>
                        {p.note && <p className="text-[11px] text-muted/90 italic mt-0.5">{p.note}</p>}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[13.5px] font-semibold text-ok tabular-nums">
                          {formatMoney(p.amountCents)}
                        </p>
                        <span className="text-[10px] font-medium text-ok/80 uppercase">Confirmed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Sheet>

      {/* Edit Loan Sheet */}
      {editOpen && (
        <EditLoanSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          group={group}
          item={item}
          onSuccess={() => onUpdated?.()}
        />
      )}

      {/* Pay Sheet */}
      {payOpen && (
        <PayLoanSheet
          open={payOpen}
          onClose={() => setPayOpen(false)}
          item={item}
          groupId={group.id}
          onSuccess={() => onUpdated?.()}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this loan?"
        message={
          <>
            Are you sure you want to delete <span className="font-semibold text-ink">"{item.description}"</span> from your loans?
            All payment history will be permanently removed.
          </>
        }
        confirmText="Yes, delete loan"
        danger
        onConfirm={handleDelete}
      />
    </>
  );
}
