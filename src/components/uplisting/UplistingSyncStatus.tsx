'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock3, RefreshCw } from 'lucide-react';
import { createClientComponentClient } from '@/lib/supabase';
import {
  formatSyncDateTime,
  getNextCronSyncAt,
  UPLISTING_CRON_INTERVAL_MINUTES,
} from '@/lib/uplisting-sync-status';
import { cn } from '@/lib/utils';

type UplistingSyncStatusProps = {
  className?: string;
  compact?: boolean;
  refreshKey?: number;
};

export function UplistingSyncStatus({
  className,
  compact = false,
  refreshKey = 0,
}: UplistingSyncStatusProps) {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [nextSyncAt, setNextSyncAt] = useState<Date>(() => getNextCronSyncAt());
  const [loading, setLoading] = useState(true);

  const loadLastSynced = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('booking_sync_events')
        .select('created_at')
        .eq('event_type', 'sync_completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      setLastSyncedAt(data?.created_at ?? null);
    } catch {
      setLastSyncedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLastSynced();
  }, [loadLastSynced, refreshKey]);

  useEffect(() => {
    const tick = () => setNextSyncAt(getNextCronSyncAt());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [lastSyncedAt, refreshKey]);

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white',
        compact ? 'px-3 py-2' : 'p-4 shadow-sm',
        className
      )}
    >
      <div
        className={cn(
          'flex gap-3',
          compact
            ? 'flex-col sm:flex-row sm:items-center sm:justify-between'
            : 'flex-col sm:flex-row sm:items-start sm:justify-between'
        )}
      >
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              'font-medium text-gray-900 flex items-center gap-1.5',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            <RefreshCw className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4', 'text-blue-600')} />
            Uplisting sync status
          </p>
          <p className={cn('text-gray-600', compact ? 'text-xs' : 'text-sm')}>
            Last synced:{' '}
            <span className="font-medium text-gray-900">
              {loading ? '…' : lastSyncedAt ? formatSyncDateTime(lastSyncedAt) : 'Never'}
            </span>
          </p>
        </div>
        <div className={cn('text-gray-600', compact ? 'text-xs' : 'text-sm')}>
          <p className="flex items-center gap-1.5">
            <Clock3 className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4', 'text-gray-500')} />
            Next sync:{' '}
            <span className="font-medium text-gray-900">
              {formatSyncDateTime(nextSyncAt)}
            </span>
          </p>
          {!compact ? (
            <p className="text-xs text-gray-500 mt-1">
              Safety-net cron every {UPLISTING_CRON_INTERVAL_MINUTES} minutes (plus webhooks)
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
