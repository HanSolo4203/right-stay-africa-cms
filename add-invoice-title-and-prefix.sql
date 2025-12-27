-- Add invoice_title, client_prefix, and subject_description columns to invoices table
-- Run this SQL in your Supabase SQL Editor

DO $$ 
BEGIN
    -- Add invoice_title column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_title'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN invoice_title TEXT;
        
        -- Set default value for existing invoices
        UPDATE invoices 
        SET invoice_title = 'Right Stay Service Invoice'
        WHERE invoice_title IS NULL;
    END IF;
    
    -- Add client_prefix column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'client_prefix'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN client_prefix TEXT;
    END IF;
    
    -- Add subject_description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'subject_description'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN subject_description TEXT;
    END IF;
END $$;

