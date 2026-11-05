import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bell,
  HelpCircle,
  History,
  LogOut,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth, useUser } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenFriends?: () => void;
  friendRequestsCount?: number;
  onOpenReminders?: () => void;
  remindersCount?: number;
  hasUrgentReminder?: boolean;
  onOpenHistory?: () => void;
  onOpenSettings?: () => void;
  onOpenAppIcon?: () => void;
  onStartTour?: () => void;
}

export function ProfileMenu({
  open,
  onClose,
  onOpenFriends,
  friendRequestsCount = 0,
  onOpenReminders,
  remindersCount = 0,
  hasUrgentReminder = false,
  onOpenHistory,
  onOpenSettings,
  onOpenAppIcon,
  onStartTour,
}: Props) {
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
      {/* Blurs the page so only the menu is in focus. Also catches outside taps. */}
      <div
        className="fixed inset-0 z-40 animate-fade-in bg-white/10 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Liquid glass bubble menu */}
      <div
        ref={menuRef}
        role="dialog"
        aria-label="Actions and profile menu"
        className="liquid-rim absolute top-14 right-3 z-50 w-72 origin-top-right animate-pop overflow-hidden rounded-[26px] bg-white/80 p-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.16),0_0_0_0.5px_rgba(0,0,0,0.07)] backdrop-blur-2xl backdrop-saturate-150 select-none sm:right-6 lg:right-10"
      >
        {/* User Card Header */}
        <div className="mb-1.5 flex items-center justify-between gap-2.5 rounded-[18px] bg-white/50 p-2.5 ring-1 ring-white/70 ring-inset">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={name} photo={user.photoURL ?? ''} size="sm" ring="subtle" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] leading-tight font-semibold text-ink">{name}</p>
              <p className="truncate text-[11.5px] text-muted">{user.email || 'Signed in'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink active:scale-90 transition"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>

        {/* Main Actions Group */}
        <div className="space-y-0.5">
          {onOpenFriends && (
            <MenuRow
              icon={<UserPlus className="size-[17px]" strokeWidth={2.2} />}
              label="Friends & Contacts"
              badge={friendRequestsCount > 0 ? `+${friendRequestsCount}` : undefined}
              badgeTone="bad"
              onClick={() => {
                onClose();
                onOpenFriends();
              }}
            />
          )}

          {onOpenReminders && (
            <MenuRow
              icon={<Bell className="size-[17px]" strokeWidth={2.2} />}
              label="Due Reminders"
              badge={remindersCount > 0 ? String(remindersCount) : undefined}
              badgeTone={hasUrgentReminder ? 'bad' : 'warn'}
              onClick={() => {
                onClose();
                onOpenReminders();
              }}
            />
          )}

          {onOpenHistory && (
            <MenuRow
              icon={<History className="size-[17px]" strokeWidth={2.2} />}
              label="Completed History"
              onClick={() => {
                onClose();
                onOpenHistory();
              }}
            />
          )}

          {onOpenSettings && (
            <MenuRow
              icon={<SlidersHorizontal className="size-[17px]" strokeWidth={2.2} />}
              label="Wallet Settings"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
            />
          )}

          {onStartTour && (
            <MenuRow
              icon={<HelpCircle className="size-[17px]" strokeWidth={2.2} />}
              label="App Walkthrough / Guide"
              onClick={() => {
                onClose();
                onStartTour();
              }}
            />
          )}
        </div>

        {/* Thin divider */}
        <div className="my-1.5 h-px bg-black/[0.06] mx-2" />

        {/* Customization & Sign Out */}
        <div className="space-y-0.5">
          {onOpenAppIcon && (
            <MenuRow
              icon={<Sparkles className="size-[17px]" strokeWidth={2.2} />}
              label="Customize App Icon"
              onClick={() => {
                onClose();
                onOpenAppIcon();
              }}
            />
          )}

          <MenuRow
            icon={<LogOut className="size-[17px]" strokeWidth={2.2} />}
            label={busy ? 'Signing out...' : 'Sign Out'}
            tone="bad"
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
          />
        </div>
      </div>
    </>
  );
}

function MenuRow({
  icon,
  label,
  badge,
  badgeTone = 'accent',
  onClick,
  tone = 'default',
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  badgeTone?: 'bad' | 'warn' | 'accent';
  onClick: () => void;
  tone?: 'default' | 'bad';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-2 text-left text-[13.5px] font-medium transition active:scale-[0.98] ${
        tone === 'bad'
          ? 'text-bad hover:bg-bad/8'
          : 'text-ink/90 hover:bg-white/60 hover:text-ink'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <span className={`shrink-0 ${tone === 'bad' ? 'text-bad' : 'text-ink/70'}`}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span
          className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold text-white shadow-xs ${
            badgeTone === 'bad'
              ? 'bg-bad animate-pulse'
              : badgeTone === 'warn'
                ? 'bg-amber-500'
                : 'bg-accent'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
