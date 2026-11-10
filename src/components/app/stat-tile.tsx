import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatTileProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  delta?: string;
  icon?: LucideIcon;
  className?: string;
};

export function StatTile({
  label,
  value,
  sublabel,
  delta,
  icon: Icon,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        'rounded-[12px] border border-border bg-card p-4 shadow-xs',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Icon className="size-[18px]" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums text-foreground md:text-[30px]">
        {value}
      </p>
      {(sublabel || delta) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {delta ? <span className="tabular-nums">{delta}</span> : null}
          {delta && sublabel ? ' · ' : null}
          {sublabel}
        </p>
      )}
    </div>
  );
}

export function StatTileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{children}</div>
  );
}
