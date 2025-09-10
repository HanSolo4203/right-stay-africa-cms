import { NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse } from './validations';

// Success response helpers
export function successResponse<T>(data: T, message?: string, status: number = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  return NextResponse.json(response, { status });
}

export function successPaginatedResponse<T>(
  data: T[],
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  },
  message?: string
) {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination,
    ...(message && { message }),
  };
  return NextResponse.json(response);
}

// Error response helpers
export function errorResponse(
  error: string,
  status: number = 400,
  details?: unknown
) {
  const response: ApiResponse = {
    success: false,
    error,
    ...(details && { details }),
  };
  return NextResponse.json(response, { status });
}

export function validationErrorResponse(errors: unknown) {
  return errorResponse('Validation failed', 400, { validation_errors: errors });
}

export function notFoundResponse(resource: string = 'Resource') {
  return errorResponse(`${resource} not found`, 404);
}

export function serverErrorResponse(error?: string) {
  return errorResponse(error || 'Internal server error', 500);
}

// Common error handling wrapper
export function handleApiError(error: unknown, context: string = 'API operation') {
  console.error(`${context} error:`, error);
  
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('duplicate key')) {
      return errorResponse('Resource already exists', 409);
    }
    if (error.message.includes('foreign key')) {
      return errorResponse('Cannot delete resource with dependencies', 409);
    }
    if (error.message.includes('not found')) {
      return notFoundResponse();
    }
  }
  
  return serverErrorResponse();
}

// Request validation helper
export function validateRequest<T>(
  schema: unknown,
  data: unknown,
  context: string = 'request'
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error: unknown) {
    const validationErrors = (error as { errors?: Array<{ path: string[]; message: string }> }).errors?.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })) || [];
    
    return {
      success: false,
      error: validationErrorResponse(validationErrors),
    };
  }
}
