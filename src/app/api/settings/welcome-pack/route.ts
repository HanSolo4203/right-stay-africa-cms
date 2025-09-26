import { NextRequest, NextResponse } from 'next/server';
import { welcomePackApi } from '@/lib/database';

export async function GET() {
  try {
    const welcomePackItems = await welcomePackApi.getAll();
    return NextResponse.json({ success: true, data: welcomePackItems });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load welcome pack items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, price } = body;
    
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json({ success: false, error: 'Invalid price' }, { status: 400 });
    }
    
    const newItem = await welcomePackApi.create({
      name: name.trim(),
      price: priceNum,
      is_active: true
    });
    
    return NextResponse.json({ success: true, data: newItem });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create welcome pack item' }, { status: 500 });
  }
}


