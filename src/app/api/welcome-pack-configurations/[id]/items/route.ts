import { NextRequest } from 'next/server';
import { welcomePackConfigurationItemsApi } from '@/lib/database';
import { CreateWelcomePackConfigurationItemData } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const items = await welcomePackConfigurationItemsApi.getByConfigurationId(id);
    return successResponse(items);
  } catch (error) {
    console.error('Error fetching welcome pack configuration items:', error);
    return errorResponse('Failed to fetch welcome pack configuration items', 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const data: CreateWelcomePackConfigurationItemData = await request.json();
    data.configuration_id = id;
    
    // Validate required fields
    if (!data.inventory_item_id) {
      return errorResponse('Inventory item ID is required', 400);
    }
    if (!data.quantity || data.quantity <= 0) {
      return errorResponse('Quantity must be greater than 0', 400);
    }

    const item = await welcomePackConfigurationItemsApi.create(data);
    return successResponse(item, 'Welcome pack configuration item added successfully', 201);
  } catch (error) {
    console.error('Error creating welcome pack configuration item:', error);
    return errorResponse('Failed to create welcome pack configuration item', 500);
  }
}
