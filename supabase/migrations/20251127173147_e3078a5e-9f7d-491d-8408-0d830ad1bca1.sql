-- ═══════════════════════════════════════════════════════════
-- REFORMULAÇÃO DO DOMÍNIO CC (CULTURA E CONHECIMENTO)
-- ~45 novos tagsets organizados hierarquicamente
-- ═══════════════════════════════════════════════════════════

-- N1: Atualizar descrição de CULTURA E CONHECIMENTO
UPDATE semantic_tagset 
SET descricao = 'Agrupa termos relacionados à produção intelectual, artística, simbólica e informacional da sociedade. Abrange desde sistemas de crença e expressão artística até a comunicação, a ciência e o conhecimento formal.'
WHERE codigo = 'CC';

-- ═══════════════════════════════════════════════════════════
-- N2: ARTE E EXPRESSÃO CULTURAL
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART', 'Arte e Expressão Cultural', 
        'Termos relacionados às manifestações estéticas, narrativas e performáticas, incluindo suas formas, gêneros e componentes.',
        'CC', 2, 'ativo', ARRAY['poema', 'música', 'pintura', 'teatro', 'dança']);

-- N3: Literatura em Prosa
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.PRO', 'Literatura em Prosa', 
        'Arte da palavra organizada em parágrafos, com foco na narrativa e na argumentação.',
        'CC.ART', 3, 'ativo', ARRAY['romance', 'conto', 'crônica']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.PRO.GEN', 'Gêneros e Formas Narrativas', 
        'Tipos de textos em prosa.',
        'CC.ART.PRO', 4, 'ativo', ARRAY['romance', 'novela', 'conto', 'crônica', 'fábula', 'ensaio']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.PRO.EST', 'Componentes Estruturais da Prosa', 
        'Elementos constitutivos do texto em prosa.',
        'CC.ART.PRO', 4, 'ativo', ARRAY['enredo', 'personagem', 'narrador', 'capítulo', 'parágrafo', 'diálogo']);

-- N3: Literatura em Poesia
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.POE', 'Literatura em Poesia', 
        'Arte da palavra organizada em versos, com foco no ritmo, na sonoridade e na expressão subjetiva.',
        'CC.ART', 3, 'ativo', ARRAY['poema', 'soneto', 'haicai']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.POE.GEN', 'Gêneros e Formas Poéticas', 
        'Tipos de composições poéticas.',
        'CC.ART.POE', 4, 'ativo', ARRAY['poema', 'soneto', 'haicai', 'ode', 'elegia', 'pajada', 'poema épico']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.POE.EST', 'Componentes Estruturais e Rítmicos', 
        'Elementos formais da poesia.',
        'CC.ART.POE', 4, 'ativo', ARRAY['verso', 'estrofe', 'rima', 'métrica', 'ritmo', 'aliteração']);

-- N3: Música
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.MUS', 'Música', 
        'Arte dos sons, melodias e ritmos.',
        'CC.ART', 3, 'ativo', ARRAY['melodia', 'canção', 'milonga']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.MUS.COM', 'Componentes Musicais', 
        'Elementos constitutivos da música.',
        'CC.ART.MUS', 4, 'ativo', ARRAY['melodia', 'ritmo', 'harmonia', 'nota', 'acorde', 'refrão']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.MUS.GEN', 'Gêneros e Formas Musicais', 
        'Estilos e tipos de composição musical.',
        'CC.ART.MUS', 4, 'ativo', ARRAY['canção', 'sinfonia', 'ópera', 'milonga', 'samba', 'cantiga']);

-- N3: Artes Visuais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.VIS', 'Artes Visuais', 
        'Expressões artísticas percebidas pela visão.',
        'CC.ART', 3, 'ativo', ARRAY['pintura', 'escultura', 'fotografia']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.VIS.MOD', 'Modalidades de Artes Visuais', 
        'Tipos de artes visuais.',
        'CC.ART.VIS', 4, 'ativo', ARRAY['pintura', 'escultura', 'desenho', 'fotografia', 'gravura']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.VIS.CON', 'Conceitos e Elementos Visuais', 
        'Elementos formais das artes visuais.',
        'CC.ART.VIS', 4, 'ativo', ARRAY['cor', 'forma', 'textura', 'perspectiva', 'composição']);

-- N3: Artes Cênicas e Performáticas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.CEN', 'Artes Cênicas e Performáticas', 
        'Formas de arte que acontecem em presença de um público.',
        'CC.ART', 3, 'ativo', ARRAY['teatro', 'dança', 'performance']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.ART.CEN.MOD', 'Modalidades Cênicas', 
        'Tipos de artes performáticas.',
        'CC.ART.CEN', 4, 'ativo', ARRAY['teatro', 'dança', 'circo', 'performance', 'declamação']);

-- ═══════════════════════════════════════════════════════════
-- N2: CIÊNCIA E TECNOLOGIA
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.CIT', 'Ciência e Tecnologia', 
        'Termos relacionados ao conhecimento sistemático do mundo e à aplicação desse conhecimento para fins práticos.',
        'CC', 2, 'ativo', ARRAY['ciência', 'tecnologia', 'pesquisa', 'software']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.CIT.CIE', 'Ciência e Método Científico', 
        'Busca pelo conhecimento através da observação e experimentação.',
        'CC.CIT', 3, 'ativo', ARRAY['teoria', 'hipótese', 'experimento']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.CIT.CIE.CAM', 'Campos do Conhecimento', 
        'Áreas do saber científico.',
        'CC.CIT.CIE', 4, 'ativo', ARRAY['matemática', 'física', 'biologia', 'química', 'astronomia']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.CIT.CIE.PRO', 'Processos e Conceitos Científicos', 
        'Elementos do método científico.',
        'CC.CIT.CIE', 4, 'ativo', ARRAY['teoria', 'hipótese', 'experimento', 'análise', 'dado', 'pesquisa']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.CIT.TEC', 'Tecnologia e Inovação', 
        'Aplicação do conhecimento científico e criação de ferramentas.',
        'CC.CIT', 3, 'ativo', ARRAY['informática', 'software', 'internet']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.CIT.TEC.CAM', 'Campos Tecnológicos', 
        'Áreas da tecnologia.',
        'CC.CIT.TEC', 4, 'ativo', ARRAY['informática', 'engenharia', 'robótica', 'biotecnologia']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.CIT.TEC.DIG', 'Conceitos e Produtos Digitais', 
        'Termos do mundo digital.',
        'CC.CIT.TEC', 4, 'ativo', ARRAY['algoritmo', 'software', 'internet', 'rede', 'inteligência artificial']);

-- ═══════════════════════════════════════════════════════════
-- N2: EDUCAÇÃO E APRENDIZADO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.EDU', 'Educação e Aprendizado', 
        'Termos relacionados à aquisição e transmissão de conhecimento, tanto formal quanto informal.',
        'CC', 2, 'ativo', ARRAY['estudar', 'aprender', 'escola', 'professor']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.EDU.APR', 'Processos de Aprendizagem', 
        'Ações e conceitos ligados ao ato de conhecer.',
        'CC.EDU', 3, 'ativo', ARRAY['estudar', 'aprender', 'conhecimento']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.EDU.APR.ACO', 'Ações Cognitivas', 
        'Verbos relacionados ao aprendizado.',
        'CC.EDU.APR', 4, 'ativo', ARRAY['estudar', 'aprender', 'ensinar', 'pesquisar', 'ler', 'memorizar']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.EDU.APR.CON', 'Conceitos Abstratos de Aprendizagem', 
        'Noções abstratas sobre conhecimento.',
        'CC.EDU.APR', 4, 'ativo', ARRAY['conhecimento', 'sabedoria', 'ignorância', 'lição', 'disciplina']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.EDU.INS', 'Instituições e Papéis Educacionais', 
        'Estruturas e pessoas envolvidas no sistema educacional.',
        'CC.EDU', 3, 'ativo', ARRAY['escola', 'professor', 'aluno']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.EDU.INS.LOC', 'Instituições de Ensino', 
        'Lugares de aprendizagem formal.',
        'CC.EDU.INS', 4, 'ativo', ARRAY['escola', 'colégio', 'universidade', 'faculdade', 'biblioteca']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.EDU.INS.PAP', 'Papéis Educacionais', 
        'Funções no sistema educacional.',
        'CC.EDU.INS', 4, 'ativo', ARRAY['aluno', 'estudante', 'professor', 'mestre', 'pesquisador', 'orientador']);

-- ═══════════════════════════════════════════════════════════
-- N2: COMUNICAÇÃO E MÍDIA
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.COM', 'Comunicação e Mídia', 
        'Termos relacionados à troca de informações e aos meios pelos quais ela ocorre.',
        'CC', 2, 'ativo', ARRAY['conversa', 'jornal', 'internet', 'mensagem']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.COM.PRO', 'Processos Comunicativos', 
        'O ato de comunicar e seus componentes.',
        'CC.COM', 3, 'ativo', ARRAY['conversa', 'diálogo', 'discurso']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.COM.PRO.ATO', 'Atos de Fala e Escrita', 
        'Ações comunicativas.',
        'CC.COM.PRO', 4, 'ativo', ARRAY['conversa', 'diálogo', 'discurso', 'debate', 'pergunta', 'resposta', 'mensagem']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.COM.PRO.LIN', 'Conceitos Linguísticos', 
        'Termos sobre linguagem.',
        'CC.COM.PRO', 4, 'ativo', ARRAY['linguagem', 'idioma', 'dialeto', 'significado', 'metáfora']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.COM.MID', 'Mídia e Canais de Informação', 
        'Os meios e veículos de comunicação de massa.',
        'CC.COM', 3, 'ativo', ARRAY['jornal', 'televisão', 'internet']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.COM.MID.TRA', 'Mídia Tradicional', 
        'Veículos de comunicação clássicos.',
        'CC.COM.MID', 4, 'ativo', ARRAY['jornal', 'revista', 'rádio', 'televisão', 'carta']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.COM.MID.DIG', 'Mídia Digital', 
        'Veículos de comunicação digitais.',
        'CC.COM.MID', 4, 'ativo', ARRAY['site', 'blog', 'rede social', 'podcast', 'fórum']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.COM.MID.CON', 'Conteúdo Midiático', 
        'Tipos de conteúdo produzido pela mídia.',
        'CC.COM.MID', 4, 'ativo', ARRAY['notícia', 'reportagem', 'anúncio', 'propaganda', 'editorial']);

-- ═══════════════════════════════════════════════════════════
-- N2: RELIGIOSIDADE E ESPIRITUALIDADE (atualizar + expandir)
-- ═══════════════════════════════════════════════════════════
UPDATE semantic_tagset 
SET descricao = 'Termos relacionados a sistemas de crenças, práticas devocionais e o transcendente.'
WHERE codigo = 'CC.REL';

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.REL.CRE', 'Crenças e Conceitos Transcendentais', 
        'Ideias e entidades fundamentais das religiões e da espiritualidade.',
        'CC.REL', 3, 'ativo', ARRAY['Deus', 'fé', 'alma', 'milagre']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.REL.CRE.ENT', 'Entidades e Forças Divinas', 
        'Seres e forças do plano espiritual.',
        'CC.REL.CRE', 4, 'ativo', ARRAY['Deus', 'divindade', 'diabo', 'anjo', 'espírito', 'alma']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.REL.CRE.CON', 'Conceitos Abstratos Religiosos', 
        'Noções abstratas da religião.',
        'CC.REL.CRE', 4, 'ativo', ARRAY['fé', 'pecado', 'graça', 'milagre', 'destino', 'céu', 'inferno']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.REL.PRA', 'Práticas e Rituais', 
        'Ações e cerimônias de devoção.',
        'CC.REL', 3, 'ativo', ARRAY['reza', 'missa', 'procissão']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.REL.PRA.ACO', 'Ações Rituais', 
        'Atos de devoção.',
        'CC.REL.PRA', 4, 'ativo', ARRAY['reza', 'oração', 'prece', 'promessa', 'penitência', 'peregrinação']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.REL.PRA.EVE', 'Eventos e Cerimônias', 
        'Celebrações religiosas.',
        'CC.REL.PRA', 4, 'ativo', ARRAY['missa', 'culto', 'ritual', 'batismo', 'procissão']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.REL.INS', 'Instituições e Papéis Religiosos', 
        'Estruturas organizadas e figuras de autoridade dentro de uma fé.',
        'CC.REL', 3, 'ativo', ARRAY['igreja', 'padre', 'santo']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.REL.INS.LOC', 'Lugares Sagrados', 
        'Espaços de culto e devoção.',
        'CC.REL.INS', 4, 'ativo', ARRAY['igreja', 'templo', 'capela', 'santuário', 'altar']);

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('CC.REL.INS.PAP', 'Figuras e Papéis Religiosos', 
        'Pessoas com funções religiosas.',
        'CC.REL.INS', 4, 'ativo', ARRAY['santo', 'profeta', 'padre', 'pastor', 'monge', 'beato']);

-- Recalcular hierarquia completa
SELECT calculate_tagset_hierarchy();