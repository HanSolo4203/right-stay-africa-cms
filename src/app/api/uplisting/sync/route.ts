import { NextRequest, NextResponse } from 'next/server';
import { syncBookings, syncListings } from '@/lib/uplisting-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET;
  const providedSecret = request.headers.get('x-sync-secret');

  if (!syncSecret || providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
