-- Fix: Set search_path for function security (using CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION update_dev_history_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;