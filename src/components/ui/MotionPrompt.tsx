import { Sparkles } from 'lucide-react';
import { useMotionPrompt } from '../../hooks/useTiltReflection';

/** iPhone/iPad only: one tap to let the card shine follow the phone's movement. */
export function MotionPrompt() {
  const { show, enable } = useMotionPrompt();
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => void enable()}
      className="flex w-full items-center gap-3 rounded-[18px] bg-white px-4 py-3 text-left shadow-sm ring-1 ring-hairline transition active:scale-[0.99]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-pink-400 via-sky-400 to-amber-300 text-white">
        <Sparkles className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink">Turn on card shine</span>
        <span className="block text-[12px] text-muted">Tilt your phone and the cards catch the light.</span>
      </span>
      <span className="shrink-0 text-[13px] font-semibold text-accent">Turn on</span>
    </button>
  );
}
