'use client';

import Image from 'next/image';
import { Bath, BedDouble, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type PropertyTileProps = {
  name: string;
  coverUrl?: string | null;
  beds?: number | null;
  baths?: number | null;
  nextCleanDate?: string | null;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export function PropertyTile({
  name,
  coverUrl,
  beds,
  baths,
  nextCleanDate,
  active = true,
  onClick,
  className,
}: PropertyTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group overflow-hidden rounded-[12px] border border-border bg-card text-left shadow-xs transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Building2 className="size-8" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
            {name}
          </h3>
          <span
            className={cn(
              'mt-1 size-2.5 shrink-0 rounded-full',
              active ? 'bg-status-completed-fg' : 'bg-muted-foreground'
            )}
            aria-label={active ? 'Active' : 'Inactive'}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {beds != null ? (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="size-3.5" strokeWidth={1.75} />
              <span className="tabular-nums">{beds}</span>
            </span>
          ) : null}
          {baths != null ? (
            <span className="inline-flex items-center gap-1">
              <Bath className="size-3.5" strokeWidth={1.75} />
              <span className="tabular-nums">{baths}</span>
            </span>
          ) : null}
        </div>
        {nextCleanDate ? (
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            Next clean · {nextCleanDate}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No upcoming clean</p>
        )}
      </div>
    </button>
  );
}
