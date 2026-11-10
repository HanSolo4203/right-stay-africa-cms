import { z } from 'zod';

// Apartment validation schemas
export const createApartmentSchema = z.object({
  apartment_number: z.string().min(1, 'Apartment number is required').max(50, 'Apartment number too long'),
  owner_name: z.string().min(1, 'Owner name is required').max(100, 'Owner name too long'),
  owner_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().max(200, 'Address too long').optional().or(z.literal('')),
  cleaner_payout: z.number().min(0, 'Payout must be positive').optional(),
  is_active: z.boolean().optional(),
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
  cleaner_2_id: z.string().uuid('Invalid second cleaner ID').optional().nullable().or(z.literal('')),
  cleaning_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
  price: z.number().min(0, 'Price must be positive').optional(),
  include_welcome_pack: z.boolean().optional(),
  // Multi-cleaner fields
  cleaner_1_fee: z.number().min(0, 'Cleaner 1 fee must be positive').optional(),
  cleaner_2_fee: z.number().min(0, 'Cleaner 2 fee must be positive').optional().nullable(),
  is_multi_cleaner: z.boolean().optional(),
  // Additional fields for internal asset support
  property_category: z.enum(['apartment', 'internal_asset']).optional(),
  property_id: z.string().uuid().optional(),
  welcome_pack_fee: z.number().min(0, 'Welcome pack fee must be positive').optional().nullable(),
});

export const updateCleaningSessionSchema = createCleaningSessionSchema.partial().extend({
  // Additional fields for updating multi-cleaner sessions
  cleaner_1_name: z.string().optional(),
  cleaner_2_name: z.string().optional().nullable(),
  total_cleaning_fee: z.number().min(0, 'Total cleaning fee must be positive').optional(),
  cleaner_count: z.number().min(1, 'Cleaner count must be at least 1').max(2, 'Cleaner count cannot exceed 2').optional(),
}).refine((data) => {
  // If apartment_id is provided, it must be a valid UUID
  if (data.apartment_id !== undefined && data.apartment_id !== '') {
    return z.string().uuid().safeParse(data.apartment_id).success;
  }
  return true;
}, {
  message: "Invalid apartment ID format",
  path: ["apartment_id"]
}).refine((data) => {
  // If cleaner_id is provided, it must be a valid UUID
  if (data.cleaner_id !== undefined && data.cleaner_id !== '') {
    return z.string().uuid().safeParse(data.cleaner_id).success;
  }
  return true;
}, {
  message: "Invalid cleaner ID format",
  path: ["cleaner_id"]
}).refine((data) => {
  // If cleaner_2_id is provided and not empty, it must be a valid UUID
  if (data.cleaner_2_id !== undefined && data.cleaner_2_id !== '' && data.cleaner_2_id !== null) {
    return z.string().uuid().safeParse(data.cleaner_2_id).success;
  }
  return true;
}, {
  message: "Invalid second cleaner ID format",
  path: ["cleaner_2_id"]
});

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
  upcoming: z.string().optional(), // Filter for upcoming cleanings (next 7 days)
});

export const analyticsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
});

// Inventory validation schemas
export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  item_type: z.enum(['detergent', 'welcome_pack']),
  current_stock: z.number().min(0, 'Current stock must be non-negative'),
  unit_of_measure: z.string().min(1, 'Unit of measure is required').max(20, 'Unit of measure too long'),
  min_stock_level: z.number().min(0, 'Min stock level must be non-negative').optional().nullable(),
  notes: z.string().max(500, 'Notes too long').optional().nullable(),
  is_active: z.boolean().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial().extend({
  id: z.string().uuid('Invalid ID format'),
});

export const inventoryQuerySchema = z.object({
  type: z.enum(['detergent', 'welcome_pack']).optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

// API Response types
export interface ApiResponse<T = unknown> {
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
