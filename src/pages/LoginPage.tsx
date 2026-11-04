import { useState } from 'react';
import { CircleAlert, Copy, Mail, Smartphone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { copyText, isInAppBrowser } from '../lib/clipboard';
import { AuthCards } from '../components/auth/AuthCards';
import { EmailForm } from '../components/auth/EmailForm';
import { Spinner } from '../components/ui/Spinner';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const POINTS = ['Every debt as a card, easy to read', 'Pay and confirm in a few taps', 'Everyone sees the same live balance'];

export function LoginPage({ joining }: { joining: boolean }) {
  const { signIn, signingIn, error } = useAuth();
  const [copied, setCopied] = useState(false);
  const [useEmail, setUseEmail] = useState(false);
  const inApp = isInAppBrowser();

  const copyLink = async () => {
    if (await copyText(window.location.href)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  const headline = joining ? 'You were invited.' : 'Utang, made simple.';
  const sub = joining
    ? 'Sign in to see what you owe, where it came from, and how to pay.'
    : 'Every debt as a card. See what you owe, tap Pay, and the lender confirms it.';

  return (
    <div className="min-h-dvh bg-black pt-[env(safe-area-inset-top)] text-white max-lg:flex max-lg:flex-col max-lg:justify-center lg:grid lg:grid-cols-2">
      {/* Left: story + cards (full width on phones, half on laptops) */}
      <div className="relative flex flex-col overflow-hidden lg:min-h-dvh lg:justify-center lg:bg-[radial-gradient(120%_90%_at_20%_10%,#1c1d3a,transparent_60%)] lg:px-12 xl:px-20">
        <AuthCards className="h-[290px] shrink-0 sm:h-[330px] lg:order-2 lg:mt-10 lg:h-[360px]" />
        <div className="mx-auto w-full max-w-md px-6 lg:order-1 lg:mx-0 lg:max-w-lg lg:px-0">
          <div className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="size-8 rounded-[10px]" />
            <span className="text-[16px] font-semibold tracking-tight">Utang List</span>
          </div>
          <h1 className="mt-5 text-[32px] leading-[1.1] font-semibold tracking-tight lg:mt-10 lg:text-[44px]">{headline}</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-white/60">{sub}</p>
          <ul className="mt-6 hidden space-y-2.5 text-[14px] text-white/70 lg:block">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-full bg-[#7c8cff]" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: sign in */}
      <div className="flex items-center justify-center px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] lg:min-h-dvh lg:border-l lg:border-white/[0.06] lg:bg-[#0b0b0f] lg:px-12">
        <div className="w-full max-w-sm">
          {inApp && (
            <div className="mb-4 rounded-2xl bg-white/10 p-4">
              <p className="flex items-center gap-2 text-[14px] font-semibold">
                <Smartphone className="size-4 shrink-0 text-[#ffb340]" />
                Open this in Chrome or Safari
              </p>
              <p className="mt-1 text-[13px] text-white/70">
                Google sign in does not work inside Messenger or Facebook. Tap the menu (⋯) and choose "Open in browser", or copy the link. Email sign in works here.
              </p>
              <button
                type="button"
                onClick={copyLink}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-ink active:scale-95"
              >
                <Copy className="size-4" />
                {copied ? 'Link copied!' : 'Copy link'}
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl bg-[#ff3b30]/15 p-3 text-[13px] font-medium text-[#ff8a80]">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">{error}</span>
            </div>
          )}

          {useEmail ? (
            <EmailForm onBack={() => setUseEmail(false)} />
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={signIn}
                disabled={signingIn}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-semibold text-ink transition active:scale-[0.97] disabled:opacity-70"
              >
                {signingIn ? <Spinner className="size-5" /> : <GoogleIcon />}
                {signingIn ? 'Signing in...' : 'Continue with Google'}
              </button>
              <div className="flex items-center gap-3 py-1 text-[12px] text-white/35">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <button
                type="button"
                onClick={() => setUseEmail(true)}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-full bg-white/[0.07] text-[15px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.97]"
              >
                <Mail className="size-5" />
                Continue with email
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-[12px] text-white/40">
            We only use your name, email and photo so your friends know it is you.
          </p>
        </div>
      </div>
    </div>
  );
}
