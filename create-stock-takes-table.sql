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
