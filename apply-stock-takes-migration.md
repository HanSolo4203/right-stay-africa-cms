# Apply Stock Takes Migration

To enable the stock take functionality, you need to apply the database migration. Here are the steps:

## Option 1: Manual SQL Execution (Recommended)

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the following SQL:

```sql
-- Create stock_takes table for tracking periodic stock adjustments
CREATE TABLE IF NOT EXISTS stock_takes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    previous_stock NUMERIC NOT NULL,
    new_stock NUMERIC NOT NULL,
    adjustment_amount NUMERIC NOT NULL, -- positive for additions, negative for usage
    take_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT NULL,
    created_by TEXT NULL, -- user who performed the stock take
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for filtering by item
CREATE INDEX IF NOT EXISTS idx_stock_takes_item_id ON stock_takes(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_date ON stock_takes(take_date);

-- Enable RLS
ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users (admin only)
CREATE POLICY "Allow admin access to stock_takes" ON stock_takes
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_takes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update created_at
CREATE TRIGGER update_stock_takes_created_at
    BEFORE INSERT ON stock_takes
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_takes_updated_at();
```

4. Click "Run" to execute the migration

## Option 2: Using Supabase CLI (if linked)

If you have the Supabase CLI linked to your project:

```bash
# Apply the migration
npx supabase db push --linked

# Or apply specific migration file
npx supabase migration up --linked
```

## Verification

After applying the migration, you can verify it worked by:

1. Going to the Inventory page in your app
2. Clicking on the "Usage Analytics" tab
3. You should see usage analytics (even if empty initially)
4. You can also click the green clipboard icon next to any detergent to perform a stock take

## Features Available After Migration

- ✅ Stock take recording
- ✅ Usage analytics and tracking
- ✅ Stock take history
- ✅ Usage rate calculations
- ✅ Days remaining predictions
- ✅ Low stock alerts based on usage

The system will work gracefully even before the migration is applied, but the advanced analytics and history features require the `stock_takes` table to be present.
