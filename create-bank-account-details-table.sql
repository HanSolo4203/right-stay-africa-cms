-- Bank Account Details table for Right Stay Africa CMS
-- Run this SQL in your Supabase SQL Editor

-- Bank Account Details table
CREATE TABLE IF NOT EXISTS bank_account_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_name TEXT NOT NULL, -- e.g., "Main Account", "Business Account"
    beneficiary_name TEXT NOT NULL, -- e.g., "Right Stay (PTY) LTD"
    account_number TEXT NOT NULL,
    branch_code TEXT NOT NULL,
    bank_name TEXT NOT NULL, -- e.g., "First National Bank (FNB/RMB)"
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_bank_account_details_is_active'
    ) THEN
        CREATE INDEX idx_bank_account_details_is_active ON bank_account_details(is_active);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_bank_account_details_is_default'
    ) THEN
        CREATE INDEX idx_bank_account_details_is_default ON bank_account_details(is_default);
    END IF;
END $$;

-- Insert default bank account (if not exists)
-- Only insert if no bank accounts exist yet
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM bank_account_details LIMIT 1) THEN
        INSERT INTO bank_account_details (account_name, beneficiary_name, account_number, branch_code, bank_name, is_default, is_active)
        VALUES (
            'Main Account',
            'Right Stay (PTY) LTD',
            '63120936985',
            '250655',
            'First National Bank (FNB/RMB)',
            true,
            true
        );
    END IF;
END $$;

-- Add bank_account_id column to invoices table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'bank_account_id'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN bank_account_id UUID REFERENCES bank_account_details(id) ON DELETE SET NULL;
        
        -- Create index (if it doesn't exist)
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_invoices_bank_account_id'
        ) THEN
            CREATE INDEX idx_invoices_bank_account_id ON invoices(bank_account_id);
        END IF;
        
        -- Set default bank account for existing invoices
        UPDATE invoices 
        SET bank_account_id = (SELECT id FROM bank_account_details WHERE is_default = true LIMIT 1)
        WHERE bank_account_id IS NULL;
    END IF;
END $$;

