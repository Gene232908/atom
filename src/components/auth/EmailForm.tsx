import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui/Spinner';

type Mode = 'signin' | 'signup' | 'reset';

const field =
  'h-12 w-full rounded-xl bg-white/[0.07] px-4 text-[16px] text-white outline-none ring-1 ring-white/10 transition placeholder:text-white/35 focus:bg-white/[0.1] focus:ring-2 focus:ring-[#7c8cff]';

/** Email + password form: sign in, create account, or reset a forgotten password. */
export function EmailForm({ onBack }: { onBack: () => void }) {
  const { signUpWithEmail, signInWithEmail, resetPassword, signingIn, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [local, setLocal] = useState('');
  const [sent, setSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setLocal('');
    setSent(false);
    clearError();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLocal('');
    if (!email.trim()) return setLocal('Please type your email.');
    if (mode === 'signup' && !name.trim()) return setLocal('Please type your name.');
    if (mode !== 'reset' && !password) return setLocal('Please type your password.');
    if (mode === 'signup' && password.length < 6) return setLocal('Use a password with at least 6 characters.');

    if (mode === 'signup') await signUpWithEmail(name, email, password);
    else if (mode === 'signin') await signInWithEmail(email, password);
    else if (await resetPassword(email)) setSent(true);
  };

  const title = mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in with email';

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-white">{title}</h2>
        <button type="button" onClick={onBack} className="text-[13px] font-medium text-white/60 hover:text-white">
          Back
        </button>
      </div>

      {mode === 'signup' && (
        <input className={field} placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      <input
        className={field}
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {mode !== 'reset' && (
        <div className="relative">
          <input
            className={`${field} pr-12`}
            type={show ? 'text' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-white/50 hover:text-white"
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
      )}

      {local && <p className="text-[13px] font-medium text-[#ff8a80]">{local}</p>}
      {sent && <p className="text-[13px] text-[#8fe3a8]">Done! Check your email for a link to set a new password.</p>}

      <button
        type="submit"
        disabled={signingIn}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#6c7bff] text-[15px] font-semibold text-white transition hover:bg-[#7d8aff] active:scale-[0.98] disabled:opacity-60"
      >
        {signingIn && <Spinner className="size-4" />}
        {mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
      </button>

      <div className="flex items-center justify-between pt-1 text-[13px] text-white/60">
        {mode === 'signin' ? (
          <>
            <button type="button" onClick={() => switchMode('reset')} className="hover:text-white">
              Forgot password?
            </button>
            <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-white hover:underline">
              Create account
            </button>
          </>
        ) : (
          <button type="button" onClick={() => switchMode('signin')} className="font-semibold text-white hover:underline">
            I already have an account
          </button>
        )}
      </div>
    </form>
  );
}
