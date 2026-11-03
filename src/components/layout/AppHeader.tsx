import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useScrolled } from '../../hooks/useScrolled';

interface NavProps {
  /** Small title that fades in when the page is scrolled. */
  title: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}

/** iOS style top bar: clear at the top, frosted glass after scrolling. */
export function NavBar({ title, onBack, backLabel = 'Back', right }: NavProps) {
  const scrolled = useScrolled(56);
  return (
    <header
      className={`sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-200 ${
        scrolled ? 'border-b border-hairline bg-canvas/80 backdrop-blur-xl backdrop-saturate-150' : 'border-b border-transparent bg-canvas'
      }`}
    >
      <div className="mx-auto grid h-13 w-full max-w-5xl grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-2 px-2 sm:px-5">
        <div className="flex min-w-0 justify-start">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 flex h-10 min-w-0 items-center rounded-full pr-2 text-[16px] font-medium text-accent transition active:opacity-50"
            >
              <ChevronLeft className="size-7 shrink-0" strokeWidth={2.2} />
              <span className="truncate max-[359px]:hidden">{backLabel}</span>
            </button>
          )}
        </div>
        <p
          className={`truncate text-center text-[16px] font-semibold transition-opacity duration-200 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {title}
        </p>
        <div className="flex min-w-0 items-center justify-end gap-2">{right}</div>
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
    <div className="flex items-end gap-3 pb-4">
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="truncate text-[13px] font-semibold tracking-wide text-muted uppercase">{eyebrow}</p>}
        <h1 className="text-[32px] leading-[1.1] font-bold tracking-tight wrap-break-word sm:text-[36px]">{title}</h1>
      </div>
      {right}
    </div>
  );
}

export function PageBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`mx-auto w-full max-w-5xl px-4 pt-1 pb-32 sm:px-5 ${className}`}>{children}</main>
  );
}
