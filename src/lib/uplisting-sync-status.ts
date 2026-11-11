/** Matches VPS crontab every 15 minutes for `/api/uplisting/cron`. */
export const UPLISTING_CRON_INTERVAL_MINUTES = 15;

export function formatSyncDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Next wall-clock slot for an every-N-minute cron (defaults to 15). */
export function getNextCronSyncAt(
  from: Date = new Date(),
  intervalMinutes: number = UPLISTING_CRON_INTERVAL_MINUTES
): Date {
  const next = new Date(from.getTime());
  next.setSeconds(0, 0);

  const minutes = next.getMinutes();
  const remainder = minutes % intervalMinutes;

  if (remainder === 0 && from.getSeconds() === 0 && from.getMilliseconds() === 0) {
    next.setMinutes(minutes + intervalMinutes);
    return next;
  }

  if (remainder === 0) {
    next.setMinutes(minutes + intervalMinutes);
    return next;
  }

  next.setMinutes(minutes + (intervalMinutes - remainder));
  return next;
}
