-- Right Stay Africa Cleaning Management System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Apartments table
CREATE TABLE apartments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    apartment_number TEXT UNIQUE NOT NULL,
    owner_name TEXT NOT NULL,
    owner_email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cleaners table
CREATE TABLE cleaners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cleaning sessions table
CREATE TABLE cleaning_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    cleaner_id UUID REFERENCES cleaners(id) ON DELETE CASCADE,
    cleaning_date DATE NOT NULL,
    notes TEXT,
    price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_apartments_apartment_number ON apartments(apartment_number);
CREATE INDEX idx_cleaners_name ON cleaners(name);
CREATE INDEX idx_cleaning_sessions_date ON cleaning_sessions(cleaning_date);
CREATE INDEX idx_cleaning_sessions_apartment ON cleaning_sessions(apartment_id);
CREATE INDEX idx_cleaning_sessions_cleaner ON cleaning_sessions(cleaner_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_apartments_updated_at 
    BEFORE UPDATE ON apartments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cleaners_updated_at 
    BEFORE UPDATE ON cleaners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cleaning_sessions_updated_at 
    BEFORE UPDATE ON cleaning_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO apartments (apartment_number, owner_name, owner_email, address) VALUES
('101', 'John Smith', 'john.smith@email.com', '123 Main Street, Cape Town'),
('102', 'Sarah Johnson', 'sarah.johnson@email.com', '123 Main Street, Cape Town'),
('201', 'Mike Chen', 'mike.chen@email.com', '123 Main Street, Cape Town'),
('202', 'Emma Davis', 'emma.davis@email.com', '123 Main Street, Cape Town'),
('301', 'Lisa Brown', 'lisa.brown@email.com', '123 Main Street, Cape Town');

INSERT INTO cleaners (name, phone, email) VALUES
('Alice Wilson', '+27 82 123 4567', 'alice.wilson@email.com'),
('Bob Thompson', '+27 83 234 5678', 'bob.thompson@email.com'),
('Carol Martinez', '+27 84 345 6789', 'carol.martinez@email.com'),
('David Lee', '+27 85 456 7890', 'david.lee@email.com'),
('Eva Garcia', '+27 86 567 8901', 'eva.garcia@email.com');

INSERT INTO cleaning_sessions (apartment_id, cleaner_id, cleaning_date, notes, price) VALUES
((SELECT id FROM apartments WHERE apartment_number = '101'), (SELECT id FROM cleaners WHERE name = 'Alice Wilson'), '2024-01-15', 'Regular weekly cleaning', 150.00),
((SELECT id FROM apartments WHERE apartment_number = '102'), (SELECT id FROM cleaners WHERE name = 'Bob Thompson'), '2024-01-15', 'Deep cleaning after move-out', 200.00),
((SELECT id FROM apartments WHERE apartment_number = '201'), (SELECT id FROM cleaners WHERE name = 'Carol Martinez'), '2024-01-16', 'Regular weekly cleaning', 150.00),
((SELECT id FROM apartments WHERE apartment_number = '202'), (SELECT id FROM cleaners WHERE name = 'David Lee'), '2024-01-16', 'Move-in cleaning', 180.00),
((SELECT id FROM apartments WHERE apartment_number = '301'), (SELECT id FROM cleaners WHERE name = 'Eva Garcia'), '2024-01-17', 'Regular weekly cleaning', 150.00);

-- Create a view for cleaning sessions with apartment and cleaner details
CREATE VIEW cleaning_sessions_detailed AS
SELECT 
    cs.id,
    cs.cleaning_date,
    cs.notes,
    cs.price,
    cs.created_at,
    cs.updated_at,
    a.apartment_number,
    a.owner_name,
    a.owner_email,
    a.address,
    c.name as cleaner_name,
    c.phone as cleaner_phone,
    c.email as cleaner_email
FROM cleaning_sessions cs
JOIN apartments a ON cs.apartment_id = a.id
JOIN cleaners c ON cs.cleaner_id = c.id;

-- Application settings table for configurable fees and options
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default Welcome Pack fee (in Rand)
INSERT INTO app_settings (key, value)
VALUES ('welcome_pack_fee', 80)
ON CONFLICT (key) DO NOTHING;

-- Grant necessary permissions (adjust based on your RLS policies)
-- ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cleaning_sessions ENABLE ROW LEVEL SECURITY;
