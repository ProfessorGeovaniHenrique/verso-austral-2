-- Adicionar campos de validação na tabela dialectal_lexicon
ALTER TABLE dialectal_lexicon
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- Adicionar constraint de validação
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dialectal_validation_status_check'
  ) THEN
    ALTER TABLE dialectal_lexicon
    ADD CONSTRAINT dialectal_validation_status_check 
    CHECK (validation_status IN ('pending', 'approved', 'corrected', 'rejected'));
  END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_dialectal_validation_status 
ON dialectal_lexicon(validation_status);

-- Adicionar campos de validação na tabela gutenberg_lexicon
ALTER TABLE gutenberg_lexicon
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- Adicionar constraint de validação
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gutenberg_validation_status_check'
  ) THEN
    ALTER TABLE gutenberg_lexicon
    ADD CONSTRAINT gutenberg_validation_status_check 
    CHECK (validation_status IN ('pending', 'approved', 'corrected', 'rejected'));
  END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_gutenberg_validation_status 
ON gutenberg_lexicon(validation_status);

-- Sincronizar status de validação existente (validado_humanamente -> validation_status)
UPDATE dialectal_lexicon 
SET validation_status = 'approved' 
WHERE validado_humanamente = true AND validation_status = 'pending';

UPDATE gutenberg_lexicon 
SET validation_status = 'approved' 
WHERE validado = true AND validation_status = 'pending';