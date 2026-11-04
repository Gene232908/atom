import { useState, type FormEvent } from 'react';
import { Check, Copy, KeyRound, Search, Trash2, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useUser } from '../../hooks/useAuth';
import { useFriends, type FriendContact } from '../../hooks/useFriends';
import { useSafeWrite, useToast } from '../../hooks/useToast';
import {
  acceptFriendRequest,
  removeFriendship,
  searchUser,
  sendFriendRequest,
} from '../../services/friends';
import type { UserProfile } from '../../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenJoinCode?: () => void;
}

export function FriendsSheet({ open, onClose, onOpenJoinCode }: Props) {
  const user = useUser();
  const toast = useToast();
  const write = useSafeWrite();
  const { friends, incomingRequests, outgoingRequests } = useFriends();

  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionUid, setActionUid] = useState<string | null>(null);

  const copyMyId = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopied(true);
      toast('Your User ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy ID');
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);

    const res = await searchUser(q, user.uid);
    setSearching(false);

    if (res.error) {
      setSearchError(res.error);
    } else if (res.user) {
      setSearchResult(res.user);
    }
  };

  const handleSendRequest = async (target: UserProfile) => {
    setActionUid(target.uid);
    try {
      const result = await sendFriendRequest(user, target);
      if (result === 'accepted') {
        toast(`You and ${target.name} are now friends!`);
      } else {
        toast(`Friend request sent to ${target.name}!`);
      }
      setSearchResult(null);
      setQuery('');
    } catch (err: any) {
      toast(err.message || 'Failed to send request');
    } finally {
      setActionUid(null);
    }
  };

  const handleAccept = async (contact: FriendContact) => {
    write(acceptFriendRequest(contact.friendshipId), `Connected with ${contact.name}!`);
  };

  const handleDeclineOrRemove = async (contact: FriendContact, isRemove = false) => {
    write(
      removeFriendship(contact.friendshipId),
      isRemove ? `Removed ${contact.name} from friends` : `Declined request from ${contact.name}`,
    );
  };

  const totalRequests = incomingRequests.length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Friends & Contacts"
      description="Connect with friends to easily invite them to cards and split debts"
    >
      <div className="space-y-4 pt-1">
        {/* My Unique ID Card */}
        <div className="rounded-[18px] bg-fill p-3.5 sm:p-4 ring-1 ring-hairline">
          <div className="flex items-center gap-3">
            <Avatar name={user.displayName || 'You'} photo={user.photoURL ?? ''} size="md" ring="subtle" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-ink">{user.displayName || 'You'}</p>
              <p className="text-[11px] font-medium text-muted">Your Unique User ID:</p>
              <div className="mt-0.5 flex items-center gap-2">
                <code className="select-all rounded-md bg-canvas px-2 py-0.5 font-mono text-[11.5px] font-semibold text-accent ring-1 ring-hairline/80 truncate">
                  {user.uid}
                </code>
              </div>
            </div>
            <button
              type="button"
              onClick={copyMyId}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition active:scale-95 ${
                copied
                  ? 'bg-ok/10 text-ok ring-1 ring-ok/30'
                  : 'bg-white text-ink shadow-xs ring-1 ring-hairline hover:bg-canvas'
              }`}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{copied ? 'Copied' : 'Copy ID'}</span>
            </button>
          </div>
        </div>

        {/* Search & Add Friend Form */}
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="block text-[12px] font-medium text-muted">
            Add a Friend by User ID or Email
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchError(null);
                }}
                placeholder="Paste User ID or type email..."
                className="w-full rounded-xl bg-fill pl-9 pr-3 py-2.5 text-[13px] text-ink outline-none ring-1 ring-hairline focus:bg-canvas focus:ring-2 focus:ring-accent"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSearchResult(null);
                    setSearchError(null);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              disabled={searching || !query.trim()}
              icon={<UserPlus className="size-4" />}
            >
              {searching ? 'Finding...' : 'Find'}
            </Button>
          </div>

          {searchError && (
            <p className="text-[12px] font-medium text-bad">{searchError}</p>
          )}

          {/* Search Result Card */}
          {searchResult && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-[16px] bg-accent/5 p-3.5 ring-1 ring-accent/20 animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={searchResult.name} photo={searchResult.photo} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{searchResult.name}</p>
                  <p className="truncate text-[11px] text-muted">{searchResult.email || searchResult.uid}</p>
                </div>
              </div>
              <Button
                size="sm"
                icon={<UserPlus className="size-3.5" />}
                disabled={actionUid === searchResult.uid}
                onClick={() => handleSendRequest(searchResult)}
              >
                {actionUid === searchResult.uid ? 'Adding...' : 'Add Friend'}
              </Button>
            </div>
          )}
        </form>

        {/* Tab switcher: Friends vs Requests */}
        <div className="flex border-b border-hairline">
          <button
            type="button"
            onClick={() => setTab('friends')}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold border-b-2 transition ${
              tab === 'friends'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Users className="size-4" />
            <span>Friends ({friends.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold border-b-2 transition relative ${
              tab === 'requests'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <UserCheck className="size-4" />
            <span>Requests</span>
            {totalRequests > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {totalRequests}
              </span>
            )}
          </button>
        </div>

        {/* Friends Tab */}
        {tab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <div className="rounded-[16px] bg-fill p-6 text-center text-muted">
                <Users className="mx-auto size-7 opacity-40 mb-1.5" />
                <p className="text-[13px] font-medium">No friends added yet</p>
                <p className="text-[11.5px] text-muted/80 mt-0.5">
                  Share your User ID with friends or enter their ID above to connect.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-hairline rounded-[16px] bg-fill ring-1 ring-hairline overflow-hidden">
                {friends.map((friend) => (
                  <div key={friend.uid} className="flex items-center justify-between gap-3 p-3 sm:p-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={friend.name} photo={friend.photo} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{friend.name}</p>
                        <p className="truncate text-[11px] text-muted">{friend.email || friend.uid}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      title="Remove friend"
                      onClick={() => handleDeclineOrRemove(friend, true)}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-bad/10 hover:text-bad"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {tab === 'requests' && (
          <div className="space-y-3">
            {/* Incoming Requests */}
            <div>
              <p className="text-[11.5px] font-semibold text-muted uppercase tracking-wider mb-2">
                Incoming Requests ({incomingRequests.length})
              </p>
              {incomingRequests.length === 0 ? (
                <p className="text-[12px] text-muted italic">No incoming friend requests</p>
              ) : (
                <div className="divide-y divide-hairline rounded-[16px] bg-fill ring-1 ring-hairline overflow-hidden">
                  {incomingRequests.map((req) => (
                    <div key={req.uid} className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={req.name} photo={req.photo} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-ink">{req.name}</p>
                          <p className="truncate text-[11px] text-muted">{req.email || req.uid}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="primary" onClick={() => handleAccept(req)}>
                          Accept
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeclineOrRemove(req)}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div>
                <p className="text-[11.5px] font-semibold text-muted uppercase tracking-wider mb-2">
                  Waiting for response ({outgoingRequests.length})
                </p>
                <div className="divide-y divide-hairline rounded-[16px] bg-fill ring-1 ring-hairline overflow-hidden">
                  {outgoingRequests.map((req) => (
                    <div key={req.uid} className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={req.name} photo={req.photo} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-ink">{req.name}</p>
                          <span className="text-[10px] font-semibold text-accent uppercase">Pending</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeclineOrRemove(req)}
                        className="text-[11px] font-medium text-muted hover:text-bad"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fallback to Card Code */}
        {onOpenJoinCode && (
          <div className="pt-2 text-center border-t border-hairline">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenJoinCode();
              }}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink transition"
            >
              <KeyRound className="size-3.5" />
              <span>Have an 8-letter card code instead? Join with code</span>
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
