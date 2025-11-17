/**
 * Seed de Marcadores Gramaticais do Português Brasileiro
 * Taxonomia funcional de 4 níveis baseada em análise linguística
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TagsetSeed {
  codigo: string;
  nome: string;
  descricao: string;
  categoria_pai: string | null;
  exemplos: string[];
  status: 'ativo' | 'proposto';
}

const MARCADORES_GRAMATICAIS: TagsetSeed[] = [
  // ============ NÍVEL 1: DOMÍNIO PRINCIPAL ============
  {
    codigo: 'MG',
    nome: 'Marcadores Gramaticais',
    descricao: 'Palavras cuja função principal é estruturar a oração, conectar ideias e marcar relações gramaticais',
    categoria_pai: null,
    exemplos: ['de', 'que', 'o', 'não', 'ser', 'este', 'muito', 'e', 'mas'],
    status: 'ativo'
  },

  // ============ NÍVEL 2: SUBDOMÍNIOS ============
  
  // 1. CONECTOR
  {
    codigo: 'MG.CON',
    nome: 'Conector',
    descricao: 'Palavras que estabelecem ligação lógica ou estrutural entre elementos',
    categoria_pai: 'MG',
    exemplos: ['de', 'em', 'para', 'e', 'mas', 'porque', 'quando', 'se'],
    status: 'ativo'
  },

  // 2. ESPECIFICADOR
  {
    codigo: 'MG.ESP',
    nome: 'Especificador',
    descricao: 'Palavras que atuam sobre substantivos para determiná-los ou quantificá-los',
    categoria_pai: 'MG',
    exemplos: ['o', 'um', 'dois', 'vários', 'primeiro', 'meio'],
    status: 'ativo'
  },

  // 3. DEÍCTICO
  {
    codigo: 'MG.DEI',
    nome: 'Deíctico',
    descricao: 'Palavras que apontam para elementos do discurso, texto ou contexto',
    categoria_pai: 'MG',
    exemplos: ['eu', 'me', 'meu', 'este', 'esse', 'aquele', 'que', 'cujo'],
    status: 'ativo'
  },

  // 4. MODIFICADOR
  {
    codigo: 'MG.MOD',
    nome: 'Modificador',
    descricao: 'Palavras que alteram o sentido de verbos, adjetivos ou advérbios, ou que focalizam um termo',
    categoria_pai: 'MG',
    exemplos: ['muito', 'não', 'talvez', 'bem', 'aqui', 'ontem', 'só', 'até'],
    status: 'ativo'
  },

  // 5. AUXILIAR VERBAL
  {
    codigo: 'MG.AUX',
    nome: 'Auxiliar Verbal',
    descricao: 'Verbos que ajudam a formar tempos, vozes ou locuções verbais',
    categoria_pai: 'MG',
    exemplos: ['ter', 'haver', 'ser', 'estar', 'ir', 'começar', 'dever'],
    status: 'ativo'
  },

  // 6. VERBO RELACIONAL
  {
    codigo: 'MG.VRL',
    nome: 'Verbo Relacional',
    descricao: 'Verbos copulativos que conectam sujeito a sua característica ou estado',
    categoria_pai: 'MG',
    exemplos: ['ser', 'estar', 'ficar', 'parecer', 'permanecer', 'continuar', 'tornar-se'],
    status: 'ativo'
  },

  // 7. EXPRESSIVO
  {
    codigo: 'MG.EXP',
    nome: 'Expressivo',
    descricao: 'Palavras que expressam emoções, apelos ou imitam sons',
    categoria_pai: 'MG',
    exemplos: ['oba', 'ai', 'nossa', 'ufa', 'miau', 'tic-tac'],
    status: 'ativo'
  },

  // 8. NOMES PRÓPRIOS (CASE SENSITIVE)
  {
    codigo: 'MG.NPR',
    nome: 'Nomes Próprios',
    descricao: 'Substantivos que nomeiam seres específicos e únicos, requerem análise case-sensitive e contextual',
    categoria_pai: 'MG',
    exemplos: ['Maria', 'Brasil', 'São Paulo', 'João', 'Cristo', 'Deus', 'Rio Grande do Sul'],
    status: 'ativo'
  },

  // ============ NÍVEL 3: CATEGORIAS FUNCIONAIS ============

  // --- MG.CON (CONECTOR) ---
  {
    codigo: 'MG.CON.REL',
    nome: 'Relacional (Preposicional)',
    descricao: 'Conecta palavras dentro da oração estabelecendo relação semântica',
    categoria_pai: 'MG.CON',
    exemplos: ['de', 'em', 'para', 'por', 'com', 'sobre', 'entre', 'sem', 'desde'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA',
    nome: 'Oracional (Conjuncional)',
    descricao: 'Conecta orações estabelecendo coordenação ou subordinação',
    categoria_pai: 'MG.CON',
    exemplos: ['e', 'mas', 'porque', 'se', 'quando', 'embora', 'enquanto', 'nem'],
    status: 'ativo'
  },

  // --- MG.ESP (ESPECIFICADOR) ---
  {
    codigo: 'MG.ESP.DEF',
    nome: 'Definidor (Artigo)',
    descricao: 'Indica se o substantivo é específico ou genérico',
    categoria_pai: 'MG.ESP',
    exemplos: ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas'],
    status: 'ativo'
  },
  {
    codigo: 'MG.ESP.QUA',
    nome: 'Quantificador',
    descricao: 'Delimita a quantidade ou posição de um ser',
    categoria_pai: 'MG.ESP',
    exemplos: ['dois', 'meio', 'vários', 'primeiro', 'alguns', 'muitos'],
    status: 'ativo'
  },

  // --- MG.DEI (DEÍCTICO) ---
  {
    codigo: 'MG.DEI.PES',
    nome: 'Pessoal',
    descricao: 'Refere-se às pessoas do discurso',
    categoria_pai: 'MG.DEI',
    exemplos: ['eu', 'tu', 'ele', 'me', 'te', 'lhe', 'nós', 'vós'],
    status: 'ativo'
  },
  {
    codigo: 'MG.DEI.POS',
    nome: 'Possessivo',
    descricao: 'Indica posse em relação a uma pessoa do discurso',
    categoria_pai: 'MG.DEI',
    exemplos: ['meu', 'teu', 'seu', 'nosso', 'vosso', 'minha', 'tua', 'sua'],
    status: 'ativo'
  },
  {
    codigo: 'MG.DEI.ESP',
    nome: 'Espacial/Textual',
    descricao: 'Localiza ou retoma um termo no espaço ou no texto',
    categoria_pai: 'MG.DEI',
    exemplos: ['este', 'esse', 'aquele', 'que', 'qual', 'cujo', 'onde'],
    status: 'ativo'
  },

  // --- MG.MOD (MODIFICADOR) ---
  {
    codigo: 'MG.MOD.CIR',
    nome: 'Circunstância (Advérbio)',
    descricao: 'Expressa a circunstância da ação ou estado',
    categoria_pai: 'MG.MOD',
    exemplos: ['muito', 'não', 'talvez', 'bem', 'aqui', 'ontem', 'sempre'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.FOC',
    nome: 'Focalizador',
    descricao: 'Destaca ou restringe um elemento na frase',
    categoria_pai: 'MG.MOD',
    exemplos: ['até', 'inclusive', 'mesmo', 'exceto', 'salvo', 'só', 'apenas', 'somente'],
    status: 'ativo'
  },

  // --- MG.AUX (AUXILIAR VERBAL) ---
  {
    codigo: 'MG.AUX.TEM',
    nome: 'Tempo Composto',
    descricao: 'Forma tempos compostos',
    categoria_pai: 'MG.AUX',
    exemplos: ['ter', 'haver'],
    status: 'ativo'
  },
  {
    codigo: 'MG.AUX.VOZ',
    nome: 'Voz Passiva',
    descricao: 'Forma a voz passiva analítica',
    categoria_pai: 'MG.AUX',
    exemplos: ['ser'],
    status: 'ativo'
  },
  {
    codigo: 'MG.AUX.LOC',
    nome: 'Locução Verbal',
    descricao: 'Combina-se com verbo principal para expressar nuances',
    categoria_pai: 'MG.AUX',
    exemplos: ['começar', 'estar', 'ir', 'dever', 'poder', 'querer'],
    status: 'ativo'
  },

  // --- MG.VRL (VERBO RELACIONAL) ---
  {
    codigo: 'MG.VRL.PER',
    nome: 'Estado Permanente',
    descricao: 'Indica estado ou característica permanente',
    categoria_pai: 'MG.VRL',
    exemplos: ['ser'],
    status: 'ativo'
  },
  {
    codigo: 'MG.VRL.TRA',
    nome: 'Estado Transitório',
    descricao: 'Indica estado ou condição temporária',
    categoria_pai: 'MG.VRL',
    exemplos: ['estar'],
    status: 'ativo'
  },
  {
    codigo: 'MG.VRL.MUD',
    nome: 'Mudança de Estado',
    descricao: 'Indica transformação ou mudança',
    categoria_pai: 'MG.VRL',
    exemplos: ['ficar', 'tornar-se', 'fazer-se', 'virar'],
    status: 'ativo'
  },
  {
    codigo: 'MG.VRL.APA',
    nome: 'Estado Aparente',
    descricao: 'Indica aparência ou percepção',
    categoria_pai: 'MG.VRL',
    exemplos: ['parecer', 'assemelhar-se'],
    status: 'ativo'
  },
  {
    codigo: 'MG.VRL.CON',
    nome: 'Permanência de Estado',
    descricao: 'Indica continuidade de um estado',
    categoria_pai: 'MG.VRL',
    exemplos: ['permanecer', 'continuar', 'seguir'],
    status: 'ativo'
  },

  // --- MG.EXP (EXPRESSIVO) ---
  {
    codigo: 'MG.EXP.EMO',
    nome: 'Emoção (Interjeição)',
    descricao: 'Manifesta um estado emocional',
    categoria_pai: 'MG.EXP',
    exemplos: ['oba', 'ai', 'nossa', 'ufa', 'oxente', 'eita', 'bah'],
    status: 'ativo'
  },
  {
    codigo: 'MG.EXP.APE',
    nome: 'Apelo (Vocativo)',
    descricao: 'Usado para chamar ou interpelar o interlocutor',
    categoria_pai: 'MG.EXP',
    exemplos: ['ó', 'ei', 'psiu'],
    status: 'ativo'
  },
  {
    codigo: 'MG.EXP.ONO',
    nome: 'Onomatopeia',
    descricao: 'Imita sons ou ruídos',
    categoria_pai: 'MG.EXP',
    exemplos: ['miau', 'tic-tac', 'trim-trim', 'bang', 'crash'],
    status: 'ativo'
  },

  // --- MG.NPR (NOMES PRÓPRIOS) ---
  {
    codigo: 'MG.NPR.PES',
    nome: 'Pessoa',
    descricao: 'Nomes de pessoas, personagens ou figuras históricas',
    categoria_pai: 'MG.NPR',
    exemplos: ['Maria', 'João', 'Cristo', 'Tiradentes', 'Dom Pedro'],
    status: 'ativo'
  },
  {
    codigo: 'MG.NPR.LOC',
    nome: 'Lugar',
    descricao: 'Nomes de locais geográficos',
    categoria_pai: 'MG.NPR',
    exemplos: ['Brasil', 'São Paulo', 'Rio Grande do Sul', 'Pampas', 'Amazonas'],
    status: 'ativo'
  },
  {
    codigo: 'MG.NPR.REL',
    nome: 'Religioso',
    descricao: 'Nomes de divindades, entidades religiosas ou santos',
    categoria_pai: 'MG.NPR',
    exemplos: ['Deus', 'Cristo', 'Nossa Senhora', 'São Jorge', 'Oxalá'],
    status: 'ativo'
  },
  {
    codigo: 'MG.NPR.OUT',
    nome: 'Outros',
    descricao: 'Outros nomes próprios não categorizados',
    categoria_pai: 'MG.NPR',
    exemplos: ['Natal', 'Páscoa', 'Carnaval'],
    status: 'ativo'
  },

  // ============ NÍVEL 4: ESPECIFICAÇÕES SEMÂNTICAS ============

  // --- MG.CON.REL (RELACIONAL) ---
  {
    codigo: 'MG.CON.REL.LUG.EST',
    nome: 'Lugar Estático',
    descricao: 'Indica localização estática no espaço',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['em', 'sobre', 'sob', 'entre', 'junto a', 'perto de'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.REL.LUG.DES',
    nome: 'Lugar Destino',
    descricao: 'Indica direção ou ponto de chegada',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['a', 'para', 'até', 'rumo a'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.REL.LUG.ORI',
    nome: 'Lugar Origem',
    descricao: 'Indica ponto de partida',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['de', 'desde'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.REL.TEM.PON',
    nome: 'Tempo Pontual',
    descricao: 'Indica momento específico no tempo',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['em', 'a', 'por'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.REL.CAU',
    nome: 'Causa',
    descricao: 'Indica motivo ou razão',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['por', 'devido a', 'por causa de', 'em virtude de'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.REL.FIN',
    nome: 'Finalidade',
    descricao: 'Indica objetivo ou propósito',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['para', 'a fim de', 'com o intuito de'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.REL.INS',
    nome: 'Instrumento',
    descricao: 'Indica meio ou instrumento',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['com', 'por meio de', 'através de'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.REL.POS',
    nome: 'Posse',
    descricao: 'Indica relação de posse ou pertencimento',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['de'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.REL.COM',
    nome: 'Companhia',
    descricao: 'Indica acompanhamento',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['com', 'junto com'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.REL.MOD',
    nome: 'Modo',
    descricao: 'Indica maneira de realizar a ação',
    categoria_pai: 'MG.CON.REL',
    exemplos: ['com', 'sem', 'a'],
    status: 'ativo'
  },

  // --- MG.CON.ORA (ORACIONAL) ---
  {
    codigo: 'MG.CON.ORA.ADI.AFI',
    nome: 'Adição Afirmativa',
    descricao: 'Adiciona informação afirmativa',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['e', 'também', 'além disso', 'ademais'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.ADI.NEG',
    nome: 'Adição Negativa',
    descricao: 'Adiciona informação negativa',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['nem', 'tampouco'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.OPO.ADV',
    nome: 'Oposição Adversativa',
    descricao: 'Expressa contraste ou oposição',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['mas', 'porém', 'contudo', 'todavia', 'no entanto'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.OPO.CON',
    nome: 'Oposição Concessiva',
    descricao: 'Indica concessão apesar de obstáculo',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['embora', 'apesar de', 'ainda que', 'conquanto'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.CAU',
    nome: 'Causa',
    descricao: 'Indica razão ou motivo',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['porque', 'pois', 'já que', 'visto que', 'uma vez que'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.CON',
    nome: 'Condição',
    descricao: 'Expressa condição ou hipótese',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['se', 'caso', 'desde que', 'contanto que'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.TEM.SIM',
    nome: 'Tempo Simultaneidade',
    descricao: 'Indica ações simultâneas',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['enquanto', 'quando', 'à medida que', 'ao passo que'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.TEM.ANT',
    nome: 'Tempo Anterioridade',
    descricao: 'Indica ação anterior',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['antes que', 'até que'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.TEM.POS',
    nome: 'Tempo Posterioridade',
    descricao: 'Indica ação posterior',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['depois que', 'logo que', 'assim que'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.FIN',
    nome: 'Finalidade',
    descricao: 'Expressa objetivo ou propósito',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['para que', 'a fim de que'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.COM',
    nome: 'Comparação',
    descricao: 'Estabelece comparação',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['como', 'tal como', 'assim como', 'mais que', 'menos que'],
    status: 'ativo'
  },
  {
    codigo: 'MG.CON.ORA.CON.SEQ',
    nome: 'Consequência',
    descricao: 'Indica resultado ou consequência',
    categoria_pai: 'MG.CON.ORA',
    exemplos: ['que', 'de modo que', 'de forma que', 'tanto que'],
    status: 'ativo'
  },

  // --- MG.ESP.DEF (DEFINIDOR) ---
  {
    codigo: 'MG.ESP.DEF.DEF',
    nome: 'Definido',
    descricao: 'Indica ser específico e conhecido',
    categoria_pai: 'MG.ESP.DEF',
    exemplos: ['o', 'a', 'os', 'as'],
    status: 'ativo'
  },
  {
    codigo: 'MG.ESP.DEF.IND',
    nome: 'Indefinido',
    descricao: 'Indica ser não específico',
    categoria_pai: 'MG.ESP.DEF',
    exemplos: ['um', 'uma', 'uns', 'umas'],
    status: 'ativo'
  },

  // --- MG.ESP.QUA (QUANTIFICADOR) ---
  {
    codigo: 'MG.ESP.QUA.EXA.CAR',
    nome: 'Quantidade Exata Cardinal',
    descricao: 'Indica quantidade precisa',
    categoria_pai: 'MG.ESP.QUA',
    exemplos: ['um', 'dois', 'três', 'dez', 'cem', 'mil'],
    status: 'ativo'
  },
  {
    codigo: 'MG.ESP.QUA.EXA.FRA',
    nome: 'Quantidade Exata Fracionária',
    descricao: 'Indica fração ou parte',
    categoria_pai: 'MG.ESP.QUA',
    exemplos: ['meio', 'terço', 'quarto'],
    status: 'ativo'
  },
  {
    codigo: 'MG.ESP.QUA.IMP',
    nome: 'Quantidade Imprecisa',
    descricao: 'Indica quantidade aproximada',
    categoria_pai: 'MG.ESP.QUA',
    exemplos: ['vários', 'alguns', 'muitos', 'poucos', 'bastante'],
    status: 'ativo'
  },
  {
    codigo: 'MG.ESP.QUA.ORD',
    nome: 'Ordem',
    descricao: 'Indica posição em sequência',
    categoria_pai: 'MG.ESP.QUA',
    exemplos: ['primeiro', 'segundo', 'terceiro', 'último'],
    status: 'ativo'
  },
  {
    codigo: 'MG.ESP.QUA.MUL',
    nome: 'Multiplicativo',
    descricao: 'Indica multiplicação',
    categoria_pai: 'MG.ESP.QUA',
    exemplos: ['dobro', 'triplo', 'quádruplo'],
    status: 'ativo'
  },

  // --- MG.DEI.PES (PESSOAL) ---
  {
    codigo: 'MG.DEI.PES.RET',
    nome: 'Caso Reto',
    descricao: 'Pronome pessoal do caso reto (sujeito)',
    categoria_pai: 'MG.DEI.PES',
    exemplos: ['eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas'],
    status: 'ativo'
  },
  {
    codigo: 'MG.DEI.PES.OBL',
    nome: 'Caso Oblíquo',
    descricao: 'Pronome pessoal do caso oblíquo (objeto)',
    categoria_pai: 'MG.DEI.PES',
    exemplos: ['me', 'te', 'se', 'lhe', 'o', 'a', 'nos', 'vos', 'lhes'],
    status: 'ativo'
  },

  // --- MG.DEI.POS (POSSESSIVO) ---
  {
    codigo: 'MG.DEI.POS.EMI',
    nome: 'Posse Emissor',
    descricao: 'Indica posse do emissor (1ª pessoa)',
    categoria_pai: 'MG.DEI.POS',
    exemplos: ['meu', 'minha', 'meus', 'minhas', 'nosso', 'nossa'],
    status: 'ativo'
  },
  {
    codigo: 'MG.DEI.POS.REC',
    nome: 'Posse Receptor',
    descricao: 'Indica posse do receptor (2ª pessoa)',
    categoria_pai: 'MG.DEI.POS',
    exemplos: ['teu', 'tua', 'teus', 'tuas', 'vosso', 'vossa'],
    status: 'ativo'
  },
  {
    codigo: 'MG.DEI.POS.REF',
    nome: 'Posse Referente',
    descricao: 'Indica posse do referente (3ª pessoa)',
    categoria_pai: 'MG.DEI.POS',
    exemplos: ['seu', 'sua', 'seus', 'suas'],
    status: 'ativo'
  },

  // --- MG.DEI.ESP (ESPACIAL/TEXTUAL) ---
  {
    codigo: 'MG.DEI.ESP.PRO.EMI',
    nome: 'Proximidade Emissor',
    descricao: 'Indica proximidade do emissor',
    categoria_pai: 'MG.DEI.ESP',
    exemplos: ['este', 'esta', 'estes', 'estas', 'isto'],
    status: 'ativo'
  },
  {
    codigo: 'MG.DEI.ESP.PRO.REC',
    nome: 'Proximidade Receptor',
    descricao: 'Indica proximidade do receptor',
    categoria_pai: 'MG.DEI.ESP',
    exemplos: ['esse', 'essa', 'esses', 'essas', 'isso'],
    status: 'ativo'
  },
  {
    codigo: 'MG.DEI.ESP.DIS',
    nome: 'Distância',
    descricao: 'Indica distância de ambos',
    categoria_pai: 'MG.DEI.ESP',
    exemplos: ['aquele', 'aquela', 'aqueles', 'aquelas', 'aquilo'],
    status: 'ativo'
  },
  {
    codigo: 'MG.DEI.ESP.RET.GER',
    nome: 'Retomada Geral',
    descricao: 'Retoma termo anteriormente mencionado',
    categoria_pai: 'MG.DEI.ESP',
    exemplos: ['que', 'qual', 'quais', 'quem', 'onde'],
    status: 'ativo'
  },
  {
    codigo: 'MG.DEI.ESP.RET.POS',
    nome: 'Retomada com Posse',
    descricao: 'Retoma termo com ideia de posse',
    categoria_pai: 'MG.DEI.ESP',
    exemplos: ['cujo', 'cuja', 'cujos', 'cujas'],
    status: 'ativo'
  },

  // --- MG.MOD.CIR (CIRCUNSTÂNCIA) ---
  {
    codigo: 'MG.MOD.CIR.INT.AMP',
    nome: 'Intensidade Ampliação',
    descricao: 'Intensifica positivamente',
    categoria_pai: 'MG.MOD.CIR',
    exemplos: ['muito', 'demais', 'bastante', 'deveras', 'extremamente'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.CIR.INT.DIM',
    nome: 'Intensidade Diminuição',
    descricao: 'Atenua a intensidade',
    categoria_pai: 'MG.MOD.CIR',
    exemplos: ['pouco', 'menos', 'quase'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.CIR.NEG.TOT',
    nome: 'Negação Total',
    descricao: 'Nega completamente',
    categoria_pai: 'MG.MOD.CIR',
    exemplos: ['não', 'nunca', 'jamais', 'nem'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.CIR.DUV.PRO',
    nome: 'Dúvida Probabilidade',
    descricao: 'Expressa incerteza ou possibilidade',
    categoria_pai: 'MG.MOD.CIR',
    exemplos: ['talvez', 'provavelmente', 'porventura', 'quiçá', 'acaso'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.CIR.MOD',
    nome: 'Modo',
    descricao: 'Indica a maneira da ação',
    categoria_pai: 'MG.MOD.CIR',
    exemplos: ['bem', 'mal', 'assim', 'melhor', 'pior'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.CIR.LUG',
    nome: 'Lugar',
    descricao: 'Indica localização espacial',
    categoria_pai: 'MG.MOD.CIR',
    exemplos: ['aqui', 'ali', 'aí', 'lá', 'acolá', 'cá', 'onde'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.CIR.TEM',
    nome: 'Tempo',
    descricao: 'Indica localização temporal',
    categoria_pai: 'MG.MOD.CIR',
    exemplos: ['ontem', 'hoje', 'amanhã', 'agora', 'já', 'ainda', 'sempre'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.CIR.AFI',
    nome: 'Afirmação',
    descricao: 'Reforça afirmação',
    categoria_pai: 'MG.MOD.CIR',
    exemplos: ['sim', 'certamente', 'realmente', 'efetivamente'],
    status: 'ativo'
  },

  // --- MG.MOD.FOC (FOCALIZADOR) ---
  {
    codigo: 'MG.MOD.FOC.INC',
    nome: 'Foco Inclusão',
    descricao: 'Inclui elemento adicional',
    categoria_pai: 'MG.MOD.FOC',
    exemplos: ['até', 'inclusive', 'mesmo', 'também'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.FOC.EXC',
    nome: 'Foco Exclusão',
    descricao: 'Exclui elemento',
    categoria_pai: 'MG.MOD.FOC',
    exemplos: ['exceto', 'salvo', 'senão', 'fora'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.FOC.RES',
    nome: 'Foco Restrição',
    descricao: 'Restringe a apenas um elemento',
    categoria_pai: 'MG.MOD.FOC',
    exemplos: ['só', 'somente', 'apenas', 'unicamente'],
    status: 'ativo'
  },
  {
    codigo: 'MG.MOD.FOC.REA',
    nome: 'Foco Realce',
    descricao: 'Dá ênfase a um elemento',
    categoria_pai: 'MG.MOD.FOC',
    exemplos: ['é que', 'lá', 'cá'],
    status: 'ativo'
  },

  // --- MG.AUX.TEM (TEMPO COMPOSTO) ---
  {
    codigo: 'MG.AUX.TEM.TER',
    nome: 'Ter',
    descricao: 'Auxiliar ter em tempos compostos',
    categoria_pai: 'MG.AUX.TEM',
    exemplos: ['tenho cantado', 'tinha visto', 'terei feito'],
    status: 'ativo'
  },
  {
    codigo: 'MG.AUX.TEM.HAV',
    nome: 'Haver',
    descricao: 'Auxiliar haver em tempos compostos',
    categoria_pai: 'MG.AUX.TEM',
    exemplos: ['hei de cantar', 'havia de ir'],
    status: 'ativo'
  },

  // --- MG.AUX.VOZ (VOZ PASSIVA) ---
  {
    codigo: 'MG.AUX.VOZ.SER',
    nome: 'Ser',
    descricao: 'Auxiliar ser na voz passiva',
    categoria_pai: 'MG.AUX.VOZ',
    exemplos: ['foi cantado', 'será feito', 'é amado'],
    status: 'ativo'
  },

  // --- MG.AUX.LOC (LOCUÇÃO VERBAL) ---
  {
    codigo: 'MG.AUX.LOC.INC',
    nome: 'Aspecto Incoativo',
    descricao: 'Indica início da ação',
    categoria_pai: 'MG.AUX.LOC',
    exemplos: ['começar a', 'passar a', 'pôr-se a'],
    status: 'ativo'
  },
  {
    codigo: 'MG.AUX.LOC.DUR',
    nome: 'Aspecto Durativo',
    descricao: 'Indica ação em progresso',
    categoria_pai: 'MG.AUX.LOC',
    exemplos: ['estar', 'andar', 'vir'],
    status: 'ativo'
  },
  {
    codigo: 'MG.AUX.LOC.TER',
    nome: 'Aspecto Terminativo',
    descricao: 'Indica fim da ação',
    categoria_pai: 'MG.AUX.LOC',
    exemplos: ['acabar de', 'deixar de', 'cessar de'],
    status: 'ativo'
  },
  {
    codigo: 'MG.AUX.LOC.OBR',
    nome: 'Modalidade Obrigação',
    descricao: 'Indica necessidade ou dever',
    categoria_pai: 'MG.AUX.LOC',
    exemplos: ['dever', 'ter de', 'haver de'],
    status: 'ativo'
  },
  {
    codigo: 'MG.AUX.LOC.INT',
    nome: 'Modalidade Intenção',
    descricao: 'Indica intenção ou futuro próximo',
    categoria_pai: 'MG.AUX.LOC',
    exemplos: ['ir', 'pretender'],
    status: 'ativo'
  },
  {
    codigo: 'MG.AUX.LOC.POS',
    nome: 'Modalidade Possibilidade',
    descricao: 'Indica capacidade ou permissão',
    categoria_pai: 'MG.AUX.LOC',
    exemplos: ['poder', 'conseguir'],
    status: 'ativo'
  },

  // --- MG.EXP.EMO (EMOÇÃO) ---
  {
    codigo: 'MG.EXP.EMO.ALE',
    nome: 'Emoção Alegria',
    descricao: 'Expressa alegria ou satisfação',
    categoria_pai: 'MG.EXP.EMO',
    exemplos: ['oba', 'eba', 'viva', 'hurra'],
    status: 'ativo'
  },
  {
    codigo: 'MG.EXP.EMO.DOR',
    nome: 'Emoção Dor',
    descricao: 'Expressa dor física ou emocional',
    categoria_pai: 'MG.EXP.EMO',
    exemplos: ['ai', 'ui', ' ai de mim'],
    status: 'ativo'
  },
  {
    codigo: 'MG.EXP.EMO.SUR',
    nome: 'Emoção Surpresa',
    descricao: 'Expressa espanto ou admiração',
    categoria_pai: 'MG.EXP.EMO',
    exemplos: ['nossa', 'puxa', 'caramba', 'uau', 'eita', 'oxente', 'bah'],
    status: 'ativo'
  },
  {
    codigo: 'MG.EXP.EMO.ALI',
    nome: 'Emoção Alívio',
    descricao: 'Expressa alívio',
    categoria_pai: 'MG.EXP.EMO',
    exemplos: ['ufa', 'arre'],
    status: 'ativo'
  },
  {
    codigo: 'MG.EXP.EMO.MED',
    nome: 'Emoção Medo',
    descricao: 'Expressa medo ou susto',
    categoria_pai: 'MG.EXP.EMO',
    exemplos: ['socorro', 'credo', 'cruzes'],
    status: 'ativo'
  },
  {
    codigo: 'MG.EXP.EMO.TRI',
    nome: 'Emoção Tristeza',
    descricao: 'Expressa tristeza ou pesar',
    categoria_pai: 'MG.EXP.EMO',
    exemplos: ['ah', 'oh', 'ai de mim'],
    status: 'ativo'
  },
];

async function seedGrammaticalMarkers() {
  let inseridos = 0;
  let pulados = 0;
  let erros = 0;

  console.log(`🚀 Iniciando seed de ${MARCADORES_GRAMATICAIS.length} tagsets gramaticais...`);

  for (const tagset of MARCADORES_GRAMATICAIS) {
    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('semantic_tagset')
        .select('codigo')
        .eq('codigo', tagset.codigo)
        .single();

      if (existing) {
        console.log(`⏭️  Pulando ${tagset.codigo} - já existe`);
        pulados++;
        continue;
      }

      // Inserir novo
      const { error } = await supabase
        .from('semantic_tagset')
        .insert({
          ...tagset,
          aprovado_em: new Date().toISOString(),
          aprovado_por: 'sistema_seed',
        });

      if (error) throw error;

      console.log(`✅ Inserido: ${tagset.codigo} - ${tagset.nome}`);
      inseridos++;
    } catch (error) {
      console.error(`❌ Erro ao inserir ${tagset.codigo}:`, error);
      erros++;
    }
  }

  // Recalcular hierarquia
  console.log('\n🔄 Recalculando hierarquia...');
  const { error: hierarquiaError } = await supabase.rpc('calculate_tagset_hierarchy');
  
  if (hierarquiaError) {
    console.error('❌ Erro ao recalcular hierarquia:', hierarquiaError);
  } else {
    console.log('✅ Hierarquia recalculada com sucesso');
  }

  console.log('\n📊 Resumo:');
  console.log(`   ✅ Inseridos: ${inseridos}`);
  console.log(`   ⏭️  Pulados: ${pulados}`);
  console.log(`   ❌ Erros: ${erros}`);
}

// Executar
seedGrammaticalMarkers().catch(console.error);
