-- Adicionar campos de validação à tabela lexical_synonyms
ALTER TABLE lexical_synonyms
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validado_humanamente BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confianca_extracao NUMERIC(3,2) DEFAULT 0.95,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID,
ADD COLUMN IF NOT EXISTS validation_notes TEXT,
ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lexical_synonyms_validation 
ON lexical_synonyms(validation_status);

CREATE INDEX IF NOT EXISTS idx_lexical_synonyms_validado 
ON lexical_synonyms(validado_humanamente);

CREATE INDEX IF NOT EXISTS idx_lexical_synonyms_fonte 
ON lexical_synonyms(fonte);

-- Criar trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_lexical_synonyms_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lexical_synonyms_timestamp_trigger ON lexical_synonyms;
CREATE TRIGGER update_lexical_synonyms_timestamp_trigger
BEFORE UPDATE ON lexical_synonyms
FOR EACH ROW
EXECUTE FUNCTION update_lexical_synonyms_timestamp();

-- Atualizar entradas existentes do Rocha Pombo para "approved" (alta confiança)
UPDATE lexical_synonyms
SET 
  validation_status = 'approved',
  validado_humanamente = true,
  confianca_extracao = 0.95,
  atualizado_em = NOW()
WHERE fonte = 'houaiss' 
  AND (validation_status IS NULL OR validation_status = 'pending');

-- Adicionar comentários
COMMENT ON COLUMN lexical_synonyms.validation_status IS 'Status de validação: pending, approved, rejected';
COMMENT ON COLUMN lexical_synonyms.confianca_extracao IS 'Confiança de extração do dicionário original (0-1)';
COMMENT ON COLUMN lexical_synonyms.validado_humanamente IS 'Se a entrada foi validada por um humano';
COMMENT ON COLUMN lexical_synonyms.reviewed_at IS 'Data e hora da revisão';
COMMENT ON COLUMN lexical_synonyms.reviewed_by IS 'ID do usuário que revisou';
COMMENT ON COLUMN lexical_synonyms.validation_notes IS 'Notas sobre a validação';