-- ===================================
-- FASE P0: Correção de Integridade de Dados
-- ===================================

-- 1. Limpar referências órfãs (categoria_pai apontando para códigos inexistentes)
UPDATE semantic_tagset
SET categoria_pai = NULL, nivel_profundidade = 1
WHERE categoria_pai IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM semantic_tagset t2 WHERE t2.codigo = semantic_tagset.categoria_pai
  );

-- 2. Recalcular hierarquia completa para todos os tagsets
SELECT calculate_tagset_hierarchy();

-- 3. Adicionar constraint de integridade referencial (previne futuras inconsistências)
ALTER TABLE semantic_tagset
DROP CONSTRAINT IF EXISTS fk_semantic_tagset_categoria_pai;

ALTER TABLE semantic_tagset
ADD CONSTRAINT fk_semantic_tagset_categoria_pai
FOREIGN KEY (categoria_pai) 
REFERENCES semantic_tagset(codigo)
ON DELETE SET NULL
ON UPDATE CASCADE;