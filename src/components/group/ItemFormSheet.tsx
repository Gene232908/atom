import { useMemo, useState, type FormEvent } from 'react';
import { Check, CircleAlert, CreditCard, Trash2, UserPlus } from 'lucide-react';
import { useSafeWrite } from '../../hooks/useToast';
import { addItem, deleteItem, updateItem } from '../../services/items';
import { centsToInput, cleanMoneyInput, formatMoney, splitEvenly, toCents } from '../../lib/money';
import type { Group, Item, Share } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { Avatar } from '../ui/Avatar';
import { itemGradient } from '../../lib/cardTheme';
import { PeoplePicker, type PickPerson } from './PeoplePicker';

interface Props {
  open: boolean;
  onClose: () => void;
  group: Group;
  item: Item | null;
  onInvite: () => void;
}

export function ItemFormSheet(props: Props) {
  if (!props.open) return null;
  return <ItemForm key={props.item?.id ?? 'new'} {...props} />;
}

type Errors = Partial<Record<'description' | 'price' | 'people' | 'split', string>>;

function ItemForm({ onClose, group, item, onInvite }: Props) {
  const write = useSafeWrite();
  const ownerId = group.ownerId;

  // Only actual members of the group can be selected
  const people = useMemo<PickPerson[]>(() => {
    const list: PickPerson[] = group.memberIds
      .filter((uid) => group.members[uid])
      .map((uid) => ({
        uid,
        name: group.members[uid].name,
        photo: group.members[uid].photo,
        isMe: uid === ownerId,
        isPending: group.members[uid]?.status === 'pending',
      }));

    // If an item was previously saved with someone who later left, keep them so data isn't lost
    for (const [uid, share] of Object.entries(item?.shares ?? {})) {
      if (!list.some((p) => p.uid === uid)) {
        list.push({ uid, name: share.name, photo: '', isMe: uid === ownerId });
      }
    }

    return list.sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : a.name.localeCompare(b.name)));
  }, [group.memberIds, group.members, item, ownerId]);

  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item ? centsToInput(item.priceCents) : '');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(item ? Object.keys(item.shares) : people.filter((p) => !p.isMe).map((p) => p.uid)),
  );

  // Check if item was previously saved with custom per-person amounts
  const hasCustomShares = useMemo(() => {
    if (!item?.shares) return false;
    const shareValues = Object.values(item.shares);
    return shareValues.some((s) => typeof s.splitCents === 'number' && s.splitCents !== item.splitCents);
  }, [item]);

  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>(() => (hasCustomShares ? 'custom' : 'equal'));

  const [memberAmounts, setMemberAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (item?.shares) {
      for (const [uid, s] of Object.entries(item.shares)) {
        const val = s.splitCents ?? item.splitCents;
        map[uid] = centsToInput(val);
      }
    }
    return map;
  });

  const [dueDate, setDueDate] = useState(item?.dueDate ?? '');
  const [billingCycle, setBillingCycle] = useState(item?.billingCycle ?? '');
  const [installmentsCount, setInstallmentsCount] = useState<number>(item?.installmentsCount ?? 1);
  const [monthlyInput, setMonthlyInput] = useState(
    item?.monthlyCents ? centsToInput(item.monthlyCents) : '',
  );

  const store = item?.store ?? '';
  const color = item?.color ?? '';
  const [errors, setErrors] = useState<Errors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const priceCents = toCents(price) ?? 0;
  const autoSplit = splitEvenly(priceCents, selected.size);

  // Sum of custom amounts
  const customSumCents = useMemo(() => {
    let sum = 0;
    for (const uid of selected) {
      sum += toCents(memberAmounts[uid]) ?? 0;
    }
    return sum;
  }, [selected, memberAmounts]);

  const diffCents = priceCents - customSumCents;
  const effectiveSplitCents = splitMode === 'custom' ? Math.round(customSumCents / (selected.size || 1)) : autoSplit;
  const hasOtherMembers = people.some((p) => !p.isMe);

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
        // Pre-fill amount for added member if in custom mode
        if (splitMode === 'custom' && !memberAmounts[uid]) {
          const remaining = priceCents - customSumCents;
          if (remaining > 0) {
            setMemberAmounts((m) => ({ ...m, [uid]: centsToInput(remaining) }));
          }
        }
      }
      return next;
    });
    setErrors((e) => ({ ...e, people: undefined, split: undefined }));
  };

  const autoDistributeEvenly = () => {
    if (selected.size === 0 || priceCents <= 0) return;
    const count = selected.size;
    const baseCents = Math.floor(priceCents / count);
    let remainder = priceCents % count;

    const newAmts: Record<string, string> = {};
    for (const uid of selected) {
      const share = baseCents + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      newAmts[uid] = centsToInput(share);
    }
    setMemberAmounts(newAmts);
    setErrors((x) => ({ ...x, split: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    const desc = description.trim();
    if (!desc) next.description = 'Please type a title or item name (e.g. Cacaolat).';
    if (priceCents <= 0) next.price = 'Please type the total price.';

    if (selected.size === 0) {
      next.people = 'Please select which member owes this item.';
    }

    if (splitMode === 'custom') {
      if (priceCents > 0 && diffCents !== 0) {
        next.split =
          diffCents < 0
            ? `Invalid amount: Total split (${formatMoney(customSumCents)}) exceeds total price by ${formatMoney(Math.abs(diffCents))}. Hindi equal sa total amount.`
            : `Invalid amount: Total split (${formatMoney(customSumCents)}) is not equal to total price (${formatMoney(priceCents)}). May kulang pa na ${formatMoney(diffCents)}.`;
      }
      for (const uid of selected) {
        const pCents = toCents(memberAmounts[uid]) ?? 0;
        if (pCents <= 0) {
          next.split = 'Each selected person must be assigned an amount greater than 0.';
          break;
        }
      }
    } else {
      if (autoSplit <= 0 && priceCents > 0) {
        next.split = 'Please type how much each person pays.';
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const now = Date.now();
    const shares: Record<string, Share> = {};
    for (const uid of selected) {
      const foundPerson = people.find((p) => p.uid === uid);
      const name = foundPerson?.name ?? group.members[uid]?.name ?? item?.shares[uid]?.name ?? 'Someone';
      const prev = item?.shares[uid];
      const personShareCents = splitMode === 'custom' ? (toCents(memberAmounts[uid]) ?? autoSplit) : autoSplit;
      shares[uid] = prev
        ? { ...prev, name, splitCents: personShareCents }
        : { name, status: 'unpaid', splitCents: personShareCents, updatedAt: now };
    }

    const manualMonthlyCents = installmentsCount > 1 ? toCents(monthlyInput) : undefined;

    const input = {
      description: desc.slice(0, 200),
      priceCents,
      splitCents: autoSplit,
      shares,
      dueDate: dueDate || null,
      billingCycle: installmentsCount > 1 && billingCycle.trim() ? billingCycle.trim() : undefined,
      installmentsCount: installmentsCount > 1 ? installmentsCount : undefined,
      monthlyCents: manualMonthlyCents && manualMonthlyCents > 0 ? manualMonthlyCents : undefined,
      store: store.trim().slice(0, 40),
      color,
    };

    if (item) write(updateItem(group.id, item.id, input), 'Changes saved');
    else write(addItem(group.id, input), 'Item added');
    onClose();
  };

  const errorList = Object.values(errors).filter(Boolean);

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={item ? 'Edit item' : 'New item'}
        description={item ? undefined : 'Everyone in this list will see it right away.'}
        footer={
          <div className="flex gap-2">
            {item && (
              <Button
                variant="secondary"
                className="text-bad"
                aria-label="Delete item"
                icon={<Trash2 className="size-4" />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
            <Button type="submit" form="item-form" size="md" full>
              {item ? 'Save changes' : 'Add item'}
            </Button>
          </div>
        }
      >
        <form id="item-form" onSubmit={submit} className="space-y-5 pt-1" noValidate>
          {/* Prominent error summary if save was blocked */}
          {errorList.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-[18px] bg-bad/10 p-3.5 text-[14px] font-medium text-bad-ink border border-bad/20">
              <CircleAlert className="size-4.5 shrink-0 mt-0.5 text-bad" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-bad-ink">Please fix the following:</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[13px]">
                  {errorList.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <TextField
            id="item-desc"
            label="Title / Item name"
            placeholder="e.g. Cacaolat, Dinner bill, Shoes"
            value={description}
            maxLength={200}
            error={errors.description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((x) => ({ ...x, description: undefined }));
            }}
          />

          <TextField
            id="item-price"
            label="Price (total)"
            prefix="₱"
            placeholder="0.00"
            inputMode="decimal"
            autoComplete="off"
            value={price}
            error={errors.price}
            onChange={(e) => {
              const val = cleanMoneyInput(e.target.value);
              setPrice(val);
              setErrors((x) => ({ ...x, price: undefined, split: undefined }));
            }}
          />

          {/* People / Borrowers Section: Only group members can be selected */}
          <div className="space-y-2">
            {hasOtherMembers ? (
              <PeoplePicker
                people={people}
                selected={selected}
                onToggle={toggle}
                onSelectAll={() => setSelected(new Set(people.map((p) => p.uid)))}
                onClear={() => setSelected(new Set())}
                error={errors.people}
              />
            ) : (
              <div className="rounded-[18px] bg-white p-4 text-center shadow-sm ring-1 ring-hairline space-y-2.5">
                <div>
                  <p className="font-semibold text-ink text-[14px]">No members in this list yet</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Only members of this list can be selected. Share code <span className="font-mono font-bold text-ink">{group.inviteCode}</span> so they can join!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onInvite();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-accent/90 active:scale-95"
                >
                  <UserPlus className="size-3.5" />
                  <span>Invite members</span>
                </button>
              </div>
            )}
          </div>

          {/* Split Summary & Custom Distribution Card */}
          <div
            className="rounded-[18px] p-4 text-white shadow-sm ring-1 ring-white/20 select-none"
            style={{ backgroundImage: itemGradient({ id: 'split-cost', store, color }, group) }}
          >
            <p className="mb-2 truncate text-[11px] font-bold tracking-[0.14em] uppercase text-white/80">
              {store.trim() || group.name || 'Item Split'}
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-white/85">
                {splitMode === 'custom' ? 'Custom amount per person' : 'Each person pays'}
              </p>
              <button
                type="button"
                className="h-6 rounded-full bg-white/20 px-2.5 text-[11px] font-semibold backdrop-blur transition active:scale-95 hover:bg-white/30"
                onClick={() => {
                  if (splitMode === 'equal') {
                    // Switching to custom: pre-fill member amounts with even split or existing
                    const newAmts: Record<string, string> = { ...memberAmounts };
                    for (const uid of selected) {
                      if (!newAmts[uid] || newAmts[uid] === '0.00' || newAmts[uid] === '0') {
                        newAmts[uid] = centsToInput(autoSplit);
                      }
                    }
                    setMemberAmounts(newAmts);
                    setSplitMode('custom');
                  } else {
                    setSplitMode('equal');
                  }
                  setErrors((x) => ({ ...x, split: undefined }));
                }}
              >
                {splitMode === 'custom' ? 'Split evenly' : 'Custom per person'}
              </button>
            </div>

            {splitMode === 'equal' ? (
              <>
                <p className="mt-1 text-[26px] leading-tight font-bold tracking-tight tabular-nums wrap-break-word">
                  {formatMoney(autoSplit)}
                </p>
                <p className="mt-1 text-[11px] text-white/80">
                  {selected.size > 0
                    ? `${formatMoney(priceCents)} split evenly by ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`
                    : 'Select members above to split the price.'}
                </p>
              </>
            ) : (
              <div className="mt-3 space-y-2">
                {Array.from(selected).map((uid) => {
                  const p = people.find((item) => item.uid === uid);
                  const name = p?.name || group.members[uid]?.name || 'Member';
                  return (
                    <div
                      key={uid}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/15 px-3 py-2 backdrop-blur-md ring-1 ring-white/15"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={name} photo={p?.photo} size="sm" />
                        <span className="text-[13px] font-semibold text-white truncate">{name}</span>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-black/20 px-2.5 py-1 ring-1 ring-white/20 focus-within:ring-white">
                        <span className="text-[13px] font-bold text-white/80">₱</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="0.00"
                          value={memberAmounts[uid] ?? ''}
                          onChange={(e) => {
                            const val = cleanMoneyInput(e.target.value);
                            setMemberAmounts((prev) => ({ ...prev, [uid]: val }));
                            setErrors((x) => ({ ...x, split: undefined }));
                          }}
                          className="w-24 bg-transparent text-right text-[14px] font-bold text-white outline-none placeholder:text-white/40"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Status & Validation Indicator */}
                <div className="pt-1.5">
                  {priceCents <= 0 ? (
                    <p className="text-[11.5px] text-white/80 italic">Enter total price above to calculate split.</p>
                  ) : diffCents === 0 ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/25 px-3 py-1.5 text-[12px] font-semibold text-emerald-100 ring-1 ring-emerald-300/40">
                      <span className="flex items-center gap-1.5">
                        <Check className="size-3.5" />
                        Total matches price ({formatMoney(priceCents)})
                      </span>
                      <span className="tabular-nums font-bold">{formatMoney(customSumCents)}</span>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-rose-500/30 px-3 py-2 text-[12px] font-semibold text-white ring-1 ring-rose-300/40 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <CircleAlert className="size-3.5 shrink-0" />
                        <span>
                          {diffCents < 0
                            ? `Invalid amount: Total split (${formatMoney(customSumCents)}) is ${formatMoney(Math.abs(diffCents))} over total price (${formatMoney(priceCents)}). Hindi equal sa total amount.`
                            : `Invalid amount: Total split (${formatMoney(customSumCents)}) is not equal to total price (${formatMoney(priceCents)}). Remaining: ${formatMoney(diffCents)}.`}
                        </span>
                      </p>
                      <div className="flex items-center justify-between pt-0.5 text-[11px] text-white/85">
                        <span>Dapat eksaktong {formatMoney(priceCents)} ang kabuuan</span>
                        <button
                          type="button"
                          onClick={autoDistributeEvenly}
                          className="underline font-bold hover:text-white"
                        >
                          Split evenly
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {errors.split && (
              <p className="mt-2 rounded-lg bg-white px-2.5 py-1 text-[12px] font-semibold text-bad shadow-xs">
                {errors.split}
              </p>
            )}
          </div>

          {/* Credit Card Installments & Cutoff schedule */}
          <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-hairline space-y-3.5">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-accent" />
              <p className="text-[13px] font-bold text-ink">Credit Card / Payment Terms</p>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-muted">Installment Terms</label>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 6, 12, 24].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setInstallmentsCount(n);
                      if (n > 1 && effectiveSplitCents > 0) {
                        setMonthlyInput(centsToInput(Math.round(effectiveSplitCents / n)));
                      } else if (n === 1) {
                        setMonthlyInput('');
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold transition active:scale-95 ${
                      installmentsCount === n
                        ? 'bg-accent/10 text-accent ring-1 ring-accent/40'
                        : 'bg-fill text-muted hover:text-ink'
                    }`}
                  >
                    {n === 1 ? '1x (Full)' : `${n} mos`}
                  </button>
                ))}

                {/* Custom Month Pill with balanced font size */}
                <div
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] transition ring-1 ${
                    ![1, 2, 3, 6, 12, 24].includes(installmentsCount) && installmentsCount > 0
                      ? 'bg-accent/10 text-accent ring-accent/40 font-semibold'
                      : 'bg-fill text-muted ring-hairline'
                  }`}
                >
                  <span className="text-[11px] font-medium">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    placeholder="e.g. 4"
                    value={![1, 2, 3, 6, 12, 24].includes(installmentsCount) && installmentsCount > 0 ? installmentsCount : ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1) {
                        setInstallmentsCount(val);
                        if (val > 1 && effectiveSplitCents > 0) {
                          setMonthlyInput(centsToInput(Math.round(effectiveSplitCents / val)));
                        } else if (val === 1) {
                          setMonthlyInput('');
                        }
                      } else if (e.target.value === '') {
                        setInstallmentsCount(1);
                        setMonthlyInput('');
                      }
                    }}
                    className="w-10 bg-transparent text-center text-[12px] font-semibold text-ink outline-none placeholder:text-[11px] placeholder:font-normal placeholder:text-muted/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[11px] font-medium">mos</span>
                </div>
              </div>
            </div>

            {/* If 1x Full Payment: show clean one-time info badge without confusing 0.00 input */}
            {installmentsCount > 1 ? (
              <div className="space-y-3 pt-1 border-t border-hairline">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-[12px] font-semibold text-ink">
                      Monthly / Cut-off amount (₱)
                    </label>
                    {effectiveSplitCents > 0 && (
                      <button
                        type="button"
                        onClick={() => setMonthlyInput(centsToInput(Math.round(effectiveSplitCents / installmentsCount)))}
                        className="text-[11px] font-semibold text-accent hover:underline"
                      >
                        Auto calculate ({formatMoney(Math.round(effectiveSplitCents / installmentsCount))})
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={monthlyInput}
                    onChange={(e) => setMonthlyInput(cleanMoneyInput(e.target.value))}
                    placeholder={
                      effectiveSplitCents > 0
                        ? centsToInput(Math.round(effectiveSplitCents / installmentsCount))
                        : '0.00'
                    }
                    className="mt-1 w-full rounded-xl bg-fill px-3.5 py-2.5 text-[15px] font-bold text-ink outline-none ring-1 ring-hairline placeholder:text-muted/60 focus:ring-accent"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Type the exact monthly or cut-off bill stated on your billing statement (SOA).
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-muted">Cut-off / Billing Cycle (optional)</label>
                  <input
                    type="text"
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    placeholder="e.g. Every 15th of the month, Every cut-off"
                    className="mt-1 w-full rounded-xl bg-fill px-3.5 py-2 text-[14px] text-ink outline-none ring-1 ring-hairline placeholder:text-muted/60 focus:ring-accent"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-fill/60 p-3 text-[12px] text-muted flex items-center justify-between gap-2 border border-hairline">
                <span className="text-muted/80">One-time payment upon due date.</span>
                <span className="inline-flex items-center gap-1 font-semibold text-ink text-[11.5px] rounded-full bg-white px-2.5 py-0.5 shadow-2xs">
                  1x Full Payment
                </span>
              </div>
            )}
          </div>

          <div>
            <TextField
              id="item-due"
              label="First Due date (optional)"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              hint="When is the first or next payment due?"
              className="appearance-none text-left [&::-webkit-date-and-time-value]:text-left"
            />
            {dueDate && (
              <button type="button" onClick={() => setDueDate('')} className="mt-1 px-1 text-[13px] font-semibold text-accent">
                Remove due date
              </button>
            )}
          </div>
        </form>
      </Sheet>

      {item && (
        <ConfirmSheet
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Delete this item?"
          message={
            <>
              <span className="font-semibold text-ink">"{item.description}"</span> will be removed for everyone.
              This cannot be undone.
            </>
          }
          confirmText="Yes, delete"
          danger
          onConfirm={() => {
            write(deleteItem(group.id, item.id), 'Item deleted');
            setConfirmDelete(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
