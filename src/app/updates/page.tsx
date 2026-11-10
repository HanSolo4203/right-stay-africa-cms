'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  CalendarDays,
  Link2,
  RefreshCw,
  Webhook,
} from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatTile, StatTileGrid } from '@/components/app/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getBookingSyncEvents,
  type BookingSyncEvent,
  type BookingSyncEventSource,
  type BookingSyncEventType,
} from '@/lib/queries/booking-sync-events';
import { createClientComponentClient } from '@/lib/supabase';
import { toast } from 'sonner';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStayDates(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return null;
  const format = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
    });
  return `${format(checkIn)} → ${format(checkOut)}`;
}

function eventLabel(eventType: BookingSyncEventType) {
  switch (eventType) {
    case 'booking_created':
      return 'Created';
    case 'booking_updated':
      return 'Updated';
    case 'booking_cancelled':
      return 'Cancelled';
    case 'sync_completed':
      return 'Sync';
    default:
      return eventType;
  }
}

function eventBadgeClass(eventType: BookingSyncEventType) {
  switch (eventType) {
    case 'booking_created':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'booking_updated':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'booking_cancelled':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'sync_completed':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return '';
  }
}

function sourceLabel(source: BookingSyncEventSource) {
  switch (source) {
    case 'uplisting_webhook':
      return 'Webhook';
    case 'uplisting_api':
      return 'Manual sync';
    case 'system':
      return 'System';
    default:
      return source;
  }
}

function sourceBadgeClass(source: BookingSyncEventSource) {
  switch (source) {
    case 'uplisting_webhook':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'uplisting_api':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

function UpdatesContent() {
  const [events, setEvents] = useState<BookingSyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<
    BookingSyncEventSource | 'all'
  >('all');
  const [eventFilter, setEventFilter] = useState<BookingSyncEventType | 'all'>(
    'all'
  );

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClientComponentClient();
      const data = await getBookingSyncEvents(supabase, {
        source: sourceFilter,
        eventType: eventFilter,
        limit: 150,
      });
      setEvents(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load booking updates';
      toast.error(message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [eventFilter, sourceFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const webhook = events.filter((e) => e.source === 'uplisting_webhook').length;
    const api = events.filter((e) => e.source === 'uplisting_api').length;
    const cancelled = events.filter(
      (e) => e.event_type === 'booking_cancelled'
    ).length;
    return { total: events.length, webhook, api, cancelled };
  }, [events]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Updates"
        description="Booking changes from Uplisting webhooks and manual syncs."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="min-h-11" asChild>
              <Link href="/settings/uplisting">
                <Link2 className="size-4" strokeWidth={1.75} />
                Uplisting
              </Link>
            </Button>
            <Button
              className="min-h-11"
              onClick={() => refresh()}
              disabled={loading}
            >
              <RefreshCw
                className={`size-4 ${loading ? 'animate-spin' : ''}`}
                strokeWidth={1.75}
              />
              Refresh
            </Button>
          </div>
        }
      />

      <StatTileGrid>
        <StatTile label="Shown" value={stats.total} icon={Activity} />
        <StatTile label="Webhooks" value={stats.webhook} icon={Webhook} />
        <StatTile label="Manual sync" value={stats.api} icon={RefreshCw} />
        <StatTile
          label="Cancellations"
          value={stats.cancelled}
          icon={CalendarDays}
        />
      </StatTileGrid>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={sourceFilter}
          onValueChange={(value) =>
            setSourceFilter(value as BookingSyncEventSource | 'all')
          }
        >
          <SelectTrigger className="min-h-11 w-full sm:w-48">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="uplisting_webhook">Webhook</SelectItem>
            <SelectItem value="uplisting_api">Manual sync</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={eventFilter}
          onValueChange={(value) =>
            setEventFilter(value as BookingSyncEventType | 'all')
          }
        >
          <SelectTrigger className="min-h-11 w-full sm:w-48">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            <SelectItem value="booking_created">Created</SelectItem>
            <SelectItem value="booking_updated">Updated</SelectItem>
            <SelectItem value="booking_cancelled">Cancelled</SelectItem>
            <SelectItem value="sync_completed">Sync runs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-[12px] border border-border bg-card"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No booking updates yet"
          description="Run a sync from Uplisting settings or wait for webhook events to appear here."
          actionLabel="Open Uplisting settings"
          onAction={() => {
            window.location.href = '/settings/uplisting';
          }}
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const stay = formatStayDates(
              event.check_in_date,
              event.check_out_date
            );

            return (
              <article
                key={event.id}
                className="rounded-[12px] border border-border bg-card p-4 shadow-xs"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={eventBadgeClass(event.event_type)}
                      >
                        {eventLabel(event.event_type)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={sourceBadgeClass(event.source)}
                      >
                        {sourceLabel(event.source)}
                      </Badge>
                      {event.booking_status ? (
                        <Badge variant="outline" className="capitalize">
                          {event.booking_status}
                        </Badge>
                      ) : null}
                    </div>

                    <p className="text-sm font-medium text-foreground">
                      {event.summary}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {event.property_name ? (
                        <span>{event.property_name}</span>
                      ) : null}
                      {event.guest_name ? <span>{event.guest_name}</span> : null}
                      {event.booking_reference ? (
                        <span className="font-mono">{event.booking_reference}</span>
                      ) : null}
                      {stay ? <span>{stay}</span> : null}
                    </div>
                  </div>

                  <time
                    dateTime={event.created_at}
                    className="shrink-0 text-xs text-muted-foreground tabular-nums"
                  >
                    {formatDateTime(event.created_at)}
                  </time>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function UpdatesPage() {
  return (
    <AuthWrapper>
      <UpdatesContent />
    </AuthWrapper>
  );
}
