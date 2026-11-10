import { cn } from '@/lib/utils';
import { getStatusMeta, type JobStatusKey } from '@/lib/status';

type StatusBadgeProps = {
  status: JobStatusKey;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        meta.badgeClass,
        className
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
      {meta.label}
    </span>
  );
}
