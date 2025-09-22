-- Create RSA Laundry Room Expenses Table
-- Run this in your Supabase SQL Editor

-- 1. Create the RSA laundry expenses table
CREATE TABLE IF NOT EXISTS rsa_laundry_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES internal_assets(id) ON DELETE CASCADE,
    cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    daily_payment_amount DECIMAL(10,2) NOT NULL,
    service_description TEXT,
    notes TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rsa_laundry_expenses_asset_id ON rsa_laundry_expenses(asset_id);
CREATE INDEX IF NOT EXISTS idx_rsa_laundry_expenses_cleaner_id ON rsa_laundry_expenses(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_rsa_laundry_expenses_service_date ON rsa_laundry_expenses(service_date);
CREATE INDEX IF NOT EXISTS idx_rsa_laundry_expenses_is_paid ON rsa_laundry_expenses(is_paid);

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_rsa_laundry_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rsa_laundry_expenses_updated_at ON rsa_laundry_expenses;
CREATE TRIGGER update_rsa_laundry_expenses_updated_at
    BEFORE UPDATE ON rsa_laundry_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_rsa_laundry_expenses_updated_at();

-- 4. Set up Row-Level Security
ALTER TABLE rsa_laundry_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON rsa_laundry_expenses
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Grant permissions
GRANT ALL ON rsa_laundry_expenses TO authenticated;

-- 6. Create a view for detailed RSA laundry expenses
CREATE OR REPLACE VIEW rsa_laundry_expenses_detailed AS
SELECT 
    rle.id,
    rle.asset_id,
    rle.cleaner_id,
    rle.service_date,
    rle.daily_payment_amount,
    rle.service_description,
    rle.notes,
    rle.is_paid,
    rle.payment_date,
    rle.created_at,
    rle.updated_at,
    -- Asset details
    ia.asset_name,
    ia.asset_type,
    ia.owner_name as asset_owner,
    ia.location as asset_location,
    -- Cleaner details
    c.name as cleaner_name,
    c.phone as cleaner_phone,
    c.email as cleaner_email
FROM rsa_laundry_expenses rle
JOIN internal_assets ia ON rle.asset_id = ia.id
JOIN cleaners c ON rle.cleaner_id = c.id;

-- 7. Grant permissions on the view
GRANT SELECT ON rsa_laundry_expenses_detailed TO authenticated;

-- 8. Create helper functions
CREATE OR REPLACE FUNCTION get_rsa_laundry_room_id()
RETURNS UUID AS $$
DECLARE
    asset_id UUID;
BEGIN
    SELECT id INTO asset_id 
    FROM internal_assets 
    WHERE asset_name = 'RSA Laundry Room' 
    AND COALESCE(is_active, true) = true
    LIMIT 1;
    
    RETURN asset_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_rsa_laundry_expense(
    p_cleaner_id UUID,
    p_service_date DATE,
    p_daily_payment_amount DECIMAL(10,2),
    p_service_description TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    expense_id UUID;
    laundry_room_id UUID;
BEGIN
    -- Get RSA Laundry Room ID
    SELECT get_rsa_laundry_room_id() INTO laundry_room_id;
    
    IF laundry_room_id IS NULL THEN
        RAISE EXCEPTION 'RSA Laundry Room asset not found';
    END IF;
    
    -- Insert the expense record
    INSERT INTO rsa_laundry_expenses (
        asset_id,
        cleaner_id,
        service_date,
        daily_payment_amount,
        service_description,
        notes
    ) VALUES (
        laundry_room_id,
        p_cleaner_id,
        p_service_date,
        p_daily_payment_amount,
        p_service_description,
        p_notes
    ) RETURNING id INTO expense_id;
    
    RETURN expense_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Add comments for documentation
COMMENT ON TABLE rsa_laundry_expenses IS 'Records expenses and cleaner payments for RSA Laundry Room services';
COMMENT ON COLUMN rsa_laundry_expenses.asset_id IS 'References internal_assets.id (RSA Laundry Room)';
COMMENT ON COLUMN rsa_laundry_expenses.cleaner_id IS 'References cleaners.id';
COMMENT ON COLUMN rsa_laundry_expenses.daily_payment_amount IS 'Amount paid to cleaner for the service';
COMMENT ON COLUMN rsa_laundry_expenses.is_paid IS 'Whether the payment has been made to the cleaner';
COMMENT ON FUNCTION get_rsa_laundry_room_id() IS 'Returns the UUID of the RSA Laundry Room asset';
COMMENT ON FUNCTION create_rsa_laundry_expense(UUID, DATE, DECIMAL, TEXT, TEXT) IS 'Creates a new RSA laundry expense record';

-- 10. Insert sample data (optional - remove if not needed)
-- INSERT INTO rsa_laundry_expenses (asset_id, cleaner_id, service_date, daily_payment_amount, service_description, notes)
-- SELECT 
--     get_rsa_laundry_room_id(),
--     c.id,
--     CURRENT_DATE,
--     200.00,
--     'Daily laundry service',
--     'Sample expense record'
-- FROM cleaners c
-- WHERE c.name = 'Wowo'
-- LIMIT 1;

-- 11. Verification
SELECT 'RSA Laundry Expenses table created successfully!' as status;
SELECT COUNT(*) as total_rsa_expenses FROM rsa_laundry_expenses;
SELECT COUNT(*) as total_rsa_laundry_room_assets FROM internal_assets WHERE asset_name = 'RSA Laundry Room';
