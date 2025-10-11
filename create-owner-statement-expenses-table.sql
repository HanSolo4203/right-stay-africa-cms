-- Create table to store owner statement expenses and commission rates
-- This allows saving expense data per property per statement period

CREATE TABLE IF NOT EXISTS owner_statement_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_name TEXT NOT NULL,
    expenses JSONB NOT NULL DEFAULT '[]'::jsonb,
    commission_rate NUMERIC(5,2) DEFAULT 0.00,
    statement_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(property_name, statement_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_owner_statement_expenses_property ON owner_statement_expenses(property_name);
CREATE INDEX IF NOT EXISTS idx_owner_statement_expenses_date ON owner_statement_expenses(statement_date);
CREATE INDEX IF NOT EXISTS idx_owner_statement_expenses_property_date ON owner_statement_expenses(property_name, statement_date);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_owner_statement_expenses_updated_at ON owner_statement_expenses;
CREATE TRIGGER update_owner_statement_expenses_updated_at 
    BEFORE UPDATE ON owner_statement_expenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE owner_statement_expenses IS 
'Stores additional expenses and commission rates for owner statements.
Expenses are stored as JSONB array with format: [{"name": "Cleaning", "quantity": 3, "price": 250.00}]';

-- Enable RLS
ALTER TABLE owner_statement_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to view owner_statement_expenses" ON owner_statement_expenses;
CREATE POLICY "Allow authenticated users to view owner_statement_expenses" 
ON owner_statement_expenses FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert owner_statement_expenses" ON owner_statement_expenses;
CREATE POLICY "Allow authenticated users to insert owner_statement_expenses" 
ON owner_statement_expenses FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update owner_statement_expenses" ON owner_statement_expenses;
CREATE POLICY "Allow authenticated users to update owner_statement_expenses" 
ON owner_statement_expenses FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete owner_statement_expenses" ON owner_statement_expenses;
CREATE POLICY "Allow authenticated users to delete owner_statement_expenses" 
ON owner_statement_expenses FOR DELETE 
TO authenticated 
USING (true);

-- Service role policy
DROP POLICY IF EXISTS "Allow service role full access to owner_statement_expenses" ON owner_statement_expenses;
CREATE POLICY "Allow service role full access to owner_statement_expenses" 
ON owner_statement_expenses FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- Sample data structure (for reference)
-- INSERT INTO owner_statement_expenses (property_name, expenses, commission_rate, statement_date) VALUES
-- ('126709', '[{"name": "Cleaning Fees", "quantity": 3, "price": 250.00}, {"name": "Welcome Pack", "quantity": 2, "price": 80.00}]'::jsonb, 17.5, '2025-09-30');

