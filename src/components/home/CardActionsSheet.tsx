import { useState } from 'react';
import { LogOut, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { deleteGroup, removeMember } from '../../services/groups';
import { friendlyError } from '../../lib/errors';
import { firstName } from '../../lib/items';
import type { Group } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { GroupList, GroupRow, RowIcon } from '../ui/Group';
import { SettingsSheet } from '../group/SettingsSheet';

interface Props {
  group: Group | null;
  uid: string;
  onClose: () => void;
}

/** Options shown after holding a card: Edit or Remove (with an "are you sure" step). */
export function CardActionsSheet({ group, uid, onClose }: Props) {
  const toast = useToast();
  const [step, setStep] = useState<'menu' | 'edit' | 'confirm'>('menu');

  if (!group) return null;
  const isOwner = group.ownerId === uid;
  const ownerName = firstName(group.members[group.ownerId]?.name ?? 'the lender');

  const close = () => {
    setStep('menu');
    onClose();
  };

  const remove = async () => {
    try {
      if (isOwner) {
        await deleteGroup(group);
        toast(`"${group.name}" was removed`);
      } else {
        await removeMember(group.id, uid);
        toast(`"${group.name}" was removed from your wallet`);
      }
      close();
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  };

  return (
    <>
      <Sheet open={step === 'menu'} onClose={close} title={group.name}>
        <GroupList>
          {isOwner && (
            <GroupRow
              icon={
                <RowIcon color="#007aff">
                  <Pencil className="size-4" />
                </RowIcon>
              }
              label="Edit card"
              detail="Name, color, payment"
              onClick={() => setStep('edit')}
            />
          )}
          <GroupRow
            icon={
              <RowIcon color="#ff3b30">
                {isOwner ? <Trash2 className="size-4" /> : <LogOut className="size-4" />}
              </RowIcon>
            }
            label={isOwner ? 'Remove card' : 'Remove from my wallet'}
            tone="danger"
            chevron={false}
            onClick={() => setStep('confirm')}
          />
        </GroupList>
      </Sheet>

      {isOwner && <SettingsSheet open={step === 'edit'} onClose={close} group={group} />}

      <ConfirmSheet
        open={step === 'confirm'}
        onClose={() => setStep('menu')}
        title="Are you sure you want to remove this card?"
        message={
          isOwner ? (
            <>
              <span className="font-semibold text-ink">"{group.name}"</span> and all of its items will be deleted for
              everyone. This cannot be undone.
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">"{group.name}"</span> will be removed from your wallet. To see it
              again, ask {ownerName} for the invite code.
            </>
          )
        }
        confirmText="Yes, remove"
        danger
        onConfirm={remove}
      />
    </>
  );
}
