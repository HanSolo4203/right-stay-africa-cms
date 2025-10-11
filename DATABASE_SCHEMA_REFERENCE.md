# Right Stay Africa CMS - Database Schema Reference

**Database URL**: `https://kmkfrzahmvqvidyhjgmo.supabase.co`  
**Project**: Right Stay Africa CMS  
**Last Updated**: Current session

## 📊 Core Tables & Relationships

### 🏠 Property Management

#### `apartments` (7 rows)
- **Primary Key**: `id` (UUID)
- **Key Fields**: `apartment_number` (unique), `owner_name`, `owner_email`, `address`
- **Financial**: `cleaner_payout`, `welcome_pack_fee`
- **Relationships**: 
  - Referenced by `cleaning_sessions.apartment_id`

#### `internal_assets` (1 row)
- **Primary Key**: `id` (UUID)
- **Purpose**: RSA business assets (laundry room, etc.)
- **Key Fields**: `asset_name` (unique), `asset_type`, `owner_name`, `daily_payment_rate`, `cleaner_payout`
- **Asset Types**: `LAUNDRY_SERVICE`, `MAINTENANCE_SERVICE`, `OTHER_SERVICE`
- **Relationships**:
  - Referenced by `rsa_laundry_expenses.asset_id`

#### `rsa_laundry_assets` (1 row)
- **Primary Key**: `id` (UUID)
- **Purpose**: RSA laundry service assets
- **Similar structure to `internal_assets`**

### 🧹 Cleaning Operations

#### `cleaners` (2 rows)
- **Primary Key**: `id` (UUID)
- **Key Fields**: `name`, `phone`, `email`
- **Relationships**:
  - Referenced by `cleaning_sessions.cleaner_id` (primary cleaner)
  - Referenced by `cleaning_sessions.cleaner_2_id` (secondary cleaner)
  - Referenced by `rsa_laundry_expenses.cleaner_id`

#### `cleaning_sessions` (30 rows) - **MAIN TABLE**
- **Primary Key**: `id` (UUID)
- **Core Fields**: `cleaning_date`, `notes`, `price`
- **Property System**:
  - `property_category`: `'apartment'` | `'internal_asset'`
  - `property_id`: UUID (references apartment or asset)
  - `apartment_id`: UUID → `apartments.id`
- **Multi-Cleaner Support**:
  - `cleaner_id`: UUID → `cleaners.id` (primary)
  - `cleaner_2_id`: UUID → `cleaners.id` (secondary)
  - `cleaner_1_name`, `cleaner_2_name`: Denormalized names
  - `cleaner_1_fee`, `cleaner_2_fee`: Individual fees
  - `total_cleaning_fee`: Sum of all cleaner fees
  - `is_multi_cleaner`: Boolean flag
  - `cleaner_count`: Number of cleaners (1 or 2)
- **Welcome Pack Integration**: `welcome_pack_fee`
- **RLS**: Disabled (rls_enabled: false)

#### `cleaning_sessions_backup_welcomefee` (2 rows)
- **Purpose**: Backup table for welcome fee data

### 💰 Financial & Expense Tracking

#### `rsa_laundry_expenses` (2 rows)
- **Primary Key**: `id` (UUID)
- **Key Fields**: `service_date`, `daily_payment_amount`, `service_description`
- **Payment Tracking**: `is_paid`, `payment_date`
- **Relationships**:
  - `asset_id`: UUID → `internal_assets.id`
  - `cleaner_id`: UUID → `cleaners.id`

#### `welcome_pack_items` (2 rows)
- **Primary Key**: `id` (UUID)
- **Key Fields**: `name`, `price`, `is_active`
- **Purpose**: Welcome pack item pricing

### ⚙️ System Configuration

#### `app_settings` (2 rows)
- **Primary Key**: `key` (TEXT)
- **Fields**: `value` (numeric), `text_value`, `updated_at`
- **Purpose**: Application-wide settings

## 📋 Views & Reporting

### `all_schedulable_properties`
- **Purpose**: View of all properties that can be scheduled for cleaning

### `cleaning_sessions_detailed`
- **Purpose**: Enhanced cleaning session view with related data

### `rsa_laundry_expenses_detailed`
- **Purpose**: Enhanced expense reporting view

## 🔗 Key Relationships Summary

```
apartments (1) ←→ (many) cleaning_sessions
cleaners (1) ←→ (many) cleaning_sessions (as cleaner_id)
cleaners (1) ←→ (many) cleaning_sessions (as cleaner_2_id)
cleaners (1) ←→ (many) rsa_laundry_expenses
internal_assets (1) ←→ (many) rsa_laundry_expenses
```

## 🚀 Key Features

### Multi-Cleaner Support
- Single session can have 1-2 cleaners
- Individual fee tracking per cleaner
- Total fee calculation
- Denormalized cleaner names for performance

### Property System
- Supports both apartments and internal assets
- Property categorization system
- Unified scheduling through views

### Welcome Pack Integration
- Welcome pack fees at apartment level
- Welcome pack fees at session level
- Welcome pack item catalog

### RSA Laundry Service
- Dedicated asset management
- Expense tracking for laundry services
- Cleaner payment tracking

### Security
- Row Level Security (RLS) enabled on most tables
- `cleaning_sessions` has RLS disabled (admin access)

## 🛠️ Development Notes

- All tables use UUID primary keys with `gen_random_uuid()`
- Standard `created_at`, `updated_at` timestamps
- Foreign key constraints properly defined
- Check constraints for enum-like fields
- Comments on complex fields for documentation

## 📈 Current Data Volumes
- Apartments: 7
- Cleaners: 2  
- Cleaning Sessions: 30
- Internal Assets: 1
- RSA Laundry Assets: 1
- RSA Laundry Expenses: 2
- Welcome Pack Items: 2
- App Settings: 2
