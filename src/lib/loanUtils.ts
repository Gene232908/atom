import type { Item, PaymentRecord } from './types';

/**
 * Calculates next bill due date given the original first due date and number of paid terms.
 * Always maintains consistent calendar day-of-month.
 */
export function computeNextDueDate(firstDueDate: string | null | undefined, termsPaid: number): string | null {
  if (!firstDueDate) return null;
  const parts = firstDueDate.split('-');
  if (parts.length < 3) return firstDueDate;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // 0-indexed
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return firstDueDate;

  // Add termsPaid months
  const target = new Date(y, m + termsPaid, 1);
  // Get max days in target month
  const maxDays = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const day = Math.min(d, maxDays);
  target.setDate(day);

  const nextY = target.getFullYear();
  const nextM = String(target.getMonth() + 1).padStart(2, '0');
  const nextD = String(target.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

export interface LoanStats {
  totalPriceCents: number;
  monthlyCents: number;
  totalTerms: number;
  initialPaidTerms: number;
  currentPaidTerms: number;
  termsLeft: number;
  totalPaidCents: number;
  remainingCents: number;
  isFullyPaid: boolean;
  progressPercent: number;
  nextTermNumber: number | null;
  nextDueDate: string | null;
  confirmedPayments: PaymentRecord[];
}

export function computeLoanStats(item: Item): LoanStats {
  const totalPriceCents = item.priceCents;
  const totalTerms = item.totalTerms || item.installmentsCount || 1;
  const monthlyCents =
    item.monthlyCents && item.monthlyCents > 0
      ? item.monthlyCents
      : totalTerms > 0
        ? Math.round(totalPriceCents / totalTerms)
        : 0;

  const initialPaidTerms = Math.min(totalTerms, item.initialPaidTerms || 0);
  const payments = Array.isArray(item.payments) ? item.payments : [];
  const confirmedPayments = payments.filter((p) => p && p.status === 'confirmed');

  const currentPaidTerms = Math.min(totalTerms, initialPaidTerms + confirmedPayments.length);
  const termsLeft = Math.max(0, totalTerms - currentPaidTerms);

  const initialPaidCents = item.initialPaidCents || initialPaidTerms * monthlyCents;
  const paymentsTotalCents = confirmedPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0);
  const totalPaidCents = Math.min(totalPriceCents, initialPaidCents + paymentsTotalCents);
  const remainingCents = Math.max(0, totalPriceCents - totalPaidCents);

  const isFullyPaid = termsLeft === 0 || remainingCents === 0;
  const progressPercent = totalTerms > 0 ? Math.min(100, Math.round((currentPaidTerms / totalTerms) * 100)) : 0;
  const nextTermNumber = isFullyPaid ? null : currentPaidTerms + 1;
  const nextDueDate = isFullyPaid
    ? null
    : computeNextDueDate(item.firstDueDate || item.dueDate, currentPaidTerms);

  return {
    totalPriceCents,
    monthlyCents,
    totalTerms,
    initialPaidTerms,
    currentPaidTerms,
    termsLeft,
    totalPaidCents,
    remainingCents,
    isFullyPaid,
    progressPercent,
    nextTermNumber,
    nextDueDate,
    confirmedPayments,
  };
}

export function formatDueDateReadable(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No due date';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
