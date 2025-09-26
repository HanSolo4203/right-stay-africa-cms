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
