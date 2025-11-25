-- Tabela de cache para anotações POS do Gemini
CREATE TABLE IF NOT EXISTS public.gemini_pos_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra TEXT NOT NULL,
  contexto_hash TEXT NOT NULL,
  lema TEXT,
  pos TEXT,
  pos_detalhada TEXT,
  features JSONB,
  confianca NUMERIC,
  justificativa TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  hits_count INT DEFAULT 0,
  UNIQUE(palavra, contexto_hash)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gemini_pos_cache_palavra ON public.gemini_pos_cache(palavra);
CREATE INDEX IF NOT EXISTS idx_gemini_pos_cache_hash ON public.gemini_pos_cache(contexto_hash);

-- Tabela de monitoramento de uso da API Gemini
CREATE TABLE IF NOT EXISTS public.gemini_pos_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT DEFAULT 'annotate-pos',
  tokens_annotated INT,
  tokens_input INT,
  tokens_output INT,
  cost_usd NUMERIC,
  cached_hits INT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gemini_pos_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemini_pos_api_usage ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura (qualquer usuário autenticado pode ver cache)
CREATE POLICY "Cache é visível para todos"
  ON public.gemini_pos_cache
  FOR SELECT
  USING (true);

-- Apenas sistema pode inserir/atualizar cache
CREATE POLICY "Sistema pode gerenciar cache"
  ON public.gemini_pos_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Políticas de API usage (apenas leitura para usuários)
CREATE POLICY "API usage visível para todos"
  ON public.gemini_pos_api_usage
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode registrar API usage"
  ON public.gemini_pos_api_usage
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');