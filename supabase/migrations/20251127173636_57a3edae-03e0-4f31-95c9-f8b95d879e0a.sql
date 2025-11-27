-- ═══════════════════════════════════════════════════════════
-- Reformulação Hierárquica do Domínio AB (Abstrações)
-- 34 novos tagsets em 4 níveis: Filosóficos/Éticos, Sociais/Políticos, 
-- Existenciais/Metafísicos, Lógicos/Matemáticos
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- N1: ABSTRAÇÕES (atualizar descrição existente)
-- ═══════════════════════════════════════════════════════════
UPDATE semantic_tagset 
SET descricao = 'Agrupa conceitos, princípios, valores e ideias que não possuem existência física, mas que são fundamentais para o pensamento, a filosofia, a ética e a organização social humana.'
WHERE codigo = 'AB';

-- ═══════════════════════════════════════════════════════════
-- N2: CONCEITOS FILOSÓFICOS E ÉTICOS
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.FIL', 'Conceitos Filosóficos e Éticos', 
        'Ideias centrais que guiam o pensamento sobre a existência, o conhecimento e o comportamento moral.',
        'AB', 2, 'ativo', ARRAY['liberdade', 'justiça', 'verdade', 'virtude']);

-- N3: Princípios Fundamentais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.FIL.PRI', 'Princípios Fundamentais', 
        'Conceitos basilares que servem como pilares para sistemas de pensamento.',
        'AB.FIL', 3, 'ativo', ARRAY['liberdade', 'justiça', 'verdade', 'beleza']);

-- N4: Liberdade
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.FIL.PRI.LIB', 'Liberdade', 
        'Conceitos relacionados à autonomia e independência.',
        'AB.FIL.PRI', 4, 'ativo', ARRAY['liberdade', 'livre-arbítrio', 'autonomia', 'independência']);

-- N4: Justiça
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.FIL.PRI.JUS', 'Justiça', 
        'Conceitos relacionados à equidade e retidão.',
        'AB.FIL.PRI', 4, 'ativo', ARRAY['justiça', 'equidade', 'imparcialidade', 'retidão']);

-- N4: Verdade
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.FIL.PRI.VER', 'Verdade', 
        'Conceitos relacionados à autenticidade e realidade.',
        'AB.FIL.PRI', 4, 'ativo', ARRAY['verdade', 'fato', 'realidade', 'autenticidade', 'veracidade']);

-- N4: Beleza
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.FIL.PRI.BEL', 'Beleza', 
        'Conceitos relacionados à estética e harmonia.',
        'AB.FIL.PRI', 4, 'ativo', ARRAY['beleza', 'estética', 'harmonia', 'sublime']);

-- N3: Valores Morais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.FIL.MOR', 'Valores Morais', 
        'Qualidades e princípios que definem o que é considerado certo ou errado, bom ou mau.',
        'AB.FIL', 3, 'ativo', ARRAY['bem', 'mal', 'virtude', 'honra']);

-- N4: Dualidades Éticas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.FIL.MOR.DUA', 'Dualidades Éticas', 
        'Oposições fundamentais no campo moral.',
        'AB.FIL.MOR', 4, 'ativo', ARRAY['bem', 'mal', 'certo', 'errado', 'virtude', 'vício']);

-- N4: Qualidades Morais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.FIL.MOR.QUA', 'Qualidades Morais', 
        'Atributos de caráter valorizados.',
        'AB.FIL.MOR', 4, 'ativo', ARRAY['honestidade', 'coragem', 'lealdade', 'honra', 'dignidade']);

-- ═══════════════════════════════════════════════════════════
-- N2: CONCEITOS SOCIAIS E POLÍTICOS
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.SOC', 'Conceitos Sociais e Políticos', 
        'Ideias que estruturam a vida em comunidade, as relações de poder e a organização do Estado.',
        'AB', 2, 'ativo', ARRAY['poder', 'direito', 'democracia', 'cidadania']);

-- N3: Estruturas de Poder e Governança
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.SOC.POD', 'Estruturas de Poder e Governança', 
        'Conceitos abstratos relacionados à autoridade e ao controle social.',
        'AB.SOC', 3, 'ativo', ARRAY['poder', 'autoridade', 'democracia']);

-- N4: Poder e Autoridade
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.SOC.POD.AUT', 'Poder e Autoridade', 
        'Conceitos relacionados ao exercício do poder.',
        'AB.SOC.POD', 4, 'ativo', ARRAY['poder', 'autoridade', 'soberania', 'influência', 'domínio']);

-- N4: Sistemas Políticos (Ideais)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.SOC.POD.SIS', 'Sistemas Políticos (Ideais)', 
        'Formas abstratas de organização do poder.',
        'AB.SOC.POD', 4, 'ativo', ARRAY['democracia', 'tirania', 'anarquia', 'república']);

-- N3: Princípios de Convivência Social
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.SOC.CON', 'Princípios de Convivência Social', 
        'Ideias que regem a interação entre indivíduos e grupos.',
        'AB.SOC', 3, 'ativo', ARRAY['direito', 'dever', 'paz', 'ordem']);

-- N4: Direitos e Deveres
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.SOC.CON.DIR', 'Direitos e Deveres', 
        'Conceitos de obrigações e prerrogativas.',
        'AB.SOC.CON', 4, 'ativo', ARRAY['direito', 'dever', 'cidadania', 'responsabilidade']);

-- N4: Ordem e Conflito Social
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.SOC.CON.ORD', 'Ordem e Conflito Social', 
        'Conceitos relacionados à estabilidade e instabilidade social.',
        'AB.SOC.CON', 4, 'ativo', ARRAY['ordem', 'paz', 'guerra', 'conflito', 'revolução']);

-- ═══════════════════════════════════════════════════════════
-- N2: CONCEITOS EXISTENCIAIS E METAFÍSICOS
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.EXI', 'Conceitos Existenciais e Metafísicos', 
        'Ideias que tratam da natureza fundamental da existência, da realidade e do universo.',
        'AB', 2, 'ativo', ARRAY['destino', 'existência', 'vida', 'morte']);

-- N3: Forças e Princípios Universais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.EXI.FOR', 'Forças e Princípios Universais', 
        'Conceitos que tentam explicar o funcionamento do mundo em um nível fundamental.',
        'AB.EXI', 3, 'ativo', ARRAY['destino', 'sorte', 'caos', 'harmonia']);

-- N4: Forças Determinísticas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.EXI.FOR.DET', 'Forças Determinísticas', 
        'Conceitos sobre o que determina o curso dos eventos.',
        'AB.EXI.FOR', 4, 'ativo', ARRAY['destino', 'sorte', 'azar', 'acaso', 'providência']);

-- N4: Princípios de Organização
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.EXI.FOR.ORG', 'Princípios de Organização', 
        'Conceitos sobre a estrutura do universo.',
        'AB.EXI.FOR', 4, 'ativo', ARRAY['ordem', 'caos', 'harmonia', 'equilíbrio']);

-- N3: Conceitos de Existência
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.EXI.SER', 'Conceitos de Existência', 
        'Ideias sobre a natureza do ser e da realidade.',
        'AB.EXI', 3, 'ativo', ARRAY['existência', 'vida', 'morte', 'eternidade']);

-- N4: Estado de Ser
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.EXI.SER.EST', 'Estado de Ser', 
        'Conceitos sobre modos de existência.',
        'AB.EXI.SER', 4, 'ativo', ARRAY['existência', 'realidade', 'essência', 'nada']);

-- N4: Ciclo da Vida (Conceitual)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.EXI.SER.CIC', 'Ciclo da Vida (Conceitual)', 
        'Conceitos sobre o percurso existencial.',
        'AB.EXI.SER', 4, 'ativo', ARRAY['vida', 'morte', 'eternidade', 'finitude']);

-- ═══════════════════════════════════════════════════════════
-- N2: CONCEITOS LÓGICOS E MATEMÁTICOS
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.LOG', 'Conceitos Lógicos e Matemáticos', 
        'Abstrações puras que formam a base da lógica, da matemática e do raciocínio formal.',
        'AB', 2, 'ativo', ARRAY['lógica', 'razão', 'infinito', 'número']);

-- N3: Princípios Lógicos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.LOG.PRI', 'Princípios Lógicos', 
        'Fundamentos do raciocínio válido.',
        'AB.LOG', 3, 'ativo', ARRAY['lógica', 'razão', 'contradição']);

-- N4: Conceitos de Lógica
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.LOG.PRI.CON', 'Conceitos de Lógica', 
        'Termos fundamentais do raciocínio lógico.',
        'AB.LOG.PRI', 4, 'ativo', ARRAY['lógica', 'razão', 'contradição', 'paradoxo', 'premissa']);

-- N3: Conceitos Matemáticos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.LOG.MAT', 'Conceitos Matemáticos', 
        'Ideias numéricas e espaciais em sua forma abstrata.',
        'AB.LOG', 3, 'ativo', ARRAY['infinito', 'número', 'proporção']);

-- N4: Conceitos de Quantidade
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.LOG.MAT.QUA', 'Conceitos de Quantidade', 
        'Abstrações sobre medidas e grandezas.',
        'AB.LOG.MAT', 4, 'ativo', ARRAY['infinito', 'zero', 'número', 'quantidade']);

-- N4: Conceitos de Relação
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AB.LOG.MAT.REL', 'Conceitos de Relação', 
        'Abstrações sobre conexões e proporções.',
        'AB.LOG.MAT', 4, 'ativo', ARRAY['probabilidade', 'proporção', 'simetria']);

-- Recalcular hierarquia completa
SELECT calculate_tagset_hierarchy();