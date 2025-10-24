import { NextRequest } from 'next/server';
import { welcomePackConfigurationsApi } from '@/lib/database';
import { CreateWelcomePackConfigurationData } from '@/lib/types';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    const configurations = await welcomePackConfigurationsApi.getAll();
    return successResponse(configurations);
  } catch (error) {
    console.error('Error fetching welcome pack configurations:', error);
    return errorResponse('Failed to fetch welcome pack configurations', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateWelcomePackConfigurationData = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return errorResponse('Configuration name is required', 400);
    }

    const configuration = await welcomePackConfigurationsApi.create(data);
    return successResponse(configuration, 'Welcome pack configuration created successfully', 201);
  } catch (error) {
    console.error('Error creating welcome pack configuration:', error);
    return errorResponse('Failed to create welcome pack configuration', 500);
  }
}
