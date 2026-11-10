import { NextResponse } from 'next/server';

/**
 * No-op catch-all for /api/admin/* requests that are not part of this CMS.
 * Stops noisy 404s (e.g. /api/admin/booking-requests/counts) from external callers.
 */
function noop() {
  return NextResponse.json({ data: { count: 0 }, counts: {} }, { status: 200 });
}

export async function GET() {
  return noop();
}

export async function POST() {
  return noop();
}

export async function PUT() {
  return noop();
}

export async function PATCH() {
  return noop();
}

export async function DELETE() {
  return noop();
}
