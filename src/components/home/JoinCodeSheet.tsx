import { useState, type FormEvent } from 'react';
import { navigate } from '../../hooks/useRoute';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';

/** Accepts the code alone, or the whole invite link pasted in. */
function readCode(input: string): string {
  const fromLink = input.match(/join\/([A-Za-z0-9]+)/);
  const raw = fromLink ? fromLink[1] : input;
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function JoinCodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = readCode(value);
    if (code.length < 6) {
      setError('Please type the full code or paste the invite link.');
      return;
    }
    setValue('');
    onClose();
    navigate(`/join/${code}`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Join a list"
      description="Ask the lender for the invite code or link."
    >
      <form onSubmit={submit} className="space-y-5 pt-1">
        <TextField
          id="join-code"
          label="Invite code or link"
          placeholder="e.g. K7M2QX9P"
          value={value}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          error={error}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
        />
        <Button type="submit" size="lg" full>
          Continue
        </Button>
      </form>
    </Sheet>
  );
}
