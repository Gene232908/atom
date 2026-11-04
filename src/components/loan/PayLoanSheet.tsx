import { useState, useMemo, type FormEvent } from 'react';
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

export function PayLoanSheet({ open, onClose, item, groupId, onSuccess }: Props) {
  const user = useUser();
  const toast = useToast();

  const stats = useMemo(() => computeLoanStats(item), [item]);
  const defaultAmount = stats.monthlyCents > 0 ? stats.monthlyCents : stats.remainingCents;

  const [amountInput, setAmountInput] = useState(centsToInput(defaultAmount));
  const [refNumber, setRefNumber] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payTime, setPayTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const amountCents = toCents(amountInput) ?? 0;
  const termNumber = stats.nextTermNumber || stats.currentPaidTerms + 1;

  // Real-time preview of next bill date after this payment
  const nextDueDatePreview = useMemo(() => {
    return computeNextDueDate(item.firstDueDate || item.dueDate, stats.currentPaidTerms + 1);
  }, [item.firstDueDate, item.dueDate, stats.currentPaidTerms]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (amountCents <= 0) newErrors.amount = 'Please enter an amount to pay.';
    if (!refNumber.trim()) newErrors.ref = 'Please enter payment reference number (e.g. GCash / Maya ref).';
    if (!payDate) newErrors.date = 'Please select payment date.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      // Parse datetime
      let paidAtTimestamp = Date.now();
      try {
        const [y, m, d] = payDate.split('-').map((x) => parseInt(x, 10));
        const [hr, mn] = payTime.split(':').map((x) => parseInt(x, 10));
        paidAtTimestamp = new Date(y, m - 1, d, hr || 0, mn || 0).getTime();
      } catch {
        paidAtTimestamp = Date.now();
      }

      await recordLoanPayment(groupId, item, user, {
        amountCents,
        refNumber: refNumber.trim(),
        paidAt: paidAtTimestamp,
        note: note.trim() || `Payment #${termNumber} of ${stats.totalTerms}`,
      });

      const nextBillMsg = nextDueDatePreview ? ` Next bill is on ${formatDueDateReadable(nextDueDatePreview)}.` : '';
      toast(`Payment of ${formatMoney(amountCents)} for Month #${termNumber} recorded!${nextBillMsg}`);
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
      title={`Pay Installment #${termNumber}`}
      description={`${item.store ? `${item.store} · ` : ''}${item.description}`}
    >
      <form onSubmit={submit} className="space-y-4 pt-1" noValidate>
        {/* Next Bill Preview Box */}
        <div className="rounded-[18px] bg-fill p-3.5 ring-1 ring-hairline">
          <div className="flex items-center justify-between text-[12px] font-semibold text-muted">
            <span>INSTALLMENT SCHEDULE</span>
            <span className="text-accent font-bold">Month #{termNumber} of {stats.totalTerms}</span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-left">
            <div className="rounded-[12px] bg-white p-2.5 shadow-sm ring-1 ring-hairline/60">
              <p className="text-[10.5px] font-medium text-muted">Current Due Date</p>
              <p className="mt-0.5 text-[13px] font-bold text-ink">
                {formatDueDateReadable(stats.nextDueDate || item.dueDate)}
              </p>
            </div>

            <div className="rounded-[12px] bg-white p-2.5 shadow-sm ring-1 ring-hairline/60">
              <p className="text-[10.5px] font-medium text-muted">Next Bill After Paying</p>
              <p className="mt-0.5 text-[13px] font-bold text-ok">
                {nextDueDatePreview ? formatDueDateReadable(nextDueDatePreview) : 'Fully Paid ✓'}
              </p>
            </div>
          </div>
        </div>

        {/* Amount to pay */}
        <TextField
          id="pay-amount"
          label="Amount to Pay"
          prefix="₱"
          placeholder="0.00"
          inputMode="decimal"
          value={amountInput}
          error={errors.amount}
          hint={stats.monthlyCents > 0 ? `Standard monthly cut-off: ${formatMoney(stats.monthlyCents)}` : undefined}
          onChange={(e) => {
            setAmountInput(cleanMoneyInput(e.target.value));
            setErrors((prev) => ({ ...prev, amount: '' }));
          }}
        />

        {/* Reference Number */}
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
            Crucial for tracking so you have receipts of every payment.
          </p>
        </div>

        {/* Date and Time in Grid */}
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

        {/* Note */}
        <TextField
          id="pay-note"
          label="Notes / Receipt Remarks (optional)"
          placeholder="e.g. Paid in full via GCash App"
          value={note}
          maxLength={120}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="pt-2">
          <Button type="submit" size="lg" full disabled={submitting}>
            {submitting ? 'Recording...' : `Record Payment (${formatMoney(amountCents)})`}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
