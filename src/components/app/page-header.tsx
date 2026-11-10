import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  if (!title && !description && !actions) return null;

  return (
    <div
      className={cn(
        'mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        {title ? (
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="hidden items-center gap-2 md:flex">{actions}</div>
      ) : null}
    </div>
  );
}
