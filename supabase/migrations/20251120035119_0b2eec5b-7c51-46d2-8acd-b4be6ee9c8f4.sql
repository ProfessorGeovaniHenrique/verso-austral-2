-- ============================================
-- RPC Functions para otimização de queries
-- ============================================

-- Função para obter estatísticas agregadas do Dialectal
CREATE OR REPLACE FUNCTION get_dialectal_stats()
RETURNS TABLE (
  total BIGINT,
  volume_i BIGINT,
  volume_ii BIGINT,
  validados BIGINT,
  confianca_media NUMERIC,
  campeiros BIGINT,
  platinismos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE volume_fonte = 'I')::BIGINT as volume_i,
    COUNT(*) FILTER (WHERE volume_fonte = 'II')::BIGINT as volume_ii,
    COUNT(*) FILTER (WHERE validado_humanamente = true)::BIGINT as validados,
    COALESCE(AVG(confianca_extracao), 0)::NUMERIC as confianca_media,
    COUNT(*) FILTER (WHERE 'campeiro' = ANY(origem_regionalista))::BIGINT as campeiros,
    COUNT(*) FILTER (WHERE influencia_platina = true)::BIGINT as platinismos
  FROM dialectal_lexicon;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para obter estatísticas agregadas do Gutenberg
CREATE OR REPLACE FUNCTION get_gutenberg_stats()
RETURNS TABLE (
  total BIGINT,
  validados BIGINT,
  confianca_media NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE validado = true)::BIGINT as validados,
    COALESCE(AVG(confianca_extracao), 0)::NUMERIC as confianca_media
  FROM gutenberg_lexicon;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;