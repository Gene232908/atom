import { AuthProvider, useAuth } from './hooks/useAuth';
import { GroupsProvider } from './hooks/useGroups';
import { ToastProvider } from './hooks/useToast';
import { useRoute } from './hooks/useRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { FullScreenLoader } from './components/ui/Spinner';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { HomePage } from './pages/HomePage';
import { GroupPage } from './pages/GroupPage';
import { JoinPage } from './pages/JoinPage';
import { DesktopShell } from './components/desktop/DesktopShell';
import { useIsDesktop } from './hooks/useIsDesktop';
import { TutorialGate } from './components/onboarding/TutorialGate';

function Screens() {
  const { user, loading, needsVerification } = useAuth();
  const route = useRoute();
  const isDesktop = useIsDesktop();

  if (loading) return <FullScreenLoader />;
  if (!user) return <LoginPage joining={route.name === 'join'} />;
  if (needsVerification) return <VerifyEmailPage />;

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
      <TutorialGate uid={user.uid} />
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
