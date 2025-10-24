import { NextRequest } from 'next/server';
import { welcomePackAlertsApi } from '@/lib/database';
import { UpdateWelcomePackAlertData } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const data: UpdateWelcomePackAlertData = await request.json();
    data.id = id;

    const alert = await welcomePackAlertsApi.update(data);
    return successResponse(alert, 'Welcome pack alert updated successfully');
  } catch (error) {
    console.error('Error updating welcome pack alert:', error);
    return errorResponse('Failed to update welcome pack alert', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await welcomePackAlertsApi.delete(id);
    return successResponse(null, 'Welcome pack alert deleted successfully');
  } catch (error) {
    console.error('Error deleting welcome pack alert:', error);
    return errorResponse('Failed to delete welcome pack alert', 500);
  }
}
