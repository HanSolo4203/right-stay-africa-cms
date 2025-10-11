import { NextRequest, NextResponse } from 'next/server';
import { welcomePackApi } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { name, price, is_active } = body;
    const { id } = await params;
    
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json({ success: false, error: 'Invalid price' }, { status: 400 });
    }
    
    const updatedItem = await welcomePackApi.update(id, {
      name: name.trim(),
      price: priceNum,
      is_active: is_active !== undefined ? Boolean(is_active) : true
    });
    
    return NextResponse.json({ success: true, data: updatedItem });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update welcome pack item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await welcomePackApi.delete(id);
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete welcome pack item' }, { status: 500 });
  }
}
