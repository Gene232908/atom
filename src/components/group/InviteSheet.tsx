import { useState } from 'react';
import { Check, Copy, Share2, UserCheck, UserPlus, Users } from 'lucide-react';
import { groupGradient } from '../../lib/cardTheme';
import { inviteLink } from '../../hooks/useRoute';
import { copyText } from '../../lib/clipboard';
import { useUser } from '../../hooks/useAuth';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../hooks/useToast';
import { inviteFriendToGroup } from '../../services/groups';
import type { Group } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { WalletCard } from '../ui/WalletCard';

export function InviteSheet({ open, onClose, group }: { open: boolean; onClose: () => void; group: Group }) {
  const user = useUser();
  const toast = useToast();
  const { friends } = useFriends();

  const [copied, setCopied] = useState(false);
  const [addingUid, setAddingUid] = useState<string | null>(null);
  const link = inviteLink(group.inviteCode);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const code = group.inviteCode;

  const copy = async () => {
    if (await copyText(link)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      toast('Invite link copied!');
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: group.name,
        text: `Join my list "${group.name}" so you can see what you owe.`,
        url: link,
      });
    } catch {
      // User closed the share menu.
    }
  };

  const handleAddFriend = async (friend: { uid: string; name: string; email: string; photo: string }) => {
    setAddingUid(friend.uid);
    try {
      await inviteFriendToGroup(group.id, friend, user.uid);
      toast(`${friend.name} added to card! You can now split items with them.`);
    } catch (err: any) {
      toast(err.message || 'Failed to add friend');
    } finally {
      setAddingUid(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add members"
      description={`Add friends to "${group.name}" to assign them debts and splits.`}
    >
      <div className="space-y-4 pt-1">
        {/* Section 1: Add Directly from Friends List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wider">
              Add From Your Friends ({friends.length})
            </h3>
          </div>

          {friends.length === 0 ? (
            <div className="rounded-[16px] bg-fill p-4 text-center text-muted">
              <Users className="mx-auto size-5 opacity-40 mb-1" />
              <p className="text-[12.5px] font-medium">No friends in your list yet</p>
              <p className="text-[11px] text-muted/80 mt-0.5">
                Connect via the Friends (+) icon on the top right, or share the invite code below.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-hairline rounded-[16px] bg-fill ring-1 ring-hairline overflow-hidden max-h-56 overflow-y-auto">
              {friends.map((friend) => {
                const memberRecord = group.members[friend.uid];
                const isInGroup = group.memberIds.includes(friend.uid);
                const isPending = isInGroup && memberRecord?.status === 'pending';

                return (
                  <div key={friend.uid} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={friend.name} photo={friend.photo} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{friend.name}</p>
                        <p className="truncate text-[11px] text-muted">{friend.email || friend.uid}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isPending ? (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-600">
                          Pending Invite
                        </span>
                      ) : isInGroup ? (
                        <span className="flex items-center gap-1 rounded-full bg-ok/10 px-2 py-0.5 text-[10.5px] font-semibold text-ok">
                          <UserCheck className="size-3" />
                          <span>Member</span>
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          icon={<UserPlus className="size-3.5" />}
                          disabled={addingUid === friend.uid}
                          onClick={() => handleAddFriend(friend)}
                        >
                          {addingUid === friend.uid ? 'Adding...' : 'Add to Card'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Share Invite Link or Code */}
        <div className="pt-2 border-t border-hairline">
          <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wider mb-2">
            Or Share Invite Code
          </h3>

          <WalletCard seed={group.id} background={groupGradient(group)} className="flex h-[160px] flex-col p-4">
            <p className="truncate text-[16px] font-semibold text-white">{group.name}</p>
            <p className="text-[11px] text-white/70">Card invite code</p>
            <p className="mt-auto font-mono text-[22px] font-semibold tracking-[0.2em] tabular-nums text-white">
              {code.slice(0, 4)} {code.slice(4)}
            </p>
            <p className="mt-0.5 truncate text-[10.5px] text-white/70">{link}</p>
          </WalletCard>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="md"
              variant={canShare ? 'white' : 'primary'}
              full
              className={canShare ? '' : 'col-span-2'}
              icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              onClick={copy}
            >
              {copied ? 'Copied link!' : 'Copy link'}
            </Button>
            {canShare && (
              <Button size="md" full icon={<Share2 className="size-4" />} onClick={share}>
                Share
              </Button>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
