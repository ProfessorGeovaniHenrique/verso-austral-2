
-- ============================================
-- SECURITY FIXES: 3 Critical Issues (Retry)
-- ============================================

-- ============================================
-- 1. SONGS TABLE - Restrict to authenticated users only
-- ============================================

-- Drop ALL existing policies on songs table first
DROP POLICY IF EXISTS "Allow all access" ON public.songs;
DROP POLICY IF EXISTS "Public can read songs" ON public.songs;
DROP POLICY IF EXISTS "Anyone can read songs" ON public.songs;
DROP POLICY IF EXISTS "Songs are publicly readable" ON public.songs;
DROP POLICY IF EXISTS "Authenticated users can read songs" ON public.songs;
DROP POLICY IF EXISTS "Admins have full access to songs" ON public.songs;
DROP POLICY IF EXISTS "Service can insert songs" ON public.songs;
DROP POLICY IF EXISTS "Service can update songs" ON public.songs;

-- Ensure RLS is enabled
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read songs (researchers)
CREATE POLICY "Authenticated users can read songs"
ON public.songs
FOR SELECT
TO authenticated
USING (true);

-- Admins have full access
CREATE POLICY "Admins have full access to songs"
ON public.songs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. ANALYTICS_USER_SESSIONS - Fix UPDATE policy
-- ============================================

-- Drop the permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.analytics_user_sessions;

-- Create proper UPDATE policy with ownership verification
CREATE POLICY "Users can update their own sessions"
ON public.analytics_user_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. ANNOTATION_DEBUG_LOGS - Admin only access
-- ============================================

-- Drop any existing public SELECT policies
DROP POLICY IF EXISTS "Debug logs são públicos para leitura" ON public.annotation_debug_logs;
DROP POLICY IF EXISTS "Permitir leitura de debug logs" ON public.annotation_debug_logs;

-- ============================================
-- Add security comments
-- ============================================

COMMENT ON TABLE public.songs IS 
'Music catalog with lyrics and metadata.
SECURITY: Contains copyrighted lyrics - access restricted to authenticated researchers only.
- SELECT: Authenticated users only
- ALL: Admins only';

COMMENT ON TABLE public.analytics_user_sessions IS 
'User session tracking for analytics.
SECURITY: Session ownership verified on UPDATE to prevent cross-user modification.';
