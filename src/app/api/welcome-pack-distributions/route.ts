import { NextRequest } from 'next/server';
import { welcomePackDistributionsApi } from '@/lib/database';
import { CreateWelcomePackDistributionData } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let distributions;
    if (startDate && endDate) {
      distributions = await welcomePackDistributionsApi.getByDateRange(startDate, endDate);
    } else {
      distributions = await welcomePackDistributionsApi.getAll();
    }

    return successResponse(distributions);
  } catch (error) {
    console.error('Error fetching welcome pack distributions:', error);
    return errorResponse('Failed to fetch welcome pack distributions', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateWelcomePackDistributionData = await request.json();
    
    // Validate required fields
    if (!data.configuration_id) {
      return errorResponse('Configuration ID is required', 400);
    }

    const distribution = await welcomePackDistributionsApi.create(data);
    return successResponse(distribution, 'Welcome pack distribution created successfully', 201);
  } catch (error) {
    console.error('Error creating welcome pack distribution:', error);
    return errorResponse('Failed to create welcome pack distribution', 500);
  }
}
