export function Spinner({ className = 'size-6' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function FullScreenLoader({ text = 'Loading' }: { text?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Spinner className="size-7" />
        <p className="text-[13px] font-medium">{text}</p>
      </div>
    </div>
  );
}
