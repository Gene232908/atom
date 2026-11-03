import { useMemo, useState, type FormEvent } from 'react';
import { CircleAlert, CreditCard, Trash2, UserPlus } from 'lucide-react';
import { useSafeWrite } from '../../hooks/useToast';
import { addItem, deleteItem, updateItem } from '../../services/items';
import { centsToInput, cleanMoneyInput, formatMoney, splitEvenly, toCents } from '../../lib/money';
import type { Group, Item, Share } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { STORE_SUGGESTIONS, autoStoreGradient, storeGradient } from '../../lib/cardTheme';
import { ColorPicker } from '../ui/ColorPicker';
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
  const [custom, setCustom] = useState(
    () => !!item && item.splitCents !== splitEvenly(item.priceCents, Object.keys(item.shares).length),
  );
  const [splitInput, setSplitInput] = useState(item ? centsToInput(item.splitCents) : '');
  const [dueDate, setDueDate] = useState(item?.dueDate ?? '');
  const [billingCycle, setBillingCycle] = useState(item?.billingCycle ?? '');
  const [installmentsCount, setInstallmentsCount] = useState<number>(item?.installmentsCount ?? 1);
  const [monthlyInput, setMonthlyInput] = useState(
    item?.monthlyCents ? centsToInput(item.monthlyCents) : '',
  );
  const [store, setStore] = useState(item?.store ?? '');
  const [color, setColor] = useState(item?.color ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const priceCents = toCents(price) ?? 0;
  const autoSplit = splitEvenly(priceCents, selected.size);
  const splitCents = custom ? (toCents(splitInput) ?? 0) : autoSplit;
  const hasOtherMembers = people.some((p) => !p.isMe);

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
    setErrors((e) => ({ ...e, people: undefined }));
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
    if (splitCents <= 0) {
      next.split = 'Please type how much each person pays.';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const now = Date.now();
    const shares: Record<string, Share> = {};
    for (const uid of selected) {
      const foundPerson = people.find((p) => p.uid === uid);
      const name = foundPerson?.name ?? group.members[uid]?.name ?? item?.shares[uid]?.name ?? 'Someone';
      const prev = item?.shares[uid];
      shares[uid] = prev
        ? { ...prev, name }
        : { name, status: 'unpaid', updatedAt: now };
    }

    const manualMonthlyCents = toCents(monthlyInput);

    const input = {
      description: desc.slice(0, 200),
      priceCents,
      splitCents,
      shares,
      dueDate: dueDate || null,
      billingCycle: billingCycle.trim() || undefined,
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

          <div>
            <TextField
              id="item-store"
              label="Card or store used (optional)"
              placeholder="e.g. Atome, BDO, Shopee"
              value={store}
              maxLength={40}
              onChange={(e) => setStore(e.target.value)}
            />
            <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
              {STORE_SUGGESTIONS.map((name) => {
                const on = store.trim().toLowerCase() === name.toLowerCase();
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setStore(on ? '' : name)}
                    className={`h-7 shrink-0 rounded-full px-3 text-[12px] font-medium transition active:scale-95 ${
                      on ? 'text-white font-semibold' : 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-hairline'
                    }`}
                    style={on ? { backgroundImage: storeGradient(name, name) } : undefined}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          <ColorPicker
            label="Card color"
            value={color}
            onChange={setColor}
            autoBackground={autoStoreGradient(store, 'split-cost')}
            hint="Auto uses the color of the card or store above."
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
              setPrice(cleanMoneyInput(e.target.value));
              setErrors((x) => ({ ...x, price: undefined }));
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

          {/* Compact Split Summary Card */}
          <div
            className="rounded-[18px] p-4 text-white shadow-sm ring-1 ring-white/20 select-none"
            style={{ backgroundImage: storeGradient(store, 'split-cost', color) }}
          >
            <p className="mb-2 truncate text-[11px] font-bold tracking-[0.14em] uppercase text-white/80">
              {store.trim() || 'Item Split'}
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-white/85">Each person pays</p>
              <button
                type="button"
                className="h-6 rounded-full bg-white/20 px-2.5 text-[11px] font-semibold backdrop-blur transition active:scale-95 hover:bg-white/30"
                onClick={() => {
                  if (!custom) setSplitInput(centsToInput(autoSplit));
                  setCustom(!custom);
                  setErrors((x) => ({ ...x, split: undefined }));
                }}
              >
                {custom ? 'Split evenly' : 'Change'}
              </button>
            </div>
            {custom ? (
              <div className="mt-2 flex items-center gap-1 rounded-xl bg-white/15 px-3 backdrop-blur">
                <span className="text-[18px] font-bold">₱</span>
                <input
                  id="item-split"
                  aria-label="Amount each person pays"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={splitInput}
                  onChange={(e) => {
                    setSplitInput(cleanMoneyInput(e.target.value));
                    setErrors((x) => ({ ...x, split: undefined }));
                  }}
                  className="h-10 w-full min-w-0 bg-transparent text-[20px] font-bold text-white outline-none placeholder:text-white/50"
                />
              </div>
            ) : (
              <p className="mt-1 text-[26px] leading-tight font-bold tracking-tight tabular-nums wrap-break-word">
                {formatMoney(autoSplit)}
              </p>
            )}
            <p className="mt-1 text-[11px] text-white/80">
              {selected.size > 0
                ? `${formatMoney(priceCents)} split by ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`
                : 'Select members above to split the price.'}
            </p>
            {errors.split && (
              <p className="mt-1.5 rounded-lg bg-white px-2.5 py-1 text-[12px] font-semibold text-bad">{errors.split}</p>
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
                      if (n > 1 && splitCents > 0) {
                        setMonthlyInput(centsToInput(Math.round(splitCents / n)));
                      } else if (n === 1) {
                        setMonthlyInput('');
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold transition active:scale-95 ${
                      installmentsCount === n
                        ? 'bg-ink text-white shadow-sm'
                        : 'bg-fill text-muted hover:text-ink'
                    }`}
                  >
                    {n === 1 ? '1x (Full)' : `${n} mos`}
                  </button>
                ))}

                <div className="flex items-center gap-1 rounded-full bg-fill pl-2.5 pr-2 py-0.5 text-[12px] ring-1 ring-hairline">
                  <span className="text-muted text-[11px] font-medium">Custom:</span>
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
                        if (val > 1 && splitCents > 0) {
                          setMonthlyInput(centsToInput(Math.round(splitCents / val)));
                        } else if (val === 1) {
                          setMonthlyInput('');
                        }
                      }
                    }}
                    className="w-12 bg-transparent text-center font-bold text-ink outline-none"
                  />
                  <span className="text-[11px] text-muted">mos</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-[12px] font-semibold text-ink">
                  Monthly / Cut-off amount (₱)
                </label>
                {installmentsCount > 1 && splitCents > 0 && (
                  <button
                    type="button"
                    onClick={() => setMonthlyInput(centsToInput(Math.round(splitCents / installmentsCount)))}
                    className="text-[11px] font-semibold text-accent hover:underline"
                  >
                    Auto calculate ({formatMoney(Math.round(splitCents / installmentsCount))})
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={monthlyInput}
                onChange={(e) => setMonthlyInput(cleanMoneyInput(e.target.value))}
                placeholder={
                  installmentsCount > 1 && splitCents > 0
                    ? centsToInput(Math.round(splitCents / installmentsCount))
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
