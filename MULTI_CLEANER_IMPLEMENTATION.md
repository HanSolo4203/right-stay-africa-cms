# Multi-Cleaner Session Implementation

## Overview
This implementation modifies the cleaning session creation logic to handle multiple cleaners for apartment cleaning with a **single database entry** instead of creating multiple separate records.

## Key Changes

### 1. Database Schema Updates (`add-multi-cleaner-fields.sql`)

#### New Fields Added to `cleaning_sessions` table:
- `cleaner_2_id` - UUID reference to second cleaner
- `cleaner_1_name` - Denormalized name of primary cleaner
- `cleaner_2_name` - Denormalized name of second cleaner
- `cleaner_1_fee` - Individual fee for primary cleaner
- `cleaner_2_fee` - Individual fee for second cleaner
- `total_cleaning_fee` - Automatically calculated sum of both fees
- `is_multi_cleaner` - Boolean flag indicating multi-cleaner session
- `cleaner_count` - Integer count of cleaners (1 or 2)

#### Database Features:
- **Automatic Calculations**: Trigger automatically calculates `total_cleaning_fee` and `cleaner_count`
- **Backward Compatibility**: All new fields are nullable, existing records work unchanged
- **Performance Optimized**: Denormalized cleaner names for faster queries
- **Indexed Fields**: Proper indexes on frequently queried fields

### 2. TypeScript Type Updates (`src/lib/types.ts`)

#### Updated Interfaces:
- `CleaningSessionDetailed` - Added all new multi-cleaner fields
- `CreateCleaningSessionData` - Added `cleaner_2_id`, `cleaner_1_fee`, `cleaner_2_fee`, `is_multi_cleaner`
- `UpdateCleaningSessionData` - Added multi-cleaner update fields

### 3. API Endpoint Updates

#### Create Session (`/api/cleaning-sessions`)
- **Single Record Creation**: Creates one record with multiple cleaner data
- **Validation**: Ensures both cleaners exist and aren't double-booked
- **Fee Validation**: Validates individual fees match total price
- **Automatic Population**: Populates cleaner names and flags automatically

#### Update Session (`/api/cleaning-sessions/[id]`)
- **Multi-Cleaner Support**: Handles updating both cleaners in single record
- **Conflict Detection**: Checks for scheduling conflicts for both cleaners
- **Fee Validation**: Ensures individual fees are consistent with total

### 4. Frontend Component Updates

#### AddCleaningModal (`src/components/ui/AddCleaningModal.tsx`)
- **Single API Call**: Sends one request with multi-cleaner data
- **Fee Calculation**: Automatically splits total price equally between cleaners
- **Success Messages**: Shows both cleaner names in success message

#### EditCleaningModal (`src/components/ui/EditCleaningModal.tsx`)
- **Single Record Update**: Updates existing record with multi-cleaner data
- **Fee Management**: Handles individual cleaner fee updates
- **Validation**: Ensures data consistency

### 5. Validation Schema Updates (`src/lib/validations.ts`)

#### Enhanced Validation:
- `cleaner_2_id` - Optional UUID validation
- `cleaner_1_fee` - Optional positive number validation
- `cleaner_2_fee` - Optional positive number validation
- `is_multi_cleaner` - Optional boolean validation

## Key Benefits

### 1. **Single Database Record**
- ✅ One entry per cleaning session regardless of cleaner count
- ✅ Easier data management and reporting
- ✅ Simplified calendar display logic

### 2. **Individual Fee Tracking**
- ✅ Separate fees for each cleaner
- ✅ Automatic total calculation
- ✅ Detailed financial reporting

### 3. **Backward Compatibility**
- ✅ Existing single-cleaner records unchanged
- ✅ Gradual migration path
- ✅ No breaking changes

### 4. **Performance Optimized**
- ✅ Denormalized cleaner names for faster queries
- ✅ Proper database indexes
- ✅ Efficient single-record operations

### 5. **Comprehensive Validation**
- ✅ Conflict detection for both cleaners
- ✅ Fee consistency validation
- ✅ Data integrity checks

## Usage Examples

### Creating Multi-Cleaner Session
```typescript
const sessionData = {
  apartment_id: "apartment-uuid",
  cleaner_id: "cleaner-1-uuid",
  cleaner_2_id: "cleaner-2-uuid",
  cleaning_date: "2024-01-15",
  price: 200, // Total price
  cleaner_1_fee: 100, // Individual fee
  cleaner_2_fee: 100, // Individual fee
  is_multi_cleaner: true,
  notes: "Large apartment requiring two cleaners"
};
```

### Database Record Structure
```sql
INSERT INTO cleaning_sessions (
  apartment_id,
  cleaner_id,
  cleaner_2_id,
  cleaning_date,
  price,
  cleaner_1_fee,
  cleaner_2_fee,
  total_cleaning_fee, -- Auto-calculated: 200
  is_multi_cleaner,   -- Auto-set: true
  cleaner_count,      -- Auto-calculated: 2
  cleaner_1_name,     -- Auto-populated: "John Doe"
  cleaner_2_name      -- Auto-populated: "Jane Smith"
);
```

## Migration Notes

### For Existing Data:
1. Run `add-multi-cleaner-fields.sql` to add new columns
2. Existing records automatically get:
   - `cleaner_1_name` populated from `cleaners` table
   - `cleaner_1_fee` set to existing `price` value
   - `total_cleaning_fee` set to existing `price` value
   - `is_multi_cleaner` set to `false`
   - `cleaner_count` set to `1`

### For New Development:
1. Use the updated interfaces and validation schemas
2. Frontend automatically handles multi-cleaner logic
3. API endpoints support both single and multi-cleaner sessions

## Important Notes

### Price Handling:
- **Total Price**: The `price` field represents the total session cost
- **Individual Fees**: `cleaner_1_fee` and `cleaner_2_fee` are individual payments
- **No Duplication**: Price is not duplicated - it's split into individual fees
- **Automatic Calculation**: `total_cleaning_fee` is automatically calculated

### Apartment-Only Feature:
- Multi-cleaner functionality is **only available for apartment properties**
- RSA Laundry Room services remain single-cleaner only
- This maintains the business logic separation

### Welcome Pack Logic:
- Welcome pack fees are only applied to the primary cleaner
- Additional cleaners do not receive welcome pack fees
- This prevents double-charging of welcome pack fees

## Files Modified

### Database:
- `add-multi-cleaner-fields.sql` - New migration script

### Backend:
- `src/lib/types.ts` - Updated TypeScript interfaces
- `src/lib/validations.ts` - Updated validation schemas
- `src/lib/database.ts` - Updated database operations
- `src/app/api/cleaning-sessions/route.ts` - Updated create endpoint
- `src/app/api/cleaning-sessions/[id]/route.ts` - Updated update endpoint

### Frontend:
- `src/components/ui/AddCleaningModal.tsx` - Updated creation logic
- `src/components/ui/EditCleaningModal.tsx` - Updated editing logic

## Testing Recommendations

1. **Create single-cleaner session** - Verify backward compatibility
2. **Create multi-cleaner session** - Verify new functionality
3. **Edit single to multi-cleaner** - Verify update functionality
4. **Edit multi to single-cleaner** - Verify downgrade functionality
5. **Conflict detection** - Verify both cleaners can't be double-booked
6. **Fee validation** - Verify individual fees match total price
7. **Calendar display** - Verify multi-cleaner sessions display correctly
8. **Reporting** - Verify financial reports include individual cleaner fees

This implementation provides a robust, scalable solution for managing multi-cleaner cleaning sessions while maintaining full backward compatibility with existing single-cleaner records.
