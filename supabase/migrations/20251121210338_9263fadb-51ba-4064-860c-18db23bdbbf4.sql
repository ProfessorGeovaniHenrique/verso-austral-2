-- Tabela de cache para resultados da API Gemini
CREATE TABLE IF NOT EXISTS gemini_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_key TEXT NOT NULL UNIQUE, -- Hash do artista + música
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  composer TEXT,
  release_year TEXT,
  confidence TEXT, -- high/medium/low
  tokens_used INTEGER,
  hits_count INTEGER DEFAULT 0, -- Quantas vezes foi reutilizado
  last_hit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Índices para performance
CREATE INDEX idx_gemini_cache_key ON gemini_cache(cache_key);
CREATE INDEX idx_gemini_cache_expires ON gemini_cache(expires_at);
CREATE INDEX idx_gemini_cache_artist_title ON gemini_cache(artist, title);

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION clean_expired_gemini_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM gemini_cache WHERE expires_at < NOW();
END;
$$;

-- RLS Policies
ALTER TABLE gemini_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cache"
  ON gemini_cache FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage cache"
  ON gemini_cache FOR ALL
  USING (true)
  WITH CHECK (true);