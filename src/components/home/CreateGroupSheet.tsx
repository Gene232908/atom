import { useState, type FormEvent } from 'react';
import { useUser } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { navigate } from '../../hooks/useRoute';
import { createGroup } from '../../services/groups';
import { friendlyError } from '../../lib/errors';
import { STORE_SUGGESTIONS, listGradient } from '../../lib/cardTheme';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { ColorPicker } from '../ui/ColorPicker';
import { WalletCard } from '../ui/WalletCard';

/** A list is one card (e.g. "BDO Credit Card" or "Atome"). Pick its name and color here. */
export function CreateGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUser();
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError('Please give your card a name.');
      return;
    }
    setSubmitting(true);
    try {
      const { id, saved } = createGroup(user, clean.slice(0, 80), color);
      await saved;
      toast('Card added! Now invite the people who owe you.');
      setName('');
      setColor('');
      setError('');
      onClose();
      navigate(`/g/${id}`);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Add a card"
      description="One card per credit card or pay-later app. You are the lender."
    >
      <form onSubmit={submit} className="space-y-5 pt-1">
        <WalletCard seed="new-card" background={listGradient('new-card', color, name)} className="flex h-32 flex-col p-5">
          <p className="truncate text-[17px] font-semibold">{name.trim() || 'Your card'}</p>
          <p className="mt-auto text-[12px] font-medium tracking-[0.16em] text-white/75 uppercase">You lend</p>
        </WalletCard>

        <div>
          <TextField
            id="group-name"
            label="Card name"
            placeholder="e.g. BDO Credit Card, Atome"
            value={name}
            maxLength={80}
            error={error}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
          <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            {STORE_SUGGESTIONS.map((s) => {
              const on = name.trim().toLowerCase() === s.toLowerCase();
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setName(on ? '' : s);
                    setError('');
                  }}
                  className={`h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition active:scale-95 ${
                    on ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-hairline'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <ColorPicker
          label="Card color"
          value={color}
          onChange={setColor}
          autoBackground={listGradient('new-card', '', name)}
          hint="Auto matches the card name. Every item in this card uses this color."
        />

        <Button type="submit" size="lg" full loading={submitting}>
          Add card
        </Button>
      </form>
    </Sheet>
  );
}
