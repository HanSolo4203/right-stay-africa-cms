-- Create a function to properly update cleaning sessions with null values
-- This handles the case where we need to set cleaner_2 fields to NULL

CREATE OR REPLACE FUNCTION update_cleaning_session_with_null_cleaner_2(
  session_id UUID,
  update_data JSONB
) RETURNS cleaning_sessions AS $$
DECLARE
  result cleaning_sessions;
BEGIN
  -- Build the update query dynamically
  UPDATE cleaning_sessions 
  SET 
    apartment_id = COALESCE((update_data->>'apartment_id')::UUID, apartment_id),
    cleaner_id = COALESCE((update_data->>'cleaner_id')::UUID, cleaner_id),
    cleaner_2_id = CASE 
      WHEN update_data->>'cleaner_2_id' = 'null' OR update_data->>'cleaner_2_id' IS NULL 
      THEN NULL 
      ELSE (update_data->>'cleaner_2_id')::UUID 
    END,
    cleaning_date = COALESCE((update_data->>'cleaning_date')::DATE, cleaning_date),
    notes = COALESCE(update_data->>'notes', notes),
    price = COALESCE((update_data->>'price')::DECIMAL, price),
    welcome_pack_fee = COALESCE((update_data->>'welcome_pack_fee')::DECIMAL, welcome_pack_fee),
    cleaner_1_name = COALESCE(update_data->>'cleaner_1_name', cleaner_1_name),
    cleaner_2_name = CASE 
      WHEN update_data->>'cleaner_2_name' = 'null' OR update_data->>'cleaner_2_name' IS NULL 
      THEN NULL 
      ELSE update_data->>'cleaner_2_name' 
    END,
    cleaner_1_fee = COALESCE((update_data->>'cleaner_1_fee')::DECIMAL, cleaner_1_fee),
    cleaner_2_fee = CASE 
      WHEN update_data->>'cleaner_2_fee' = 'null' OR update_data->>'cleaner_2_fee' IS NULL 
      THEN NULL 
      ELSE (update_data->>'cleaner_2_fee')::DECIMAL 
    END,
    total_cleaning_fee = COALESCE((update_data->>'total_cleaning_fee')::DECIMAL, total_cleaning_fee),
    is_multi_cleaner = COALESCE((update_data->>'is_multi_cleaner')::BOOLEAN, is_multi_cleaner),
    cleaner_count = COALESCE((update_data->>'cleaner_count')::INTEGER, cleaner_count),
    property_category = COALESCE(update_data->>'property_category', property_category),
    property_id = COALESCE((update_data->>'property_id')::UUID, property_id),
    updated_at = NOW()
  WHERE id = session_id
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_cleaning_session_with_null_cleaner_2(UUID, JSONB) TO authenticated;
