
-- ============================================
-- SECURITY FIX: Invite Keys Token Expiration
-- ============================================

-- 1. Set default expiration of 7 days for new invite keys
ALTER TABLE public.invite_keys 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- 2. Create function to auto-expire magic_link_token after 24 hours
CREATE OR REPLACE FUNCTION public.set_magic_link_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When magic_link_token is set, ensure key expires in 24 hours (or sooner if already set)
  IF NEW.magic_link_token IS NOT NULL AND OLD.magic_link_token IS NULL THEN
    NEW.magic_link_sent_at = now();
    -- If no expiry set or expiry is more than 24h away, set to 24h
    IF NEW.expires_at IS NULL OR NEW.expires_at > (now() + interval '24 hours') THEN
      NEW.expires_at = now() + interval '24 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Create trigger to enforce magic link expiration
DROP TRIGGER IF EXISTS enforce_magic_link_expiry ON public.invite_keys;
CREATE TRIGGER enforce_magic_link_expiry
  BEFORE UPDATE ON public.invite_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.set_magic_link_expiry();

-- 4. Update existing invite keys without expiration (set to 7 days from now)
UPDATE public.invite_keys 
SET expires_at = now() + interval '7 days'
WHERE expires_at IS NULL 
  AND is_active = true 
  AND used_at IS NULL;

-- 5. Deactivate any invite keys with magic_link_token older than 24 hours
UPDATE public.invite_keys
SET is_active = false
WHERE magic_link_token IS NOT NULL
  AND magic_link_sent_at IS NOT NULL
  AND magic_link_sent_at < (now() - interval '24 hours')
  AND is_active = true;

-- 6. Drop the overly permissive "Users can use invite keys" policy and replace with stricter version
DROP POLICY IF EXISTS "Users can use invite keys" ON public.invite_keys;

CREATE POLICY "Users can claim valid invite keys"
ON public.invite_keys
FOR UPDATE
TO authenticated
USING (
  -- Key must be active
  is_active = true
  -- Key must not be used
  AND used_at IS NULL
  -- Key must not be expired
  AND (expires_at IS NOT NULL AND expires_at > now())
  -- If magic_link_token exists, it must be within 24 hours
  AND (
    magic_link_token IS NULL 
    OR (magic_link_sent_at IS NOT NULL AND magic_link_sent_at > (now() - interval '24 hours'))
  )
)
WITH CHECK (
  -- User can only set used_by to themselves
  used_by = auth.uid()
  -- And must set used_at
  AND used_at IS NOT NULL
);

-- 7. Add comment documenting security measures
COMMENT ON TABLE public.invite_keys IS 
'Invite keys for user registration. Security measures:
- expires_at: defaults to 7 days from creation
- magic_link_token: auto-expires 24 hours after being set
- Single-use: once used_at is set, key cannot be reused
- is_active: can be manually deactivated by admins';
