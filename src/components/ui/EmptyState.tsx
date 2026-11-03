import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, text, action }: Props) {
  return (
    <div className="flex animate-rise flex-col items-center rounded-[22px] bg-white px-6 py-10 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-fill text-ink">{icon}</div>
      <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-[14px] leading-relaxed text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
