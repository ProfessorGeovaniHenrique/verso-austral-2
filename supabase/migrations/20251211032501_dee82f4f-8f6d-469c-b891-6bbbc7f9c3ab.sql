-- SPRINT SEMANTIC-ANNOTATION-FIX: Corrigir função de refresh

CREATE OR REPLACE FUNCTION public.refresh_semantic_coverage_mvs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY semantic_coverage_by_corpus;
  REFRESH MATERIALIZED VIEW CONCURRENTLY semantic_coverage_by_artist;
  -- semantic_quality_metrics não suporta CONCURRENTLY (sem índice único), usar refresh normal
  REFRESH MATERIALIZED VIEW semantic_quality_metrics;
END;
$function$;