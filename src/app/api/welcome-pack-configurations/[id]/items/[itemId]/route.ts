import { NextRequest } from 'next/server';
import { welcomePackConfigurationItemsApi } from '@/lib/database';
import { UpdateWelcomePackConfigurationItemData } from '@/lib/types';
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
    const data: UpdateWelcomePackConfigurationItemData = await request.json();
    data.id = itemId;

    const item = await welcomePackConfigurationItemsApi.update(data);
    return successResponse(item, 'Welcome pack configuration item updated successfully');
  } catch (error) {
    console.error('Error updating welcome pack configuration item:', error);
    return errorResponse('Failed to update welcome pack configuration item', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    await welcomePackConfigurationItemsApi.delete(itemId);
    return successResponse(null, 'Welcome pack configuration item deleted successfully');
  } catch (error) {
    console.error('Error deleting welcome pack configuration item:', error);
    return errorResponse('Failed to delete welcome pack configuration item', 500);
  }
}
