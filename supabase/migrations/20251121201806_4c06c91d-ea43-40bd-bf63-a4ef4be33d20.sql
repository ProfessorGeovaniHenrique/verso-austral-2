-- Adicionar campos de biografia à tabela artists
ALTER TABLE public.artists
ADD COLUMN IF NOT EXISTS biography TEXT,
ADD COLUMN IF NOT EXISTS biography_source TEXT,
ADD COLUMN IF NOT EXISTS biography_updated_at TIMESTAMP WITH TIME ZONE;

-- Criar índice para otimizar busca por artistas com biografia
CREATE INDEX IF NOT EXISTS idx_artists_biography ON public.artists(biography_source) WHERE biography IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.artists.biography IS 'Biografia do artista obtida de fontes externas';
COMMENT ON COLUMN public.artists.biography_source IS 'Fonte da biografia (wikipedia, web, manual)';
COMMENT ON COLUMN public.artists.biography_updated_at IS 'Data da última atualização da biografia';
