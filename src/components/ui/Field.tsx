import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

interface WrapProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}

export function FieldWrap({ label, hint, error, htmlFor, children }: WrapProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1.5 block px-1 text-[13px] font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 px-1 text-[13px] font-medium text-bad">{error}</p>
      ) : (
        hint && <p className="mt-1.5 px-1 text-[12px] leading-relaxed text-muted">{hint}</p>
      )}
    </div>
  );
}

const inputBase =
  'w-full min-w-0 rounded-2xl bg-white px-4 text-ink placeholder:text-muted/70 outline-none ring-1 ring-inset transition focus:ring-2 focus:ring-accent';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  prefix?: string;
}

export function TextField({ id, label, hint, error, prefix, className = '', ...rest }: InputProps) {
  const ring = error ? 'ring-bad' : 'ring-transparent';
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={id}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-medium text-muted">
            {prefix}
          </span>
        )}
        <input id={id} className={`${inputBase} ${ring} h-[52px] ${prefix ? 'pl-9' : ''} ${className}`} {...rest} />
      </div>
    </FieldWrap>
  );
}

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
}

export function TextArea({ id, label, hint, error, className = '', ...rest }: AreaProps) {
  const ring = error ? 'ring-bad' : 'ring-transparent';
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={id}>
      <textarea id={id} className={`${inputBase} ${ring} resize-none py-3.5 ${className}`} {...rest} />
    </FieldWrap>
  );
}
