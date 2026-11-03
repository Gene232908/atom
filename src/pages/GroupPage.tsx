import { useEffect, useState } from 'react';
import { SearchX } from 'lucide-react';
import { useUser } from '../hooks/useAuth';
import { useGroups } from '../hooks/useGroups';
import { navigate } from '../hooks/useRoute';
import { NavBar, PageBody } from '../components/layout/AppHeader';
import { GroupView } from '../components/group/GroupView';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Spinner } from '../components/ui/Spinner';

export function GroupPage({ id }: { id: string }) {
  const user = useUser();
  const { groups, loading, error, retry } = useGroups();
  const group = groups.find((g) => g.id === id) ?? null;

  // Right after joining, the list can take a moment to arrive. Wait a bit before saying "not found".
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setWaiting(false), 4000);
    return () => window.clearTimeout(timer);
  }, [id]);

  if (group) return <GroupView group={group} uid={user.uid} />;

  return (
    <>
      <NavBar title="List" backLabel="Wallet" onBack={() => navigate('/')} />
      <PageBody>
        {error ? (
          <ErrorBanner message={error} onRetry={retry} />
        ) : loading || waiting ? (
          <div className="flex justify-center py-20 text-muted">
            <Spinner className="size-8" />
          </div>
        ) : (
          <EmptyState
            icon={<SearchX className="size-7" />}
            title="We can't find this list"
            text="It may have been deleted, or you are not part of it anymore."
            action={<Button onClick={() => navigate('/')}>Go to my lists</Button>}
          />
        )}
      </PageBody>
    </>
  );
}
