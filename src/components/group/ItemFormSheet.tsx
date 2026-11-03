import { useMemo, useState, type FormEvent } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { useSafeWrite } from '../../hooks/useToast';
import { addItem, deleteItem, updateItem } from '../../services/items';
import { centsToInput, cleanMoneyInput, formatMoney, splitEvenly, toCents } from '../../lib/money';
import type { Group, Item, Share } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { WalletCard } from '../ui/WalletCard';
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
  // Mounting fresh each time makes the form start from the right values.
  return <ItemForm key={props.item?.id ?? 'new'} {...props} />;
}

type Errors = Partial<Record<'description' | 'price' | 'people' | 'split', string>>;

function ItemForm({ onClose, group, item, onInvite }: Props) {
  const write = useSafeWrite();
  const ownerId = group.ownerId;

  const people = useMemo<PickPerson[]>(() => {
    const list: PickPerson[] = group.memberIds
      .filter((uid) => group.members[uid])
      .map((uid) => ({
        uid,
        name: group.members[uid].name,
        photo: group.members[uid].photo,
        isMe: uid === ownerId,
      }));
    // Keep people who were removed from the list but are still on this item.
    for (const [uid, share] of Object.entries(item?.shares ?? {})) {
      if (!list.some((p) => p.uid === uid)) list.push({ uid, name: share.name, photo: '', isMe: false });
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
  const [store, setStore] = useState(item?.store ?? '');
  const [color, setColor] = useState(item?.color ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const priceCents = toCents(price) ?? 0;
  const autoSplit = splitEvenly(priceCents, selected.size);
  const splitCents = custom ? (toCents(splitInput) ?? 0) : autoSplit;
  const nobodyElse = people.every((p) => p.isMe);

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
    if (!desc) next.description = 'Please type what this item is.';
    if (priceCents <= 0) next.price = 'Please type the price.';
    if (![...selected].some((uid) => uid !== ownerId)) next.people = 'Pick at least one person who owes you.';
    if (splitCents <= 0) next.split = 'Please type how much each person pays.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const now = Date.now();
    const shares: Record<string, Share> = {};
    for (const uid of selected) {
      const name = group.members[uid]?.name ?? item?.shares[uid]?.name ?? 'Someone';
      const prev = item?.shares[uid];
      shares[uid] = prev
        ? { ...prev, name }
        : { name, status: uid === ownerId ? 'paid' : 'unpaid', updatedAt: now };
    }
    const input = { description: desc.slice(0, 200), priceCents, splitCents, shares, dueDate: dueDate || null, store: store.trim().slice(0, 40), color };

    if (item) write(updateItem(group.id, item.id, input), 'Changes saved');
    else write(addItem(group.id, input), 'Item added');
    onClose();
  };

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
          <TextField
            id="item-desc"
            label="Item description"
            placeholder="e.g. Rubber shoes - month 1 of 3"
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
            <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
              {STORE_SUGGESTIONS.map((name) => {
                const on = store.trim().toLowerCase() === name.toLowerCase();
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setStore(on ? '' : name)}
                    className={`h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95 ${
                      on ? 'text-white' : 'bg-white text-ink'
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
            hint="Auto uses the color of the card or store above. You can see it on the card below."
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

          {nobodyElse ? (
            <div className="rounded-[20px] bg-white p-4 text-[14px]">
              <p className="font-semibold">No one has joined this list yet.</p>
              <p className="mt-1 text-muted">Invite the people who owe you first, then add items for them.</p>
              <Button
                size="sm"
                className="mt-3"
                icon={<UserPlus className="size-4" />}
                onClick={() => {
                  onClose();
                  onInvite();
                }}
              >
                Invite people
              </Button>
            </div>
          ) : (
            <PeoplePicker
              people={people}
              selected={selected}
              onToggle={toggle}
              onSelectAll={() => setSelected(new Set(people.map((p) => p.uid)))}
              onClear={() => setSelected(new Set())}
              error={errors.people}
            />
          )}

          <WalletCard seed="split-cost" background={storeGradient(store, 'split-cost', color)} className="p-5">
            <p className="mb-3 truncate text-[13px] font-bold tracking-[0.12em] uppercase">
              {store.trim() || 'Item'}
            </p>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-[13px] font-medium text-white/80">Split cost (each person)</p>
              <button
                type="button"
                className="h-7 rounded-full bg-white/20 px-3 text-[12px] font-semibold backdrop-blur"
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
              <div className="mt-2 flex items-center gap-1 rounded-2xl bg-white/15 px-4 backdrop-blur">
                <span className="text-[20px] font-bold">₱</span>
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
                  className="h-12 w-full min-w-0 bg-transparent text-[22px] font-bold text-white outline-none placeholder:text-white/50"
                />
              </div>
            ) : (
              <p className="mt-1 text-[32px] leading-tight font-bold tracking-tight tabular-nums wrap-break-word">
                {formatMoney(autoSplit)}
              </p>
            )}
            <p className="mt-1 text-[12px] text-white/80">
              {selected.size > 0
                ? `${formatMoney(priceCents)} split by ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`
                : 'Pick people above to split the price.'}
            </p>
            {errors.split && (
              <p className="mt-2 rounded-xl bg-white px-3 py-1.5 text-[13px] font-semibold text-bad">{errors.split}</p>
            )}
          </WalletCard>

          <div>
            <TextField
              id="item-due"
              label="Due date (optional)"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              hint="When should they pay? Leave empty if there is no due date."
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
