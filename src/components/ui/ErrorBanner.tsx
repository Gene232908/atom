import { CircleAlert, RotateCw } from 'lucide-react';
import { Button } from './Button';

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex animate-rise flex-col gap-3 rounded-[20px] bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bad/10 text-bad">
          <CircleAlert className="size-[18px]" />
        </span>
        <p className="min-w-0 pt-1 text-[14px] font-medium wrap-break-word">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<RotateCw className="size-4" />}>
          Try again
        </Button>
      )}
    </div>
  );
}
