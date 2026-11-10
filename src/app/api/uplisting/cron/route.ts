import { NextRequest, NextResponse } from 'next/server';
import { syncBookings } from '@/lib/uplisting-sync';

export const dynamic = 'force-dynamic';

/**
 * Safety-net booking sync for all linked properties.
 * Protect with x-sync-secret (SYNC_SECRET) — suitable for a VPS crontab every 15m.
 */
function authorize(request: NextRequest): boolean {
  const syncSecret = process.env.SYNC_SECRET?.trim();
  if (!syncSecret) {
    return false;
  }

  const headerSecret = request.headers.get('x-sync-secret');
  if (headerSecret === syncSecret) {
    return true;
  }

  const bearer = request.headers.get('authorization');
  if (bearer?.startsWith('Bearer ') && bearer.slice(7) === syncSecret) {
    return true;
  }

  const querySecret = request.nextUrl.searchParams.get('secret');
  return querySecret === syncSecret;
}

async function runCron() {
  console.log('[uplisting-cron] starting bookings sync for all properties');
  const bookings = await syncBookings();
  console.log(
    `[uplisting-cron] done synced=${bookings.synced} skipped=${bookings.skipped} cancelled=${bookings.cancelled} errors=${bookings.errors.length}`
  );
  return bookings;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bookings = await runCron();
    return NextResponse.json({ ok: true, bookings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[uplisting-cron] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
