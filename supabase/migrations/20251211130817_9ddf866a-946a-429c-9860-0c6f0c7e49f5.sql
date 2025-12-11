-- Fix function search_path for refresh_semantic_pipeline_stats_mv
-- Issue: search_path parameter is not set, allowing potential search path injection

CREATE OR REPLACE FUNCTION public.refresh_semantic_pipeline_stats_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY semantic_pipeline_stats_mv;
END;
$function$;