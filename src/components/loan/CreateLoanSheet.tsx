import { useState, useMemo, type FormEvent } from 'react';
import { useUser } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { createGroup } from '../../services/groups';
import { addItem } from '../../services/items';
import { cleanMoneyInput, centsToInput, formatMoney, toCents } from '../../lib/money';
import { listGradient } from '../../lib/cardTheme';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { ColorPicker } from '../ui/ColorPicker';
import { WalletCard } from '../ui/WalletCard';
import { computeFirstDueDate, formatDueDateReadable } from '../../lib/loanUtils';

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
  onCreated?: (groupId: string, itemId: string) => void;
}

export function CreateLoanSheet({ open, onClose, onCreated }: Props) {
  const user = useUser();
  const toast = useToast();

  const [provider, setProvider] = useState('');
  const [description, setDescription] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [monthlyInput, setMonthlyInput] = useState('');
  const [totalTermsInput, setTotalTermsInput] = useState('18');
  const [isExisting, setIsExisting] = useState(false);
  const [alreadyPaidMonthsInput, setAlreadyPaidMonthsInput] = useState('0');
  const [dueDayInput, setDueDayInput] = useState('15');
  const [startMonthOffset, setStartMonthOffset] = useState(() => {
    return new Date().getDate() <= 15 ? 0 : 1;
  });
  const [color, setColor] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const priceCents = toCents(priceInput) ?? 0;
  const totalTerms = Math.max(1, parseInt(totalTermsInput, 10) || 1);
  const alreadyPaidTerms = isExisting ? Math.min(totalTerms, Math.max(0, parseInt(alreadyPaidMonthsInput, 10) || 0)) : 0;
  const termsLeft = Math.max(0, totalTerms - alreadyPaidTerms);

  const autoMonthlyCents = totalTerms > 0 && priceCents > 0 ? Math.round(priceCents / totalTerms) : 0;
  const manualMonthlyCents = toCents(monthlyInput);
  const monthlyCents = manualMonthlyCents && manualMonthlyCents > 0 ? manualMonthlyCents : autoMonthlyCents;

  const initialPaidCents = alreadyPaidTerms * monthlyCents;
  const remainingCents = Math.max(0, priceCents - initialPaidCents);
  const progressPercent = totalTerms > 0 ? Math.min(100, Math.round((alreadyPaidTerms / totalTerms) * 100)) : 0;

  const dueDay = Math.min(31, Math.max(1, parseInt(dueDayInput, 10) || 15));

  const monthOptions = useMemo(() => {
    const now = new Date();
    const list: { offset: number; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({
        offset: i,
        label: i === 0 ? `This month (${mName})` : i === 1 ? `Next month (${mName})` : mName,
      });
    }
    return list;
  }, []);

  const computedNextDueDate = useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + startMonthOffset, 1);
    const maxDays = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    const day = Math.min(dueDay, maxDays);
    target.setDate(day);

    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [dueDay, startMonthOffset]);

  const computedFirstDueDate = useMemo(() => {
    return computeFirstDueDate(computedNextDueDate, alreadyPaidTerms);
  }, [computedNextDueDate, alreadyPaidTerms]);

  const handleAutoDivide = () => {
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

    const parsedDueDay = parseInt(dueDayInput, 10);
    if (isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
      newErrors.dueDay = 'Enter a valid day of the month (1 – 31).';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      // 1. Create personal loan group
      const { id: groupId, saved: groupSaved } = createGroup(user, cleanProvider, color, 'loan');
      await groupSaved;

      // 2. Add personal loan item
      const now = Date.now();
      const billingCycleLabel = `Every ${dueDay}th of the month`;
      const itemId = await addItem(groupId, {
        description: cleanDesc,
        priceCents,
        splitCents: priceCents,
        shares: {
          [user.uid]: {
            name: user.displayName || 'Me',
            status: alreadyPaidTerms >= totalTerms ? 'paid' : 'unpaid',
            paidCents: initialPaidCents,
            updatedAt: now,
          },
        },
        dueDate: computedNextDueDate,
        firstDueDate: computedFirstDueDate,
        billingCycle: billingCycleLabel,
        installmentsCount: totalTerms,
        totalTerms,
        initialPaidTerms: alreadyPaidTerms,
        initialPaidCents,
        monthlyCents,
        store: cleanProvider,
        color,
        isPersonalLoan: true,
      });

      toast(`Added ${cleanDesc} under ${cleanProvider}!`);
      onClose();
      onCreated?.(groupId, itemId);
    } catch (err: any) {
      toast(err?.message || 'Failed to save loan. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Add Personal Loan"
      description="Track your own motorcycle, gadget, or bank loan progress."
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
              <p className="text-[10px] font-semibold tracking-wider text-white/75 uppercase">Remaining</p>
              <p className="text-[18px] sm:text-[20px] font-bold text-white tabular-nums drop-shadow">
                {formatMoney(remainingCents)}
              </p>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-white/85">
              <span>
                {alreadyPaidTerms > 0 ? `${alreadyPaidTerms} of ${totalTerms} mos paid` : `New loan · ${totalTerms} mos`}
              </span>
              <span>{termsLeft} mos left</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </WalletCard>

        {/* Card Color - placed directly below the card */}
        <ColorPicker
          label="Card Color"
          value={color}
          onChange={setColor}
          autoBackground={listGradient('loan', '', provider)}
          hint="Auto matches the provider. Choose color for your wallet card."
        />

        {/* Loan Provider (Sumisho, Home Credit, etc.) */}
        <div>
          <TextField
            id="loan-provider"
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
                    on ? 'bg-accent/15 text-accent font-semibold ring-1 ring-accent/40' : 'bg-fill text-ink ring-1 ring-hairline'
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
          id="loan-desc"
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
            id="loan-price"
            label="Total Price / Loan Amount"
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
              <label htmlFor="loan-monthly" className="block text-[13px] font-medium text-ink">
                Monthly Cut-off Bill
              </label>
              {autoMonthlyCents > 0 && (
                <button
                  type="button"
                  onClick={handleAutoDivide}
                  className="text-[11px] font-semibold text-accent hover:underline"
                >
                  Auto ({formatMoney(autoMonthlyCents)})
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-muted">₱</span>
              <input
                id="loan-monthly"
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
                Calculated: <span className="font-semibold text-ink">{formatMoney(autoMonthlyCents)}/mo</span> (tap Auto above to apply)
              </p>
            )}
            {errors.monthly && <p className="mt-1 text-[12px] text-bad">{errors.monthly}</p>}
          </div>
        </div>

        {/* Terms (Total Months) */}
        <div>
          <label className="block text-[13px] font-medium text-ink">Total Terms (Number of Months)</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="120"
              value={totalTermsInput}
              onChange={(e) => setTotalTermsInput(e.target.value)}
              className="w-24 rounded-[14px] bg-fill px-3 py-2 text-[15px] font-bold text-ink text-center outline-none ring-1 ring-hairline focus:ring-accent"
            />
            <span className="text-[13px] text-muted">months</span>

            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pl-2">
              {TERM_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTotalTermsInput(String(t))}
                  className={`h-7 shrink-0 rounded-full px-2.5 text-[12px] font-semibold transition active:scale-95 ${
                    totalTerms === t ? 'bg-ink text-white shadow-sm' : 'bg-fill text-muted hover:text-ink ring-1 ring-hairline'
                  }`}
                >
                  {t}m
                </button>
              ))}
            </div>
          </div>
          {errors.terms && <p className="mt-1 text-[12px] text-bad">{errors.terms}</p>}
        </div>

        {/* Starting Status: New vs Ongoing Loan */}
        <div className="rounded-[18px] bg-fill p-3.5 ring-1 ring-hairline">
          <label className="block text-[12px] font-semibold text-muted uppercase tracking-wider">Starting Status</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsExisting(false);
                setAlreadyPaidMonthsInput('0');
              }}
              className={`rounded-[12px] p-2.5 text-left transition active:scale-95 ${
                !isExisting
                  ? 'bg-white shadow-sm ring-1.5 ring-accent text-ink'
                  : 'bg-black/[0.03] text-muted hover:text-ink'
              }`}
            >
              <p className="text-[13px] font-bold">Brand New Loan</p>
              <p className="text-[11px] text-muted leading-tight mt-0.5">Starts from month 1</p>
            </button>

            <button
              type="button"
              onClick={() => setIsExisting(true)}
              className={`rounded-[12px] p-2.5 text-left transition active:scale-95 ${
                isExisting
                  ? 'bg-white shadow-sm ring-1.5 ring-accent text-ink'
                  : 'bg-black/[0.03] text-muted hover:text-ink'
              }`}
            >
              <p className="text-[13px] font-bold">Ongoing Loan</p>
              <p className="text-[11px] text-muted leading-tight mt-0.5">Has existing payments</p>
            </button>
          </div>

          {isExisting && (
            <div className="mt-3 pt-3 border-t border-hairline animate-fade-in">
              <label htmlFor="already-paid" className="block text-[12.5px] font-semibold text-ink">
                Months Already Paid
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="already-paid"
                  type="number"
                  min="1"
                  max={totalTerms}
                  value={alreadyPaidMonthsInput}
                  onChange={(e) => setAlreadyPaidMonthsInput(e.target.value)}
                  className="w-24 rounded-[12px] bg-white px-3 py-2 text-[15px] font-bold text-ink text-center outline-none ring-1 ring-hairline focus:ring-accent"
                />
                <span className="text-[12.5px] text-muted">
                  months completed
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] font-medium text-accent">
                {totalTerms} total months - {alreadyPaidTerms} paid = <span className="font-bold">{termsLeft} months left</span> to pay.
              </p>
            </div>
          )}
        </div>

        {/* Due Day and Billing Month */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            id="loan-due-day"
            label="Monthly Due Day"
            type="number"
            min={1}
            max={31}
            placeholder="15"
            value={dueDayInput}
            error={errors.dueDay}
            hint="Day of each month (1 – 31)"
            onChange={(e) => {
              setDueDayInput(e.target.value);
              setErrors((prev) => ({ ...prev, dueDay: '' }));
            }}
          />

          <div>
            <label htmlFor="loan-due-month" className="block text-[13px] font-medium text-ink">
              {isExisting ? 'Next Due Month' : 'First Payment Month'}
            </label>
            <select
              id="loan-due-month"
              value={startMonthOffset}
              onChange={(e) => setStartMonthOffset(parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded-[14px] bg-fill px-3.5 py-2.5 text-[14px] font-semibold text-ink outline-none ring-1 ring-hairline focus:ring-accent"
            >
              {monthOptions.map((opt) => (
                <option key={opt.offset} value={opt.offset}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted">
              {isExisting ? 'Next bill due' : 'First bill due'}: {formatDueDateReadable(computedNextDueDate)}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" size="lg" full disabled={submitting}>
            {submitting ? 'Adding loan...' : 'Save Personal Loan'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
