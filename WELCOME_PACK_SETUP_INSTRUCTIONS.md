# Welcome Pack Setup Instructions

## Database Setup

Before using the welcome pack feature, you need to run the following SQL script in your Supabase SQL Editor:

```sql
-- Create welcome pack items table for multiple welcome pack options
CREATE TABLE IF NOT EXISTS welcome_pack_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger for welcome_pack_items
CREATE TRIGGER update_welcome_pack_items_updated_at 
    BEFORE UPDATE ON welcome_pack_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default welcome pack item
INSERT INTO welcome_pack_items (name, price, is_active)
VALUES ('Welcome Pack', 80.00, TRUE)
ON CONFLICT DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_welcome_pack_items_active ON welcome_pack_items(is_active);
```

## What's Been Added

1. **New Welcome Pack Tab**: Added a "Welcome Pack" tab to the settings page
2. **Multiple Welcome Pack Items**: Users can add, edit, and delete multiple welcome pack items
3. **Database Table**: New `welcome_pack_items` table to store multiple welcome pack options
4. **API Endpoints**: Full CRUD operations for welcome pack items
5. **Active/Inactive Status**: Each welcome pack item can be marked as active or inactive

## Features

- **Add New Items**: Create new welcome pack items with name and price
- **Edit Existing Items**: Modify name, price, and active status of existing items
- **Delete Items**: Remove welcome pack items with confirmation
- **Active/Inactive Status**: Toggle items between active and inactive states
- **Real-time Updates**: Loading states and toast notifications
- **Responsive Design**: Works on all screen sizes
- **Empty State**: Helpful message when no items exist

## Usage

1. Navigate to Settings page
2. Click on the "Welcome Pack" tab
3. Click "Add Welcome Pack" to create a new item
4. Fill in the name and price, set active status
5. Use Edit/Delete buttons on existing items to manage them

## API Endpoints

- `GET /api/settings/welcome-pack` - Get all welcome pack items
- `POST /api/settings/welcome-pack` - Create a new welcome pack item
- `PUT /api/settings/welcome-pack/[id]` - Update an existing welcome pack item
- `DELETE /api/settings/welcome-pack/[id]` - Delete a welcome pack item

## Database Schema

The `welcome_pack_items` table contains:
- `id`: UUID primary key
- `name`: Text name of the welcome pack
- `price`: Decimal price in Rands
- `is_active`: Boolean status (active/inactive)
- `created_at`: Timestamp when created
- `updated_at`: Timestamp when last updated
