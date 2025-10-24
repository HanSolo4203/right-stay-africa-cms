-- Create inventory_items table for simple stock tracking
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('detergent', 'welcome_pack')),
    current_stock NUMERIC NOT NULL DEFAULT 0,
    unit_of_measure TEXT NOT NULL,
    min_stock_level NUMERIC NULL,
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for filtering by item_type
CREATE INDEX IF NOT EXISTS idx_inventory_items_type ON inventory_items(item_type);

-- Create index for active items
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users (admin only)
CREATE POLICY "Allow admin access to inventory_items" ON inventory_items
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_items_updated_at();

-- Add some sample data
INSERT INTO inventory_items (name, item_type, current_stock, unit_of_measure, min_stock_level, notes) VALUES
('Laundry Detergent', 'detergent', 15, 'bottles', 5, 'Main cleaning detergent for apartments'),
('Dish Soap', 'detergent', 8, 'bottles', 3, 'Kitchen dish washing soap'),
('All-Purpose Cleaner', 'detergent', 12, 'bottles', 4, 'Multi-surface cleaner'),
('Welcome Pack - Standard', 'welcome_pack', 25, 'packs', 10, 'Standard welcome pack for guests'),
('Welcome Pack - Premium', 'welcome_pack', 8, 'packs', 5, 'Premium welcome pack with extra items');
