-- ✅ FASE 1: Adicionar campo tipo_dicionario para separar dicionários
ALTER TABLE dialectal_lexicon
ADD COLUMN tipo_dicionario TEXT DEFAULT 'dialectal';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_dialectal_tipo_dicionario 
ON dialectal_lexicon(tipo_dicionario);

-- Update existing records based on volume_fonte
UPDATE dialectal_lexicon
SET tipo_dicionario = CASE
  WHEN volume_fonte = 'I' THEN 'dialectal_I'
  WHEN volume_fonte = 'II' THEN 'dialectal_II'
  WHEN volume_fonte = 'Navarro 2014' THEN 'dialectal_navarro'
  ELSE 'dialectal'
END;

-- ✅ FASE 5: Adicionar constraint único para prevenir duplicatas
ALTER TABLE dialectal_lexicon
ADD CONSTRAINT unique_verbete_per_dictionary
UNIQUE (verbete_normalizado, tipo_dicionario);