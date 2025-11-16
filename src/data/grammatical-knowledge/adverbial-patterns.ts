/**
 * Padrões Adverbiais do Português Brasileiro
 * Regras de formação e classificação dos advérbios
 */

// Sufixo formador de advérbios
export const adverbialSuffix = {
  suffix: 'mente',
  rule: 'adjetivo feminino + mente',
  examples: [
    { adjective: 'rápida', adverb: 'rapidamente' },
    { adjective: 'lenta', adverb: 'lentamente' },
    { adjective: 'feliz', adverb: 'felizmente' },
    { adjective: 'fácil', adverb: 'facilmente' },
  ],
};

// Classificação semântica dos advérbios
export const adverbialClasses = {
  tempo: [
    'agora', 'hoje', 'amanhã', 'ontem', 'sempre', 'nunca', 'já',
    'ainda', 'logo', 'cedo', 'tarde', 'antes', 'depois', 'outrora',
    'antigamente', 'brevemente', 'constantemente', 'frequentemente'
  ],
  
  lugar: [
    'aqui', 'aí', 'ali', 'lá', 'cá', 'acolá', 'perto', 'longe',
    'dentro', 'fora', 'acima', 'abaixo', 'adiante', 'atrás',
    'embaixo', 'onde', 'aonde', 'donde'
  ],
  
  modo: [
    'bem', 'mal', 'assim', 'devagar', 'depressa', 'melhor', 'pior',
    'apenas', 'como', 'quase', 'rapidamente', 'lentamente'
  ],
  
  intensidade: [
    'muito', 'pouco', 'bastante', 'demais', 'mais', 'menos',
    'tão', 'tanto', 'assaz', 'demasiado', 'extremamente',
    'completamente', 'totalmente'
  ],
  
  afirmacao: [
    'sim', 'certamente', 'realmente', 'efetivamente', 'deveras',
    'seguramente', 'indubitavelmente', 'verdadeiramente'
  ],
  
  negacao: [
    'não', 'nunca', 'jamais', 'tampouco', 'nem'
  ],
  
  duvida: [
    'talvez', 'quiçá', 'acaso', 'porventura', 'possivelmente',
    'provavelmente', 'eventualmente'
  ],
};

// Locuções adverbiais
export const adverbialPhrases = {
  tempo: [
    'de vez em quando', 'às vezes', 'de repente', 'de manhã',
    'à tarde', 'à noite', 'ao meio-dia', 'em breve'
  ],
  
  lugar: [
    'em cima', 'em baixo', 'ao lado', 'de longe', 'de perto',
    'por aqui', 'por ali', 'por dentro', 'por fora'
  ],
  
  modo: [
    'às pressas', 'às claras', 'às escondidas', 'de cor',
    'de propósito', 'a pé', 'a cavalo', 'em silêncio'
  ],
  
  intensidade: [
    'de todo', 'de muito', 'em excesso', 'por completo'
  ],
};

// Advérbios regionais gauchescos
export const regionalAdverbs = [
  'barbaridade',  // intensificador
  'tchê',        // vocativo/marcador discursivo
  'bah',         // interjeição adverbial
  'capaz',       // dúvida/possibilidade
  'tri',         // intensificador (muito)
];

// Graus do advérbio
export const adverbialDegrees = {
  comparativo: {
    superioridade: 'mais ... (do) que',
    inferioridade: 'menos ... (do) que',
    igualdade: 'tão ... quanto/como',
  },
  superlativo: {
    sintetico: [
      { base: 'bem', superlative: 'ótima/optimamente' },
      { base: 'mal', superlative: 'pessimamente' },
      { base: 'muito', superlative: 'muitíssimo' },
      { base: 'pouco', superlative: 'pouquíssimo' },
    ],
    analitico: 'muito + advérbio',
  },
};
