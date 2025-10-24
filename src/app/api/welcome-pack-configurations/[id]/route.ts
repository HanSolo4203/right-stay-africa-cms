import { NextRequest } from 'next/server';
import { welcomePackConfigurationsApi } from '@/lib/database';
import { UpdateWelcomePackConfigurationData } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const configuration = await welcomePackConfigurationsApi.getById(id);
    
    if (!configuration) {
      return errorResponse('Welcome pack configuration not found', 404);
    }
    
    return successResponse(configuration);
  } catch (error) {
    console.error('Error fetching welcome pack configuration:', error);
    return errorResponse('Failed to fetch welcome pack configuration', 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const data: UpdateWelcomePackConfigurationData = await request.json();
    data.id = id;

    const configuration = await welcomePackConfigurationsApi.update(data);
    return successResponse(configuration, 'Welcome pack configuration updated successfully');
  } catch (error) {
    console.error('Error updating welcome pack configuration:', error);
    return errorResponse('Failed to update welcome pack configuration', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await welcomePackConfigurationsApi.delete(id);
    return successResponse(null, 'Welcome pack configuration deleted successfully');
  } catch (error) {
    console.error('Error deleting welcome pack configuration:', error);
    return errorResponse('Failed to delete welcome pack configuration', 500);
  }
}
