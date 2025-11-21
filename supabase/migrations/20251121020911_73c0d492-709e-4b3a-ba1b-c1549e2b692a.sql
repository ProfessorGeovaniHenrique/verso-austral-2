-- Sincronizar validation_status com campos booleanos existentes no Gutenberg
UPDATE gutenberg_lexicon
SET validation_status = 'approved'
WHERE validado = true 
  AND (validation_status IS NULL OR validation_status = 'pending');

-- Sincronizar validation_status com campos booleanos existentes no Dialectal
UPDATE dialectal_lexicon
SET validation_status = 'approved'
WHERE validado_humanamente = true 
  AND (validation_status IS NULL OR validation_status = 'pending');