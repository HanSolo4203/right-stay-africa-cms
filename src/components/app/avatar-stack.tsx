import { cn } from '@/lib/utils';

const PALETTE = [
  'bg-primary/15 text-primary',
  'bg-status-assigned text-status-assigned-fg',
  'bg-status-progress text-status-progress-fg',
  'bg-status-completed text-status-completed-fg',
  'bg-secondary text-secondary-foreground',
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % PALETTE.length;
  return PALETTE[hash];
}

type CleanerChipProps = {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
  showLabel?: boolean;
};

export function CleanerChip({ name, size = 'md', className, showLabel }: CleanerChipProps) {
  const dim = size === 'sm' ? 'size-7 text-[10px]' : 'size-8 text-xs';
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full font-medium',
          dim,
          colorFor(name)
        )}
        title={name}
        aria-label={name}
      >
        {initials(name) || '?'}
      </span>
      {showLabel ? <span className="text-sm text-foreground">{name}</span> : null}
    </span>
  );
}

type AvatarStackProps = {
  names: string[];
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
};

export function AvatarStack({ names, max = 3, size = 'md', className }: AvatarStackProps) {
  const visible = names.slice(0, max);
  const overflow = names.length - visible.length;
  const dim = size === 'sm' ? 'size-7 text-[10px]' : 'size-8 text-xs';

  if (names.length === 0) {
    return <span className="text-xs text-muted-foreground">Unassigned</span>;
  }

  return (
    <div className={cn('flex items-center', className)} aria-label={names.join(', ')}>
      {visible.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full border-2 border-card font-medium',
            dim,
            colorFor(name),
            index > 0 && '-ml-2'
          )}
          title={name}
        >
          {initials(name) || '?'}
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full border-2 border-card bg-muted font-medium text-muted-foreground tabular-nums',
            dim,
            '-ml-2'
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
