import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { friendlyError } from '../lib/errors';

type Tone = 'success' | 'error' | 'info';
type ShowToast = (message: string, tone?: Tone) => void;

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<ShowToast>(() => undefined);

const toneStyle: Record<Tone, string> = {
  success: 'text-white',
  error: 'text-white',
  info: 'text-white',
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<number | null>(null);

  const show = useCallback<ShowToast>((message, tone = 'success') => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    const id = nextId++;
    setToast({ id, message, tone });
    timerRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
      timerRef.current = null;
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex flex-col items-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className={`flex w-fit max-w-sm animate-pop items-start gap-2.5 rounded-[22px] bg-black/90 px-4 py-3 text-[14px] font-medium shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl ${toneStyle[toast.tone]}`}
          >
            {toast.tone === 'error' ? (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-bad" />
            ) : toast.tone === 'info' ? (
              <Info className="mt-0.5 size-4 shrink-0 text-accent" />
            ) : (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" />
            )}
            <span className="min-w-0 wrap-break-word">{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

/**
 * Runs a save without making the user wait. The screen updates right away
 * (even offline) and we only show a message if the save fails.
 */
export function useSafeWrite() {
  const toast = useToast();
  return useCallback(
    (work: Promise<unknown>, successMessage?: string) => {
      if (successMessage) toast(successMessage);
      work.catch((err) => toast(friendlyError(err), 'error'));
    },
    [toast],
  );
}
