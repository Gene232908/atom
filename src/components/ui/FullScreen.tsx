import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll } from '../../lib/scrollLock';

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
  zIndex?: string;
}

const stack: symbol[] = [];

/** A full page that slides up over the app. Sheets (z-50) still open on top of it. */
export function FullScreen({ label, onClose, children, zIndex = 'z-40' }: Props) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const id = Symbol('fullscreen');
    stack.push(id);
    const unlock = lockScroll();
    document.documentElement.style.backdropFilter = 'blur(8px)';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== id) return;
      if (document.querySelector('[role="dialog"]:not([data-fullscreen])')) return;
      closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.backdropFilter = '';
      stack.splice(stack.indexOf(id), 1);
      unlock();
    };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-fullscreen=""
      className={`fixed inset-0 ${zIndex} animate-sheet-up overflow-y-auto overscroll-contain bg-canvas text-ink`}
    >
      <div className="mx-auto min-h-full w-full max-w-xl px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5">
        {children}
      </div>
    </div>,
    document.body,
  );
}
