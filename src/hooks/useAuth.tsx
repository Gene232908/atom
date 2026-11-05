import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { errorCode, friendlyError } from '../lib/errors';
import { syncUserProfile } from '../services/friends';

interface AuthValue {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  error: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** True when signed in with email and password but the email is not verified yet. */
  needsVerification: boolean;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  resendVerification: () => Promise<boolean>;
  /** Re-checks with Firebase after the person clicked the link in their email. */
  checkVerified: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const QUIET_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'];
const REDIRECT_CODES = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  // Bumped after re-checking verification, so the screen updates even though the user object is the same.
  const [, setVerifyTick] = useState(0);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => setError(friendlyError(err)));
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
      if (next) {
        syncUserProfile(next).catch(() => undefined);
      }
    });
  }, []);

  const signIn = useCallback(async () => {
    setError('');
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = errorCode(err);
      if (REDIRECT_CODES.includes(code)) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          setError(friendlyError(redirectErr));
        }
      } else if (!QUIET_CODES.includes(code)) {
        setError(friendlyError(err));
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const run = useCallback(async (work: () => Promise<unknown>): Promise<boolean> => {
    setError('');
    setSigningIn(true);
    try {
      await work();
      return true;
    } catch (err) {
      setError(friendlyError(err));
      return false;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signUpWithEmail = useCallback(
    (name: string, email: string, password: string) =>
      run(async () => {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
        // The account is created even if this email fails. The verify screen has a "send again" button.
        await sendEmailVerification(cred.user).catch(() => undefined);
        setUser(cred.user);
      }),
    [run],
  );

  const signInWithEmail = useCallback(
    (email: string, password: string) =>
      run(async () => {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user.emailVerified) await sendEmailVerification(cred.user).catch(() => undefined);
      }),
    [run],
  );

  const resendVerification = useCallback(
    () => run(async () => auth.currentUser && sendEmailVerification(auth.currentUser)),
    [run],
  );

  const checkVerified = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return false;
    try {
      await current.reload();
      // Fresh token so the database rules see email_verified = true.
      await current.getIdToken(true);
      setVerifyTick((n) => n + 1);
      return current.emailVerified === true;
    } catch (err) {
      setError(friendlyError(err));
      return false;
    }
  }, []);

  const resetPassword = useCallback(
    (email: string) => run(() => sendPasswordResetEmail(auth, email.trim())),
    [run],
  );

  const clearError = useCallback(() => setError(''), []);

  const needsVerification = Boolean(
    user &&
      !user.emailVerified &&
      user.providerData.length > 0 &&
      user.providerData.every((p) => p.providerId === 'password'),
  );

  const value = useMemo(
    () => ({
      user, loading, signingIn, error, signIn, signOut, needsVerification,
      signUpWithEmail, signInWithEmail, resendVerification, checkVerified, resetPassword, clearError,
    }),
    [user, loading, signingIn, error, signIn, signOut, needsVerification, signUpWithEmail, signInWithEmail, resendVerification, checkVerified, resetPassword, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** For screens that are only shown after sign in. */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useUser needs a signed in user');
  return user;
}
