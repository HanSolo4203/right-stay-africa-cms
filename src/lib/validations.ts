import { z } from 'zod';

// Apartment validation schemas
export const createApartmentSchema = z.object({
  apartment_number: z.string().min(1, 'Apartment number is required').max(50, 'Apartment number too long'),
  owner_name: z.string().min(1, 'Owner name is required').max(100, 'Owner name too long'),
  owner_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().max(200, 'Address too long').optional().or(z.literal('')),
});

export const updateApartmentSchema = createApartmentSchema.partial();

// Cleaner validation schemas
export const createCleanerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phone: z.string().max(20, 'Phone number too long').optional().or(z.literal('')),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
});

export const updateCleanerSchema = createCleanerSchema.partial();

// Cleaning session validation schemas
export const createCleaningSessionSchema = z.object({
  apartment_id: z.string().uuid('Invalid apartment ID'),
  cleaner_id: z.string().uuid('Invalid cleaner ID'),
  cleaning_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
  price: z.number().min(0, 'Price must be positive').optional(),
});

export const updateCleaningSessionSchema = createCleaningSessionSchema.partial();

// Query parameter validation schemas
export const apartmentQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export const cleanerQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export const cleaningSessionQuerySchema = z.object({
  apartment_id: z.string().uuid().optional(),
  apartment: z.string().optional(), // Filter by apartment number
  cleaner_id: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // Filter by month (YYYY-MM)
  year: z.string().regex(/^\d{4}$/).optional(), // Filter by year (YYYY)
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export const analyticsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
});

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
