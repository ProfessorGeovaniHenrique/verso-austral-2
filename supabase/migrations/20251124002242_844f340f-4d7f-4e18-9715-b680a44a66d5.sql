-- Materialized View com estatísticas por artista
CREATE MATERIALIZED VIEW artist_stats_mv AS
SELECT 
  a.id as artist_id,
  a.name as artist_name,
  a.normalized_name,
  a.genre,
  a.corpus_id,
  c.name as corpus_name,
  c.color as corpus_color,
  COUNT(s.id) as total_songs,
  COUNT(s.id) FILTER (WHERE s.status = 'pending') as pending_songs,
  COUNT(s.id) FILTER (WHERE s.status = 'enriched') as enriched_songs,
  COUNT(s.id) FILTER (WHERE s.status = 'error') as error_songs
FROM artists a
LEFT JOIN songs s ON s.artist_id = a.id
LEFT JOIN corpora c ON c.id = a.corpus_id
GROUP BY a.id, a.name, a.normalized_name, a.genre, a.corpus_id, c.name, c.color
HAVING COUNT(s.id) > 0
ORDER BY total_songs DESC;

-- Índices para performance
CREATE UNIQUE INDEX idx_artist_stats_mv_artist_id ON artist_stats_mv(artist_id);
CREATE INDEX idx_artist_stats_mv_total_songs ON artist_stats_mv(total_songs DESC);
CREATE INDEX idx_artist_stats_mv_corpus ON artist_stats_mv(corpus_id);
CREATE INDEX idx_artist_stats_mv_name ON artist_stats_mv(artist_name);

-- Função para refresh automático
CREATE OR REPLACE FUNCTION refresh_artist_stats()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY artist_stats_mv;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar view quando músicas ou artistas mudarem
CREATE TRIGGER trigger_refresh_artist_stats_songs
AFTER INSERT OR UPDATE OR DELETE ON songs
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_artist_stats();

CREATE TRIGGER trigger_refresh_artist_stats_artists
AFTER INSERT OR UPDATE OR DELETE ON artists
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_artist_stats();

-- Refresh inicial
REFRESH MATERIALIZED VIEW artist_stats_mv;

-- RLS Policy (permitir leitura)
ALTER MATERIALIZED VIEW artist_stats_mv OWNER TO postgres;
GRANT SELECT ON artist_stats_mv TO anon, authenticated;