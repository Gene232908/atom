import { Children, useRef, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Width of each slide on phones, e.g. "w-[86%]" or "w-[148px]". */
  slideClass: string;
  /** Class for tablet/laptop layout. Leave empty to keep swiping on all screens. */
  wideClass?: string;
  dots?: boolean;
}

/**
 * Swipe left and right on phones (snaps to each card).
 * On tablets and laptops it can turn into a normal grid.
 */
export function Carousel({ children, slideClass, wideClass = '', dots = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const slides = Children.toArray(children);

  const onScroll = () => {
    const el = ref.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const step = first.offsetWidth + 12;
    setIndex(Math.min(slides.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
  };

  const goTo = (i: number) => {
    const el = ref.current;
    const target = el?.children[i] as HTMLElement | undefined;
    if (!el || !target) return;
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    el.scrollTo({ left: target.offsetLeft - pad, behavior: 'smooth' });
  };

  return (
    <div className="min-w-0">
      <div
        ref={ref}
        onScroll={onScroll}
        className={`no-scrollbar relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-3 sm:-mx-5 sm:scroll-px-5 sm:px-5 ${wideClass}`}
      >
        {slides.map((slide, i) => (
          <div key={i} className={`min-w-0 shrink-0 snap-start ${slideClass}`}>
            {slide}
          </div>
        ))}
      </div>
      {dots && slides.length > 1 && (
        <div className={`flex items-center justify-center gap-1.5 ${wideClass ? 'md:hidden' : ''}`}>
          {slides.length <= 12 ? (
            slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to card ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-ink' : 'w-1.5 bg-fill-strong'}`}
              />
            ))
          ) : (
            <span className="text-[12px] font-semibold text-muted tabular-nums">
              {index + 1} / {slides.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
