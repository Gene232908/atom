import { useState, type FormEvent } from 'react';
import { useUser } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { navigate } from '../../hooks/useRoute';
import { createGroup } from '../../services/groups';
import { friendlyError } from '../../lib/errors';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';

export function CreateGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUser();
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError('Please give your list a name.');
      return;
    }
    const { id, saved } = createGroup(user, clean.slice(0, 80));
    saved.catch((err) => toast(friendlyError(err), 'error'));
    toast('List created! Now invite the people who owe you.');
    setName('');
    setError('');
    onClose();
    navigate(`/g/${id}`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Make a new list"
      description="Make a list if people owe you money. You will be the lender."
    >
      <form onSubmit={submit} className="space-y-5 pt-1">
        <TextField
          id="group-name"
          label="List name"
          placeholder="e.g. Atome - Shopee items"
          value={name}
          maxLength={80}
          autoFocus
          error={error}
          hint="Pick a name your friends will understand."
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
        />
        <Button type="submit" size="lg" full>
          Create list
        </Button>
      </form>
    </Sheet>
  );
}
