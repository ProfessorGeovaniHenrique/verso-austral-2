/**
 * Padrões Adjetivais do Português Brasileiro
 * Regras de flexão, concordância e derivação dos adjetivos
 */

export interface AdjectivePattern {
  masculine: string;
  feminine: string;
  rule: string;
}

// Padrões de flexão de gênero dos adjetivos
export const genderFlexionPatterns: AdjectivePattern[] = [
  // Padrão geral: -o/-a
  {
    masculine: 'o',
    feminine: 'a',
    rule: 'Substituir -o por -a',
  },
  
  // Adjetivos terminados em -or
  {
    masculine: 'or',
    feminine: 'ora',
    rule: 'Adicionar -a',
  },
  
  // Adjetivos terminados em -ês
  {
    masculine: 'ês',
    feminine: 'esa',
    rule: 'Substituir -ês por -esa',
  },
  
  // Adjetivos terminados em -u
  {
    masculine: 'u',
    feminine: 'ua',
    rule: 'Adicionar -a',
  },
];

// Adjetivos uniformes (não variam em gênero)
export const invariantAdjectives = [
  'feliz', 'triste', 'alegre', 'forte', 'doce', 'simples',
  'fácil', 'difícil', 'útil', 'gentil', 'frágil', 'hábil',
  'comum', 'jovem', 'selvagem', 'verde', 'grande', 'pobre',
  'nobre', 'livre', 'suave', 'breve', 'leve', 'grave'
];

// Sufixos adjetivais (formam adjetivos a partir de substantivos)
export const adjectivalSuffixes = [
  // De substantivos
  'oso', 'osa',      // amor → amoroso
  'ico', 'ica',      // história → histórico
  'ário', 'ária',    // banco → bancário
  'eiro', 'eira',    // Brasil → brasileiro
  'ino', 'ina',      // campo → campino
  'al',              // pessoa → pessoal
  'ar',              // círculo → circular
  'ense',            // rio → riense
  'ano', 'ana',      // América → americano
  'ês', 'esa',       // França → francês
  
  // Sufixos de qualidade
  'ável', 'ível',    // amar → amável
  'vel',             // possível
  'dor', 'dora',     // falar → falador
  'ante',            // brilhar → brilhante
  'nte',             // presente
  'udo', 'uda',      // barba → barbudo
];

// Graus do adjetivo
export const comparativePatterns = {
  superioridade: 'mais ... (do) que',
  inferioridade: 'menos ... (do) que',
  igualdade: 'tão ... quanto/como',
};

export const superlativePatterns = {
  analitico: {
    absoluto: 'muito/extremamente + adjetivo',
    relativo: {
      superioridade: 'o mais + adjetivo + de/entre',
      inferioridade: 'o menos + adjetivo + de/entre',
    },
  },
  sintetico: {
    regular: '-íssimo/-íssima',
    irregulares: {
      'bom': 'ótimo',
      'mau': 'péssimo',
      'grande': 'máximo',
      'pequeno': 'mínimo',
      'alto': 'supremo',
      'baixo': 'ínfimo',
    },
  },
};

// Adjetivos do campo semântico gauchesco
export const regionalAdjectives = [
  'gaúcho', 'campeiro', 'tradicionalista', 'pampeano', 'crioulo',
  'nativo', 'mateiro', 'guasca', 'farroupilha', 'missioneiro',
  'serrano', 'fronteiriço', 'sulino', 'rio-grandense', 'bagual'
];

// Adjetivos de cores (invariáveis vs. variáveis)
export const colorAdjectives = {
  variable: [
    'branco', 'preto', 'vermelho', 'amarelo', 'verde', 'azul',
    'roxo', 'cinza', 'rosa', 'laranja'
  ],
  invariant: [
    'bege', 'marrom', 'turquesa', 'violeta'
  ],
  compound: {
    rule: 'Último elemento varia',
    examples: ['verde-claro', 'azul-escuro', 'amarelo-ouro']
  },
};
