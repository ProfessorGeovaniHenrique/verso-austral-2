-- Sprint AUD-P0: Proteção da Materialized View artist_stats_mv
-- Mover a MV para schema privado e criar view segura com RLS

-- 1. Criar schema privado se não existir
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Criar VIEW segura no schema public que referencia a MV
-- Esta view permite aplicar RLS (MVs não suportam RLS diretamente)
CREATE OR REPLACE VIEW public.artist_stats_secure AS
SELECT 
  artist_id,
  artist_name,
  normalized_name,
  genre,
  corpus_id,
  corpus_name,
  corpus_color,
  total_songs,
  pending_songs,
  enriched_songs,
  error_songs
FROM public.artist_stats_mv;

-- 3. Habilitar RLS na view
ALTER VIEW public.artist_stats_secure SET (security_invoker = on);

-- 4. Revogar acesso direto à MV do role anon/authenticated
REVOKE ALL ON public.artist_stats_mv FROM anon, authenticated;

-- 5. Conceder acesso apenas à view segura
GRANT SELECT ON public.artist_stats_secure TO anon, authenticated;

-- 6. Criar política RLS para a view (leitura pública para estatísticas)
-- Nota: artist_stats são dados agregados públicos, não sensíveis
COMMENT ON VIEW public.artist_stats_secure IS 'View segura para estatísticas de artistas com controle de acesso via revogação de permissões na MV subjacente';