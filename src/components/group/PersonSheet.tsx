import { useState } from 'react';
import { CheckCheck, ListFilter, UserMinus } from 'lucide-react';
import { useSafeWrite } from '../../hooks/useToast';
import { removeMember } from '../../services/groups';
import { markPersonPaid } from '../../services/items';
import { formatMoney } from '../../lib/money';
import { firstName } from '../../lib/items';
import type { Group, Item, PersonSummary } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { GroupList, GroupRow, RowIcon } from '../ui/Group';
import { Avatar } from '../ui/Avatar';
import { ConfirmSheet } from '../ui/ConfirmSheet';

interface Props {
  person: PersonSummary | null;
  group: Group;
  items: Item[];
  uid: string;
  onClose: () => void;
  onShowItems: (uid: string) => void;
}

export function PersonSheet({ person, group, items, uid, onClose, onShowItems }: Props) {
  const write = useSafeWrite();
  const [confirm, setConfirm] = useState<'paid' | 'remove' | null>(null);
  const isOwner = group.ownerId === uid;

  if (!person) return null;
  const short = firstName(person.name);
  const canManage = isOwner && !person.isOwner;

  return (
    <>
      <Sheet open onClose={onClose} title={person.uid === uid ? 'You' : person.name}>
        <div className="flex flex-col items-center rounded-[20px] bg-white px-4 py-6 text-center">
          <Avatar name={person.name} photo={person.photo} size="lg" />
          <p className="mt-3 max-w-full truncate text-[17px] font-semibold">{person.name}</p>
          {person.email && <p className="max-w-full truncate text-[14px] text-muted">{person.email}</p>}
          {person.isOwner && <p className="mt-1 text-[13px] font-semibold text-warn-ink">Lender of this list</p>}
        </div>

        {!person.isOwner && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-[20px] bg-white p-4">
              <p className="text-[13px] font-medium text-muted">Still owes</p>
              <p className="truncate text-[20px] font-bold text-bad-ink tabular-nums">{formatMoney(person.owes)}</p>
            </div>
            <div className="min-w-0 rounded-[20px] bg-white p-4">
              <p className="text-[13px] font-medium text-muted">Already paid</p>
              <p className="truncate text-[20px] font-bold text-ok-ink tabular-nums">{formatMoney(person.paid)}</p>
            </div>
          </div>
        )}

        {(!person.isOwner || canManage) && (
          <GroupList className="mt-4">
            {!person.isOwner && (
              <GroupRow
                icon={
                  <RowIcon color="#007aff">
                    <ListFilter className="size-4" />
                  </RowIcon>
                }
                label={person.uid === uid ? 'Show only my items' : `Show only ${short}'s items`}
                onClick={() => {
                  onShowItems(person.uid);
                  onClose();
                }}
              />
            )}
            {canManage && person.owes > 0 && (
              <GroupRow
                icon={
                  <RowIcon color="#34c759">
                    <CheckCheck className="size-4" />
                  </RowIcon>
                }
                label="Mark everything as paid"
                tone="ok"
                onClick={() => setConfirm('paid')}
              />
            )}
            {canManage && person.inList && (
              <GroupRow
                icon={
                  <RowIcon color="#ff3b30">
                    <UserMinus className="size-4" />
                  </RowIcon>
                }
                label="Remove from list"
                tone="danger"
                chevron={false}
                onClick={() => setConfirm('remove')}
              />
            )}
          </GroupList>
        )}
      </Sheet>

      <ConfirmSheet
        open={confirm === 'paid'}
        onClose={() => setConfirm(null)}
        title={`Did ${short} pay everything?`}
        message={`All of ${short}'s items (${formatMoney(person.owes)}) will be marked as paid.`}
        confirmText="Yes, all paid"
        onConfirm={() => {
          write(markPersonPaid(group.id, items, person.uid), `${short} is now fully paid`);
          setConfirm(null);
        }}
      />
      <ConfirmSheet
        open={confirm === 'remove'}
        onClose={() => setConfirm(null)}
        title={`Remove ${short}?`}
        message={`${short} will not be able to open this list anymore. Their items will stay in the list so you do not lose any records.`}
        confirmText="Yes, remove"
        danger
        onConfirm={() => {
          write(removeMember(group.id, person.uid), `${short} was removed`);
          setConfirm(null);
          onClose();
        }}
      />
    </>
  );
}
