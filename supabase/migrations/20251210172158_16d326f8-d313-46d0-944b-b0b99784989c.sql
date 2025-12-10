-- Materialized View para estatísticas agregadas do pipeline semântico
-- Elimina necessidade de fetch de 42k+ registros no frontend

CREATE MATERIALIZED VIEW IF NOT EXISTS semantic_pipeline_stats_mv AS
WITH cache_stats AS (
  SELECT
    COUNT(DISTINCT palavra) as total_words,
    COUNT(DISTINCT tagset_codigo) as unique_tagsets,
    COUNT(*) FILTER (WHERE tagset_codigo = 'NC') as nc_words,
    ROUND(AVG(COALESCE(confianca, 0))::numeric, 2) as avg_confidence,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE fonte = 'gemini') as gemini_count,
    COUNT(*) FILTER (WHERE fonte IN ('rule_based', 'mwe_rule')) as rule_based_count,
    COUNT(*) FILTER (WHERE fonte = 'pos_based') as pos_based_count,
    COUNT(*) FILTER (WHERE insignias_culturais IS NOT NULL AND array_length(insignias_culturais, 1) > 0) as words_with_insignias,
    COUNT(*) FILTER (WHERE is_polysemous = true) as polysemous_words
  FROM semantic_disambiguation_cache
),
domain_distribution AS (
  SELECT 
    tagset_codigo,
    COUNT(*) as count
  FROM semantic_disambiguation_cache
  WHERE tagset_codigo IS NOT NULL
  GROUP BY tagset_codigo
  ORDER BY count DESC
),
lexicon_stats AS (
  SELECT COUNT(*) as total_entries FROM semantic_lexicon
)
SELECT
  cs.total_words,
  cs.unique_tagsets,
  cs.nc_words,
  cs.avg_confidence,
  cs.total_entries,
  CASE WHEN cs.total_entries > 0 
    THEN ROUND((cs.gemini_count::numeric / cs.total_entries) * 100, 2) 
    ELSE 0 
  END as gemini_percentage,
  CASE WHEN cs.total_entries > 0 
    THEN ROUND((cs.rule_based_count::numeric / cs.total_entries) * 100, 2) 
    ELSE 0 
  END as rule_based_percentage,
  CASE WHEN cs.total_entries > 0 
    THEN ROUND((cs.pos_based_count::numeric / cs.total_entries) * 100, 2) 
    ELSE 0 
  END as pos_based_percentage,
  cs.words_with_insignias,
  cs.polysemous_words,
  ls.total_entries as lexicon_entries,
  (SELECT jsonb_agg(jsonb_build_object('tagset', tagset_codigo, 'count', count)) FROM domain_distribution) as domain_distribution
FROM cache_stats cs, lexicon_stats ls;

-- Índice único para refresh concurrent
CREATE UNIQUE INDEX IF NOT EXISTS semantic_pipeline_stats_mv_idx ON semantic_pipeline_stats_mv (total_words);

-- Função para refresh da MV
CREATE OR REPLACE FUNCTION refresh_semantic_pipeline_stats_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY semantic_pipeline_stats_mv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissões
GRANT SELECT ON semantic_pipeline_stats_mv TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_semantic_pipeline_stats_mv() TO authenticated;