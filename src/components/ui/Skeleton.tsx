interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-black/[0.06] ${className}`}
    />
  );
}

/** Pre-composed Skeleton placeholders for cards, balance tiles, and rows */
export function HomeSkeleton() {
  return (
    <div className="animate-fade-in space-y-4 pt-1 sm:pt-2">
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-3.5">
        <div className="rounded-[20px] bg-white p-4 shadow-sm space-y-2.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="rounded-[20px] bg-white p-4 shadow-sm space-y-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-44 rounded-full" />
          <Skeleton className="size-9 rounded-full" />
        </div>
        <Skeleton className="h-[220px] w-full rounded-[24px]" />
      </div>
    </div>
  );
}

export function GroupSkeleton() {
  return (
    <div className="animate-fade-in space-y-6 pt-1">
      <Skeleton className="h-[230px] w-full rounded-[24px]" />
      <div className="flex items-center gap-2 overflow-hidden py-1">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <div className="rounded-[20px] bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
