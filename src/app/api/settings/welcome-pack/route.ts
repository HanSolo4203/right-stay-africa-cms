import { NextRequest, NextResponse } from 'next/server';
import { settingsApi } from '@/lib/database';

export async function GET() {
  try {
    const fee = await settingsApi.getWelcomePackFee();
    return NextResponse.json({ success: true, data: { fee } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load welcome pack fee' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const fee = Number(body?.fee);
    if (Number.isNaN(fee) || fee < 0) {
      return NextResponse.json({ success: false, error: 'Invalid fee' }, { status: 400 });
    }
    await settingsApi.setWelcomePackFee(fee);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update welcome pack fee' }, { status: 500 });
  }
}


