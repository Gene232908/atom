import { Check, Sparkles } from 'lucide-react';
import { CARD_COLORS } from '../../lib/cardTheme';

interface Props {
  label: string;
  value: string;
  onChange: (key: string) => void;
  /** Background for the "Auto" choice, so people can see what Auto will look like. */
  autoBackground: string;
  hint?: string;
}

/** Row of round color swatches. Empty value means Auto. */
export function ColorPicker({ label, value, onChange, autoBackground, hint }: Props) {
  const options = [{ key: '', name: 'Auto', bg: autoBackground }].concat(
    CARD_COLORS.map((c) => ({ key: c.key, name: c.name, bg: `linear-gradient(145deg, ${c.colors[0]}, ${c.colors[1]})` })),
  );
  const current = options.find((o) => o.key === value) ?? options[0];

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <span className="flex-1 text-[13px] font-medium text-muted">{label}</span>
        <span className="text-[13px] font-semibold">{current.name}</span>
      </div>
      <div
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:-mx-5 sm:px-5"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((o) => {
          const on = o.key === value;
          return (
            <button
              key={o.key || 'auto'}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.name}
              title={o.name}
              onClick={() => onChange(o.key)}
              className={`grid size-[30px] shrink-0 place-items-center rounded-full text-white transition active:scale-90 ${
                on ? 'ring-2 ring-accent ring-offset-2 ring-offset-canvas' : ''
              }`}
              style={{ backgroundImage: o.bg }}
            >
              {on ? (
                <Check className="size-3.5 drop-shadow" strokeWidth={3} />
              ) : (
                o.key === '' && <Sparkles className="size-3.5 drop-shadow" />
              )}
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-1 px-1 text-[12px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
