
-- =====================================================
-- Sprint AUD-P2: Materialized Views para Cobertura Semântica
-- Reduz queries de 17 para 3, registros de 130k para ~900
-- =====================================================

-- MV 1: Cobertura por Corpus (3 linhas)
CREATE MATERIALIZED VIEW IF NOT EXISTS semantic_coverage_by_corpus AS
SELECT 
  c.id AS corpus_id,
  c.name AS corpus_name,
  COUNT(DISTINCT s.id) AS total_songs,
  COUNT(DISTINCT sdc.song_id) AS annotated_songs,
  CASE 
    WHEN COUNT(DISTINCT s.id) > 0 
    THEN ROUND((COUNT(DISTINCT sdc.song_id)::NUMERIC / COUNT(DISTINCT s.id)::NUMERIC) * 100, 2)
    ELSE 0
  END AS coverage_percent,
  COUNT(sdc.id) AS total_words,
  COUNT(DISTINCT sdc.palavra) AS unique_words,
  COALESCE(ROUND(AVG(sdc.confianca), 2), 0) AS avg_confidence
FROM corpora c
LEFT JOIN songs s ON s.corpus_id = c.id
LEFT JOIN semantic_disambiguation_cache sdc ON sdc.song_id = s.id
GROUP BY c.id, c.name;

-- Índice para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_semantic_coverage_corpus_id ON semantic_coverage_by_corpus(corpus_id);

-- MV 2: Cobertura por Artista (~900 linhas)
CREATE MATERIALIZED VIEW IF NOT EXISTS semantic_coverage_by_artist AS
SELECT 
  a.id AS artist_id,
  a.name AS artist_name,
  a.corpus_id,
  c.name AS corpus_name,
  COUNT(DISTINCT s.id) AS total_songs,
  COUNT(DISTINCT sdc.song_id) AS annotated_songs,
  CASE 
    WHEN COUNT(DISTINCT s.id) > 0 
    THEN ROUND((COUNT(DISTINCT sdc.song_id)::NUMERIC / COUNT(DISTINCT s.id)::NUMERIC) * 100, 2)
    ELSE 0
  END AS coverage_percent,
  COUNT(sdc.id) AS annotated_words,
  COUNT(sdc.id) FILTER (WHERE sdc.tagset_codigo = 'NC' OR sdc.tagset_codigo IS NULL) AS nc_count,
  COUNT(sdc.id) FILTER (WHERE sdc.tagset_n2 IS NOT NULL) AS n2_plus_count,
  COALESCE(ROUND(AVG(sdc.confianca), 2), 0) AS avg_confidence
FROM artists a
LEFT JOIN corpora c ON c.id = a.corpus_id
LEFT JOIN songs s ON s.artist_id = a.id
LEFT JOIN semantic_disambiguation_cache sdc ON sdc.artist_id = a.id
GROUP BY a.id, a.name, a.corpus_id, c.name;

-- Índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_semantic_coverage_artist_id ON semantic_coverage_by_artist(artist_id);
CREATE INDEX IF NOT EXISTS idx_semantic_coverage_artist_corpus ON semantic_coverage_by_artist(corpus_id);
CREATE INDEX IF NOT EXISTS idx_semantic_coverage_artist_coverage ON semantic_coverage_by_artist(coverage_percent);

-- MV 3: Métricas de Qualidade Global (1 linha)
CREATE MATERIALIZED VIEW IF NOT EXISTS semantic_quality_metrics AS
SELECT 
  COUNT(*) AS total_cached_words,
  COUNT(*) FILTER (WHERE tagset_codigo = 'NC' OR tagset_codigo IS NULL) AS nc_count,
  COUNT(*) FILTER (WHERE tagset_n2 IS NOT NULL) AS n2_plus_count,
  COUNT(*) FILTER (WHERE tagset_codigo IS NOT NULL AND tagset_codigo != 'NC' AND tagset_n2 IS NULL) AS n1_only_count,
  COALESCE(ROUND(AVG(confianca), 2), 0) AS avg_confidence,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(*) FILTER (WHERE confianca >= 0.8)::NUMERIC / COUNT(*)::NUMERIC) * 100, 0)
    ELSE 0
  END AS high_confidence_percent
FROM semantic_disambiguation_cache;

-- Índice único para evitar duplicatas no refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_semantic_quality_metrics_single ON semantic_quality_metrics((1));

-- Função para refresh manual das MVs
CREATE OR REPLACE FUNCTION refresh_semantic_coverage_mvs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY semantic_coverage_by_corpus;
  REFRESH MATERIALIZED VIEW CONCURRENTLY semantic_coverage_by_artist;
  REFRESH MATERIALIZED VIEW CONCURRENTLY semantic_quality_metrics;
END;
$$;

-- Comentários para documentação
COMMENT ON MATERIALIZED VIEW semantic_coverage_by_corpus IS 'Cobertura semântica agregada por corpus. Refresh manual via refresh_semantic_coverage_mvs()';
COMMENT ON MATERIALIZED VIEW semantic_coverage_by_artist IS 'Cobertura semântica agregada por artista. Refresh manual via refresh_semantic_coverage_mvs()';
COMMENT ON MATERIALIZED VIEW semantic_quality_metrics IS 'Métricas globais de qualidade do cache semântico. Refresh manual via refresh_semantic_coverage_mvs()';
COMMENT ON FUNCTION refresh_semantic_coverage_mvs IS 'Atualiza todas as MVs de cobertura semântica de forma concorrente';
