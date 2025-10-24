import { NextRequest } from 'next/server';
import { welcomePackAlertsApi } from '@/lib/database';
import { CreateWelcomePackAlertData } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unresolved = searchParams.get('unresolved');

    let alerts;
    if (unresolved === 'true') {
      alerts = await welcomePackAlertsApi.getUnresolved();
    } else {
      alerts = await welcomePackAlertsApi.getAll();
    }

    return successResponse(alerts);
  } catch (error) {
    console.error('Error fetching welcome pack alerts:', error);
    return errorResponse('Failed to fetch welcome pack alerts', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateWelcomePackAlertData = await request.json();
    
    // Validate required fields
    if (!data.inventory_item_id) {
      return errorResponse('Inventory item ID is required', 400);
    }
    if (!data.alert_type) {
      return errorResponse('Alert type is required', 400);
    }
    if (!data.message) {
      return errorResponse('Message is required', 400);
    }

    const alert = await welcomePackAlertsApi.create(data);
    return successResponse(alert, 'Welcome pack alert created successfully', 201);
  } catch (error) {
    console.error('Error creating welcome pack alert:', error);
    return errorResponse('Failed to create welcome pack alert', 500);
  }
}
