import { NextRequest } from 'next/server';
import { welcomePackReportsApi } from '@/lib/database';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const configurationId = searchParams.get('configurationId');

    if (!startDate || !endDate) {
      return errorResponse('Start date and end date are required', 400);
    }

    switch (reportType) {
      case 'consumption':
        const consumptionReport = await welcomePackReportsApi.getConsumptionReport(startDate, endDate);
        return successResponse(consumptionReport);
      
      case 'cost-analysis':
        if (!configurationId) {
          return errorResponse('Configuration ID is required for cost analysis', 400);
        }
        const costAnalysis = await welcomePackReportsApi.getCostAnalysis(configurationId);
        return successResponse(costAnalysis);
      
      default:
        return errorResponse('Invalid report type. Use "consumption" or "cost-analysis"', 400);
    }
  } catch (error) {
    console.error('Error generating welcome pack report:', error);
    return errorResponse('Failed to generate welcome pack report', 500);
  }
}
