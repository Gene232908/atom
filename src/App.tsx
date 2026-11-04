import { AuthProvider, useAuth } from './hooks/useAuth';
import { GroupsProvider } from './hooks/useGroups';
import { ToastProvider } from './hooks/useToast';
import { useRoute } from './hooks/useRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { FullScreenLoader } from './components/ui/Spinner';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { GroupPage } from './pages/GroupPage';
import { JoinPage } from './pages/JoinPage';
import { DesktopShell } from './components/desktop/DesktopShell';
import { useIsDesktop } from './hooks/useIsDesktop';

function Screens() {
  const { user, loading } = useAuth();
  const route = useRoute();
  const isDesktop = useIsDesktop();

  if (loading) return <FullScreenLoader />;
  if (!user) return <LoginPage joining={route.name === 'join'} />;

  const page =
    route.name === 'group' ? (
      <GroupPage key={route.id} id={route.id} />
    ) : route.name === 'join' ? (
      <JoinPage key={route.code} code={route.code} />
    ) : (
      <HomePage />
    );

  return (
    <GroupsProvider uid={user.uid}>
      <OfflineBanner />
      {isDesktop ? <DesktopShell route={route}>{page}</DesktopShell> : page}
    </GroupsProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Screens />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
