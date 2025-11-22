-- Adicionar constraint UNIQUE em normalized_name para permitir upsert
CREATE UNIQUE INDEX IF NOT EXISTS artists_normalized_name_unique 
ON public.artists (normalized_name);

-- Adicionar comentário explicativo
COMMENT ON INDEX artists_normalized_name_unique IS 
'Garante que não haverá artistas duplicados com o mesmo nome normalizado. Necessário para ON CONFLICT no upsert da edge function extract-music-titles';