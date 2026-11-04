import { useEffect, useState } from 'react';
import { CircleAlert, MailCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui/Spinner';

/** Shown after creating an account. Nobody gets in until they click the link in their email. */
export function VerifyEmailPage() {
  const { user, resendVerification, checkVerified, signOut, error, signingIn } = useAuth();
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const [resent, setResent] = useState(false);
  const [wait, setWait] = useState(0);

  // Check quietly every few seconds, so it opens by itself after they click the link.
  useEffect(() => {
    const timer = window.setInterval(() => void checkVerified(), 4000);
    const onFocus = () => void checkVerified();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkVerified]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const iVerified = async () => {
    setChecking(true);
    setNotYet(false);
    const ok = await checkVerified();
    setChecking(false);
    if (!ok) setNotYet(true);
  };

  const resend = async () => {
    if (await resendVerification()) {
      setResent(true);
      setWait(60);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-black px-5 py-10 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#6c7bff]/15 text-[#9aa6ff]">
          <MailCheck className="size-8" />
        </div>
        <h1 className="mt-6 text-[26px] font-semibold tracking-tight">Check your email</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/65">
          We sent a verification link to
          <span className="mt-1 block font-semibold break-all text-white">{user?.email}</span>
        </p>
        <ol className="mx-auto mt-6 max-w-xs space-y-2 text-left text-[14px] text-white/70">
          <li>1. Open your email app (Gmail, Yahoo, etc.).</li>
          <li>2. Open the message from Utang List. Not there? Check Spam, then tap "Not spam" so future emails arrive normally.</li>
          <li>3. Tap the link. Then come back here.</li>
        </ol>

        {(error || notYet) && (
          <p className="mt-5 flex items-start justify-center gap-2 text-[13px] font-medium text-[#ff8a80]">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error || 'Not verified yet. Please tap the link in your email first.'}</span>
          </p>
        )}
        {resent && !error && <p className="mt-5 text-[13px] text-[#8fe3a8]">A new email was sent.</p>}

        <div className="mt-7 space-y-2.5">
          <button
            type="button"
            onClick={iVerified}
            disabled={checking}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#6c7bff] text-[15px] font-semibold text-white transition hover:bg-[#7d8aff] active:scale-[0.98] disabled:opacity-60"
          >
            {checking && <Spinner className="size-4" />}I verified my email
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={signingIn || wait > 0}
            className="h-12 w-full rounded-full bg-white/[0.07] text-[15px] font-medium text-white ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
          >
            {wait > 0 ? `Send again in ${wait}s` : 'Send the email again'}
          </button>
          <button type="button" onClick={() => void signOut()} className="pt-2 text-[13px] text-white/50 hover:text-white">
            Use a different email
          </button>
        </div>
      </div>
    </div>
  );
}
