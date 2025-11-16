-- Ajustar RLS policies para permitir operações em modo demo (sem autenticação)

-- Desabilitar temporariamente RLS para annotation_jobs (apenas para testes)
DROP POLICY IF EXISTS "Usuários criam seus jobs" ON annotation_jobs;
DROP POLICY IF EXISTS "Usuários veem apenas seus jobs" ON annotation_jobs;
DROP POLICY IF EXISTS "Usuários atualizam seus jobs" ON annotation_jobs;

-- Criar policies permissivas para modo de teste
CREATE POLICY "Permitir criação de jobs"
  ON annotation_jobs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir leitura de jobs"
  ON annotation_jobs
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir atualização de jobs"
  ON annotation_jobs
  FOR UPDATE
  USING (true);

-- Ajustar annotated_corpus para permitir leitura pública
DROP POLICY IF EXISTS "Usuários veem corpus de seus jobs" ON annotated_corpus;

CREATE POLICY "Permitir leitura de corpus anotado"
  ON annotated_corpus
  FOR SELECT
  USING (true);

CREATE POLICY "Edge functions podem inserir corpus"
  ON annotated_corpus
  FOR INSERT
  WITH CHECK (true);

-- Ajustar human_validations
DROP POLICY IF EXISTS "Usuários veem suas validações" ON human_validations;
DROP POLICY IF EXISTS "Usuários criam validações" ON human_validations;

CREATE POLICY "Permitir leitura de validações"
  ON human_validations
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir criação de validações"
  ON human_validations
  FOR INSERT
  WITH CHECK (true);

-- Ajustar semantic_tagset para permitir proposta sem auth
DROP POLICY IF EXISTS "Usuários autenticados podem propor tagsets" ON semantic_tagset;

CREATE POLICY "Permitir proposta de tagsets"
  ON semantic_tagset
  FOR INSERT
  WITH CHECK (true);

-- Comentário: Em produção, estas policies devem ser restritas com auth.uid()
COMMENT ON TABLE annotation_jobs IS 'ATENÇÃO: Policies configuradas para modo demo. Restringir em produção com autenticação.';
COMMENT ON TABLE annotated_corpus IS 'ATENÇÃO: Policies configuradas para modo demo. Restringir em produção com autenticação.';
COMMENT ON TABLE human_validations IS 'ATENÇÃO: Policies configuradas para modo demo. Restringir em produção com autenticação.';
COMMENT ON TABLE semantic_tagset IS 'ATENÇÃO: Policies configuradas para modo demo. Restringir em produção com autenticação.';