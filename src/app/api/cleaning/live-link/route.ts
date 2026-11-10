import { NextRequest, NextResponse } from 'next/server';
import {
  LIVE_SCHEDULE_SPILLOVER_DAYS,
  formatMonthLabel,
  getCurrentMonthKey,
  getLiveScheduleRange,
  parseMonthKey,
} from '@/lib/cleaning-month';
import { getCleaningLiveToken } from '@/lib/cleaning-live-token';

function resolveBaseUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (envUrl) return envUrl;
  const origin = request.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  return 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  try {
    const monthParam = request.nextUrl.searchParams.get('month');
    const monthKey =
      monthParam && parseMonthKey(monthParam) ? monthParam : getCurrentMonthKey();
    const range = getLiveScheduleRange(monthKey);
    const token = getCleaningLiveToken();
    const baseUrl = resolveBaseUrl(request);
    const url = `${baseUrl}/cleaning/live/${token}?month=${monthKey}`;

    return NextResponse.json({
      success: true,
      data: {
        url,
        token,
        month: monthKey,
        month_label: formatMonthLabel(monthKey),
        from_date: range.start,
        to_date: range.end,
        month_end: range.monthEnd,
        spillover_days: LIVE_SCHEDULE_SPILLOVER_DAYS,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build live link';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
