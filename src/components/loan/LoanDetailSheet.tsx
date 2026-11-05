import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  PhilippinePeso,
  Pencil,
  ReceiptText,
  Repeat,
  Settings,
  Trash2,
  Wallet,
} from 'lucide-react';
import { storeGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { computeLoanStats, formatDueDateReadable } from '../../lib/loanUtils';
import { daysUntil } from '../../lib/itemStatus';
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

const TINT = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  blue: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
} as const;

const SUB_TONE = {
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  violet: 'text-violet-600',
  blue: 'text-sky-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
} as const;

type Tint = keyof typeof TINT;

function Stat({
  icon: Icon,
  tint,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: Tint;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-3.5 ring-1 ring-hairline">
      <div className="flex items-center gap-2">
        <span className={`grid size-7 shrink-0 place-items-center rounded-full ${TINT[tint]}`}>
          <Icon className="size-3.5" strokeWidth={2.2} />
        </span>
        <p className="truncate text-[12px] font-medium text-muted">{label}</p>
      </div>
      <p className="mt-2 truncate text-[16px] font-semibold text-ink tabular-nums">{value}</p>
      {sub && <p className={`mt-0.5 truncate text-[11.5px] font-medium ${SUB_TONE[tint]}`}>{sub}</p>}
    </div>
  );
}

function dueText(days: number | null): { sub: string; tint: Tint } {
  if (days === null) return { sub: '', tint: 'blue' };
  if (days < 0) return { sub: `${-days} ${days === -1 ? 'day' : 'days'} late`, tint: 'red' };
  if (days === 0) return { sub: 'Due today', tint: 'red' };
  if (days === 1) return { sub: 'Due tomorrow', tint: 'amber' };
  if (days <= 7) return { sub: `In ${days} days`, tint: 'amber' };
  return { sub: `In ${days} days`, tint: 'blue' };
}

function termLabel(p: PaymentRecord, total: number, fallback: number): string {
  const covered = p.termsCovered ?? 1;
  if (covered > 1 && p.termNumber) return `Months ${p.termNumber}–${p.termNumber + covered - 1}`;
  if (p.termNumber) return `Month ${p.termNumber} of ${total}`;
  return `Payment ${fallback}`;
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
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) setGearMenuOpen(false);
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [gearMenuOpen]);

  const provider = group.name || item.store || 'Personal Loan';
  const payments = stats.confirmedPayments;
  const nextDate = stats.nextDueDate || item.dueDate;
  const due = stats.isFullyPaid ? { sub: 'All months paid', tint: 'emerald' as Tint } : dueText(daysUntil(nextDate));
  const segmented = stats.totalTerms > 1 && stats.totalTerms <= 36;

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
        description={`Personal loan · ${provider}`}
        headerAction={
          <div className="relative" ref={gearRef}>
            <button
              type="button"
              onClick={() => setGearMenuOpen((v) => !v)}
              aria-label="Loan options"
              title="Loan options"
              className={`grid size-8 place-items-center rounded-full transition active:scale-90 ${
                gearMenuOpen ? 'bg-ink text-white' : 'bg-fill text-muted hover:bg-black/5 hover:text-ink'
              }`}
            >
              <Settings className="size-4" strokeWidth={2.2} />
            </button>

            {gearMenuOpen && (
              <div className="absolute top-full right-0 z-30 mt-1.5 w-44 origin-top-right animate-pop overflow-hidden rounded-[20px] bg-white/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.16)] ring-1 ring-black/8 backdrop-blur-xl select-none">
                <button
                  type="button"
                  onClick={() => {
                    setGearMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left text-[13px] font-medium text-ink transition hover:bg-black/4 active:scale-[0.98]"
                >
                  <Pencil className="size-3.5 text-accent" strokeWidth={2.2} />
                  <span>Edit details</span>
                </button>
                <div className="mx-1.5 my-1 h-px bg-black/6" />
                <button
                  type="button"
                  onClick={() => {
                    setGearMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left text-[13px] font-medium text-bad transition hover:bg-bad/8 active:scale-[0.98]"
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
            <Button size="lg" full onClick={() => setPayOpen(true)}>
              Pay
            </Button>
          ) : (
            <Button size="lg" full variant="secondary" disabled>
              Loan completed ✓
            </Button>
          )
        }
      >
        <div className="space-y-5 pt-1">
          <WalletCard
            seed={item.id}
            background={storeGradient(provider, item.id, group.color || item.color)}
            className="flex min-h-[190px] flex-col justify-between p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase backdrop-blur">
                  Personal loan
                </span>
                <p className="mt-1.5 truncate text-[16px] font-semibold text-white drop-shadow">{provider}</p>
                <p className="truncate text-[13px] text-white/85">{item.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] text-white/75">Remaining</p>
                <p className="text-[20px] font-semibold text-white tabular-nums drop-shadow">
                  {formatMoney(stats.remainingCents)}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between text-[11.5px] text-white/85">
                <span>
                  {stats.isFullyPaid ? 'Paid in full ✓' : `${stats.currentPaidTerms} of ${stats.totalTerms} months paid`}
                </span>
                <span>{stats.termsLeft} left</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
            </div>
          </WalletCard>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat icon={Wallet} tint="indigo" label="Total loan" value={formatMoney(stats.totalPriceCents)} />
            <Stat
              icon={PhilippinePeso}
              tint="emerald"
              label="Paid so far"
              value={formatMoney(stats.totalPaidCents)}
              sub={`${stats.progressPercent}% of the loan`}
            />
            <Stat icon={Repeat} tint="violet" label="Monthly bill" value={formatMoney(stats.monthlyCents)} />
            <Stat
              icon={CalendarClock}
              tint={due.tint}
              label="Next bill"
              value={stats.isFullyPaid ? 'Done' : formatDueDateReadable(nextDate)}
              sub={due.sub}
            />
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-hairline">
            <div className="flex items-baseline justify-between">
              <p className="text-[14px] font-semibold text-ink">Progress</p>
              <p className="text-[13px] font-semibold text-emerald-600 tabular-nums">{stats.progressPercent}%</p>
            </div>

            {segmented ? (
              <div className="mt-3 flex gap-[3px]" aria-hidden>
                {Array.from({ length: stats.totalTerms }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2 flex-1 rounded-full ${
                      i < stats.initialPaidTerms
                        ? 'bg-emerald-300'
                        : i < stats.currentPaidTerms
                          ? 'bg-emerald-500'
                          : i === stats.currentPaidTerms
                            ? 'bg-sky-400'
                            : 'bg-fill-strong'
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-fill-strong">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.progressPercent}%` }} />
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
              <span>
                <span className="font-semibold text-emerald-600">{stats.currentPaidTerms}</span> paid
              </span>
              <span>
                <span className="font-semibold text-ink">{stats.termsLeft}</span> left
              </span>
              <span>
                <span className="font-semibold text-ink">{stats.totalTerms}</span> months total
              </span>
            </div>

            {stats.initialPaidTerms > 0 && (
              <p className="mt-2.5 border-t border-hairline pt-2.5 text-[12px] leading-snug text-muted">
                {stats.initialPaidTerms} {stats.initialPaidTerms === 1 ? 'month was' : 'months were'} already paid before
                you added this loan ({formatMoney(stats.initialPaidCents)}).
              </p>
            )}
            {stats.totalInterestPaidCents > 0 && (
              <p className="mt-1.5 text-[12px] leading-snug text-amber-700">
                Late fees paid: {formatMoney(stats.totalInterestPaidCents)}. These do not lower the loan balance.
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[14px] font-semibold text-ink">
                Payment history
                {payments.length > 0 && <span className="ml-1.5 text-[12px] font-medium text-muted">{payments.length}</span>}
              </p>
              {!stats.isFullyPaid && (
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className="text-[13px] font-medium text-accent active:opacity-60"
                >
                  Record payment
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="rounded-2xl bg-white px-6 py-7 text-center ring-1 ring-hairline">
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-sky-50 text-sky-600">
                  <ReceiptText className="size-5" strokeWidth={2} />
                </span>
                <p className="mt-2.5 text-[14px] font-medium text-ink">No payments yet</p>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {stats.isFullyPaid
                    ? 'This loan was fully paid before it was added.'
                    : `Tap Pay to record month ${stats.nextTermNumber}.`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-hairline overflow-hidden rounded-2xl bg-white ring-1 ring-hairline">
                {payments.map((p, idx) => {
                  const when = new Date(p.paidAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="size-4" strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-[13.5px] font-medium text-ink">
                            {termLabel(p, stats.totalTerms, payments.length - idx)}
                          </p>
                          {(p.termsCovered ?? 1) > 1 && (
                            <span className="rounded-full bg-sky-50 px-1.5 text-[10.5px] font-medium text-sky-700">Advance</span>
                          )}
                          {p.interestCents && p.interestCents > 0 ? (
                            <span className="rounded-full bg-amber-50 px-1.5 text-[10.5px] font-medium text-amber-700">
                              +{formatMoney(p.interestCents)} late fee
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-muted">
                          {when}
                          {p.refNumber ? ` · Ref ${p.refNumber}` : ''}
                        </p>
                        {p.note && !/#\d/.test(p.note) && <p className="mt-0.5 truncate text-[12px] text-muted">{p.note}</p>}
                      </div>
                      <p className="shrink-0 text-[14px] font-semibold text-emerald-600 tabular-nums">
                        {formatMoney(p.amountCents)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Sheet>

      {editOpen && (
        <EditLoanSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          group={group}
          item={item}
          onSuccess={() => onUpdated?.()}
        />
      )}

      {payOpen && (
        <PayLoanSheet
          open={payOpen}
          onClose={() => setPayOpen(false)}
          item={item}
          groupId={group.id}
          onSuccess={() => onUpdated?.()}
        />
      )}

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this loan?"
        message={
          <>
            Are you sure you want to delete <span className="font-semibold text-ink">"{item.description}"</span> from your
            loans? All payment history will be permanently removed.
          </>
        }
        confirmText="Yes, delete loan"
        danger
        onConfirm={handleDelete}
      />
    </>
  );
}
