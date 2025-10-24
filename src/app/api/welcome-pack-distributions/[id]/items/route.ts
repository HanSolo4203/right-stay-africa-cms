import { NextRequest } from 'next/server';
import { welcomePackDistributionItemsApi } from '@/lib/database';
import { CreateWelcomePackDistributionItemData } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const items = await welcomePackDistributionItemsApi.getByDistributionId(id);
    return successResponse(items);
  } catch (error) {
    console.error('Error fetching welcome pack distribution items:', error);
    return errorResponse('Failed to fetch welcome pack distribution items', 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const data: CreateWelcomePackDistributionItemData = await request.json();
    data.distribution_id = id;
    
    // Validate required fields
    if (!data.inventory_item_id) {
      return errorResponse('Inventory item ID is required', 400);
    }
    if (!data.quantity_issued || data.quantity_issued <= 0) {
      return errorResponse('Quantity issued must be greater than 0', 400);
    }

    const item = await welcomePackDistributionItemsApi.create(data);
    return successResponse(item, 'Welcome pack distribution item added successfully', 201);
  } catch (error) {
    console.error('Error creating welcome pack distribution item:', error);
    return errorResponse('Failed to create welcome pack distribution item', 500);
  }
}
