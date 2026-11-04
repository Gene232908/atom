import { useEffect, useState } from 'react';
import { Check, Download, QrCode, ReceiptText, ShoppingBag } from 'lucide-react';
import { loadQr } from '../../services/groups';
import { groupGradient, itemGradient } from '../../lib/cardTheme';
import { friendlyError } from '../../lib/errors';
import { centsToInput, cleanMoneyInput, formatMoney, toCents } from '../../lib/money';
import { confirmedPaid, firstName } from '../../lib/items';
import type { Group, Item } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { CopyLines } from '../ui/CopyLines';
import { WalletCard } from '../ui/WalletCard';

interface Props {
  open: boolean;
  onClose: () => void;
  group: Group;
  uid: string;
  /** Paying for one item. When null, paying for everything. */
  item: Item | null;
  totalCents: number;
  unpaidCount: number;
  onPaid: (item: Item | null, amountCents?: number, refNumber?: string, note?: string) => void;
}

/** Where and how much to pay. Supports partial/installment cutoffs and alphanumeric reference numbers. */
export function PaySheet({ open, onClose, group, uid, item, totalCents, unpaidCount, onPaid }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'Maya' | 'Bank Transfer' | 'Cash'>('GCash');
  const [refNumber, setRefNumber] = useState('');
  const [note, setNote] = useState('');
  const [payMode, setPayMode] = useState<'full' | 'custom'>('full');
  const [customAmountInput, setCustomAmountInput] = useState('');

  const ownerName = firstName(group.members[group.ownerId]?.name ?? 'the lender');

  // Calculate user's remaining balance for this item
  const paidSoFar = item ? confirmedPaid(item, uid) : 0;
  const remainingCents = item ? Math.max(0, item.splitCents - paidSoFar) : totalCents;

  const installmentMonthly =
    item?.installmentsCount && item.installmentsCount > 1
      ? Math.round(item.splitCents / item.installmentsCount)
      : null;

  useEffect(() => {
    if (!open) {
      setRefNumber('');
      setNote('');
      setPayMode('full');
      setCustomAmountInput('');
      return;
    }
    if (installmentMonthly && installmentMonthly < remainingCents) {
      setCustomAmountInput(centsToInput(installmentMonthly));
    }
  }, [open, installmentMonthly, remainingCents]);

  useEffect(() => {
    if (!open || !group.hasQr) return;
    let alive = true;
    setLoading(true);
    setError('');
    loadQr(group.id)
      .then((img) => alive && setQr(img))
      .catch((err) => alive && setError(friendlyError(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, group.id, group.hasQr]);


  const customCents = toCents(customAmountInput) ?? 0;
  const isPartial = Boolean(item) && payMode === 'custom';
  // Partial: exactly what they typed (never more than they owe). Empty means nothing to pay yet.
  const amountToPay = isPartial ? Math.min(customCents, remainingCents) : remainingCents;
  const tooMuch = isPartial && customCents > remainingCents;
  const nothing = !group.hasQr && !group.paymentNote;
  const canMark = item ? remainingCents > 0 : unpaidCount > 0;

  const handlePaidSubmit = () => {
    const cleanRef = refNumber.trim();
    const finalRef = cleanRef
      ? (cleanRef.toLowerCase().includes(paymentMethod.toLowerCase()) ? cleanRef : `${paymentMethod} · Ref: ${cleanRef}`)
      : `${paymentMethod} payment`;
    const finalNote = note.trim() || `Paid via ${paymentMethod}`;
    onPaid(item, amountToPay, finalRef, finalNote);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pay now"
      description={`Send your payment to ${ownerName}, then tap the button below.`}
      footer={
        canMark ? (
          <Button
            size="lg"
            full
            icon={<Check className="size-5" strokeWidth={2.5} />}
            onClick={handlePaidSubmit}
            disabled={amountToPay <= 0}
          >
            {amountToPay > 0 ? `I paid ${formatMoney(amountToPay)}` : 'Type the amount you paid'}
          </Button>
        ) : undefined
      }
    >
      <WalletCard
        seed={item?.id ?? group.id}
        background={item ? itemGradient(item, group) : groupGradient(group)}
        className="p-4"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-3.5 shrink-0" />
          <p className="min-w-0 flex-1 truncate text-[12px] font-semibold tracking-[0.1em] uppercase">
            {item ? item.store.trim() || group.name : group.name}
          </p>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[13px] text-white/85">
          {item ? item.description : `All ${unpaidCount} unpaid ${unpaidCount === 1 ? 'item' : 'items'}`}
        </p>

        {paidSoFar > 0 && item && (
          <p className="mt-1.5 text-[11px] text-white/80">
            Paid so far: {formatMoney(paidSoFar)} · Balance: {formatMoney(remainingCents)}
          </p>
        )}

        <p className="mt-3 text-[11px] text-white/75">Amount to pay</p>
        <p className="text-[24px] leading-tight font-bold tabular-nums wrap-break-word">
          {formatMoney(amountToPay)}
        </p>
        <p className="mt-0.5 text-[11px] text-white/75">Pay to {group.members[group.ownerId]?.name ?? ownerName}</p>
      </WalletCard>

      {/* If this is an installment item, let the user choose cut-off payment */}
      {item && remainingCents > 0 && (
        <div className="mt-4 rounded-[20px] bg-white p-4">
          <p className="text-[12px] font-medium text-muted">How much are you paying?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPayMode('full')}
              className={`rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition active:scale-95 ${
                payMode === 'full'
                  ? 'bg-accent/10 text-accent ring-1 ring-accent/40'
                  : 'bg-fill text-muted hover:text-ink'
              }`}
            >
              Full balance
              <span className="block text-[11px] font-normal opacity-80">{formatMoney(remainingCents)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPayMode('custom');
                if (!customAmountInput && installmentMonthly) {
                  setCustomAmountInput(centsToInput(installmentMonthly));
                }
              }}
              className={`rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition active:scale-95 ${
                payMode === 'custom'
                  ? 'bg-accent/10 text-accent ring-1 ring-accent/40'
                  : 'bg-fill text-muted hover:text-ink'
              }`}
            >
              Part of it
              <span className="block text-[11px] font-normal opacity-80">
                {installmentMonthly ? `${formatMoney(installmentMonthly)}/mo` : 'Type the amount'}
              </span>
            </button>
          </div>

          {payMode === 'custom' && (
            <div className="mt-3">
              <label className="block text-[12px] font-medium text-muted">Amount (₱)</label>
              <input
                type="text"
                inputMode="decimal"
                value={customAmountInput}
                onChange={(e) => setCustomAmountInput(cleanMoneyInput(e.target.value))}
                placeholder="0.00"
                className="mt-1 w-full rounded-xl bg-fill px-3.5 py-2.5 text-[14px] font-semibold text-ink outline-none ring-1 ring-hairline focus:ring-accent"
              />
              <p className={`mt-1 text-[12px] ${tooMuch ? 'font-semibold text-bad' : 'text-muted'}`}>
                {tooMuch
                  ? `You only owe ${formatMoney(remainingCents)}. We will use that amount.`
                  : `You still owe ${formatMoney(remainingCents)}.`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reference Number & Payment Method Input */}
      <div className="mt-4 rounded-[20px] bg-white p-4">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
          <ReceiptText className="size-3.5" />
          <span>How did you pay?</span>
        </div>

        {/* Quick Payment Method Selector */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(['GCash', 'Maya', 'Bank Transfer', 'Cash'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold transition active:scale-95 ${
                paymentMethod === method
                  ? 'bg-accent/10 text-accent ring-1 ring-accent/40'
                  : 'bg-fill text-muted hover:text-ink'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <label className="block text-[12px] font-medium text-muted">Reference number (optional)</label>
          <input
            type="text"
            value={refNumber}
            onChange={(e) => setRefNumber(e.target.value)}
            placeholder={paymentMethod === 'Cash' ? 'Not needed for cash' : 'e.g. 1002384915'}
            className="mt-1 w-full rounded-xl bg-fill px-3.5 py-2.5 font-mono text-[14px] font-medium text-ink outline-none ring-1 ring-hairline placeholder:text-muted/60 focus:ring-accent"
          />
        </div>

        <div className="mt-3">
          <label className="block text-[12px] font-medium text-muted">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 1st cutoff, May 15 installment"
            className="mt-1 w-full rounded-xl bg-fill px-3.5 py-2 text-[13px] text-ink outline-none ring-1 ring-hairline placeholder:text-muted/60 focus:ring-accent"
          />
        </div>
      </div>

      {nothing && (
        <div className="mt-4 rounded-[20px] bg-white p-5 text-center">
          <QrCode className="mx-auto size-8 text-muted" />
          <p className="mt-2 text-[14px] text-muted">
            {ownerName} has not added payment details yet. Please message them to ask where to pay.
          </p>
        </div>
      )}

      {group.paymentNote && (
        <div className="mt-4 rounded-[20px] bg-white p-4">
          <p className="mb-1.5 text-[11px] font-medium text-muted">Payment details</p>
          <CopyLines text={group.paymentNote} />
        </div>
      )}

      {group.hasQr && (
        <div className="mt-4 rounded-[20px] bg-white p-4 text-center">
          <p className="text-[13px] font-medium text-muted">Scan to pay</p>
          {loading ? (
            <div className="grid h-64 place-items-center text-muted">
              <Spinner className="size-7" />
            </div>
          ) : error ? (
            <p className="py-10 text-[14px] text-bad">{error}</p>
          ) : qr ? (
            <>
              <img src={qr} alt="Payment QR code" className="mx-auto mt-3 max-h-[55dvh] w-auto max-w-full rounded-2xl object-contain" />
              <p className="mt-2 text-[12px] text-muted">Tip: press and hold the picture to save it.</p>
              <a
                href={qr}
                download={`${group.name.replace(/[^\w-]+/g, '-') || 'payment'}-qr.jpg`}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-fill px-4 text-[13px] font-semibold text-accent transition active:scale-95"
              >
                <Download className="size-4" />
                Save QR picture
              </a>
            </>
          ) : (
            <p className="py-10 text-[14px] text-muted">The QR picture was removed.</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
