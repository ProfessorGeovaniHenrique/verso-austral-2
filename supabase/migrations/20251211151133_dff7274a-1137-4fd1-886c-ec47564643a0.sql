
-- ============================================
-- SECURITY FIXES: Multiple tables from security scan
-- ============================================

-- ============================================
-- 1. edge_function_logs - Fix unrestricted INSERT
-- ============================================
DROP POLICY IF EXISTS "System can insert edge_function_logs" ON public.edge_function_logs;
-- Service role bypasses RLS, no need for explicit insert policy for authenticated users

-- ============================================
-- 2. analytics_events - Fix unrestricted INSERT
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert analytics_events" ON public.analytics_events;

-- Only authenticated users can insert their own events
CREATE POLICY "Authenticated users can insert analytics_events"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ============================================
-- 3. analytics_user_sessions - Fix unrestricted INSERT
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert analytics_user_sessions" ON public.analytics_user_sessions;

-- Only authenticated users can insert their own sessions
CREATE POLICY "Authenticated users can insert own sessions"
ON public.analytics_user_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ============================================
-- 4. semantic_consultant_conversations - Strengthen RLS
-- ============================================
DROP POLICY IF EXISTS "Users can read own conversations" ON public.semantic_consultant_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.semantic_consultant_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.semantic_consultant_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.semantic_consultant_conversations;

-- Ensure RLS is enabled
ALTER TABLE public.semantic_consultant_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users can read own conversations"
ON public.semantic_consultant_conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations"
ON public.semantic_consultant_conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
ON public.semantic_consultant_conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
ON public.semantic_consultant_conversations
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins have full access to conversations"
ON public.semantic_consultant_conversations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 5. gemini_api_usage - Fix unrestricted INSERT
-- ============================================
DROP POLICY IF EXISTS "System can insert API usage logs" ON public.gemini_api_usage;
DROP POLICY IF EXISTS "Sistema pode inserir API usage" ON public.gemini_api_usage;
-- Service role bypasses RLS for edge functions

-- ============================================
-- 6. human_validations - Restrict to user's own validations
-- ============================================
DROP POLICY IF EXISTS "Permitir criação de validações" ON public.human_validations;
DROP POLICY IF EXISTS "Permitir leitura de validações" ON public.human_validations;
DROP POLICY IF EXISTS "Public can read validations" ON public.human_validations;
DROP POLICY IF EXISTS "Public can insert validations" ON public.human_validations;

-- Ensure RLS is enabled
ALTER TABLE public.human_validations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own validations
CREATE POLICY "Users can read own validations"
ON public.human_validations
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert their own validations
CREATE POLICY "Users can insert own validations"
ON public.human_validations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins have full access to validations"
ON public.human_validations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 7. invite_keys - Strengthen claim policy
-- ============================================
DROP POLICY IF EXISTS "Users can claim valid invite keys" ON public.invite_keys;

-- Users can only claim invite keys where they are the recipient
CREATE POLICY "Users can claim their own invite keys"
ON public.invite_keys
FOR UPDATE
TO authenticated
USING (
  recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND is_active = true
  AND used_by IS NULL
  AND (expires_at IS NULL OR expires_at > now())
)
WITH CHECK (
  used_by = auth.uid()
);
