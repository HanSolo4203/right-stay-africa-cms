import { NextRequest } from 'next/server';
import { welcomePackDistributionItemsApi } from '@/lib/database';
import { UpdateWelcomePackDistributionItemData } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    const data: UpdateWelcomePackDistributionItemData = await request.json();
    data.id = itemId;

    const item = await welcomePackDistributionItemsApi.update(data);
    return successResponse(item, 'Welcome pack distribution item updated successfully');
  } catch (error) {
    console.error('Error updating welcome pack distribution item:', error);
    return errorResponse('Failed to update welcome pack distribution item', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    await welcomePackDistributionItemsApi.delete(itemId);
    return successResponse(null, 'Welcome pack distribution item deleted successfully');
  } catch (error) {
    console.error('Error deleting welcome pack distribution item:', error);
    return errorResponse('Failed to delete welcome pack distribution item', 500);
  }
}
