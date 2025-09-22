# RSA Laundry Service Asset Documentation

## Overview

This document describes the implementation of the RSA Laundry Service as a separate asset table in the Right Stay Africa Cleaning Management System. The RSA Laundry Room is treated as a business asset owned by Right Stay Africa, separate from rental apartments.

## Database Schema Changes

### New Table: `rsa_laundry_assets`

A completely separate table for RSA business assets with the following structure:

1. **`id`** (UUID)
   - Primary key for the asset

2. **`asset_name`** (TEXT)
   - Name of the business asset (e.g., "RSA Laundry Room")
   - NOT NULL constraint

3. **`asset_type`** (TEXT)
   - Values: `'LAUNDRY_SERVICE'`, `'MAINTENANCE_SERVICE'`, or `'OTHER_SERVICE'`
   - Default: `'LAUNDRY_SERVICE'`
   - CHECK constraint ensures valid values

4. **`owner_name`** (TEXT)
   - Owner of the asset (typically "Right Stay Africa")
   - Default: "Right Stay Africa"

5. **`owner_email`** (TEXT)
   - Contact email for the asset owner
   - Default: "admin@rightstayafrica.com"

6. **`location`** (TEXT)
   - Physical location of the asset

7. **`daily_payment_rate`** (DECIMAL(10,2))
   - Daily payment rate for services provided by this asset
   - NOT NULL constraint
   - Example: R200.00 per day for laundry services

8. **`service_description`** (TEXT)
   - Description of the service provided by this asset

9. **`cleaner_payout`** (DECIMAL(10,2))
   - Amount paid to cleaners for services at this asset
   - NOT NULL constraint

10. **`is_active`** (BOOLEAN)
    - Whether this asset is currently active and available for scheduling
    - Default: TRUE

11. **`created_at`** (TIMESTAMP WITH TIME ZONE)
    - Record creation timestamp

12. **`updated_at`** (TIMESTAMP WITH TIME ZONE)
    - Record last update timestamp

### Database Constraints

- **Asset Type Constraint**: Ensures valid asset types
- **Required Fields**: Asset name, daily payment rate, and cleaner payout are required
- **Active Status**: Assets can be deactivated without deletion

### New Database Functions

1. **`get_active_rsa_laundry_assets()`**
   - Returns all active RSA laundry assets

2. **`get_rsa_laundry_assets_by_type(asset_type_param)`**
   - Returns RSA laundry assets filtered by type

3. **`all_schedulable_properties`** (VIEW)
   - Combines apartments and RSA assets for unified scheduling

## RSA Laundry Room Configuration

The RSA Laundry Room is automatically created in the new `rsa_laundry_assets` table with the following configuration:

```sql
INSERT INTO rsa_laundry_assets (
    asset_name: 'RSA Laundry Room',
    asset_type: 'LAUNDRY_SERVICE',
    owner_name: 'Right Stay Africa',
    owner_email: 'admin@rightstayafrica.com',
    location: 'Internal Business Space',
    daily_payment_rate: 200.00,
    service_description: 'Internal laundry service for Right Stay Africa properties',
    cleaner_payout: 200.00,
    is_active: TRUE
);
```

## TypeScript Interface Updates

### New `RSALaundryAsset` Interface

```typescript
export interface RSALaundryAsset {
  id: string;
  asset_name: string;
  asset_type: 'LAUNDRY_SERVICE' | 'MAINTENANCE_SERVICE' | 'OTHER_SERVICE';
  owner_name: string;
  owner_email?: string;
  location?: string;
  daily_payment_rate: number;
  service_description?: string;
  cleaner_payout: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### New `SchedulableProperty` Interface

```typescript
export interface SchedulableProperty {
  property_category: 'apartment' | 'rsa_asset';
  id: string;
  property_name: string;
  owner_name: string;
  owner_email?: string;
  location?: string;
  cleaner_payout?: number;
  asset_type?: string;
  service_description?: string;
  daily_payment_rate?: number;
}
```

### Unchanged `Apartment` Interface

The `Apartment` interface remains unchanged, maintaining separation between rental apartments and business assets.

## Utility Functions

The `property-utils.ts` file provides utility functions:

- `isRSALaundryAsset()` - Check if property is an RSA laundry asset
- `isRegularApartment()` - Check if property is a regular apartment
- `isLaundryService()` - Check if RSA asset is a laundry service
- `isActiveAsset()` - Check if RSA asset is active
- `getPropertyDisplayName()` - Get display name (without "Apartment" prefix for RSA assets)
- `getAssetTypeDisplayName()` - Get asset type display name
- `getDailyPaymentRate()` - Get daily payment rate for RSA assets
- `requiresDailyPaymentTracking()` - Check if property requires daily payment tracking
- `getRSALaundryAssets()` - Get RSA laundry assets from a list
- `getActiveRSALaundryAssets()` - Get active RSA laundry assets
- `isRSALaundryRoom()` - Check if property name is "RSA Laundry Room"

## UI/UX Changes

### Display Logic

- **RSA Laundry Assets**: Display as asset name (e.g., "RSA Laundry Room") without "Apartment" prefix
- **Regular Apartments**: Display as "Apartment [number]"

### Scheduling

- RSA Laundry Assets can be selected in cleaning session scheduling
- Unified view combines apartments and RSA assets for scheduling
- Tracks daily payments to cleaners for asset services

### Analytics

- RSA assets are tracked separately from rental apartments
- Daily payment rates are included in financial reporting
- Asset services are distinguished from customer properties

## Migration Instructions

1. **Run the Migration**: Execute `add-rsa-laundry-service.sql` in your Supabase SQL editor
2. **Update Application**: The TypeScript types are already updated
3. **Verify Data**: Check that RSA Laundry Room appears in the new `rsa_laundry_assets` table
4. **Test Scheduling**: Verify RSA Laundry Room can be selected for cleaning sessions via the unified view

## Business Logic

### Asset Classification

- **Regular Apartments**: Customer rental units with standard cleaning services
- **RSA Laundry Assets**: Internal business assets with daily payment tracking

### Financial Tracking

- **Customer Properties**: Revenue from cleaning services
- **Business Assets**: Daily payments to cleaners for asset services
- **Cost Tracking**: Separate tracking for business assets

### Reporting

- RSA assets are included in analytics but tracked separately from apartments
- Daily payment rates are tracked for financial reporting
- Service descriptions provide context for business assets

## Future Enhancements

1. **Additional Asset Types**: Framework supports adding more business asset types
2. **Service Categories**: Could extend to different types of business services
3. **Payment Tracking**: Enhanced tracking for different payment models
4. **Reporting**: Specialized reports for business assets

## Validation Rules

1. **Asset Type Consistency**: Valid asset types are enforced by database constraints
2. **Daily Payment Rate**: Required for all RSA assets
3. **Service Description**: Recommended for business assets
4. **Owner Information**: RSA assets owned by Right Stay Africa
5. **Active Status**: Assets can be deactivated without deletion

This implementation provides a robust foundation for managing business assets while maintaining clear separation from customer rental properties through a dedicated table structure.
