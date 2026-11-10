import { NextRequest, NextResponse } from 'next/server';
import { syncBookings, syncListings } from '@/lib/uplisting-sync';

export const dynamic = 'force-dynamic';

type SyncScope = 'listings' | 'bookings' | 'all';

function parseScope(value: unknown): SyncScope {
  if (value === 'listings' || value === 'bookings' || value === 'all') {
    return value;
  }
  return 'all';
}

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET;
  const providedSecret = request.headers.get('x-sync-secret');

  if (!syncSecret || providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let scope: SyncScope = 'all';
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        const body = (await request.json()) as { scope?: unknown };
        scope = parseScope(body?.scope);
      } catch {
        scope = 'all';
      }
    }

    if (scope === 'listings') {
      const listings = await syncListings();
      return NextResponse.json({ listings });
    }

    if (scope === 'bookings') {
      const bookings = await syncBookings();
      return NextResponse.json({ bookings });
    }

    const listings = await syncListings();
    const bookings = await syncBookings();

    return NextResponse.json({
      listings,
      bookings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
