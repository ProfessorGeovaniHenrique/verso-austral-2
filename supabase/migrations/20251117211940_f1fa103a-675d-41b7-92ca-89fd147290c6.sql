-- ============================================
-- FIX: Corrigir RLS da tabela user_visualization_preferences
-- Remove políticas permissivas e adiciona isolamento por user_id
-- ============================================

-- Garantir que RLS está habilitado
ALTER TABLE public.user_visualization_preferences ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Usuários podem ler suas preferências" ON public.user_visualization_preferences;
DROP POLICY IF EXISTS "Usuários podem inserir suas preferências" ON public.user_visualization_preferences;
DROP POLICY IF EXISTS "Usuários podem atualizar suas preferências" ON public.user_visualization_preferences;

-- Criar política de SELECT (usuário só lê suas próprias preferências)
CREATE POLICY "Users can read own preferences"
ON public.user_visualization_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Criar política de INSERT (usuário só insere suas próprias preferências)
CREATE POLICY "Users can insert own preferences"
ON public.user_visualization_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Criar política de UPDATE (usuário só atualiza suas próprias preferências)
CREATE POLICY "Users can update own preferences"
ON public.user_visualization_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Criar política de DELETE (usuário só deleta suas próprias preferências)
CREATE POLICY "Users can delete own preferences"
ON public.user_visualization_preferences
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Comentário para auditoria
COMMENT ON TABLE public.user_visualization_preferences IS 'Tabela de preferências de visualização por usuário. Protegida por RLS - cada usuário só acessa suas próprias preferências.';