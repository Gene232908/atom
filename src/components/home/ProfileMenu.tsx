import { useEffect, useRef, useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { useAuth, useUser } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProfileMenu({ open, onClose }: Props) {
  const user = useUser();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = user.displayName || 'You';

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    // Slight delay so the opening click doesn't instantly close
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Invisible backdrop to catch outside taps on mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={menuRef}
        role="dialog"
        aria-label="Profile and account menu"
        className="absolute right-3 sm:right-6 lg:right-10 top-14 z-50 w-72 origin-top-right rounded-[24px] bg-white/95 p-4 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08] backdrop-blur-xl animate-pop select-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={name} photo={user.photoURL ?? ''} size="md" ring="subtle" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-ink">{name}</p>
              <p className="truncate text-[12px] text-muted">{user.email || 'Signed in'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink active:scale-90 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="my-3 h-px bg-black/[0.06]" />

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();
            } finally {
              setBusy(false);
              onClose();
            }
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-semibold text-bad transition hover:bg-bad/10 active:scale-[0.98] disabled:opacity-50"
        >
          <LogOut className="size-4 shrink-0" strokeWidth={2.2} />
          <span>{busy ? 'Signing out...' : 'Sign out'}</span>
        </button>
      </div>
    </>
  );
}
