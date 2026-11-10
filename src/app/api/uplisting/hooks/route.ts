import { NextRequest, NextResponse } from 'next/server';
import {
  ensureUplistingWebhooks,
  getWebhookTargetUrl,
  listUplistingWebhooks,
} from '@/lib/uplisting';

export const dynamic = 'force-dynamic';

function authorize(request: NextRequest): boolean {
  const syncSecret = process.env.SYNC_SECRET;
  const providedSecret = request.headers.get('x-sync-secret');
  return Boolean(syncSecret && providedSecret === syncSecret);
}

/** List currently registered Uplisting hooks (and the URL we would register). */
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const hooks = await listUplistingWebhooks();
    let targetUrl: string | null = null;
    try {
      targetUrl = getWebhookTargetUrl();
    } catch {
      targetUrl = null;
    }
    return NextResponse.json({ ok: true, targetUrl, hooks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Delete + recreate booking_created / booking_updated / booking_removed hooks
 * pointing at this app (URL includes ?token= when UPLISTING_WEBHOOK_TOKEN is set).
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await ensureUplistingWebhooks();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
