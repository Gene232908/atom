import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'white' | 'glass';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  full?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-black',
  secondary: 'bg-fill text-ink hover:bg-fill-strong',
  ghost: 'bg-transparent text-accent hover:bg-fill',
  danger: 'bg-bad text-white hover:brightness-95',
  success: 'bg-ok text-white hover:brightness-95',
  white: 'bg-white text-ink shadow-sm hover:bg-white/90',
  glass: 'bg-white/20 text-white backdrop-blur-md hover:bg-white/28',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-[52px] px-6 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  full = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap transition duration-150 active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}
