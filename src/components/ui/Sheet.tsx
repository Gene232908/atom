import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockScroll } from '../../lib/scrollLock';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  zIndex?: string;
}

const CLOSE_DISTANCE = 110;

/**
 * iOS style sheet. Slides up from the bottom on phones (drag it down to close)
 * and shows as a centered card on tablets and laptops.
 */
export function Sheet({ open, onClose, title, description, children, footer, zIndex = 'z-50' }: Props) {
  const closeRef = useRef(onClose);
  // Ignore background taps right after opening (the finger that opened it may still be lifting).
  const openedAt = useRef(0);
  closeRef.current = onClose;
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
    const unlock = lockScroll();
    document.body.classList.add('sheet-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('sheet-open');
      unlock();
    };
  }, [open]);

  useEffect(() => {
    if (!open) setDrag(0);
  }, [open]);

  if (!open) return null;

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(min-width: 768px)').matches) return;
    if ((e.target as HTMLElement).closest('button')) return;
    start.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return;
    setDrag(Math.max(0, e.clientY - start.current));
  };
  const onUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (drag > CLOSE_DISTANCE) closeRef.current();
    else setDrag(0);
  };

  const dragging = start.current !== null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndex} flex items-end justify-center md:items-center md:p-6 select-none`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/20 backdrop-blur-md backdrop-saturate-125 transition-opacity"
        style={{ opacity: Math.max(0.2, 1 - drag / 400) }}
        onClick={() => {
          if (Date.now() - openedAt.current > 400) closeRef.current();
        }}
      />
      <div
        className="relative flex max-h-[94dvh] w-full animate-sheet-up flex-col rounded-t-[28px] bg-canvas text-ink shadow-2xl md:max-w-lg md:animate-pop md:rounded-[28px]"
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div
          className="shrink-0 touch-none cursor-grab"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className="flex justify-center pt-2 md:hidden">
            <span className="h-[5px] w-9 rounded-full bg-fill-strong" />
          </div>
          <div className="flex items-start gap-3 px-5 pt-3 pb-3 md:pt-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] leading-tight font-bold tracking-tight text-ink wrap-break-word">{title}</h2>
              {description && <p className="mt-1 text-[14px] leading-snug text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={() => closeRef.current()}
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-fill text-muted transition active:scale-90 hover:text-ink"
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 sm:px-5 ${
            footer ? 'pb-4' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]'
          }`}
        >
          {children}
        </div>
        {footer && (
          <div className="border-t border-hairline bg-canvas/90 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-5 md:rounded-b-[28px]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
