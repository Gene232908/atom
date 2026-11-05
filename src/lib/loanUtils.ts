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

/**
 * Calculates Month #1's due date from the target upcoming due date and already paid terms count.
 */
export function computeFirstDueDate(targetDateStr: string, alreadyPaidTerms: number): string {
  if (!targetDateStr || alreadyPaidTerms <= 0) return targetDateStr;
  const parts = targetDateStr.split('-');
  if (parts.length < 3) return targetDateStr;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return targetDateStr;

  const target = new Date(y, m - alreadyPaidTerms, 1);
  const maxDays = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, maxDays));

  const resY = target.getFullYear();
  const resM = String(target.getMonth() + 1).padStart(2, '0');
  const resD = String(target.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

export interface LoanStats {
  totalPriceCents: number;
  monthlyCents: number;
  totalTerms: number;
  initialPaidTerms: number;
  initialPaidCents: number;
  currentPaidTerms: number;
  termsLeft: number;
  totalPaidCents: number;
  remainingCents: number;
  totalInterestPaidCents: number;
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

  // Accumulate terms covered, principal applied, and interest fees across payments
  let paymentsTermsCount = 0;
  let paymentsPrincipalCents = 0;
  let totalInterestPaidCents = 0;

  for (const p of confirmedPayments) {
    const terms = p.termsCovered && p.termsCovered > 0 ? p.termsCovered : 1;
    paymentsTermsCount += terms;

    // Principal applied directly to the loan
    const principal = p.principalCents !== undefined
      ? p.principalCents
      : monthlyCents > 0
        ? Math.min(p.amountCents, terms * monthlyCents)
        : p.amountCents;

    paymentsPrincipalCents += principal;

    // Any late interest or penalty fee is tracked separately and does not reduce loan principal
    if (typeof p.interestCents === 'number' && p.interestCents > 0) {
      totalInterestPaidCents += p.interestCents;
    } else if (p.amountCents > principal) {
      totalInterestPaidCents += (p.amountCents - principal);
    }
  }

  const currentPaidTerms = Math.min(totalTerms, initialPaidTerms + paymentsTermsCount);
  const termsLeft = Math.max(0, totalTerms - currentPaidTerms);

  const initialPaidCents = item.initialPaidCents || initialPaidTerms * monthlyCents;
  // Principal reduces the loan balance; interest does NOT reduce principal
  const totalPaidCents = Math.min(totalPriceCents, initialPaidCents + paymentsPrincipalCents);
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
    initialPaidCents,
    currentPaidTerms,
    termsLeft,
    totalPaidCents,
    remainingCents,
    totalInterestPaidCents,
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
