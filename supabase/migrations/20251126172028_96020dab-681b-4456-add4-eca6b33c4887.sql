-- Adicionar colunas artist_id e song_id ao cache para rastreamento incremental
ALTER TABLE semantic_disambiguation_cache 
ADD COLUMN artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
ADD COLUMN song_id UUID REFERENCES songs(id) ON DELETE SET NULL;

-- Criar índices para performance de filtros
CREATE INDEX idx_semantic_cache_artist ON semantic_disambiguation_cache(artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX idx_semantic_cache_song ON semantic_disambiguation_cache(song_id) WHERE song_id IS NOT NULL;

COMMENT ON COLUMN semantic_disambiguation_cache.artist_id IS 'Artista origem da palavra (opcional, para filtros)';
COMMENT ON COLUMN semantic_disambiguation_cache.song_id IS 'Música origem da palavra (opcional, para rastreamento)';
