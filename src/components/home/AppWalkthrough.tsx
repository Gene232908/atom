import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import {
  ArrowLeftRight,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  HelpCircle,
  MoreHorizontal,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface TourStep {
  targetId: string;
  title: string;
  icon: typeof Plus;
  badge: string;
  description: string;
  actionPrompt: string;
  shape?: 'circle' | 'rect';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-add-btn',
    shape: 'circle',
    badge: '1 of 7',
    title: 'Add a Card or Loan',
    icon: Plus,
    description: 'Tap "+" to create a new credit card, pay-later store, or personal installment loan.',
    actionPrompt: 'Tap the "+" button to proceed',
  },
  {
    targetId: 'tour-wallet-cards',
    shape: 'rect',
    badge: '2 of 7',
    title: 'Open Card & Add Items',
    icon: CreditCard,
    description: 'Tap any card to open it. Inside, tap "+ Add item" to split bills equally or set custom amounts per person.',
    actionPrompt: 'Tap the card area to proceed',
  },
  {
    targetId: 'tour-summary-tiles',
    shape: 'rect',
    badge: '3 of 7',
    title: 'Balance Overview',
    icon: Coins,
    description: '"You owe" is what you pay. "To collect" is what others owe you. Automatically updates when payments are confirmed.',
    actionPrompt: 'Tap the summary tiles to proceed',
  },
  {
    targetId: 'tour-tabs-toggle',
    shape: 'rect',
    badge: '4 of 7',
    title: 'Switch Views',
    icon: ArrowLeftRight,
    description: 'Toggle between "You lend" (debts to collect), "You owe" (debts you pay), and "My loans" (your installment loans).',
    actionPrompt: 'Tap the tabs toggle to proceed',
  },
  {
    targetId: 'tour-profile-btn',
    shape: 'circle',
    badge: '5 of 7',
    title: 'Profile & Settings',
    icon: MoreHorizontal,
    description: 'Tap here to add friends, view completed payment history, and customize your wallet settings.',
    actionPrompt: 'Tap the profile button to proceed',
  },
  {
    targetId: 'tour-profile-btn',
    shape: 'circle',
    badge: '6 of 7',
    title: 'Phone Alerts & Reminders',
    icon: Bell,
    description: 'Get lock-screen alerts for upcoming due dates, payment confirmations, and friend requests.',
    actionPrompt: 'Tap here to proceed to final step',
  },
  {
    targetId: 'tour-help-btn',
    shape: 'circle',
    badge: '7 of 7',
    title: 'Quick Guide & Replay',
    icon: HelpCircle,
    description: 'Tap this "?" icon anytime to replay this step-by-step walkthrough.',
    actionPrompt: 'Tap the "?" button to finish',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

interface TargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

export function AppWalkthrough({ open, onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const step = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Measure target DOM element
  const updateRect = useCallback(() => {
    if (!open) return;
    const el = document.getElementById(step.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const isCircle = step.shape === 'circle';
    const padding = 6;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;
    const left = rect.left - padding;
    const top = rect.top - padding;
    const radius = isCircle ? Math.max(width, height) / 2 : 18;

    setTargetRect({ left, top, width, height, radius });
  }, [open, step.targetId, step.shape]);

  // Scroll target element smoothly so it never collides with the card
  useLayoutEffect(() => {
    if (!open) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const timer = setTimeout(updateRect, 180);
    return () => clearTimeout(timer);
  }, [open, step.targetId, updateRect]);

  // Listen to window resize and scroll
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open, updateRect]);

  // Handle clicking the interactive highlighted target element to advance
  const handleTargetClick = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } catch {}

    if (isLast) {
      onClose();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && !isLast) setStepIndex((i) => i + 1);
      else if (e.key === 'ArrowLeft' && !isFirst) setStepIndex((i) => i - 1);
      else if (e.key === 'Enter') handleTargetClick();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isFirst, isLast, onClose]);

  if (!open) return null;

  const StepIcon = step.icon;

  // Guarantee the card NEVER overlaps the highlighted element:
  // If target element is in the lower half of viewport, place card at the top.
  // If target element is in the upper half of viewport, place card at the bottom.
  const targetCenterY = targetRect
    ? targetRect.top + targetRect.height / 2
    : typeof window !== 'undefined'
      ? window.innerHeight / 2
      : 300;
  const isTargetLowerHalf = typeof window !== 'undefined' && targetCenterY > window.innerHeight * 0.44;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden select-none animate-fade-in pointer-events-auto">
      {/* SVG Spotlight Mask Cutout */}
      <svg
        className="pointer-events-none fixed inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx={targetRect.radius}
                ry={targetRect.radius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.72)"
          mask="url(#tour-spotlight-mask)"
          className="backdrop-blur-[2px] transition-all duration-300"
        />
      </svg>

      {/* Clickable Interactive Target Overlay - Tapping it advances to the next step */}
      {targetRect && (
        <button
          type="button"
          onClick={handleTargetClick}
          style={{
            left: `${targetRect.left}px`,
            top: `${targetRect.top}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            borderRadius: `${targetRect.radius}px`,
          }}
          aria-label={`Tap ${step.title} to proceed`}
          className="fixed z-[101] cursor-pointer transition-transform active:scale-95 ring-4 ring-accent shadow-[0_0_28px_rgba(0,122,255,0.85)] animate-pulse hover:ring-white focus:outline-none"
        >
          {/* Animated Bouncing Pointer Hand */}
          <span className="pointer-events-none absolute -bottom-2.5 -right-2.5 flex size-7 items-center justify-center rounded-full bg-accent text-white shadow-lg animate-bounce text-[13px]">
            👆
          </span>
        </button>
      )}

      {/* Compact Floating Glassmorphic Bubble Card (Positioned away from target) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        style={{
          ...(isTargetLowerHalf
            ? { top: 'max(16px, env(safe-area-inset-top, 16px))' }
            : { bottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }),
        }}
        className="fixed inset-x-3 sm:inset-x-6 mx-auto z-10 w-auto max-w-[380px] rounded-[22px] bg-white/95 p-3.5 sm:p-4 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.35),0_0_0_0.5px_rgba(0,0,0,0.08)] ring-1 ring-white/90 ring-inset backdrop-blur-2xl backdrop-saturate-150 animate-pop"
      >
        {/* Top Header: Badge, Step Counter, and Close Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10.5px] font-bold text-accent tracking-wide uppercase">
              Step {step.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Skip walkthrough"
            title="Close / Skip"
            className="grid size-6 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink active:scale-90 transition"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>

        {/* Title and Icon */}
        <div className="mt-2 flex items-center gap-2.5">
          <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-xs">
            <StepIcon className="size-3.5" strokeWidth={2.5} />
          </div>
          <h3 className="text-[14px] font-bold text-ink leading-tight">
            {step.title}
          </h3>
        </div>

        {/* Short, direct explanation */}
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink/80">
          {step.description}
        </p>

        {/* Interactive Action Prompt Banner */}
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">
          <span className="animate-pulse">👉</span>
          <span className="truncate">{step.actionPrompt}</span>
        </div>

        {/* Footer: Progress Dots & Action Buttons */}
        <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-hairline/60">
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStepIndex(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === stepIndex
                    ? 'w-4 bg-accent'
                    : 'w-1.5 bg-black/20 hover:bg-black/35'
                }`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            {!isFirst && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStepIndex((i) => i - 1)}
                className="text-[11.5px] h-7 px-2 text-muted hover:text-ink"
                icon={<ChevronLeft className="size-3" />}
              >
                Back
              </Button>
            )}

            {isLast ? (
              <Button
                size="sm"
                variant="primary"
                onClick={onClose}
                className="text-[11.5px] h-7 px-2.5 font-bold shadow-xs"
                icon={<Check className="size-3" strokeWidth={3} />}
              >
                Got it!
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setStepIndex((i) => i + 1)}
                className="text-[11.5px] h-7 px-2.5 font-semibold shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="size-3 ml-0.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
