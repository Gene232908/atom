import type { ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useScrolled } from '../../hooks/useScrolled';

interface NavProps {
  /** Small title that fades in when the page is scrolled. */
  title: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  /** Render circular close button instead of chevron */
  closeButton?: boolean;
}

/** iOS style top bar: clear at the top, frosted glass after scrolling. */
export function NavBar({ title, onBack, backLabel = 'Wallet', right, closeButton = false }: NavProps) {
  const scrolled = useScrolled(56);
  return (
    <header
      className={`sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-200 select-none ${
        scrolled
          ? 'border-b border-hairline bg-canvas/80 backdrop-blur-xl backdrop-saturate-150'
          : 'border-b border-transparent bg-canvas'
      }`}
    >
      <div className="relative mx-auto flex h-13 w-full max-w-7xl xl:max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-10 xl:px-12">
        <div className="flex min-w-0 shrink-0 items-center justify-start">
          {onBack &&
            (closeButton ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-hairline transition active:scale-90"
              >
                <X className="size-4" strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onBack}
                className="-ml-1 flex h-10 min-w-0 items-center rounded-full pr-2 text-[16px] font-medium text-accent transition active:opacity-50"
              >
                <ChevronLeft className="size-7 shrink-0" strokeWidth={2.2} />
                <span className="truncate max-[359px]:hidden">{backLabel}</span>
              </button>
            ))}
        </div>
        <p
          className={`pointer-events-none absolute inset-x-0 mx-auto max-w-xs truncate text-center text-[16px] font-semibold text-ink transition-opacity duration-200 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {title}
        </p>
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">{right}</div>
      </div>
    </header>
  );
}

interface TitleProps {
  title: string;
  eyebrow?: string;
  right?: ReactNode;
}

/** The big bold page title, like in iOS apps. */
export function LargeTitle({ title, eyebrow, right }: TitleProps) {
  return (
    <div className="flex items-end gap-3 pb-4 select-none">
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="truncate text-[13px] font-semibold tracking-wide text-muted uppercase">{eyebrow}</p>}
        <h1 className="text-[32px] leading-[1.1] font-bold tracking-tight text-ink wrap-break-word sm:text-[36px]">
          {title}
        </h1>
      </div>
      {right}
    </div>
  );
}

export function PageBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`mx-auto w-full max-w-7xl xl:max-w-[1600px] px-3 sm:px-6 lg:px-10 xl:px-12 pt-1 pb-10 sm:pb-12 lg:pb-16 select-none ${className}`}>
      {children}
    </main>
  );
}
