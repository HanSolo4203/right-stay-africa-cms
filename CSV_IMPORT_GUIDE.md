# CSV Booking Import Guide

## Overview
The CSV import feature allows you to bulk import booking data into the Right Stay Africa CMS. This is particularly useful for uploading monthly booking reports and generating owner statements.

## How to Use

### 1. Access the Import Feature
1. Navigate to **Finance > Owner Statements** in the CMS
2. Click the **"Import CSV"** button in the top right corner
3. The import modal will open

### 2. Download the Template (Recommended)
- Click **"Download Template"** in the import modal
- This will download a pre-formatted CSV file with sample data
- Use this template to ensure your data is in the correct format

### 3. Prepare Your CSV File

#### Required Columns:
- **property_id** or **uplisting_id** - The property identifier from cached_properties table
- **booking_reference** - Unique booking reference number (e.g., AIR-2025-001)
- **guest_name** - Full name of the guest
- **check_in_date** - Check-in date in YYYY-MM-DD format
- **check_out_date** - Check-out date in YYYY-MM-DD format
- **accommodation_total** - Total accommodation cost

#### Optional Columns:
- **guest_email** - Guest email address
- **guest_phone** - Guest phone number
- **discount_amount** - Any discounts applied (default: 0)
- **extra_charges** - Additional charges (default: 0)
- **cleaning_fee** - Cleaning fee charged (default: 0)
- **booking_taxes** - Taxes applied (default: 0)
- **channel_commission** - Commission paid to booking channel (default: 0)
- **payment_processing_fee** - Payment processing fees (default: 0)
- **channel_name** - Booking source (e.g., Airbnb, Booking.com, Direct)
- **booking_status** - Status: pending, confirmed, cancelled, completed (default: completed)
- **notes** - Additional booking notes

### 4. Upload and Import
1. Click **"Select CSV File"** and choose your prepared file
2. Review the file details shown
3. Click **"Import Bookings"** to start the import
4. Monitor the progress bar as the system processes your data
5. Review the import results summary

## How It Works

### Property Mapping
The system uses the `property_id` (or `uplisting_id`) to look up properties in the `cached_properties` table. The property data includes:
- Property name and nickname
- Owner information (extracted from nickname)
- Property details

### Automatic Record Creation

#### Apartments
If an apartment doesn't exist for the given property ID:
- A new apartment record is automatically created
- Owner name is extracted from the property nickname
- Property details are populated from cached_properties data

#### Guests
If a guest doesn't exist:
- A new guest record is created using the provided details
- Guest matching is done by email (if provided) or name

#### Booking Channels
If a booking channel doesn't exist:
- A new channel is created with the provided name
- Default commission rates (0%) are applied
- You can update these rates later in the system

### Data Validation
The import process validates:
- Required fields are present
- Property IDs exist in cached_properties
- Dates are in correct format (YYYY-MM-DD)
- Numeric values are valid numbers
- Booking references are unique (duplicates are skipped)

### Error Handling
- Invalid rows are skipped and reported in the results
- Duplicate booking references are automatically skipped
- Missing property IDs are flagged as errors
- Import continues even if some rows fail
- Maximum of 10 errors are displayed in the UI

## CSV Format Example

```csv
property_id,booking_reference,guest_name,guest_email,check_in_date,check_out_date,accommodation_total,cleaning_fee,channel_name,booking_status
126709,AIR-2025-001,John Smith,john@example.com,2025-01-15,2025-01-18,1500.00,250.00,Airbnb,completed
129921,BOOK-2025-002,Sarah Johnson,sarah@example.com,2025-01-20,2025-01-25,2500.00,250.00,Booking.com,completed
```

## Tips for Successful Imports

### 1. Verify Property IDs
- Ensure all property_id values exist in your cached_properties table
- Property IDs are typically numeric (e.g., 126709, 129921)
- Use the exact uplisting_id from your property management system

### 2. Use Consistent Formatting
- Always use YYYY-MM-DD for dates (e.g., 2025-01-15)
- Use decimal format for amounts (e.g., 1500.00)
- Don't include currency symbols in numeric fields

### 3. Handle Special Characters
- Escape commas in text fields by wrapping in quotes
- Example: `"Notes with, comma"` or use semicolons instead

### 4. Channel Names
- Use consistent channel names across imports
- Common channels: Airbnb, Booking.com, VRBO, Direct, Expedia
- The system will create new channels if they don't exist

### 5. Booking References
- Ensure booking references are unique
- Use a consistent format (e.g., CHANNEL-YEAR-NUMBER)
- Duplicate references will be automatically skipped

## Post-Import Actions

After a successful import:
1. **Review the data** - Check the owner statements page for imported bookings
2. **Verify totals** - Ensure financial calculations are correct
3. **Update channel rates** - If new channels were created, update their commission rates
4. **Complete owner details** - Add missing owner email addresses if needed
5. **Generate statements** - Use the filters to generate specific owner statements

## Troubleshooting

### "Property ID not found"
- Verify the property exists in cached_properties table
- Check that you're using the correct uplisting_id
- Ensure there are no extra spaces or formatting issues

### "Duplicate booking reference"
- The booking reference already exists in the system
- Either use a different reference or delete the existing booking first

### "Invalid date format"
- Dates must be in YYYY-MM-DD format
- Check for extra spaces or incorrect separators

### Import Appears Slow
- Large files (>100 rows) may take longer to process
- Each row requires multiple database lookups and insertions
- Be patient and don't close the modal during import

## Best Practices

1. **Start Small** - Test with a few rows before importing large datasets
2. **Keep Backups** - Save a copy of your CSV before importing
3. **Regular Imports** - Import booking data monthly for accurate statements
4. **Verify After Import** - Always review imported data for accuracy
5. **Maintain Data Quality** - Use consistent naming and formatting

## Technical Details

### Database Tables Affected
- `bookings` - Main booking records
- `guests` - Guest information (auto-created)
- `apartments` - Property details (auto-created from cached_properties)
- `booking_channels` - Booking sources (auto-created)

### Calculated Fields
The following fields are automatically calculated:
- `nights` - Computed from check-in and check-out dates
- `total_payout` - Calculated from all financial fields

### Row Level Security
All imported data respects the existing RLS policies:
- Authenticated users can view all bookings
- Service role has full access for API operations

## Support

If you encounter issues with CSV imports:
1. Check this guide for troubleshooting tips
2. Verify your CSV format matches the template
3. Review the error messages in the import results
4. Contact support with specific error details and sample data

## API Endpoint

The import uses the following API endpoint:
- **URL**: `/api/bookings/import`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Response**: JSON with import statistics and errors

