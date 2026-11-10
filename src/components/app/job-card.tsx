'use client';

import { MoreHorizontal, Play, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AvatarStack } from '@/components/app/avatar-stack';
import { StatusBadge } from '@/components/app/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getStatusMeta, type JobStatusKey } from '@/lib/status';
import { cn } from '@/lib/utils';

export type JobCardProps = {
  propertyName: string;
  area?: string;
  windowLabel: string;
  cleanerNames?: string[];
  status: JobStatusKey;
  timeUntil?: string;
  onOpen?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onReportIssue?: () => void;
  className?: string;
};

export function JobCard({
  propertyName,
  area,
  windowLabel,
  cleanerNames = [],
  status,
  timeUntil,
  onOpen,
  onStart,
  onComplete,
  onReportIssue,
  className,
}: JobCardProps) {
  const meta = getStatusMeta(status);
  const cancelled = status === 'cancelled';

  return (
    <article
      className={cn(
        'rounded-[12px] border border-border bg-card shadow-xs border-l-[3px] transition-transform active:scale-[0.98]',
        meta.borderClass,
        className
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className={cn(
                'truncate text-base font-semibold tracking-tight text-foreground',
                cancelled && 'text-muted-foreground line-through'
              )}
            >
              {propertyName}
            </h3>
            {area ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{area}</p>
            ) : null}
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs tabular-nums text-muted-foreground">
            {windowLabel}
          </span>
          {timeUntil ? (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {timeUntil}
            </span>
          ) : null}
        </div>

        <AvatarStack names={cleanerNames} size="sm" />
      </button>

      {(onStart || onComplete || onReportIssue) && (
        <div className="flex items-center justify-end border-t border-border px-2 py-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Job actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-[18px]" strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onStart ? (
                <DropdownMenuItem onClick={onStart}>
                  <Play className="size-4" strokeWidth={1.75} />
                  Start
                </DropdownMenuItem>
              ) : null}
              {onComplete ? (
                <DropdownMenuItem onClick={onComplete}>
                  <CheckCircle2 className="size-4" strokeWidth={1.75} />
                  Complete
                </DropdownMenuItem>
              ) : null}
              {onReportIssue ? (
                <DropdownMenuItem onClick={onReportIssue}>
                  <AlertTriangle className="size-4" strokeWidth={1.75} />
                  Report issue
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </article>
  );
}
