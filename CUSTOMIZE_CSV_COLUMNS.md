# How to Customize CSV Column Mappings

## Overview
The CSV import system is now **flexible and adaptive** - it automatically detects your CSV column names and maps them to the expected fields. You don't need to reformat your CSV file!

## How It Works

### Automatic Column Detection
When you upload a CSV file, the system:
1. **Analyzes** your CSV headers
2. **Matches** them against known column name variations
3. **Shows you** what was detected before importing
4. **Warns you** if required fields are missing

### Column Mapping System
The system looks for multiple variations of each field name. For example, for the property ID, it will recognize any of these:
- `property_id`
- `uplisting_id`
- `listing_id`
- `unit_id`
- `property`
- And more...

## Adding Your Custom Column Names

If your CSV uses column names that aren't recognized, you can easily add them to the mapping configuration.

### Step 1: Locate the Mapping File
Open this file: `src/lib/csv-column-mappings.ts`

### Step 2: Find the Field You Want to Map
The file has a `CSV_COLUMN_MAPPINGS` object with all possible fields. For example:

```typescript
export const CSV_COLUMN_MAPPINGS = {
  property_id: [
    'property_id',
    'uplisting_id',
    'listing_id',
    // Add your column name here:
  ],
  
  guest_name: [
    'guest_name',
    'guest',
    'name',
    // Add your column name here:
  ],
  
  // ... more fields
};
```

### Step 3: Add Your Column Name
Simply add your CSV column name to the appropriate array. For example, if your CSV has a column called `"Apt ID"` for the property:

```typescript
property_id: [
  'property_id',
  'uplisting_id',
  'listing_id',
  'Apt ID',  // ← Add your column name here
],
```

**Important Notes:**
- The matching is **case-insensitive**
- Spaces and underscores are OK
- Add the exact column name as it appears in your CSV header

### Step 4: Save and Test
1. Save the file
2. Upload your CSV again
3. The system will now recognize your column names

## Example: Complete Customization

Let's say your CSV has these columns:
- `Apartment ID` (instead of property_id)
- `Guest Full Name` (instead of guest_name)
- `Arrival` (instead of check_in_date)
- `Departure` (instead of check_out_date)
- `Total Price` (instead of accommodation_total)
- `Confirmation Code` (instead of booking_reference)

Here's how to add them:

```typescript
export const CSV_COLUMN_MAPPINGS = {
  property_id: [
    'property_id',
    'uplisting_id',
    'Apartment ID',  // ← Your column
  ],
  
  booking_reference: [
    'booking_reference',
    'reference',
    'Confirmation Code',  // ← Your column
  ],
  
  guest_name: [
    'guest_name',
    'guest',
    'Guest Full Name',  // ← Your column
  ],
  
  check_in_date: [
    'check_in_date',
    'check_in',
    'Arrival',  // ← Your column
  ],
  
  check_out_date: [
    'check_out_date',
    'check_out',
    'Departure',  // ← Your column
  ],
  
  accommodation_total: [
    'accommodation_total',
    'total',
    'Total Price',  // ← Your column
  ],
  
  // ... other fields
};
```

## Testing Your CSV

### Upload and Analyze
1. Go to **Finance > Owner Statements**
2. Click **"Import CSV"**
3. Select your CSV file
4. The system will automatically analyze it

### Check the Analysis
You'll see:
- ✅ **Detected Columns** (green) - Your columns were found!
- ❌ **Missing Required Fields** (red) - These must be added to the mapping
- ⚠️ **Optional Fields Not Detected** (yellow) - These are optional, no action needed

### If Required Fields Are Missing
The analysis will show:
- Which fields are missing
- Example column names the system expects
- The Import button will be disabled until you fix this

**Solution:** Add your column names to `csv-column-mappings.ts` as shown above.

## All Available Fields

### Required Fields (Must be in your CSV)
| Field | Description | Example Column Names |
|-------|-------------|---------------------|
| `property_id` | Property/apartment ID | property_id, uplisting_id, unit_id, listing_id |
| `booking_reference` | Unique booking ID | booking_reference, confirmation_number, reservation_id |
| `guest_name` | Guest full name | guest_name, customer_name, name |
| `check_in_date` | Check-in date | check_in_date, arrival_date, start_date |
| `check_out_date` | Check-out date | check_out_date, departure_date, end_date |
| `accommodation_total` | Total accommodation cost | accommodation_total, total, amount, revenue |

### Optional Fields (Nice to have)
| Field | Description | Example Column Names |
|-------|-------------|---------------------|
| `guest_email` | Guest email | guest_email, email, customer_email |
| `guest_phone` | Guest phone | guest_phone, phone, mobile |
| `discount_amount` | Discount applied | discount_amount, discount, promotion |
| `extra_charges` | Extra charges | extra_charges, extras, surcharges |
| `cleaning_fee` | Cleaning fee | cleaning_fee, cleaning, housekeeping |
| `booking_taxes` | Taxes | booking_taxes, taxes, vat |
| `channel_commission` | Platform commission | channel_commission, commission, platform_fee |
| `payment_processing_fee` | Processing fee | payment_processing_fee, transaction_fee |
| `channel_name` | Booking source | channel_name, source, platform |
| `booking_status` | Booking status | booking_status, status |
| `notes` | Additional notes | notes, comments, remarks |

## Common CSV Formats

### Airbnb Export
If using Airbnb CSV exports, add these to the mappings:

```typescript
property_id: ['Listing', 'Listing ID'],
booking_reference: ['Confirmation Code'],
guest_name: ['Guest'],
check_in_date: ['Check In'],
check_out_date: ['Check Out'],
accommodation_total: ['Earnings'],
```

### Booking.com Export
For Booking.com CSV:

```typescript
property_id: ['Property ID', 'Hotel ID'],
booking_reference: ['Reservation Number'],
guest_name: ['Guest Name'],
check_in_date: ['Check-in Date', 'Arrival'],
check_out_date: ['Check-out Date', 'Departure'],
accommodation_total: ['Total Commission'],
```

### Custom Property Management System
Share your CSV header row with your developer, and they can add all your column names at once.

## Troubleshooting

### Problem: Import button is disabled
**Cause:** Missing required fields

**Solution:**
1. Check the red "Missing Required Fields" alert
2. Note which fields are missing
3. Add your CSV column names to the mapping file
4. Re-upload the CSV

### Problem: Some data is empty after import
**Cause:** Optional fields weren't detected

**Solution:**
1. Check the yellow "Optional Fields Not Detected" section
2. If you want that data imported, add your column names to the mapping
3. Re-upload and import again

### Problem: Wrong data in wrong fields
**Cause:** Column names matched the wrong field

**Solution:**
1. Check the green "Detected Columns" section
2. Verify each mapping is correct
3. If wrong, rename your CSV column or adjust the mapping priority

### Problem: System not recognizing my column names
**Cause:** Column names not in the mapping list

**Solution:**
- Make sure you added them to `csv-column-mappings.ts`
- Check for typos
- Remember: matching is case-insensitive but exact (including spaces)
- Restart the dev server after editing the file

## Advanced: Understanding the Mapping Priority

The system tries each variation in order from top to bottom. If you have two columns that could match, the first one in the list wins.

Example:
```typescript
guest_name: [
  'guest_name',    // Tries this first
  'guest',         // Then this
  'name',          // Then this (might be too generic!)
],
```

If your CSV has both `guest` and `name` columns, it will use `guest` because it's listed first.

**Best Practice:** Add your custom column names near the top of each array for priority matching.

## Quick Reference: Edit Mapping File

1. Open `src/lib/csv-column-mappings.ts`
2. Find the field (e.g., `property_id:`)
3. Add your column name to the array
4. Save the file
5. Re-upload your CSV
6. Check the analysis - your columns should now be detected!

## Need Help?

If you're having trouble:
1. Upload your CSV to see the analysis
2. Take a screenshot of the "Missing Required Fields" section
3. Note your actual CSV column names (first row of your CSV)
4. Share both with your developer

They can quickly add all your column names to the mapping file.

## Summary

✅ **No need to reformat your CSV**
✅ **System auto-detects your column names**
✅ **Easy to add custom column names**
✅ **Visual feedback before importing**
✅ **Prevents imports with missing data**

The mapping file is your friend - customize it once, and all future imports will work seamlessly!

