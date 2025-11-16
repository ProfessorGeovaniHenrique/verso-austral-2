/**
 * Morfologia Nominal do Português Brasileiro
 * Regras de formação de plural, gênero e derivação dos substantivos
 */

export interface PluralRule {
  pattern: RegExp;
  replacement: string;
  examples: string[];
}

// Regras de formação de plural
export const pluralRules: PluralRule[] = [
  // Regra geral: + s
  {
    pattern: /([aeiou])$/,
    replacement: '$1s',
    examples: ['casa → casas', 'povo → povos', 'trilho → trilhos'],
  },
  
  // Palavras terminadas em -ão
  {
    pattern: /ão$/,
    replacement: 'ões',
    examples: ['coração → corações', 'canção → canções'],
  },
  {
    pattern: /ão$/,
    replacement: 'ãos',
    examples: ['mão → mãos', 'cidadão → cidadãos'],
  },
  {
    pattern: /ão$/,
    replacement: 'ães',
    examples: ['cão → cães', 'pão → pães'],
  },
  
  // Palavras terminadas em -m
  {
    pattern: /m$/,
    replacement: 'ns',
    examples: ['homem → homens', 'viagem → viagens'],
  },
  
  // Palavras terminadas em -r, -z, -s
  {
    pattern: /([rzs])$/,
    replacement: '$1es',
    examples: ['flor → flores', 'luz → luzes', 'mês → meses'],
  },
  
  // Palavras terminadas em -al, -el, -ol, -ul
  {
    pattern: /([aeo])l$/,
    replacement: '$1is',
    examples: ['animal → animais', 'papel → papéis', 'sol → sóis'],
  },
  
  // Palavras terminadas em -il (átono)
  {
    pattern: /il$/,
    replacement: 'eis',
    examples: ['fácil → fáceis', 'difícil → difíceis'],
  },
  
  // Palavras terminadas em -il (tônico)
  {
    pattern: /il$/,
    replacement: 'is',
    examples: ['barril → barris', 'funil → funis'],
  },
];

// Marcadores de gênero
export const genderMarkers = {
  masculine: {
    endings: ['o', 'or', 'ão', 'u'],
    examples: ['menino', 'professor', 'irmão', 'urubu'],
  },
  feminine: {
    endings: ['a', 'ora', 'ã', 'iz', 'ade', 'ice', 'ude'],
    examples: ['menina', 'professora', 'irmã', 'atriz', 'cidade', 'cicatriz', 'virtude'],
  },
  invariant: {
    words: ['artista', 'dentista', 'estudante', 'selvagem', 'jovem', 'feliz'],
  },
};

// Sufixos nominalizadores (formam substantivos a partir de verbos/adjetivos)
export const nominalizingSuffixes = [
  // De verbos
  'ção', 'mento', 'ncia', 'dor', 'dora', 'agem', 'ura',
  'eza', 'ância', 'ência', 'ismo', 'ista',
  
  // De adjetivos
  'dade', 'ez', 'eza', 'ice', 'ície', 'ude', 'ura', 'or',
  
  // Diminutivos
  'inho', 'inha', 'zinho', 'zinha', 'ito', 'ita',
  
  // Aumentativos
  'ão', 'ona', 'aço', 'aça', 'ázio', 'arão',
];

// Substantivos coletivos comuns
export const collectiveNouns: Record<string, string> = {
  'boi': 'boiada',
  'lobo': 'alcateia',
  'peixe': 'cardume',
  'abelha': 'colmeia',
  'ilha': 'arquipélago',
  'árvore': 'bosque',
  'pessoa': 'multidão',
  'cavalo': 'manada',
  'ovelha': 'rebanho',
  'pássaro': 'bando',
};

// Substantivos comuns ao gauchesco/regional
export const regionalNouns = [
  'gaúcho', 'prenda', 'pago', 'querência', 'galpão', 'estância',
  'tropeiro', 'carreta', 'chimarrão', 'mate', 'bombacha', 'pilcha',
  'poncho', 'laço', 'boleadeira', 'facão', 'cuia', 'chaleira',
  'churrasco', 'charque', 'gado', 'cavalo', 'pampa', 'coxilha',
  'china', 'prenda', 'peão', 'patrão', 'rodeio', 'fandango'
];
