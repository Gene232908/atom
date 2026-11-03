import { useState } from 'react';
import { CircleAlert, Copy, Smartphone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { copyText, isInAppBrowser } from '../lib/clipboard';
import { storeGradient } from '../lib/cardTheme';
import { WalletCard } from '../components/ui/WalletCard';
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

const DEMO = [
  { store: 'Lazada', amount: '₱2,150.00', label: 'Phone case', rotate: -9, x: -26, y: 10 },
  { store: 'Atome', amount: '₱899.50', label: 'Grocery', rotate: 7, x: 26, y: 2 },
  { store: 'Shopee', amount: '₱1,500.00', label: 'Rubber shoes', rotate: -1, x: 0, y: 34 },
];

export function LoginPage({ joining }: { joining: boolean }) {
  const { signIn, signingIn, error } = useAuth();
  const [copied, setCopied] = useState(false);
  const inApp = isInAppBrowser();

  const copyLink = async () => {
    if (await copyText(window.location.href)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-black pt-[env(safe-area-inset-top)] text-white">
      <div className="relative mx-auto h-[300px] w-full max-w-md shrink-0 sm:h-[340px]" aria-hidden>
        <div className="absolute inset-x-0 top-10 mx-auto h-56 w-56 rounded-full bg-[#5e5ce6]/40 blur-[90px]" />
        {DEMO.map((c, i) => (
          <div
            key={c.store}
            className="absolute top-12 left-1/2 w-[260px]"
            style={{ transform: `translateX(calc(-50% + ${c.x}px)) translateY(${c.y}px) rotate(${c.rotate}deg)` }}
          >
            <div className="animate-rise" style={{ animationDelay: `${i * 120}ms` }}>
            <WalletCard seed={c.store} background={storeGradient(c.store, c.store)} className="flex h-41 flex-col p-4">
              <p className="text-[12px] font-bold tracking-[0.14em] uppercase">{c.store}</p>
              <p className="text-[12px] text-white/75">{c.label}</p>
              <div className="mt-auto flex items-end justify-between">
                <p className="text-[22px] font-bold tabular-nums">{c.amount}</p>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-ink">Pay now</span>
              </div>
            </WalletCard>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h1 className="text-[34px] leading-[1.1] font-bold tracking-tight">
          {joining ? 'You were invited.' : 'Utang, made simple.'}
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-white/65">
          {joining
            ? 'Sign in to see what you owe, where it came from, and how to pay.'
            : 'Every debt as a card. See what you owe, tap Pay now, and the lender confirms it.'}
        </p>

        <div className="mt-auto pt-8">
          {inApp && (
            <div className="mb-4 rounded-[20px] bg-white/10 p-4">
              <p className="flex items-center gap-2 text-[14px] font-semibold">
                <Smartphone className="size-4 shrink-0 text-warn" />
                Open this in Chrome or Safari
              </p>
              <p className="mt-1 text-[13px] text-white/70">
                Google sign in does not work inside Messenger or Facebook. Tap the menu (⋯) and choose "Open in
                browser", or copy the link.
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
            <div className="mb-4 flex items-start gap-2 rounded-[18px] bg-bad/15 p-3 text-[14px] font-medium text-[#ff8a80]">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={signIn}
            disabled={signingIn}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-white text-[16px] font-semibold text-ink transition active:scale-[0.97] disabled:opacity-70"
          >
            {signingIn ? <Spinner className="size-5" /> : <GoogleIcon />}
            {signingIn ? 'Signing in...' : 'Continue with Google'}
          </button>
          <p className="mt-3 text-center text-[12px] text-white/45">
            We only use your name, email and photo so your friends know it is you.
          </p>
        </div>
      </div>
    </div>
  );
}
