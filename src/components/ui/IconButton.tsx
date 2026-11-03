import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  dark?: boolean;
}

export function IconButton({ label, children, dark = false, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-9 shrink-0 place-items-center rounded-full transition active:scale-90 select-none ${
        dark ? 'bg-ink text-white' : 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-hairline'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
