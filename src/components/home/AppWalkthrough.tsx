import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import {
  Check,
  ChevronRight,
  X,
} from 'lucide-react';
import { useIsDesktop } from '../../hooks/useIsDesktop';

export interface TourStep {
  targetId: string;
  fallbackTargetId?: string;
  title: string;
  description: string;
  actionHint: string;
  shape?: 'circle' | 'rect';
  preferredPos?: 'top' | 'bottom';
}

const MOBILE_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-profile-btn',
    shape: 'circle',
    title: 'Profile & Settings',
    description: 'Tap your profile icon to open your friends list, bill reminders, and completed history.',
    actionHint: 'Tap profile button',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-profile-friends',
    fallbackTargetId: 'tour-profile-menu',
    shape: 'rect',
    title: 'Friends & Contacts',
    description: 'Tap "Friends & Contacts" to manage your split companions and add friends by their email.',
    actionHint: 'Tap Friends & Contacts',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-friends-content',
    shape: 'rect',
    title: 'Add Friends & Share ID',
    description: 'Search friends by email, copy your User ID to share, and accept incoming friend requests.',
    actionHint: 'Tap Next for Due Reminders',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-reminders-content',
    shape: 'rect',
    title: 'Due Reminders & Alerts',
    description: 'Track urgent payment countdowns, overdue items, and turn on lock-screen push alerts.',
    actionHint: 'Tap Next for History',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-history-content',
    shape: 'rect',
    title: 'Completed History',
    description: 'Review all completed personal loans, settled debts, and past payment records safely archived here.',
    actionHint: 'Tap Next for Wallet Cards',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-front-card',
    fallbackTargetId: 'tour-wallet-cards',
    shape: 'rect',
    title: 'Open Card & Debts',
    description: 'Tap any card to view its list of purchases, or swipe left and right to switch between your cards.',
    actionHint: 'Tap card or Next',
    preferredPos: 'top',
  },
  {
    targetId: 'tour-add-item-btn',
    fallbackTargetId: 'tour-add-btn',
    shape: 'circle',
    title: 'Add an Item',
    description: 'Tap "+ Item" to list a purchase or loan, enter the store, and choose payment installment terms.',
    actionHint: 'Tap "+ Item" or Next',
    preferredPos: 'bottom',
  },
  {
    targetId: 'item-price',
    fallbackTargetId: 'tour-summary-tiles',
    shape: 'rect',
    title: 'Equal or Custom Split',
    description: 'Choose 1x or installments, and split bills equally or enter custom amounts for each friend.',
    actionHint: 'Tap Next',
    preferredPos: 'top',
  },
  {
    targetId: 'tour-add-btn',
    shape: 'circle',
    title: 'Create New Cards',
    description: 'Tap "+" in the top bar anytime to create a new shared credit card or personal loan.',
    actionHint: 'Tap Next',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-help-btn',
    shape: 'circle',
    title: 'Quick Guide & Replay',
    description: 'Tap this "?" icon anytime to replay this step-by-step walkthrough whenever you need help.',
    actionHint: 'Tap "Got it!" to finish',
    preferredPos: 'bottom',
  },
];

const DESKTOP_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-desktop-sidebar',
    shape: 'rect',
    title: 'Sidebar Command Center',
    description: 'Switch between Overview, cards you lend, debts you owe, and personal loans. Manage friends & history anytime.',
    actionHint: 'Click Next to explore',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-summary-tiles',
    shape: 'rect',
    title: 'Financial Overview',
    description: 'Real-time totals for what you owe, what to collect, personal loans, and upcoming 7-day deadlines. Click any tile to filter.',
    actionHint: 'Click any tile or Next',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-desktop-actions',
    fallbackTargetId: 'tour-add-btn',
    shape: 'rect',
    title: 'Add Cards & Quick Actions',
    description: 'Fast access to add a card for shared purchases, track a personal installment loan, or join via invite code.',
    actionHint: 'Click button or Next',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-tabs-toggle',
    shape: 'rect',
    title: 'Tabs & Search Filters',
    description: 'Filter items by "You lend", "You owe", and "My Loan", or search by store name and view Unpaid / Paid statuses.',
    actionHint: 'Click tabs or Next',
    preferredPos: 'top',
  },
  {
    targetId: 'tour-wallet-cards',
    shape: 'rect',
    title: 'Interactive Items Table',
    description: 'Review purchase dates, store installments, and remaining balances. Click any row to view details or log payments.',
    actionHint: 'Click row to view or Next',
    preferredPos: 'top',
  },
  {
    targetId: 'tour-desktop-widgets',
    shape: 'rect',
    title: 'Deadlines & Payment Activity',
    description: 'The right side panels track upcoming cut-off dates ("Coming up"), confirmed payment receipts, and debtor balance bars.',
    actionHint: 'Click Next to continue',
    preferredPos: 'bottom',
  },
  {
    targetId: 'tour-help-btn',
    fallbackTargetId: 'tour-desktop-reminders',
    shape: 'rect',
    title: 'Guide & Due Reminders',
    description: 'Check urgent payment notices in Reminders, or click "Guide" anytime to replay this desktop dashboard walkthrough.',
    actionHint: 'Click "Got it!" to finish',
    preferredPos: 'bottom',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onStepTransition?: (targetId: string) => void;
}

interface TargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

export function AppWalkthrough({ open, onClose, onStepTransition }: Props) {
  const isDesktop = useIsDesktop();
  const tourSteps = isDesktop ? DESKTOP_TOUR_STEPS : MOBILE_TOUR_STEPS;

  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);
  const isAdvancingRef = useRef(false);

  const step = tourSteps[stepIndex] || tourSteps[0];
  const isLast = stepIndex === tourSteps.length - 1;

  // Initialize step 0 when opening or switching layout
  useEffect(() => {
    if (open) {
      setStepIndex(0);
      const first = tourSteps[0];
      if (first) {
        onStepTransition?.(first.targetId);
      }
    }
  }, [open, isDesktop]);

  // Resolve target element (with optional fallback)
  const resolveTarget = useCallback(() => {
    let el = document.getElementById(step.targetId);
    if (!el && step.fallbackTargetId) {
      el = document.getElementById(step.fallbackTargetId);
    }
    return el;
  }, [step.targetId, step.fallbackTargetId]);

  // Measure target DOM element
  const updateRect = useCallback(() => {
    if (!open) return;
    const el = resolveTarget();
    activeElRef.current = el;

    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setTargetRect(null);
      return;
    }

    const isCircle = step.shape === 'circle';
    const padding = 5;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;
    const left = rect.left - padding;
    const top = rect.top - padding;
    const radius = isCircle ? Math.max(width, height) / 2 : 16;

    setTargetRect({ left, top, width, height, radius });
  }, [open, resolveTarget, step.shape]);

  // Multi-pass measurements to ensure smooth attachment across sheet mount animations
  useLayoutEffect(() => {
    if (!open) return;
    const el = resolveTarget();
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    updateRect();
    const t1 = setTimeout(updateRect, 50);
    const t2 = setTimeout(updateRect, 160);
    const t3 = setTimeout(updateRect, 320);
    const t4 = setTimeout(updateRect, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [open, stepIndex, resolveTarget, updateRect]);

  // Listen to window resize, scroll, and mutations
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const observer = new MutationObserver(() => {
      updateRect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      observer.disconnect();
    };
  }, [open, updateRect]);

  // Advance to next step with debounce lock to prevent double-skipping
  const advance = useCallback(() => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setTimeout(() => {
      isAdvancingRef.current = false;
    }, 320);

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
    } catch {}

    if (isLast) {
      onStepTransition?.('done');
      onClose();
    } else {
      const nextIndex = stepIndex + 1;
      const nextStep = tourSteps[nextIndex];
      setStepIndex(nextIndex);
      if (nextStep) {
        onStepTransition?.(nextStep.targetId);
      }
    }
  }, [isLast, onClose, stepIndex, tourSteps, onStepTransition]);

  // Real interaction handler: Triggers the real underlying button/action and advances
  const handleSpotlightClick = useCallback(() => {
    const el = resolveTarget();
    if (el) {
      try {
        el.click();
      } catch {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    }
    advance();
  }, [resolveTarget, advance]);

  // Listen directly on the active DOM element so tapping it natively also advances
  useEffect(() => {
    if (!open) return;
    const el = resolveTarget();
    if (!el) return;

    const onNativeClick = () => {
      setTimeout(advance, 80);
    };

    el.addEventListener('click', onNativeClick, { once: true });
    return () => {
      el.removeEventListener('click', onNativeClick);
    };
  }, [open, resolveTarget, advance, stepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') advance();
      else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        const prevIndex = stepIndex - 1;
        setStepIndex(prevIndex);
        if (tourSteps[prevIndex]) {
          onStepTransition?.(tourSteps[prevIndex].targetId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, stepIndex, advance, onClose, tourSteps, onStepTransition]);

  if (!open) return null;

  // Compute smart position:
  // On desktop, position contextually adjacent to the target element so it NEVER overlaps.
  // On mobile, dock to top or bottom depending on whether target is in lower or upper screen.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  let desktopCardStyle: React.CSSProperties = {
    right: '32px',
    top: '24px',
    maxWidth: '360px',
  };

  if (isDesktop && targetRect) {
    const isSidebar = targetRect.left < 50 && targetRect.width <= 320;
    const isHeaderActions = targetRect.top < 90 && targetRect.left > vw * 0.4;
    const isStatTiles = targetRect.top >= 90 && targetRect.top < 260 && targetRect.width > 500;
    const isRightWidgets = targetRect.left > vw * 0.55 && targetRect.top > 200;

    if (isSidebar) {
      // Beside sidebar in the upper-left of main canvas, 0% obstruction of header buttons
      desktopCardStyle = {
        left: `${Math.round(targetRect.left + targetRect.width + 24)}px`,
        top: '76px',
        maxWidth: '360px',
      };
    } else if (isHeaderActions) {
      // Directly underneath the header action buttons
      desktopCardStyle = {
        top: `${Math.round(targetRect.top + targetRect.height + 14)}px`,
        right: `${Math.max(24, Math.round(vw - (targetRect.left + targetRect.width)))}px`,
        maxWidth: '360px',
      };
    } else if (isStatTiles) {
      // Directly underneath the stat cards
      desktopCardStyle = {
        top: `${Math.round(targetRect.top + targetRect.height + 16)}px`,
        right: '32px',
        maxWidth: '360px',
      };
    } else if (isRightWidgets) {
      // To the left of the widgets panel
      desktopCardStyle = {
        top: `${Math.max(80, Math.round(targetRect.top))}px`,
        left: `${Math.max(284, Math.round(targetRect.left - 380))}px`,
        maxWidth: '360px',
      };
    } else if (targetRect.top >= 240) {
      // Above the tabs or item table
      desktopCardStyle = {
        top: `${Math.max(20, Math.round(targetRect.top - 110))}px`,
        right: '32px',
        maxWidth: '360px',
      };
    }
  }

  // Mobile position calculation
  const targetCenterY = targetRect
    ? targetRect.top + targetRect.height / 2
    : vh / 2;
  const isTargetInLowerHalf = targetCenterY > vh * 0.45;
  const placeAtTop = step.preferredPos === 'top' || (step.preferredPos !== 'bottom' && isTargetInLowerHalf);

  const mobileCardStyle: React.CSSProperties = placeAtTop
    ? { top: 'max(14px, env(safe-area-inset-top, 14px))' }
    : { bottom: 'max(14px, env(safe-area-inset-bottom, 14px))' };

  return (
    <div
      data-tour-walkthrough="true"
      className="fixed inset-0 z-[9990] pointer-events-none select-none animate-fade-in"
    >
      {/* SVG Spotlight Mask Cutout */}
      <svg
        className="fixed inset-0 h-full w-full pointer-events-none"
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
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#tour-spotlight-mask)"
          className="backdrop-blur-[1.5px] transition-all duration-200"
        />
      </svg>

      {/* Clean Glowing Ring around Target Element (Clickable & triggers real action) */}
      {targetRect && (
        <div
          onClick={handleSpotlightClick}
          style={{
            left: `${targetRect.left}px`,
            top: `${targetRect.top}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            borderRadius: `${targetRect.radius}px`,
          }}
          title="Click to interact"
          aria-label={`Interact with ${step.title}`}
          className="fixed z-[9995] pointer-events-auto cursor-pointer transition-all duration-200 ring-2 ring-accent shadow-[0_0_20px_rgba(0,122,255,0.7)] animate-pulse active:scale-[0.99] hover:ring-white"
        />
      )}

      {/* Ultra-Compact Micro Instruction Floating Bar (High z-index, never obscured) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        data-tour-walkthrough="true"
        style={isDesktop ? desktopCardStyle : mobileCardStyle}
        className={`fixed z-[9999] pointer-events-auto w-auto rounded-[18px] bg-white/95 px-3.5 py-2.5 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.32),0_0_0_0.5px_rgba(0,0,0,0.08)] ring-1 ring-white/90 ring-inset backdrop-blur-xl backdrop-saturate-150 animate-pop transition-all duration-200 ${
          isDesktop
            ? 'w-[360px]'
            : 'inset-x-3 sm:inset-x-6 mx-auto max-w-[340px]'
        }`}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9.5px] font-extrabold text-accent uppercase tracking-wider">
              {stepIndex + 1}/{tourSteps.length} · {isDesktop ? 'Dashboard' : 'Mobile'}
            </span>
            <h4 className="truncate text-[12.5px] font-bold text-ink">
              {step.title}
            </h4>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close walkthrough"
            title="Close"
            className="grid size-5 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink active:scale-90 transition"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>

        {/* Short, direct instruction text */}
        <p className="mt-1 text-[11px] leading-tight text-ink/80">
          {step.description}
        </p>

        {/* Bottom Interactive Prompt & Next Link */}
        <div className="mt-2 flex items-center justify-between gap-2 pt-1.5 border-t border-hairline/50 text-[10.5px]">
          <span className="flex items-center gap-1 font-semibold text-accent truncate">
            <span className="size-1.5 rounded-full bg-accent shrink-0 animate-ping" />
            <span className="truncate">{step.actionHint}</span>
          </span>

          <button
            type="button"
            onClick={advance}
            className="flex items-center gap-0.5 font-bold text-ink hover:text-accent transition shrink-0"
          >
            <span>{isLast ? 'Got it!' : 'Next'}</span>
            {isLast ? (
              <Check className="size-3 text-accent" strokeWidth={3} />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
