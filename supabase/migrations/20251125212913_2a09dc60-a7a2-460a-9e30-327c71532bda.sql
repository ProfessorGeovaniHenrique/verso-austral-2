-- ========================================
-- SOLUÇÃO DEFINITIVA: ON UPDATE CASCADE
-- ========================================

-- Recriar constraints com CASCADE
ALTER TABLE semantic_tagset DROP CONSTRAINT IF EXISTS semantic_tagset_tagset_pai_fkey;
ALTER TABLE semantic_tagset DROP CONSTRAINT IF EXISTS fk_semantic_tagset_categoria_pai;

ALTER TABLE semantic_tagset 
ADD CONSTRAINT semantic_tagset_tagset_pai_fkey 
FOREIGN KEY (tagset_pai) REFERENCES semantic_tagset(codigo) 
ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE semantic_tagset 
ADD CONSTRAINT fk_semantic_tagset_categoria_pai 
FOREIGN KEY (categoria_pai) REFERENCES semantic_tagset(codigo) 
ON UPDATE CASCADE ON DELETE SET NULL;

-- ========================================
-- FASE 3: MIGRAR CÓDIGOS NUMÉRICOS → MNEMÔNICOS
-- ========================================

-- 1. NA (reativar existente e migrar 01)
UPDATE semantic_tagset SET status = 'ativo' WHERE codigo = 'NA';

-- Migrar filhos de 01 para NA
UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, '01.', 'NA.')
WHERE codigo LIKE '01.%';

-- Deletar 01 (cascade atualiza referências)
DELETE FROM semantic_tagset WHERE codigo = '01';

-- 2. SH (criar e migrar 02)
INSERT INTO semantic_tagset (codigo, nome, descricao, nivel_profundidade, status)
VALUES ('SH', 'Ser Humano', 'Indivíduo biológico, ciclos de vida, anatomia.', 1, 'ativo')
ON CONFLICT (codigo) DO UPDATE SET status = 'ativo';

UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, '02.', 'SH.')
WHERE codigo LIKE '02.%';

DELETE FROM semantic_tagset WHERE codigo = '02';

-- 3. EL (criar e migrar 07)
INSERT INTO semantic_tagset (codigo, nome, descricao, nivel_profundidade, status)
VALUES ('EL', 'Estruturas e Lugares', 'Construções, infraestruturas, lugares.', 1, 'ativo')
ON CONFLICT (codigo) DO UPDATE SET status = 'ativo';

UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, '07.', 'EL.')
WHERE codigo LIKE '07.%';

DELETE FROM semantic_tagset WHERE codigo = '07';

-- 4. NC (criar e migrar 10)
INSERT INTO semantic_tagset (codigo, nome, descricao, nivel_profundidade, status)
VALUES ('NC', 'Não Classificado', 'Termos sem categoria definida.', 1, 'ativo')
ON CONFLICT (codigo) DO UPDATE SET status = 'ativo';

UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, '10.', 'NC.')
WHERE codigo LIKE '10.%';

DELETE FROM semantic_tagset WHERE codigo = '10';

-- 5. EQ (criar e migrar EEQ)
INSERT INTO semantic_tagset (codigo, nome, descricao, nivel_profundidade, status)
VALUES ('EQ', 'Estados, Qualidades e Medidas', 'Atributos, características, propriedades.', 1, 'ativo')
ON CONFLICT (codigo) DO UPDATE SET status = 'ativo';

UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, 'EEQ.', 'EQ.')
WHERE codigo LIKE 'EEQ.%';

DELETE FROM semantic_tagset WHERE codigo = 'EEQ';

-- 6. OA (criar e migrar OBJ)
INSERT INTO semantic_tagset (codigo, nome, descricao, nivel_profundidade, status)
VALUES ('OA', 'Objetos e Artefatos', 'Instrumentos, ferramentas, utensílios.', 1, 'ativo')
ON CONFLICT (codigo) DO UPDATE SET status = 'ativo';

UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, 'OBJ.', 'OA.')
WHERE codigo LIKE 'OBJ.%';

DELETE FROM semantic_tagset WHERE codigo = 'OBJ';

-- Recalcular hierarquias
SELECT calculate_tagset_hierarchy();