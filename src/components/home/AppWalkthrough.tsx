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
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface TourStep {
  targetId: string;
  title: string;
  icon: typeof Plus;
  badge: string;
  description: string;
  scenario: string;
  actionHint?: string;
  shape?: 'circle' | 'rect';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-add-btn',
    shape: 'circle',
    badge: '1. Pagsisimula',
    title: 'Gumawa ng Card o Personal Loan',
    icon: Plus,
    description:
      'Dito ka magsisimula! Pindutin ang bilog na "+" icon para magdagdag ng bagong Credit Card o Pay-Later card (tulad ng UnionBank, BDO, SPayLater, Maya Credit, Atome) o Personal Loan (hulugang motor, gadget, o appliance).',
    scenario:
      'Halimbawa: Ginusto mong i-swipe ang ₱3,500 grocery ng barkada sa UnionBank mo. Pindutin ang "+" para gumawa ng "UnionBank" card kung saan mo ililista ang mga utang nila.',
    actionHint: 'Pindutin ang "+" sa itaas para mag-create.',
  },
  {
    targetId: 'tour-wallet-cards',
    shape: 'rect',
    badge: '2. Cards & Split',
    title: 'Mag-Add ng Items & Mag-Split ng Utang',
    icon: CreditCard,
    description:
      'I-tap ang alinmang Card para pumasok sa loob nito. Pindutin ang "+ Add item" para magtala ng utang. Pwede kang pumili ng 1x Full Payment o Installment (2, 3, 6, 12 mos), at pumili kung Pantay na Hatian (Split evenly) o Custom amount bawat miyembro.',
    scenario:
      'Halimbawa: May binili kayong ₱100 pizza. Sa Custom Split, pwede mong ilagay na si Mathew ay ₱60 at si Christian ay ₱40. Awtomatikong iva-validate ng app na pantay sa ₱100 ang total bago ma-save.',
    actionHint: 'I-tap ang card para makapasok sa listahan ng utang.',
  },
  {
    targetId: 'tour-summary-tiles',
    shape: 'rect',
    badge: '3. Financial Overview',
    title: 'Summary: "You Owe" & "To Collect"',
    icon: Coins,
    description:
      'Ito ang live computation ng iyong balances: "To collect" ang perang kailangan mo pang kubrahin mula sa mga pinautang mo, samantalang "You owe" naman ang mga kailangan mong bayaran sa ibang cards. Awtomatiko itong nag-a-update tuwing may kumpirmadong bayad.',
    scenario:
      'Halimbawa: Nang magbayad si Juan ng ₱500 at kinumpirma mo ang resibo, agarang bababa ang "To collect" mo nang walang manual na kalkulasyon.',
    actionHint: 'Live dashboard ng lahat ng papasok at lalabas na pera.',
  },
  {
    targetId: 'tour-tabs-toggle',
    shape: 'rect',
    badge: '4. View Switcher',
    title: 'Lend vs Owe vs Personal Loans',
    icon: ArrowLeftRight,
    description:
      'Mabilis na magpalit ng view sa isang pindot lang:\n• "You lend": Ikaw ang nagpautang o nag-swipe ng card.\n• "You owe": In-invite ka ng kaibigan sa card nila at ikaw ang magbabayad.\n• "My loans": Sarili mong mga hulugang pautang (motor, gadget) na ikaw lang mag-isa ang nagbabayad.',
    scenario:
      'Halimbawa: Kung may sarili kang hulugang motor sa Sumisho, lumipat sa "My loans" para makita ang progress bar at susunod na cut-off date.',
    actionHint: 'I-tap ang tabs para magbago ang listahan.',
  },
  {
    targetId: 'tour-profile-btn',
    shape: 'circle',
    badge: '5. Profile & Actions',
    title: 'Friends, History, at Settings',
    icon: MoreHorizontal,
    description:
      'I-tap ang capsule sa itaas na may three dots (•••) para sa mga sumusunod:\n• Friends & Contacts: Mag-add ng mga kaibigan via email o code.\n• Completed History: Dito napupunta ang 100% fully paid na loans at utang para malinis ang home screen.\n• Wallet Settings: I-set ang paborito mong default view.',
    scenario:
      'Halimbawa: Kapag may nag-send sa\'yo ng friend request, may lalabas na pulang "+1" badge dito para ma-accept mo sila agad.',
    actionHint: 'Nandito ang lahat ng account options at kasaysayan.',
  },
  {
    targetId: 'tour-profile-btn',
    shape: 'circle',
    badge: '6. Real-Time Alerts',
    title: 'Phone Alerts & Due Reminders',
    icon: Bell,
    description:
      'Wala nang makakalimutang singilin o bayaran! Makakatanggap ka ng lock-screen push notifications kapag may nagpadala ng bayad, may bagong friend request, o may parating na cut-off date (1–2 araw bago ang due date) kahit naka-lock ang cellphone mo.\n\nPindutin ang capsule na ito para buksan ang Due Reminders at i-activate ang lock-screen alerts.',
    scenario:
      'Halimbawa: Bukas na ang due date mo sa SPayLater. Tutunog ang phone mo: "Due tomorrow: SPayLater (₱1,200.00)" para maiwasan ang late penalty fees!',
    actionHint: 'Pindutin ang capsule para tingnan ang Due Reminders.',
  },
  {
    targetId: 'tour-help-btn',
    shape: 'circle',
    badge: '7. Tulong & Replay',
    title: 'Maliit na "?" Icon — Gabay Anumang Oras',
    icon: HelpCircle,
    description:
      'Para sa mga existing accounts o kapag may nais kang balikan, i-click lamang itong maliit na "?" button sa itaas (o buksan ang Profile Menu).\n\nAwtomatikong ipapaliwanag muli nang step-by-step ang bawat function at pindutan nang hindi naaapektuhan ang iyong mga nailistang data!',
    scenario:
      'Halimbawa: May bago kang kaibigang nagtanong kung paano mag-split ng utang o mag-add ng card, pindutin lang ang "?" button para ma-review agad.',
    actionHint: 'Pindutin ang "?" icon kahit kailan para ulitin ang tour.',
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

  // Scroll target element into view smoothly when step changes
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

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && !isLast) setStepIndex((i) => i + 1);
      else if (e.key === 'ArrowLeft' && !isFirst) setStepIndex((i) => i - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isFirst, isLast, onClose]);

  if (!open) return null;

  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center overflow-hidden select-none p-3 sm:p-6 animate-fade-in">
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

      {/* Glowing Pulsing Ring around Target Element */}
      {targetRect && (
        <div
          style={{
            left: `${targetRect.left}px`,
            top: `${targetRect.top}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            borderRadius: `${targetRect.radius}px`,
          }}
          className="pointer-events-none fixed transition-all duration-300 ring-4 ring-accent/70 shadow-[0_0_24px_rgba(0,122,255,0.7)] animate-pulse"
        />
      )}

      {/* Floating Glassmorphic Bubble Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        className="relative z-10 w-full max-w-[420px] rounded-[28px] bg-white/95 p-5 sm:p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.35),0_0_0_0.5px_rgba(0,0,0,0.08)] ring-1 ring-white/90 ring-inset backdrop-blur-2xl backdrop-saturate-150 animate-pop mb-1 sm:mb-0"
      >
        {/* Top Header: Badge, Step Counter, and Close Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent tracking-wide uppercase">
              <Sparkles className="size-3" />
              {step.badge}
            </span>
            <span className="text-[11px] font-semibold text-muted">
              {stepIndex + 1} / {TOUR_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Skip walkthrough"
            title="Laktawan ang Gabay"
            className="grid size-7 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink active:scale-90 transition"
          >
            <X className="size-4" strokeWidth={2.4} />
          </button>
        </div>

        {/* Title and Icon */}
        <div className="mt-3 flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-md shadow-accent/25">
            <StepIcon className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] sm:text-[17px] font-bold text-ink leading-tight">
              {step.title}
            </h3>
            {step.actionHint && (
              <p className="mt-0.5 text-[11px] font-medium text-accent">
                {step.actionHint}
              </p>
            )}
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="mt-3 text-[13px] sm:text-[13.5px] leading-relaxed text-ink/85 whitespace-pre-line">
          {step.description}
        </div>

        {/* Concrete Example Scenario Box */}
        <div className="mt-3 rounded-2xl bg-amber-50/90 p-3 ring-1 ring-amber-200/80 text-[12px] sm:text-[12.5px] text-amber-950 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-amber-900 text-[11.5px] uppercase tracking-wider">
            <span>💡 Halimbawa (Scenario):</span>
          </p>
          <p className="leading-relaxed opacity-90">{step.scenario}</p>
        </div>

        {/* Footer: Progress Dots & Action Buttons */}
        <div className="mt-4 flex items-center justify-between gap-3 pt-2 border-t border-hairline/60">
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStepIndex(idx)}
                aria-label={`Pumunta sa hakbang ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === stepIndex
                    ? 'w-5 bg-accent'
                    : 'w-1.5 bg-black/20 hover:bg-black/35'
                }`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStepIndex((i) => i - 1)}
                className="text-[12px] h-8 px-2.5 text-muted hover:text-ink"
                icon={<ChevronLeft className="size-3.5" />}
              >
                Bumalik
              </Button>
            )}

            {isLast ? (
              <Button
                size="sm"
                variant="primary"
                onClick={onClose}
                className="text-[12px] h-8 px-3 font-bold shadow-md shadow-accent/25"
                icon={<Check className="size-3.5" strokeWidth={3} />}
              >
                Simulan na!
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setStepIndex((i) => i + 1)}
                className="text-[12px] h-8 px-3 font-semibold shadow-md shadow-accent/25"
              >
                <span>Susunod</span>
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
