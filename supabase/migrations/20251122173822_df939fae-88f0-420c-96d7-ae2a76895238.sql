-- Tabela de conversas do Consultor Semântico IA
CREATE TABLE IF NOT EXISTS public.semantic_consultant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content TEXT NOT NULL,
  context_snapshot JSONB,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_semantic_conversations_user_session 
  ON public.semantic_consultant_conversations(user_id, session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_semantic_conversations_created 
  ON public.semantic_consultant_conversations(created_at DESC);

-- RLS Policies
ALTER TABLE public.semantic_consultant_conversations ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias conversas
CREATE POLICY "Usuários podem ver suas conversas"
  ON public.semantic_consultant_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir suas próprias conversas
CREATE POLICY "Usuários podem criar conversas"
  ON public.semantic_consultant_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comentário descritivo
COMMENT ON TABLE public.semantic_consultant_conversations IS 
  'Armazena histórico de conversas com o Consultor Semântico IA para curadoria de taxonomia';