import { NextRequest, NextResponse } from 'next/server';
import { syncBookingsForListing } from '@/lib/uplisting-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET;
  const providedSecret = request.headers.get('x-sync-secret');

  if (!syncSecret || providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { uplisting_id?: string };
    const uplistingId = body.uplisting_id?.trim();

    if (!uplistingId) {
      return NextResponse.json(
        { error: 'uplisting_id is required' },
        { status: 400 }
      );
    }

    const result = await syncBookingsForListing(uplistingId);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
