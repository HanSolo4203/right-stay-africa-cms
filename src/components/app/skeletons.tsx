import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function JobCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-[12px] border border-border bg-card p-4 shadow-xs', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-6 w-32 rounded-full" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="size-7 rounded-full" />
      </div>
    </div>
  );
}

export function PropertyTileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-[12px] border border-border bg-card shadow-xs', className)}>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <div className="rounded-[12px] border border-border bg-card p-4 shadow-xs">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

export function ListPageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: cards }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}
