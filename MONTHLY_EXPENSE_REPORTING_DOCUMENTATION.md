# Monthly Expense Calculation and Reporting System

## Overview

This system provides comprehensive monthly expense calculation and reporting for RSA Laundry Service, including backend calculation logic, API endpoints, frontend components, and export functionality.

## Features Implemented

### 1. Database Functions (`create-monthly-expense-functions.sql`)

#### `get_monthly_rsa_expenses(start_date, end_date, cleaner_id)`
- Calculates monthly expenses with detailed breakdown
- Groups expenses by month and year
- Includes cleaner information and payment status
- Returns JSONB array of individual expenses

#### `get_rsa_expense_totals(year)`
- Calculates running totals and year-to-date statistics
- Provides monthly averages and cumulative totals
- Shows progression over time

#### `get_cleaner_monthly_performance(start_date, end_date)`
- Individual cleaner performance metrics
- Monthly breakdown by cleaner
- Payment status tracking (paid/unpaid)

#### `get_expense_summary(start_date, end_date)`
- Summary statistics for date ranges
- Total expenses, days, averages
- Payment status breakdown

### 2. API Endpoint (`/api/rsa-laundry-monthly-expenses`)

#### Features:
- **Date Range Filtering**: Filter by start and end dates
- **Cleaner Filtering**: Filter by specific cleaner
- **Detail Level Control**: Include/exclude detailed expense breakdown
- **Export Formats**: JSON and CSV export
- **Caching**: 5-minute in-memory cache for performance
- **Error Handling**: Comprehensive error handling and logging

#### Query Parameters:
- `startDate`: Start date for filtering (YYYY-MM-DD)
- `endDate`: End date for filtering (YYYY-MM-DD)
- `cleanerId`: UUID of specific cleaner
- `includeDetails`: Boolean to include detailed expense breakdown
- `format`: Export format ('json' or 'csv')

#### Response Structure:
```json
{
  "success": true,
  "data": {
    "monthlyExpenses": [...],
    "runningTotals": [...],
    "cleanerPerformance": [...],
    "summary": {...},
    "params": {...},
    "generatedAt": "2025-01-21T..."
  },
  "cached": false
}
```

### 3. Frontend Components

#### `MonthlyExpenseReport.tsx`
- **Interactive Filters**: Date range, cleaner selection, detail level
- **Summary Cards**: Key metrics display
- **Data Tables**: Monthly expenses, running totals, cleaner performance
- **Export Functionality**: CSV and JSON export
- **Responsive Design**: Mobile-friendly layout
- **Real-time Updates**: Automatic data refresh

#### Features:
- **Filter Panel**: Toggle-able filter section
- **Export Buttons**: Direct CSV/JSON download
- **Refresh Button**: Manual data refresh
- **Loading States**: Skeleton loading animations
- **Error Handling**: Graceful error display

### 4. Dashboard Integration

#### Dashboard Page (`/dashboard`)
- Monthly expense report integrated as a section
- Appears after RSA Laundry Service statistics
- Maintains consistent styling and layout

#### Reports Page (`/reports/monthly-expenses`)
- Dedicated page for detailed expense reporting
- Full-screen layout for comprehensive analysis
- Independent navigation and functionality

### 5. Navigation

#### Header Navigation
- Added "Reports" link to main navigation
- FileText icon for visual consistency
- Active state highlighting

## Usage Instructions

### 1. Database Setup

Run the SQL functions in Supabase:
```sql
-- Execute create-monthly-expense-functions.sql
-- This creates all necessary functions and indexes
```

### 2. API Usage

#### Basic Monthly Data:
```
GET /api/rsa-laundry-monthly-expenses
```

#### Filtered by Date Range:
```
GET /api/rsa-laundry-monthly-expenses?startDate=2025-01-01&endDate=2025-01-31
```

#### Filtered by Cleaner:
```
GET /api/rsa-laundry-monthly-expenses?cleanerId=uuid-here
```

#### Export CSV:
```
GET /api/rsa-laundry-monthly-expenses?format=csv&includeDetails=true
```

### 3. Frontend Usage

#### Dashboard Integration:
- Navigate to `/dashboard`
- Scroll to "Monthly Expense Report" section
- Use filters and export functionality

#### Dedicated Reports Page:
- Navigate to `/reports/monthly-expenses`
- Full-featured reporting interface
- Advanced filtering and export options

## Performance Optimizations

### 1. Caching
- **In-memory cache**: 5-minute cache duration
- **Cache key**: Based on all query parameters
- **Cache invalidation**: Manual refresh or time-based expiration

### 2. Database Indexes
- `idx_rsa_laundry_expenses_service_date_cleaner`: Optimized date/cleaner queries
- `idx_rsa_laundry_expenses_is_paid_service_date`: Optimized payment status queries

### 3. Efficient Queries
- **Window functions**: For running totals calculation
- **Aggregation**: Optimized grouping and summing
- **JSONB**: Efficient detailed expense storage

## Export Functionality

### CSV Export
- **Headers**: Month, Total Expenses, Days, Averages, Cleaner details
- **Detailed Mode**: Individual expense records
- **Summary Mode**: Monthly aggregates only
- **Filename**: Auto-generated with date

### JSON Export
- **Complete Data**: All API response data
- **Formatted**: Pretty-printed JSON
- **Filename**: Auto-generated with date

## Error Handling

### API Level
- **Database Errors**: Graceful error responses
- **Validation**: Parameter validation
- **Logging**: Comprehensive error logging

### Frontend Level
- **Loading States**: Skeleton animations
- **Error Display**: User-friendly error messages
- **Fallback UI**: Graceful degradation

## Security Considerations

### Database
- **RLS Policies**: Row-level security enabled
- **Function Permissions**: Restricted to authenticated users
- **Input Validation**: SQL injection prevention

### API
- **Authentication**: Supabase authentication required
- **Parameter Validation**: Input sanitization
- **Rate Limiting**: Consider implementing for production

## Future Enhancements

### Potential Improvements
1. **Redis Caching**: Replace in-memory cache with Redis
2. **PDF Export**: Add PDF report generation
3. **Email Reports**: Scheduled report delivery
4. **Advanced Analytics**: Trend analysis and forecasting
5. **Real-time Updates**: WebSocket integration
6. **Bulk Operations**: Batch processing capabilities

### Performance Scaling
1. **Database Partitioning**: Partition by date for large datasets
2. **Materialized Views**: Pre-calculated aggregations
3. **Background Jobs**: Async report generation
4. **CDN Integration**: Static report caching

## Troubleshooting

### Common Issues

#### No Data Displayed
- Check if RSA laundry expenses exist in database
- Verify date range filters
- Check browser console for API errors

#### Export Not Working
- Ensure browser allows downloads
- Check file size limits
- Verify API response format

#### Performance Issues
- Clear cache using DELETE endpoint
- Check database query performance
- Monitor memory usage

### Debug Information
- API responses include `generatedAt` timestamp
- Frontend logs API calls and responses
- Database functions include error logging

## API Reference

### Endpoints

#### GET `/api/rsa-laundry-monthly-expenses`
Retrieve monthly expense data with optional filtering.

**Parameters:**
- `startDate` (optional): Start date filter (YYYY-MM-DD)
- `endDate` (optional): End date filter (YYYY-MM-DD)
- `cleanerId` (optional): UUID of specific cleaner
- `includeDetails` (optional): Include detailed breakdown (boolean)
- `format` (optional): Export format ('json' or 'csv')

**Response:**
- `200`: Success with expense data
- `500`: Server error with error details

#### DELETE `/api/rsa-laundry-monthly-expenses`
Clear the in-memory cache.

**Response:**
- `200`: Cache cleared successfully
- `500`: Error clearing cache

### Database Functions

#### `get_monthly_rsa_expenses(p_start_date, p_end_date, p_cleaner_id)`
Returns monthly expense breakdown with optional filtering.

#### `get_rsa_expense_totals(p_year)`
Returns running totals and year-to-date calculations.

#### `get_cleaner_monthly_performance(p_start_date, p_end_date)`
Returns individual cleaner performance metrics.

#### `get_expense_summary(p_start_date, p_end_date)`
Returns summary statistics for date range.

## Conclusion

The monthly expense calculation and reporting system provides comprehensive financial tracking and analysis for RSA Laundry Service operations. It includes robust backend calculations, efficient API endpoints, user-friendly frontend components, and flexible export capabilities, all optimized for performance and scalability.
