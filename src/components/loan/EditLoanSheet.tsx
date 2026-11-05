import { useState, useMemo, type FormEvent } from 'react';
import { useToast } from '../../hooks/useToast';
import { updateLoan } from '../../services/items';
import { cleanMoneyInput, centsToInput, formatMoney, toCents } from '../../lib/money';
import { listGradient } from '../../lib/cardTheme';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { ColorPicker } from '../ui/ColorPicker';
import { WalletCard } from '../ui/WalletCard';
import { computeFirstDueDate, computeLoanStats } from '../../lib/loanUtils';
import type { Group, Item } from '../../lib/types';

const LOAN_SUGGESTIONS = [
  'Sumisho',
  'Home Credit',
  'Toyota Financial',
  'BDO Loan',
  'BPI Auto',
  'SSS Loan',
  'Pag-IBIG',
  'Maya Credit',
];

const TERM_PRESETS = [6, 12, 18, 24, 36, 48, 60];

interface Props {
  open: boolean;
  onClose: () => void;
  group: Group;
  item: Item;
  onSuccess?: () => void;
}

export function EditLoanSheet({ open, onClose, group, item, onSuccess }: Props) {
  const toast = useToast();
  const currentStats = useMemo(() => computeLoanStats(item), [item]);

  const [provider, setProvider] = useState(group.name || item.store || '');
  const [description, setDescription] = useState(item.description || '');
  const [priceInput, setPriceInput] = useState(() => centsToInput(item.priceCents));
  const [monthlyInput, setMonthlyInput] = useState(() =>
    item.monthlyCents ? centsToInput(item.monthlyCents) : '',
  );
  const [totalTermsInput, setTotalTermsInput] = useState(() =>
    String(item.totalTerms || item.installmentsCount || 1),
  );
  const startDue = currentStats.nextDueDate || item.dueDate || '';
  const [dueDate, setDueDate] = useState(startDue);
  const [color, setColor] = useState(() => group.color || item.color || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const priceCents = toCents(priceInput) ?? 0;
  const totalTerms = Math.max(1, parseInt(totalTermsInput, 10) || 1);
  const autoMonthlyCents = totalTerms > 0 && priceCents > 0 ? Math.round(priceCents / totalTerms) : 0;
  const manualMonthlyCents = toCents(monthlyInput);
  const monthlyCents = manualMonthlyCents && manualMonthlyCents > 0 ? manualMonthlyCents : autoMonthlyCents;

  const handleApplyAuto = () => {
    if (autoMonthlyCents > 0) {
      setMonthlyInput(centsToInput(autoMonthlyCents));
      setErrors((prev) => ({ ...prev, monthly: '' }));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const cleanProvider = provider.trim();
    const cleanDesc = description.trim();

    if (!cleanProvider) newErrors.provider = 'Please enter loan provider (e.g. Sumisho).';
    if (!cleanDesc) newErrors.description = 'Please enter item or loan name (e.g. PCX 160).';
    if (priceCents <= 0) newErrors.price = 'Please enter total loan price.';
    if (totalTerms <= 0) newErrors.terms = 'Please enter total number of months.';
    if (monthlyCents <= 0) newErrors.monthly = 'Please enter monthly cut-off amount.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      await updateLoan(
        group.id,
        item.id,
        { name: cleanProvider, color },
        {
          description: cleanDesc,
          priceCents,
          splitCents: priceCents,
          monthlyCents,
          totalTerms,
          installmentsCount: totalTerms,
          dueDate: dueDate || null,
          // The next bill is worked out from the first due date, so moving the upcoming date moves it too.
          ...(dueDate && dueDate !== startDue
            ? { firstDueDate: computeFirstDueDate(dueDate, currentStats.currentPaidTerms) }
            : {}),
          store: cleanProvider,
          color,
        },
      );

      toast(`Updated loan "${cleanDesc}"!`);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      toast(err?.message || 'Failed to update loan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Edit Loan Details"
      description={`Update settings for ${item.description}`}
    >
      <form onSubmit={submit} className="space-y-4 pt-1" noValidate>
        {/* Real-time Card Preview */}
        <WalletCard
          seed={provider || 'loan'}
          background={listGradient('loan', color, provider)}
          className="flex min-h-[175px] flex-col justify-between p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase backdrop-blur">
                Personal Loan
              </span>
              <p className="mt-1 truncate text-[16px] sm:text-[17px] font-bold text-white drop-shadow">
                {provider.trim() || 'Provider / Lender'}
              </p>
              <p className="truncate text-[13px] font-medium text-white/90">
                {description.trim() || 'Item / Loan Purpose'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[10px] font-semibold tracking-wider text-white/75 uppercase">Total Loan</p>
              <p className="text-[18px] sm:text-[20px] font-bold text-white tabular-nums drop-shadow">
                {formatMoney(priceCents)}
              </p>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-white/85">
              <span>
                {currentStats.currentPaidTerms} of {totalTerms} months paid
              </span>
              <span>{Math.max(0, totalTerms - currentStats.currentPaidTerms)} left</span>
            </div>
          </div>
        </WalletCard>

        {/* Card Color */}
        <ColorPicker
          label="Card Color"
          value={color}
          onChange={setColor}
          autoBackground={listGradient('loan', '', provider)}
        />

        {/* Loan Provider */}
        <div>
          <TextField
            id="edit-loan-provider"
            label="Lender / Card Provider"
            placeholder="e.g. Sumisho, Home Credit, Toyota Financial"
            value={provider}
            maxLength={60}
            error={errors.provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setErrors((prev) => ({ ...prev, provider: '' }));
            }}
          />
          <div className="no-scrollbar -mx-4 mt-1.5 flex gap-1.5 overflow-x-auto px-4 py-1 sm:-mx-5 sm:px-5">
            {LOAN_SUGGESTIONS.map((s) => {
              const on = provider.trim().toLowerCase() === s.toLowerCase();
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setProvider(on ? '' : s);
                    setErrors((prev) => ({ ...prev, provider: '' }));
                  }}
                  className={`h-7 shrink-0 rounded-full px-3 text-[12px] font-medium transition active:scale-95 ${
                    on
                      ? 'bg-accent/15 text-accent font-semibold ring-1 ring-accent/40'
                      : 'bg-fill text-ink ring-1 ring-hairline'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Item Name / Loan Purpose */}
        <TextField
          id="edit-loan-desc"
          label="Item / Loan Purpose"
          placeholder="e.g. PCX 160, iPhone 15, Car Installment"
          value={description}
          maxLength={100}
          error={errors.description}
          onChange={(e) => {
            setDescription(e.target.value);
            setErrors((prev) => ({ ...prev, description: '' }));
          }}
        />

        {/* Price & Monthly in Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            id="edit-loan-price"
            label="Total Loan Amount"
            prefix="₱"
            placeholder="0.00"
            inputMode="decimal"
            value={priceInput}
            error={errors.price}
            onChange={(e) => {
              setPriceInput(cleanMoneyInput(e.target.value));
              setErrors((prev) => ({ ...prev, price: '' }));
            }}
          />

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="edit-loan-monthly" className="block text-[13px] font-medium text-ink">
                Monthly Cut-off Bill
              </label>
              {autoMonthlyCents > 0 && (
                <button
                  type="button"
                  onClick={handleApplyAuto}
                  className="text-[11px] font-semibold text-accent hover:underline"
                >
                  Apply Auto ({formatMoney(autoMonthlyCents)})
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-muted">₱</span>
              <input
                id="edit-loan-monthly"
                type="text"
                inputMode="decimal"
                value={monthlyInput}
                onChange={(e) => {
                  setMonthlyInput(cleanMoneyInput(e.target.value));
                  setErrors((prev) => ({ ...prev, monthly: '' }));
                }}
                placeholder=""
                className="w-full rounded-[14px] bg-fill py-2.5 pl-8 pr-3.5 text-[15px] font-bold text-ink outline-none ring-1 ring-hairline focus:ring-accent"
              />
            </div>
            {autoMonthlyCents > 0 && !monthlyInput && (
              <p className="mt-1 text-[11px] text-muted">
                Calculated: <span className="font-semibold text-ink">{formatMoney(autoMonthlyCents)}/mo</span>
              </p>
            )}
            {errors.monthly && <p className="mt-1 text-[12px] text-bad">{errors.monthly}</p>}
          </div>
        </div>

        {/* Total Terms & Next Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-ink">Total Terms (Months)</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="120"
                value={totalTermsInput}
                onChange={(e) => setTotalTermsInput(e.target.value)}
                className="w-24 rounded-[14px] bg-fill px-3 py-2 text-[15px] font-bold text-ink text-center outline-none ring-1 ring-hairline focus:ring-accent"
              />
              <span className="text-[13px] text-muted">months</span>

              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pl-1">
                {TERM_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTotalTermsInput(String(t))}
                    className={`h-7 shrink-0 rounded-full px-2 text-[11.5px] font-semibold transition active:scale-95 ${
                      totalTerms === t
                        ? 'bg-ink text-white shadow-sm'
                        : 'bg-fill text-muted hover:text-ink ring-1 ring-hairline'
                    }`}
                  >
                    {t}m
                  </button>
                ))}
              </div>
            </div>
            {errors.terms && <p className="mt-1 text-[12px] text-bad">{errors.terms}</p>}
          </div>

          <TextField
            id="edit-loan-due-date"
            label="Upcoming Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="appearance-none text-left [&::-webkit-date-and-time-value]:text-left"
          />
        </div>

        <div className="pt-2">
          <Button type="submit" size="lg" full disabled={submitting}>
            {submitting ? 'Saving changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
