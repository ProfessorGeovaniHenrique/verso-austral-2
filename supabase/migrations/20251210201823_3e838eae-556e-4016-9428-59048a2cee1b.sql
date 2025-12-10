-- =============================================
-- Sprint PERMISSION-FIX: Permissões Absolutas
-- =============================================

-- FASE 1: Conceder SELECT nas Materialized Views existentes
-- (artist_stats_mv já foi concedido em migration anterior)
-- =============================================

GRANT SELECT ON enrichment_throughput_mv TO anon, authenticated;
GRANT SELECT ON semantic_pipeline_stats_mv TO anon, authenticated;
GRANT SELECT ON semantic_coverage_by_corpus TO anon, authenticated;
GRANT SELECT ON semantic_coverage_by_artist TO anon, authenticated;
GRANT SELECT ON semantic_quality_metrics TO anon, authenticated;

-- FASE 2: Políticas Admin Universais para Tabelas Críticas
-- =============================================

-- semantic_disambiguation_cache - tabela crítica de cache semântico
CREATE POLICY "Admins have full access to semantic_disambiguation_cache"
ON public.semantic_disambiguation_cache
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- semantic_lexicon - léxico semântico
CREATE POLICY "Admins have full access to semantic_lexicon"
ON public.semantic_lexicon
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- semantic_tagset - domínios semânticos
CREATE POLICY "Admins have full access to semantic_tagset"
ON public.semantic_tagset
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- semantic_annotation_jobs - jobs de anotação
CREATE POLICY "Admins have full access to semantic_annotation_jobs"
ON public.semantic_annotation_jobs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- semantic_refinement_jobs - jobs de refinamento
CREATE POLICY "Admins have full access to semantic_refinement_jobs"
ON public.semantic_refinement_jobs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- songs - catálogo musical
CREATE POLICY "Admins have full access to songs"
ON public.songs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- artists - artistas
CREATE POLICY "Admins have full access to artists"
ON public.artists
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- corpora - corpus
CREATE POLICY "Admins have full access to corpora"
ON public.corpora
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- processing_jobs - jobs de processamento
CREATE POLICY "Admins have full access to processing_jobs"
ON public.processing_jobs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- enrichment_jobs - jobs de enriquecimento
CREATE POLICY "Admins have full access to enrichment_jobs"
ON public.enrichment_jobs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- annotation_jobs - jobs de anotação POS
CREATE POLICY "Admins have full access to annotation_jobs"
ON public.annotation_jobs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- annotated_corpus - corpus anotado
CREATE POLICY "Admins have full access to annotated_corpus"
ON public.annotated_corpus
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- corpus_annotation_jobs - jobs de anotação de corpus
CREATE POLICY "Admins have full access to corpus_annotation_jobs"
ON public.corpus_annotation_jobs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- dictionary_import_jobs - jobs de importação de dicionário
CREATE POLICY "Admins have full access to dictionary_import_jobs"
ON public.dictionary_import_jobs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- dialectal_lexicon - léxico dialetal
CREATE POLICY "Admins have full access to dialectal_lexicon"
ON public.dialectal_lexicon
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- gutenberg_lexicon - léxico Gutenberg
CREATE POLICY "Admins have full access to gutenberg_lexicon"
ON public.gutenberg_lexicon
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- lexical_synonyms - sinônimos lexicais
CREATE POLICY "Admins have full access to lexical_synonyms"
ON public.lexical_synonyms
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- lexical_definitions - definições lexicais
CREATE POLICY "Admins have full access to lexical_definitions"
ON public.lexical_definitions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- human_validations - validações humanas
CREATE POLICY "Admins have full access to human_validations"
ON public.human_validations
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- cultural_insignia_attribution - insígnias culturais
CREATE POLICY "Admins have full access to cultural_insignia_attribution"
ON public.cultural_insignia_attribution
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- batch_seeding_jobs - jobs de seeding
CREATE POLICY "Admins have full access to batch_seeding_jobs"
ON public.batch_seeding_jobs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- gemini_api_usage - uso API Gemini
CREATE POLICY "Admins have full access to gemini_api_usage"
ON public.gemini_api_usage
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- gemini_cache - cache Gemini
CREATE POLICY "Admins have full access to gemini_cache"
ON public.gemini_cache
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- gemini_pos_cache - cache POS Gemini
CREATE POLICY "Admins have full access to gemini_pos_cache"
ON public.gemini_pos_cache
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- gemini_pos_api_usage - uso API POS Gemini
CREATE POLICY "Admins have full access to gemini_pos_api_usage"
ON public.gemini_pos_api_usage
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- youtube_api_usage - uso API YouTube
CREATE POLICY "Admins have full access to youtube_api_usage"
ON public.youtube_api_usage
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ai_analysis_history - histórico análise IA
CREATE POLICY "Admins have full access to ai_analysis_history"
ON public.ai_analysis_history
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ai_suggestion_status - status sugestões IA
CREATE POLICY "Admins have full access to ai_suggestion_status"
ON public.ai_suggestion_status
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ai_analysis_feedback - feedback análise IA
CREATE POLICY "Admins have full access to ai_analysis_feedback"
ON public.ai_analysis_feedback
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- annotation_debug_logs - logs debug anotação
CREATE POLICY "Admins have full access to annotation_debug_logs"
ON public.annotation_debug_logs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- anomaly_detections - detecções de anomalia
CREATE POLICY "Admins have full access to anomaly_detections"
ON public.anomaly_detections
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- lexicon_health_status - status saúde léxico
CREATE POLICY "Admins have full access to lexicon_health_status"
ON public.lexicon_health_status
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- metric_alerts - alertas de métricas
CREATE POLICY "Admins have full access to metric_alerts"
ON public.metric_alerts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- system_logs - logs do sistema
CREATE POLICY "Admins have full access to system_logs"
ON public.system_logs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- code_scan_history - histórico scans código
CREATE POLICY "Admins have full access to code_scan_history"
ON public.code_scan_history
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- construction_phases - fases construção
CREATE POLICY "Admins have full access to construction_phases"
ON public.construction_phases
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- phase_metrics - métricas de fases
CREATE POLICY "Admins have full access to phase_metrics"
ON public.phase_metrics
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- deduplication_log - log deduplicação
CREATE POLICY "Admins have full access to deduplication_log"
ON public.deduplication_log
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- dictionary_import_quality - qualidade importação
CREATE POLICY "Admins have full access to dictionary_import_quality"
ON public.dictionary_import_quality
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- dictionary_job_recovery_log - log recuperação jobs
CREATE POLICY "Admins have full access to dictionary_job_recovery_log"
ON public.dictionary_job_recovery_log
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- analytics_events - eventos analytics
CREATE POLICY "Admins have full access to analytics_events"
ON public.analytics_events
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- analytics_feature_usage - uso features
CREATE POLICY "Admins have full access to analytics_feature_usage"
ON public.analytics_feature_usage
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- analytics_user_sessions - sessões usuários
CREATE POLICY "Admins have full access to analytics_user_sessions"
ON public.analytics_user_sessions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- access_requests - solicitações de acesso
CREATE POLICY "Admins have full access to access_requests"
ON public.access_requests
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- invite_keys - chaves de convite
CREATE POLICY "Admins have full access to invite_keys"
ON public.invite_keys
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- user_roles - roles de usuários
CREATE POLICY "Admins have full access to user_roles"
ON public.user_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- dev_history_overrides - overrides histórico dev
CREATE POLICY "Admins have full access to dev_history_overrides"
ON public.dev_history_overrides
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- edge_function_logs - logs edge functions
CREATE POLICY "Admins have full access to edge_function_logs"
ON public.edge_function_logs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- edge_function_metrics - métricas edge functions
CREATE POLICY "Admins have full access to edge_function_metrics"
ON public.edge_function_metrics
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));