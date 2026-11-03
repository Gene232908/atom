import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth, useUser } from '../../hooks/useAuth';
import { Sheet } from '../ui/Sheet';
import { Avatar } from '../ui/Avatar';
import { GroupList, GroupRow, RowIcon } from '../ui/Group';

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUser();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const name = user.displayName || 'You';

  return (
    <Sheet open={open} onClose={onClose} title="Account">
      <div className="flex flex-col items-center rounded-[20px] bg-white px-4 py-6 text-center">
        <Avatar name={name} photo={user.photoURL ?? ''} size="lg" />
        <p className="mt-3 max-w-full truncate text-[17px] font-semibold">{name}</p>
        <p className="max-w-full truncate text-[14px] text-muted">{user.email}</p>
      </div>
      <GroupList className="mt-4">
        <GroupRow
          icon={
            <RowIcon color="#ff3b30">
              <LogOut className="size-4" />
            </RowIcon>
          }
          label={busy ? 'Signing out...' : 'Sign out'}
          tone="danger"
          chevron={false}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();
            } finally {
              setBusy(false);
            }
          }}
        />
      </GroupList>
    </Sheet>
  );
}
