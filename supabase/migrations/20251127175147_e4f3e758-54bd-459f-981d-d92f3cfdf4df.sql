-- ═══════════════════════════════════════════════════════════
-- REFORMULAÇÃO DOS DOMÍNIOS AP E SP
-- ~73 novos tagsets em hierarquia de 4 níveis
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- DOMÍNIO AP: ATIVIDADES E PRÁTICAS SOCIAIS
-- ═══════════════════════════════════════════════════════════

-- N1: Atualizar descrição
UPDATE semantic_tagset 
SET descricao = 'Agrupa as principais atividades organizadas, estruturadas e culturalmente significativas da sociedade humana, abrangendo desde o trabalho e a economia até o lazer e as formas de interação coletiva.'
WHERE codigo = 'AP';

-- ═══════════════════════════════════════════════════════════
-- N2: TRABALHO E ECONOMIA (AP.TRA) - NOVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA', 'Trabalho e Economia', 
        'Atividades produtivas, profissões, transações comerciais e o sistema de troca de bens e serviços.',
        'AP', 2, 'ativo', ARRAY['trabalho', 'plantar', 'comprar', 'vender', 'médico']);

-- N3: Trabalho Rural (Agropecuária)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA.RUR', 'Trabalho Rural (Agropecuária)', 
        'Lida no campo, com a terra e os animais.',
        'AP.TRA', 3, 'ativo', ARRAY['plantar', 'domar', 'pastorear']);

-- N4: Atividades Agrícolas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA.RUR.AGR', 'Atividades Agrícolas', 
        'Trabalho com a terra e cultivo de plantas.',
        'AP.TRA.RUR', 4, 'ativo', ARRAY['plantar', 'colher', 'semear', 'arar', 'capinar']);

-- N4: Atividades Pecuárias
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA.RUR.PEC', 'Atividades Pecuárias', 
        'Criação e manejo de animais.',
        'AP.TRA.RUR', 4, 'ativo', ARRAY['domar', 'marcar', 'pastorear', 'carnear', 'tosquiar']);

-- N3: Profissões e Ofícios
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA.PRO', 'Profissões e Ofícios', 
        'Ocupações e cargos, tanto rurais quanto urbanos.',
        'AP.TRA', 3, 'ativo', ARRAY['médico', 'professor', 'ferreiro', 'tropeiro']);

-- N4: Profissões (Formais/Urbanas)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA.PRO.FOR', 'Profissões (Formais/Urbanas)', 
        'Ocupações que requerem formação específica.',
        'AP.TRA.PRO', 4, 'ativo', ARRAY['médico', 'professor', 'advogado', 'engenheiro']);

-- N4: Ofícios (Tradicionais/Manuais)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA.PRO.OFI', 'Ofícios (Tradicionais/Manuais)', 
        'Ocupações manuais e tradicionais.',
        'AP.TRA.PRO', 4, 'ativo', ARRAY['ferreiro', 'carpinteiro', 'sapateiro', 'tropeiro']);

-- N3: Economia e Comércio
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA.ECO', 'Economia e Comércio', 
        'O sistema de troca e os conceitos financeiros.',
        'AP.TRA', 3, 'ativo', ARRAY['comprar', 'vender', 'lucro', 'mercado']);

-- N4: Transações Comerciais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA.ECO.TRA', 'Transações Comerciais', 
        'Ações de compra, venda e negociação.',
        'AP.TRA.ECO', 4, 'ativo', ARRAY['comprar', 'vender', 'pagar', 'trocar', 'negociar']);

-- N4: Conceitos Econômicos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.TRA.ECO.CON', 'Conceitos Econômicos', 
        'Termos financeiros e econômicos.',
        'AP.TRA.ECO', 4, 'ativo', ARRAY['lucro', 'dívida', 'imposto', 'preço', 'juro', 'mercado']);

-- ═══════════════════════════════════════════════════════════
-- N2: ALIMENTAÇÃO E CULINÁRIA (AP.ALI) - JÁ EXISTE, adicionar N3/N4
-- ═══════════════════════════════════════════════════════════
UPDATE semantic_tagset 
SET descricao = 'Práticas sociais e culturais relacionadas à preparação, consumo e partilha de alimentos e bebidas.'
WHERE codigo = 'AP.ALI';

-- N3: Práticas Culinárias
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.ALI.PRA', 'Práticas Culinárias', 
        'Ações e métodos envolvidos na preparação de alimentos.',
        'AP.ALI', 3, 'ativo', ARRAY['cozinhar', 'assar', 'temperar']);

-- N4: Métodos de Preparo
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.ALI.PRA.MET', 'Métodos de Preparo', 
        'Técnicas de preparação de alimentos.',
        'AP.ALI.PRA', 4, 'ativo', ARRAY['cozinhar', 'assar', 'fritar', 'grelhar', 'temperar', 'fatiar']);

-- N3: Refeições e Pratos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.ALI.REF', 'Refeições e Pratos', 
        'Os resultados da culinária e os momentos de consumo.',
        'AP.ALI', 3, 'ativo', ARRAY['almoço', 'churrasco', 'feijoada']);

-- N4: Momentos de Refeição
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.ALI.REF.MOM', 'Momentos de Refeição', 
        'Períodos do dia destinados às refeições.',
        'AP.ALI.REF', 4, 'ativo', ARRAY['café da manhã', 'almoço', 'janta', 'ceia', 'lanche']);

-- N4: Tipos de Prato
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.ALI.REF.PRA', 'Tipos de Prato', 
        'Preparações culinárias específicas.',
        'AP.ALI.REF', 4, 'ativo', ARRAY['churrasco', 'feijoada', 'sopa', 'salada', 'carreteiro']);

-- N3: Bebidas e seu Consumo
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.ALI.BEB', 'Bebidas e seu Consumo', 
        'Líquidos preparados para consumo social ou individual.',
        'AP.ALI', 3, 'ativo', ARRAY['chimarrão', 'café', 'vinho']);

-- N4: Tipos de Bebida
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.ALI.BEB.TIP', 'Tipos de Bebida', 
        'Variedades de bebidas.',
        'AP.ALI.BEB', 4, 'ativo', ARRAY['água', 'suco', 'vinho', 'cerveja', 'café', 'chimarrão']);

-- ═══════════════════════════════════════════════════════════
-- N2: VESTUÁRIO E MODA (AP.VES) - JÁ EXISTE, adicionar N3/N4
-- ═══════════════════════════════════════════════════════════
UPDATE semantic_tagset 
SET descricao = 'Práticas sociais relacionadas ao ato de vestir, aos estilos e à manutenção das roupas.'
WHERE codigo = 'AP.VES';

-- N3: Práticas de Vestir e Cuidar
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.VES.PRA', 'Práticas de Vestir e Cuidar', 
        'Ações cotidianas relacionadas ao vestuário.',
        'AP.VES', 3, 'ativo', ARRAY['vestir', 'lavar', 'costurar']);

-- N4: Ações de Vestir
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.VES.PRA.ACO', 'Ações de Vestir', 
        'Ações relacionadas ao ato de se vestir.',
        'AP.VES.PRA', 4, 'ativo', ARRAY['vestir', 'calçar', 'abotoar', 'amarrar', 'despir-se']);

-- N4: Manutenção de Roupas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.VES.PRA.MAN', 'Manutenção de Roupas', 
        'Cuidados com as peças de vestuário.',
        'AP.VES.PRA', 4, 'ativo', ARRAY['lavar', 'passar', 'costurar', 'remendar']);

-- N3: Conceitos de Moda e Estilo
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.VES.MOD', 'Conceitos de Moda e Estilo', 
        'Ideias e tendências que guiam as escolhas de vestuário.',
        'AP.VES', 3, 'ativo', ARRAY['moda', 'estilo', 'tendência']);

-- N4: Estilos e Tendências
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.VES.MOD.EST', 'Estilos e Tendências', 
        'Padrões e modismos no vestuário.',
        'AP.VES.MOD', 4, 'ativo', ARRAY['moda', 'estilo', 'tendência', 'visual', 'look', 'alta-costura']);

-- ═══════════════════════════════════════════════════════════
-- N2: LAZER E ESPORTES (AP.LAZ) - NOVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.LAZ', 'Lazer e Esportes', 
        'Atividades realizadas por prazer, entretenimento, competição ou relaxamento.',
        'AP', 2, 'ativo', ARRAY['festa', 'futebol', 'dançar', 'pesca']);

-- N3: Festas e Celebrações Sociais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.LAZ.FES', 'Festas e Celebrações Sociais', 
        'Eventos coletivos de comemoração e entretenimento.',
        'AP.LAZ', 3, 'ativo', ARRAY['festa', 'baile', 'fandango', 'rodeio']);

-- N4: Tipos de Evento
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.LAZ.FES.TIP', 'Tipos de Evento', 
        'Variedades de celebrações sociais.',
        'AP.LAZ.FES', 4, 'ativo', ARRAY['festa', 'baile', 'fandango', 'rodeio', 'quermesse', 'carnaval']);

-- N4: Ações Festivas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.LAZ.FES.ACO', 'Ações Festivas', 
        'Atividades realizadas em celebrações.',
        'AP.LAZ.FES', 4, 'ativo', ARRAY['dançar', 'comemorar', 'festejar', 'brindar', 'pular']);

-- N3: Esportes e Competições
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.LAZ.ESP', 'Esportes e Competições', 
        'Atividades físicas regulamentadas com caráter competitivo.',
        'AP.LAZ', 3, 'ativo', ARRAY['futebol', 'competir', 'treinar']);

-- N4: Modalidades Esportivas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.LAZ.ESP.MOD', 'Modalidades Esportivas', 
        'Tipos de esportes e práticas atléticas.',
        'AP.LAZ.ESP', 4, 'ativo', ARRAY['futebol', 'vôlei', 'basquete', 'natação', 'gineteada']);

-- N4: Ações e Conceitos Esportivos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.LAZ.ESP.ACO', 'Ações e Conceitos Esportivos', 
        'Termos relacionados à prática esportiva.',
        'AP.LAZ.ESP', 4, 'ativo', ARRAY['competir', 'treinar', 'jogar', 'ganhar', 'perder', 'gol', 'ponto']);

-- N3: Hobbies e Passatempos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.LAZ.HOB', 'Hobbies e Passatempos', 
        'Atividades de lazer, geralmente individuais ou em pequenos grupos.',
        'AP.LAZ', 3, 'ativo', ARRAY['pesca', 'caça', 'artesanato']);

-- N4: Tipos de Passatempo
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.LAZ.HOB.TIP', 'Tipos de Passatempo', 
        'Variedades de hobbies.',
        'AP.LAZ.HOB', 4, 'ativo', ARRAY['pesca', 'caça', 'artesanato', 'jardinagem', 'colecionismo']);

-- ═══════════════════════════════════════════════════════════
-- N2: TRANSPORTE E DESLOCAMENTO (AP.DES) - NOVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.DES', 'Transporte e Deslocamento', 
        'Práticas e sistemas relacionados ao movimento de pessoas e mercadorias.',
        'AP', 2, 'ativo', ARRAY['andar', 'viajar', 'cavalgar', 'rota']);

-- N3: Ações de Deslocamento
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.DES.ACO', 'Ações de Deslocamento', 
        'Verbos e práticas que indicam movimento através do espaço.',
        'AP.DES', 3, 'ativo', ARRAY['andar', 'cavalgar', 'viajar']);

-- N4: Movimento Terrestre
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.DES.ACO.TER', 'Movimento Terrestre', 
        'Formas de locomoção por terra.',
        'AP.DES.ACO', 4, 'ativo', ARRAY['andar', 'correr', 'caminhar', 'cavalgar', 'dirigir', 'pedalar']);

-- N4: Viagem e Exploração
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.DES.ACO.VIA', 'Viagem e Exploração', 
        'Deslocamentos de maior distância e descoberta.',
        'AP.DES.ACO', 4, 'ativo', ARRAY['viajar', 'explorar', 'peregrinar', 'navegar', 'voar']);

-- N3: Conceitos de Tráfego e Logística
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.DES.TRA', 'Conceitos de Tráfego e Logística', 
        'Ideias e termos que organizam o sistema de movimento.',
        'AP.DES', 3, 'ativo', ARRAY['rota', 'trajeto', 'destino']);

-- N4: Termos de Navegação e Rota
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('AP.DES.TRA.NAV', 'Termos de Navegação e Rota', 
        'Conceitos relacionados a caminhos e direções.',
        'AP.DES.TRA', 4, 'ativo', ARRAY['rota', 'trajeto', 'atalho', 'destino', 'partida', 'chegada', 'trânsito']);

-- ═══════════════════════════════════════════════════════════
-- DOMÍNIO SP: SOCIEDADE E ORGANIZAÇÃO POLÍTICA
-- ═══════════════════════════════════════════════════════════

-- N1: Atualizar descrição
UPDATE semantic_tagset 
SET descricao = 'Agrupa termos relacionados às estruturas de poder, sistemas de governo, leis, relações entre nações e a forma como a sociedade se organiza em um nível macro, incluindo suas hierarquias e conflitos.'
WHERE codigo = 'SP';

-- ═══════════════════════════════════════════════════════════
-- N2: GOVERNO E ESTADO (SP.GOV) - NOVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GOV', 'Governo e Estado', 
        'Termos que descrevem as instituições formais de poder, sua estrutura e administração.',
        'SP', 2, 'ativo', ARRAY['democracia', 'ministério', 'imposto', 'eleição']);

-- N3: Formas e Sistemas de Governo
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GOV.FOR', 'Formas e Sistemas de Governo', 
        'Os modelos teóricos e práticos de organização do poder estatal.',
        'SP.GOV', 3, 'ativo', ARRAY['democracia', 'monarquia', 'república']);

-- N4: Tipos de Regime
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GOV.FOR.TIP', 'Tipos de Regime', 
        'Diferentes formas de organização política.',
        'SP.GOV.FOR', 4, 'ativo', ARRAY['democracia', 'monarquia', 'república', 'ditadura', 'tirania']);

-- N3: Instituições e Poderes do Estado
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GOV.INS', 'Instituições e Poderes do Estado', 
        'Os ramos e órgãos que compõem o governo.',
        'SP.GOV', 3, 'ativo', ARRAY['senado', 'ministério', 'tribunal']);

-- N4: Poderes Constitucionais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GOV.INS.POD', 'Poderes Constitucionais', 
        'As três esferas de poder do Estado.',
        'SP.GOV.INS', 4, 'ativo', ARRAY['Poder Executivo', 'Poder Legislativo', 'Poder Judiciário']);

-- N4: Órgãos Governamentais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GOV.INS.ORG', 'Órgãos Governamentais', 
        'Instituições específicas do governo.',
        'SP.GOV.INS', 4, 'ativo', ARRAY['ministério', 'senado', 'parlamento', 'prefeitura', 'tribunal']);

-- N3: Administração Pública
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GOV.ADM', 'Administração Pública', 
        'A máquina estatal e sua operação.',
        'SP.GOV', 3, 'ativo', ARRAY['burocracia', 'eleição', 'imposto']);

-- N4: Processos e Conceitos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GOV.ADM.PRO', 'Processos e Conceitos', 
        'Termos administrativos do Estado.',
        'SP.GOV.ADM', 4, 'ativo', ARRAY['burocracia', 'serviço público', 'orçamento', 'eleição']);

-- N4: Tributação
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GOV.ADM.TRI', 'Tributação', 
        'Sistema de arrecadação do Estado.',
        'SP.GOV.ADM', 4, 'ativo', ARRAY['imposto', 'taxa', 'tributo', 'contribuição']);

-- ═══════════════════════════════════════════════════════════
-- N2: LEI E JUSTIÇA (SP.LEI) - NOVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.LEI', 'Lei e Justiça', 
        'Termos relacionados ao sistema de regras que governa uma sociedade e sua aplicação.',
        'SP', 2, 'ativo', ARRAY['lei', 'julgamento', 'crime', 'polícia']);

-- N3: Sistema Jurídico
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.LEI.JUR', 'Sistema Jurídico', 
        'As regras e os processos do direito.',
        'SP.LEI', 3, 'ativo', ARRAY['lei', 'constituição', 'julgamento']);

-- N4: Documentos e Fontes Legais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.LEI.JUR.DOC', 'Documentos e Fontes Legais', 
        'Instrumentos normativos.',
        'SP.LEI.JUR', 4, 'ativo', ARRAY['lei', 'constituição', 'decreto', 'código', 'jurisprudência']);

-- N4: Processos e Conceitos Jurídicos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.LEI.JUR.PRO', 'Processos e Conceitos Jurídicos', 
        'Termos relacionados ao funcionamento da justiça.',
        'SP.LEI.JUR', 4, 'ativo', ARRAY['julgamento', 'processo', 'sentença', 'apelação', 'justiça']);

-- N3: Crime e Punição
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.LEI.CRI', 'Crime e Punição', 
        'A violação das leis e suas consequências.',
        'SP.LEI', 3, 'ativo', ARRAY['crime', 'roubo', 'punição', 'prisão']);

-- N4: Tipos de Crime
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.LEI.CRI.TIP', 'Tipos de Crime', 
        'Categorias de atos ilícitos.',
        'SP.LEI.CRI', 4, 'ativo', ARRAY['crime', 'roubo', 'assassinato', 'fraude', 'contrabando']);

-- N4: Penalidades e Sanções
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.LEI.CRI.PEN', 'Penalidades e Sanções', 
        'Consequências legais de atos criminosos.',
        'SP.LEI.CRI', 4, 'ativo', ARRAY['punição', 'pena', 'prisão', 'multa', 'exílio']);

-- N3: Ordem Pública e Segurança
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.LEI.SEG', 'Ordem Pública e Segurança', 
        'As forças e ações que garantem a aplicação da lei e a proteção dos cidadãos.',
        'SP.LEI', 3, 'ativo', ARRAY['polícia', 'exército', 'guarda']);

-- N4: Forças de Segurança
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.LEI.SEG.FOR', 'Forças de Segurança', 
        'Instituições responsáveis pela ordem.',
        'SP.LEI.SEG', 4, 'ativo', ARRAY['polícia', 'exército', 'guarda', 'milícia']);

-- ═══════════════════════════════════════════════════════════
-- N2: RELAÇÕES INTERNACIONAIS (SP.REL) - NOVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.REL', 'Relações Internacionais', 
        'A interação entre diferentes Estados-nação, abrangendo desde a diplomacia até o conflito armado.',
        'SP', 2, 'ativo', ARRAY['fronteira', 'tratado', 'diplomacia']);

-- N3: Geopolítica e Diplomacia
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.REL.GEO', 'Geopolítica e Diplomacia', 
        'A interação estratégica e negocial entre nações.',
        'SP.REL', 3, 'ativo', ARRAY['fronteira', 'território', 'tratado', 'embaixada']);

-- N4: Conceitos Geopolíticos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.REL.GEO.CON', 'Conceitos Geopolíticos', 
        'Termos fundamentais das relações entre Estados.',
        'SP.REL.GEO', 4, 'ativo', ARRAY['geopolítica', 'fronteira', 'território', 'nação', 'soberania', 'hegemonia']);

-- N4: Práticas Diplomáticas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.REL.GEO.DIP', 'Práticas Diplomáticas', 
        'Ações e instituições da diplomacia.',
        'SP.REL.GEO', 4, 'ativo', ARRAY['diplomacia', 'tratado', 'acordo', 'aliança', 'embaixada', 'negociação']);

-- ═══════════════════════════════════════════════════════════
-- N2: GUERRA E CONFLITO ARMADO (SP.GUE) - NOVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GUE', 'Guerra e Conflito Armado', 
        'O uso da força organizada entre grupos políticos ou nações.',
        'SP', 2, 'ativo', ARRAY['guerra', 'batalha', 'atacar', 'defender']);

-- N3: Tipos de Conflito
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GUE.TIP', 'Tipos de Conflito', 
        'Categorias de confrontos armados.',
        'SP.GUE', 3, 'ativo', ARRAY['guerra', 'batalha', 'revolução', 'guerrilha', 'guerra civil', 'confronto']);

-- N3: Ações de Combate
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GUE.COM', 'Ações de Combate', 
        'Verbos e táticas de enfrentamento armado.',
        'SP.GUE', 3, 'ativo', ARRAY['atacar', 'defender', 'invadir']);

-- N4: Ações Ofensivas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GUE.COM.OFE', 'Ações Ofensivas', 
        'Movimentos de ataque.',
        'SP.GUE.COM', 4, 'ativo', ARRAY['atacar', 'invadir', 'bombardear', 'atirar', 'sitiar']);

-- N4: Ações Defensivas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GUE.COM.DEF', 'Ações Defensivas', 
        'Movimentos de proteção e resistência.',
        'SP.GUE.COM', 4, 'ativo', ARRAY['defender', 'proteger', 'resistir', 'render-se', 'recuar']);

-- N3: Táticas e Estratégias Militares
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GUE.TAT', 'Táticas e Estratégias Militares', 
        'Conceitos abstratos de planejamento e condução da guerra.',
        'SP.GUE', 3, 'ativo', ARRAY['estratégia', 'tática', 'emboscada']);

-- N4: Conceitos Estratégicos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.GUE.TAT.EST', 'Conceitos Estratégicos', 
        'Termos de planejamento militar.',
        'SP.GUE.TAT', 4, 'ativo', ARRAY['estratégia', 'tática', 'emboscada', 'cerco', 'aliança', 'trégua']);

-- ═══════════════════════════════════════════════════════════
-- N2: PROCESSOS POLÍTICOS E CIDADANIA (SP.POL) - NOVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.POL', 'Processos Políticos e Cidadania', 
        'A participação dos indivíduos na vida política e as ideologias que a norteiam.',
        'SP', 2, 'ativo', ARRAY['eleição', 'voto', 'protesto', 'cidadania']);

-- N3: Participação Política e Ativismo
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.POL.PAR', 'Participação Política e Ativismo', 
        'As formas como os cidadãos influenciam o poder.',
        'SP.POL', 3, 'ativo', ARRAY['eleição', 'voto', 'protesto', 'greve']);

-- N4: Processos Eleitorais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.POL.PAR.ELE', 'Processos Eleitorais', 
        'Sistema democrático de escolha de representantes.',
        'SP.POL.PAR', 4, 'ativo', ARRAY['eleição', 'voto', 'campanha', 'candidato', 'partido político']);

-- N4: Ações Coletivas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.POL.PAR.ACO', 'Ações Coletivas', 
        'Manifestações da sociedade civil.',
        'SP.POL.PAR', 4, 'ativo', ARRAY['protesto', 'manifestação', 'greve', 'movimento social', 'petição']);

-- N3: Ideologias Políticas
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.POL.IDE', 'Ideologias Políticas', 
        'Sistemas de ideias que propõem uma visão de como a sociedade deve ser organizada.',
        'SP.POL', 3, 'ativo', ARRAY['liberalismo', 'socialismo', 'conservadorismo']);

-- N4: Espectro Ideológico
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.POL.IDE.ESP', 'Espectro Ideológico', 
        'Correntes de pensamento político.',
        'SP.POL.IDE', 4, 'ativo', ARRAY['liberalismo', 'conservadorismo', 'socialismo', 'comunismo', 'anarquismo', 'fascismo']);

-- N3: Cidadania e Direitos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.POL.CID', 'Cidadania e Direitos', 
        'O status do indivíduo perante o Estado.',
        'SP.POL', 3, 'ativo', ARRAY['cidadania', 'nacionalidade', 'direito', 'pátria']);

-- N4: Status e Direitos
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.POL.CID.STA', 'Status e Direitos', 
        'Conceitos de pertencimento e prerrogativas.',
        'SP.POL.CID', 4, 'ativo', ARRAY['cidadania', 'nacionalidade', 'pátria', 'direito', 'dever']);

-- ═══════════════════════════════════════════════════════════
-- N2: ESTRUTURA E DINÂMICA SOCIAL (SP.EST) - NOVO
-- ═══════════════════════════════════════════════════════════
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.EST', 'Estrutura e Dinâmica Social', 
        'A forma como a sociedade se organiza em grupos e hierarquias.',
        'SP', 2, 'ativo', ARRAY['elite', 'classe', 'desigualdade', 'preconceito']);

-- N3: Classes e Grupos Sociais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.EST.CLA', 'Classes e Grupos Sociais', 
        'A estratificação da sociedade.',
        'SP.EST', 3, 'ativo', ARRAY['elite', 'classe média', 'proletariado']);

-- N4: Hierarquia Socioeconômica
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.EST.CLA.HIE', 'Hierarquia Socioeconômica', 
        'Camadas sociais baseadas em poder econômico.',
        'SP.EST.CLA', 4, 'ativo', ARRAY['elite', 'burguesia', 'classe média', 'proletariado', 'nobreza']);

-- N4: Grupos de Identidade Coletiva
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.EST.CLA.GRU', 'Grupos de Identidade Coletiva', 
        'Agrupamentos baseados em identidade compartilhada.',
        'SP.EST.CLA', 4, 'ativo', ARRAY['etnia', 'casta', 'clã', 'comunidade']);

-- N3: Fenômenos e Conflitos Sociais
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.EST.FEN', 'Fenômenos e Conflitos Sociais', 
        'As tensões e dinâmicas dentro da estrutura social.',
        'SP.EST', 3, 'ativo', ARRAY['desigualdade', 'preconceito', 'racismo']);

-- N4: Desigualdade e Mobilidade
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.EST.FEN.DES', 'Desigualdade e Mobilidade', 
        'Disparidades e movimentação entre classes.',
        'SP.EST.FEN', 4, 'ativo', ARRAY['desigualdade', 'pobreza', 'riqueza', 'mobilidade social']);

-- N4: Discriminação e Preconceito
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos)
VALUES ('SP.EST.FEN.DIS', 'Discriminação e Preconceito', 
        'Formas de exclusão e intolerância.',
        'SP.EST.FEN', 4, 'ativo', ARRAY['preconceito', 'discriminação', 'racismo', 'xenofobia']);

-- Recalcular hierarquia completa
SELECT calculate_tagset_hierarchy();