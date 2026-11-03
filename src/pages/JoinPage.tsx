import { useEffect, useState } from 'react';
import { LinkIcon, UserPlus } from 'lucide-react';
import { useUser } from '../hooks/useAuth';
import { useGroups } from '../hooks/useGroups';
import { useToast } from '../hooks/useToast';
import { navigate } from '../hooks/useRoute';
import { fetchInvite, joinGroup } from '../services/groups';
import { errorCode, friendlyError } from '../lib/errors';
import type { Invite } from '../lib/types';
import { LargeTitle, NavBar, PageBody } from '../components/layout/AppHeader';
import { WalletCard } from '../components/ui/WalletCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Spinner } from '../components/ui/Spinner';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; invite: Invite };

export function JoinPage({ code }: { code: string }) {
  const user = useUser();
  const toast = useToast();
  const { groups, loading: groupsLoading } = useGroups();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [joining, setJoining] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ kind: 'loading' });
    fetchInvite(code)
      .then((invite) => {
        if (alive) setState(invite ? { kind: 'ready', invite } : { kind: 'missing' });
      })
      .catch((err) => {
        if (alive) setState({ kind: 'error', message: friendlyError(err) });
      });
    return () => {
      alive = false;
    };
  }, [code, attempt]);

  // Already in this list? Go straight to it.
  const groupId = state.kind === 'ready' ? state.invite.groupId : '';
  const alreadyIn = !groupsLoading && groupId !== '' && groups.some((g) => g.id === groupId);
  useEffect(() => {
    if (alreadyIn) navigate(`/g/${groupId}`, true);
  }, [alreadyIn, groupId]);

  const join = async (invite: Invite) => {
    setJoining(true);
    try {
      await joinGroup(user, invite.groupId, code);
      toast(`You joined "${invite.groupName}"`);
      navigate(`/g/${invite.groupId}`, true);
    } catch (err) {
      setJoining(false);
      if (errorCode(err) === 'permission-denied' || errorCode(err) === 'not-found') {
        setState({ kind: 'missing' });
      } else {
        toast(friendlyError(err), 'error');
      }
    }
  };

  return (
    <>
      <NavBar title="Join a list" backLabel="Wallet" onBack={() => navigate("/")} />
      <PageBody className="max-w-md">
        <LargeTitle title="Join a list" />
        {state.kind === 'loading' || alreadyIn || (state.kind === 'ready' && groupsLoading) ? (
          <div className="flex justify-center py-20 text-muted">
            <Spinner className="size-8" />
          </div>
        ) : state.kind === 'missing' ? (
          <EmptyState
            icon={<LinkIcon className="size-7" />}
            title="This invite is not working"
            text="The link may be wrong or the list was deleted. Please ask your friend to send the link again."
            action={<Button onClick={() => navigate('/')}>Go to my lists</Button>}
          />
        ) : state.kind === 'error' ? (
          <ErrorBanner message={state.message} onRetry={() => setAttempt((n) => n + 1)} />
        ) : (
          <div className="animate-rise">
            <WalletCard seed={state.invite.groupId} className="flex h-[200px] flex-col p-5">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4" />
                <p className="text-[12px] font-semibold tracking-[0.14em] uppercase">Invitation</p>
              </div>
              <p className="mt-auto text-[24px] leading-tight font-bold wrap-break-word">{state.invite.groupName}</p>
              <p className="mt-1 text-[13px] text-white/75">From {state.invite.ownerName}</p>
            </WalletCard>
            <p className="mt-5 px-1 text-[15px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">{state.invite.ownerName}</span> invited you. After you join, you
              can see what you owe, where each item is from, and how to pay.
            </p>
            <div className="mt-6 space-y-2">
              <Button size="lg" full loading={joining} onClick={() => join(state.invite)}>
                Join this list
              </Button>
              <Button size="lg" variant="ghost" full onClick={() => navigate('/')} disabled={joining}>
                Not now
              </Button>
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}
