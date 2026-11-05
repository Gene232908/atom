import { useState, useMemo, type FormEvent } from 'react';
import { AlertCircle, Calendar, CheckCircle2, FastForward, Info } from 'lucide-react';
import { useUser } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { recordLoanPayment } from '../../services/items';
import { centsToInput, cleanMoneyInput, formatMoney, toCents } from '../../lib/money';
import { computeLoanStats, computeNextDueDate, formatDueDateReadable } from '../../lib/loanUtils';
import type { Item } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';

interface Props {
  open: boolean;
  onClose: () => void;
  item: Item;
  groupId: string;
  onSuccess?: () => void;
}

function getDaysOverdue(dueDateStr: string | null | undefined, payDateStr: string): number {
  if (!dueDateStr || !payDateStr) return 0;
  const due = new Date(dueDateStr + 'T00:00:00');
  const pay = new Date(payDateStr + 'T00:00:00');
  const diffMs = pay.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function PayLoanSheet({ open, onClose, item, groupId, onSuccess }: Props) {
  const user = useUser();
  const toast = useToast();

  const stats = useMemo(() => computeLoanStats(item), [item]);
  const currentDueDate = stats.nextDueDate || item.dueDate;
  const startTermNumber = stats.nextTermNumber || stats.currentPaidTerms + 1;

  // Tabs: 'monthly' or 'advance'
  const [payMode, setPayMode] = useState<'monthly' | 'advance'>('monthly');

  // Advance options: number of months (default 2, min 1, max termsLeft)
  const maxAdvance = Math.max(1, stats.termsLeft);
  const [advanceMonths, setAdvanceMonths] = useState<number>(Math.min(2, maxAdvance));

  // Date and Time (default to today / now)
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payTime, setPayTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  // Calculate default amounts based on mode
  const defaultMonthlyAmount = stats.monthlyCents > 0 ? stats.monthlyCents : stats.remainingCents;
  const defaultAdvanceAmount = advanceMonths * (stats.monthlyCents > 0 ? stats.monthlyCents : Math.round(stats.remainingCents / stats.termsLeft));

  const [monthlyAmountInput, setMonthlyAmountInput] = useState(centsToInput(defaultMonthlyAmount));
  const [advanceAmountInput, setAdvanceAmountInput] = useState(centsToInput(defaultAdvanceAmount));

  const [refNumber, setRefNumber] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // When advanceMonths changes, update advance amount input
  const handleSelectAdvanceMonths = (mos: number) => {
    const clamped = Math.max(1, Math.min(mos, maxAdvance));
    setAdvanceMonths(clamped);
    const amt = clamped * (stats.monthlyCents > 0 ? stats.monthlyCents : Math.round(stats.remainingCents / stats.termsLeft));
    setAdvanceAmountInput(centsToInput(amt));
    setErrors((prev) => ({ ...prev, amount: '' }));
  };

  // Overdue check
  const daysOverdue = useMemo(() => getDaysOverdue(currentDueDate, payDate), [currentDueDate, payDate]);

  // Calculations for Monthly Cut-off mode
  const monthlyAmountCents = toCents(monthlyAmountInput) ?? 0;
  const isLateWithExtra = payMode === 'monthly' && daysOverdue > 0 && monthlyAmountCents > stats.monthlyCents && stats.monthlyCents > 0;
  const lateInterestCents = isLateWithExtra ? monthlyAmountCents - stats.monthlyCents : 0;
  const monthlyPrincipalCents = isLateWithExtra ? stats.monthlyCents : monthlyAmountCents;

  // Calculations for Advance mode
  const advanceAmountCents = toCents(advanceAmountInput) ?? 0;
  const endTermNumber = Math.min(stats.totalTerms, startTermNumber + advanceMonths - 1);
  const futureDueDate = useMemo(() => {
    return computeNextDueDate(item.firstDueDate || item.dueDate, stats.currentPaidTerms + (payMode === 'advance' ? advanceMonths : 1));
  }, [item.firstDueDate, item.dueDate, stats.currentPaidTerms, payMode, advanceMonths]);

  const activeAmountCents = payMode === 'monthly' ? monthlyAmountCents : advanceAmountCents;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (activeAmountCents <= 0) newErrors.amount = 'Please enter an amount to pay.';
    if (!refNumber.trim()) newErrors.ref = 'Please enter payment reference number (GCash, Maya, Bank Ref).';
    if (!payDate) newErrors.date = 'Please select payment date.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      let paidAtTimestamp = Date.now();
      try {
        const [y, m, d] = payDate.split('-').map((x) => parseInt(x, 10));
        const [hr, mn] = payTime.split(':').map((x) => parseInt(x, 10));
        paidAtTimestamp = new Date(y, m - 1, d, hr || 0, mn || 0).getTime();
      } catch {
        paidAtTimestamp = Date.now();
      }

      if (payMode === 'monthly') {
        const isLate = daysOverdue > 0;
        await recordLoanPayment(groupId, item, user, {
          amountCents: monthlyAmountCents,
          principalCents: monthlyPrincipalCents,
          interestCents: lateInterestCents,
          termsCovered: 1,
          daysOverdue: isLate ? daysOverdue : 0,
          paymentType: isLate ? 'late' : 'regular',
          refNumber: refNumber.trim(),
          paidAt: paidAtTimestamp,
          note: note.trim() || undefined,
        });

        const nextMsg = futureDueDate ? ` Next bill: ${formatDueDateReadable(futureDueDate)}.` : '';
        const interestMsg = lateInterestCents > 0 ? ` (Includes ${formatMoney(lateInterestCents)} late fee)` : '';
        toast(`Month ${startTermNumber} payment recorded.${interestMsg}${nextMsg}`);
      } else {
        // Advance payment
        await recordLoanPayment(groupId, item, user, {
          amountCents: advanceAmountCents,
          principalCents: advanceAmountCents,
          interestCents: 0,
          termsCovered: advanceMonths,
          daysOverdue: 0,
          paymentType: 'advance',
          refNumber: refNumber.trim(),
          paidAt: paidAtTimestamp,
          note: note.trim() || undefined,
        });

        const nextMsg = futureDueDate ? ` Next bill jumps to ${formatDueDateReadable(futureDueDate)}.` : '';
        toast(`Advance payment for ${advanceMonths} months (months ${startTermNumber}–${endTermNumber}) recorded.${nextMsg}`);
      }

      onClose();
      onSuccess?.();
    } catch (err: any) {
      toast(err?.message || 'Failed to record payment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={payMode === 'monthly' ? `Pay month ${startTermNumber}` : `Pay ${advanceMonths} months ahead`}
      description={`${item.store ? `${item.store} · ` : ''}${item.description}`}
    >
      <form onSubmit={submit} className="space-y-4 pt-1" noValidate>
        {/* Payment Mode Selector Tabs */}
        <div className="grid grid-cols-2 rounded-[14px] bg-fill p-1 ring-1 ring-hairline">
          <button
            type="button"
            onClick={() => setPayMode('monthly')}
            className={`flex items-center justify-center gap-1.5 rounded-[11px] py-2 text-[12.5px] font-semibold transition ${
              payMode === 'monthly'
                ? 'bg-white text-ink shadow-xs ring-1 ring-hairline/80'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Calendar className="size-3.5" />
            <span>Monthly Cut-off</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPayMode('advance');
              handleSelectAdvanceMonths(advanceMonths);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-[11px] py-2 text-[12.5px] font-semibold transition ${
              payMode === 'advance'
                ? 'bg-white text-ink shadow-xs ring-1 ring-hairline/80'
                : 'text-muted hover:text-ink'
            }`}
          >
            <FastForward className="size-3.5" />
            <span>Advance Payment</span>
          </button>
        </div>

        {/* MODE 1: Monthly Cut-off */}
        {payMode === 'monthly' && (
          <div className="space-y-3">
            {/* Due date status banner */}
            {daysOverdue > 0 ? (
              <div className="flex items-start gap-2.5 rounded-[16px] bg-amber-500/10 p-3 ring-1 ring-amber-500/25">
                <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-amber-800">
                    Payment is {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                  </p>
                  <p className="text-[11px] text-amber-700/90 mt-0.5">
                    Original due date was {formatDueDateReadable(currentDueDate)}. If your payment includes a penalty or late fee, enter the total amount below. The late fee will be logged separately and will not reduce your remaining loan principal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-[16px] bg-fill p-3 ring-1 ring-hairline">
                <div>
                  <p className="text-[10.5px] font-medium text-muted uppercase tracking-wider">Upcoming Due Date</p>
                  <p className="text-[13px] font-semibold text-ink mt-0.5">{formatDueDateReadable(currentDueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] font-medium text-muted uppercase tracking-wider">Paying for</p>
                  <p className="text-[13px] font-semibold text-accent mt-0.5">
                    Month {startTermNumber} of {stats.totalTerms}
                  </p>
                </div>
              </div>
            )}

            {/* Monthly Amount Input */}
            <TextField
              id="pay-monthly-amount"
              label="Amount Paid"
              prefix="₱"
              placeholder="0.00"
              inputMode="decimal"
              value={monthlyAmountInput}
              error={errors.amount}
              hint={stats.monthlyCents > 0 ? `Standard monthly bill: ${formatMoney(stats.monthlyCents)}` : undefined}
              onChange={(e) => {
                setMonthlyAmountInput(cleanMoneyInput(e.target.value));
                setErrors((prev) => ({ ...prev, amount: '' }));
              }}
            />

            {/* Late Interest / Penalty Breakdown Box */}
            {isLateWithExtra && (
              <div className="rounded-[16px] bg-fill p-3.5 ring-1 ring-hairline space-y-2">
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink">
                  <Info className="size-3.5 text-accent" />
                  <span>Payment Breakdown</span>
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Monthly Principal (reduces loan):</span>
                    <span className="font-semibold text-ink tabular-nums">{formatMoney(monthlyPrincipalCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="font-medium">Late Penalty / Interest fee ({daysOverdue} days late):</span>
                    <span className="font-semibold tabular-nums">+{formatMoney(lateInterestCents)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-hairline flex items-center justify-between font-semibold">
                    <span className="text-ink">Total Cash Sent:</span>
                    <span className="text-ink tabular-nums">{formatMoney(monthlyAmountCents)}</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-muted italic">
                  * Note: Only the ₱{formatMoney(monthlyPrincipalCents).replace('₱', '')} principal is subtracted from your loan. Total original loan remains untouched.
                </p>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: Advance Payment */}
        {payMode === 'advance' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1.5">
                Select Number of Months in Advance
              </label>
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 6].filter((n) => n <= maxAdvance).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleSelectAdvanceMonths(n)}
                    className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
                      advanceMonths === n
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-fill text-ink ring-1 ring-hairline hover:bg-canvas'
                    }`}
                  >
                    {n} Months
                  </button>
                ))}
                {maxAdvance > 1 && (
                  <button
                    type="button"
                    onClick={() => handleSelectAdvanceMonths(maxAdvance)}
                    className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
                      advanceMonths === maxAdvance
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-fill text-ink ring-1 ring-hairline hover:bg-canvas'
                    }`}
                  >
                    All Left ({maxAdvance} mos)
                  </button>
                )}
              </div>
            </div>

            {/* Advance Amount Input */}
            <TextField
              id="pay-advance-amount"
              label={`Total Advance Payment (${advanceMonths} Months)`}
              prefix="₱"
              placeholder="0.00"
              inputMode="decimal"
              value={advanceAmountInput}
              error={errors.amount}
              hint={`Calculated as ${advanceMonths} × ${formatMoney(stats.monthlyCents)}`}
              onChange={(e) => {
                setAdvanceAmountInput(cleanMoneyInput(e.target.value));
                setErrors((prev) => ({ ...prev, amount: '' }));
              }}
            />

            {/* Advance Impact Summary Card */}
            <div className="rounded-[16px] bg-accent/5 p-3.5 ring-1 ring-accent/20 space-y-2">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-accent">
                <CheckCircle2 className="size-3.5" />
                <span>Advance Payment Impact</span>
              </div>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Terms Covered:</span>
                  <span className="font-semibold text-ink">
                    Months {startTermNumber}–{endTermNumber} ({advanceMonths} mos)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Balance Decrease:</span>
                  <span className="font-semibold text-ok tabular-nums">-{formatMoney(advanceAmountCents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Progress After Paying:</span>
                  <span className="font-semibold text-ink">
                    {stats.currentPaidTerms + advanceMonths} of {stats.totalTerms} mos paid ({Math.min(100, Math.round(((stats.currentPaidTerms + advanceMonths) / stats.totalTerms) * 100))}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Next Bill Jumps To:</span>
                  <span className="font-semibold text-accent">
                    {futureDueDate ? formatDueDateReadable(futureDueDate) : 'Fully Paid ✓'}
                  </span>
                </div>
              </div>
              <p className="text-[10.5px] text-muted">
                * Monthly amortization remains consistent at {formatMoney(stats.monthlyCents)}.
              </p>
            </div>
          </div>
        )}

        {/* Payment Reference Number */}
        <div>
          <TextField
            id="pay-ref"
            label="Payment Reference Number"
            placeholder="e.g. 102938491823 (GCash, Maya, Bank Ref)"
            value={refNumber}
            maxLength={60}
            error={errors.ref}
            onChange={(e) => {
              setRefNumber(e.target.value);
              setErrors((prev) => ({ ...prev, ref: '' }));
            }}
          />
          <p className="mt-1 text-[11px] text-muted">
            Receipt code from your digital wallet or bank confirmation.
          </p>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="pay-date"
            label="Payment Date"
            type="date"
            value={payDate}
            error={errors.date}
            onChange={(e) => {
              setPayDate(e.target.value);
              setErrors((prev) => ({ ...prev, date: '' }));
            }}
            className="appearance-none text-left [&::-webkit-date-and-time-value]:text-left"
          />

          <TextField
            id="pay-time"
            label="Payment Time"
            type="time"
            value={payTime}
            onChange={(e) => setPayTime(e.target.value)}
            className="appearance-none text-left [&::-webkit-date-and-time-value]:text-left"
          />
        </div>

        {/* Notes (Optional) */}
        <TextField
          id="pay-note"
          label="Notes / Receipt Remarks (optional)"
          placeholder="e.g. Sent via GCash App to Sumisho"
          value={note}
          maxLength={120}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Simple Pay Action Button */}
        <div className="pt-2">
          <Button type="submit" size="lg" full disabled={submitting}>
            {submitting ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
