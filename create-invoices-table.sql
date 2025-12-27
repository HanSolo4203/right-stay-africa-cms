-- Invoices table for Right Stay Africa CMS
-- Run this SQL in your Supabase SQL Editor

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL, -- e.g., 'RS-001', 'RS-002'
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    
    -- Invoice details
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    
    -- Client information
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    client_address TEXT,
    
    -- Financial details
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    
    -- Invoice items (stored as JSONB for flexibility)
    line_items JSONB DEFAULT '[]'::jsonb,
    
    -- Notes and terms
    notes TEXT,
    terms TEXT DEFAULT 'Due on Receipt',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_invoices_guest_id ON invoices(guest_id);
CREATE INDEX idx_invoices_apartment_id ON invoices(apartment_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Create updated_at trigger
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    invoice_number TEXT;
BEGIN
    -- Get the next sequential number
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoices.invoice_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_number
    FROM invoices
    WHERE invoices.invoice_number LIKE 'RS-%';
    
    -- Format as RS-XXX (3 digits with leading zeros)
    invoice_number := 'RS-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals(invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    invoice_record RECORD;
    subtotal DECIMAL(10,2) := 0;
    total_amount DECIMAL(10,2) := 0;
BEGIN
    -- Get the invoice record
    SELECT * INTO invoice_record FROM invoices WHERE id = invoice_id;
    
    -- Calculate subtotal from line items
    SELECT COALESCE(SUM((item->>'amount')::DECIMAL(10,2)), 0)
    INTO subtotal
    FROM jsonb_array_elements(invoice_record.line_items) AS item;
    
    -- Calculate total amount (subtotal + tax - discount)
    total_amount := subtotal + COALESCE(invoice_record.tax_amount, 0) - COALESCE(invoice_record.discount_amount, 0);
    
    -- Update the invoice
    UPDATE invoices 
    SET 
        subtotal = subtotal,
        total_amount = total_amount,
        updated_at = NOW()
    WHERE id = invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Insert sample invoice data
INSERT INTO invoices (
    invoice_number,
    booking_id,
    guest_id,
    apartment_id,
    invoice_date,
    due_date,
    status,
    client_name,
    client_email,
    client_phone,
    subtotal,
    total_amount,
    line_items,
    notes
) VALUES (
    'RS-001',
    (SELECT id FROM bookings LIMIT 1),
    (SELECT id FROM guests LIMIT 1),
    (SELECT id FROM apartments LIMIT 1),
    CURRENT_DATE,
    CURRENT_DATE,
    'draft',
    'Sample Guest',
    'guest@example.com',
    '+27 82 123 4567',
    4500.00,
    4500.00,
    '[
        {
            "description": "Unit 206 - Nightly Rate (19th October - 9th November) - Inclusive of cleaning days.",
            "quantity": 20,
            "rate": 4500.00,
            "amount": 90000.00
        }
    ]'::jsonb,
    'Thank you for your business.'
) ON CONFLICT (invoice_number) DO NOTHING;
