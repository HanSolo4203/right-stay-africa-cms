import { NextRequest } from 'next/server';
import { welcomePackDistributionsApi } from '@/lib/database';
import { UpdateWelcomePackDistributionData } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const distribution = await welcomePackDistributionsApi.getById(id);
    
    if (!distribution) {
      return errorResponse('Welcome pack distribution not found', 404);
    }
    
    return successResponse(distribution);
  } catch (error) {
    console.error('Error fetching welcome pack distribution:', error);
    return errorResponse('Failed to fetch welcome pack distribution', 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const data: UpdateWelcomePackDistributionData = await request.json();
    data.id = id;

    const distribution = await welcomePackDistributionsApi.update(data);
    return successResponse(distribution, 'Welcome pack distribution updated successfully');
  } catch (error) {
    console.error('Error updating welcome pack distribution:', error);
    return errorResponse('Failed to update welcome pack distribution', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await welcomePackDistributionsApi.delete(id);
    return successResponse(null, 'Welcome pack distribution deleted successfully');
  } catch (error) {
    console.error('Error deleting welcome pack distribution:', error);
    return errorResponse('Failed to delete welcome pack distribution', 500);
  }
}
