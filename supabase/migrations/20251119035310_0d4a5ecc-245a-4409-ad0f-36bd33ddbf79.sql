-- Criar função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela de sessões de enriquecimento com RLS granular
CREATE TABLE public.enrichment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  corpus_type TEXT NOT NULL CHECK (corpus_type IN ('gaucho', 'nordestino')),
  session_name TEXT,
  
  -- Dados da sessão (comprimidos com LZ-String)
  compressed_data TEXT NOT NULL,
  
  -- Metadados de progresso
  total_songs INTEGER NOT NULL DEFAULT 0,
  processed_songs INTEGER NOT NULL DEFAULT 0,
  validated_songs INTEGER NOT NULL DEFAULT 0,
  rejected_songs INTEGER NOT NULL DEFAULT 0,
  progress_percentage NUMERIC(5,2) DEFAULT 0.00,
  
  -- Controle de tempo
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Versionamento de schema
  schema_version INTEGER NOT NULL DEFAULT 1,
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_enrichment_sessions_user_id ON public.enrichment_sessions(user_id);
CREATE INDEX idx_enrichment_sessions_corpus_type ON public.enrichment_sessions(corpus_type);
CREATE INDEX idx_enrichment_sessions_last_saved_at ON public.enrichment_sessions(last_saved_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_enrichment_sessions_updated_at
  BEFORE UPDATE ON public.enrichment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.enrichment_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Usuários podem ver apenas suas próprias sessões
CREATE POLICY "Users can view own sessions"
  ON public.enrichment_sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Usuários podem criar suas próprias sessões
CREATE POLICY "Users can create own sessions"
  ON public.enrichment_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar apenas suas próprias sessões
CREATE POLICY "Users can update own sessions"
  ON public.enrichment_sessions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usuários podem deletar apenas suas próprias sessões
CREATE POLICY "Users can delete own sessions"
  ON public.enrichment_sessions
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins podem ver todas as sessões
CREATE POLICY "Admins can view all sessions"
  ON public.enrichment_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Comentários para documentação
COMMENT ON TABLE public.enrichment_sessions IS 'Armazena sessões de enriquecimento de metadados com compressão LZ-String';
COMMENT ON COLUMN public.enrichment_sessions.compressed_data IS 'Dados da sessão comprimidos com LZ-String para economizar espaço';
COMMENT ON COLUMN public.enrichment_sessions.schema_version IS 'Versão do schema para migração de dados futura';