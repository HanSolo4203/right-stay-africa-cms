'use client';

import * as React from 'react';
import { Filter, Search, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import type { JobStatusKey } from '@/lib/status';
import { getStatusMeta } from '@/lib/status';

type StatusPill = {
  value: JobStatusKey | 'all';
  label: string;
};

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: JobStatusKey | 'all';
  onStatusChange: (value: JobStatusKey | 'all') => void;
  statusOptions?: StatusPill[];
  children?: React.ReactNode;
  activeFilterCount?: number;
  className?: string;
};

const DEFAULT_STATUS_OPTIONS: StatusPill[] = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'issue', label: 'Issues' },
];

export function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  children,
  activeFilterCount = 0,
  className,
}: FilterBarProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = React.useState(false);

  const pills = (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 no-scrollbar">
      {statusOptions.map((option) => {
        const active = status === option.value;
        const meta =
          option.value === 'all' ? null : getStatusMeta(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onStatusChange(option.value)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            {meta ? <meta.icon className="size-3.5" strokeWidth={1.75} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );

  const controls = (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search jobs…"
          className="min-h-11 pl-10"
        />
        {search ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={() => onSearchChange('')}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );

  if (isDesktop) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search jobs…"
              className="min-h-11 pl-10"
            />
          </div>
          {children}
        </div>
        {pills}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="relative min-h-11 flex-1 justify-start gap-2"
          onClick={() => setOpen(true)}
        >
          <Filter className="size-[18px]" strokeWidth={1.75} />
          Filters
          {activeFilterCount > 0 ? (
            <span className="ml-auto inline-flex size-6 items-center justify-center rounded-full bg-primary font-mono text-xs tabular-nums text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>
      {pills}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="safe-pb">
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-4">
            {controls}
            <Button className="min-h-11 w-full" onClick={() => setOpen(false)}>
              Apply filters
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
