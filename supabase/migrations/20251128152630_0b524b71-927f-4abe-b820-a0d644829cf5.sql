-- =====================================================
-- MIGRATION: Adicionar RLS às tabelas de deduplicação
-- =====================================================

-- Habilitar RLS na tabela de backup
ALTER TABLE songs_backup ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela de log
ALTER TABLE deduplication_log ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ver backup
CREATE POLICY "Admins can view songs backup"
ON songs_backup FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Política: Apenas admins podem ver logs de deduplicação
CREATE POLICY "Admins can view deduplication logs"
ON deduplication_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Política: Sistema pode inserir logs
CREATE POLICY "System can insert deduplication logs"
ON deduplication_log FOR INSERT
WITH CHECK (true);

-- Política: Sistema pode atualizar logs
CREATE POLICY "System can update deduplication logs"
ON deduplication_log FOR UPDATE
USING (true);