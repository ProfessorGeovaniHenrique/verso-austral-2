/**
 * Sistema de Pronomes Adverbiais do Português Brasileiro
 * Baseado na Nova Gramática do Português Brasileiro - Ataliba de Castilho (2010)
 * 
 * Pronomes adverbiais compartilham 6 propriedades com pronomes pessoais:
 * 1. Forma átona/tônica
 * 2. Possibilidade de elipse
 * 3. Duplicação (aqui na minha casa)
 * 4. Colocação proclítica/enclítica
 * 5. Função dêitica
 * 6. Podem funcionar como argumentos verbais
 */

export interface PronounAdverbial {
  palavra: string;
  categoria: 'spatial' | 'temporal' | 'modal';
  subcategoria?: 'proximal' | 'medial' | 'distal' | 'present' | 'past' | 'future';
  deixis: boolean;
  canBeArgument: boolean;
  canBeCopied: boolean; // "aqui na minha casa"
  cliticForm?: string;
  examples: string[];
  sharedPropertiesWithPronouns: string[];
}

// ============================================================================
// DÊITICOS ESPACIAIS (Pronomes Adverbiais de Lugar)
// ============================================================================

export const spatialPronounAdverbials: Record<string, PronounAdverbial> = {
  // PROXIMAIS (1ª pessoa - próximo ao falante)
  aqui: {
    palavra: 'aqui',
    categoria: 'spatial',
    subcategoria: 'proximal',
    deixis: true,
    canBeArgument: true,
    canBeCopied: true,
    cliticForm: 'cá',
    examples: [
      'Eu moro aqui',
      'Aqui é minha casa',
      'Venha aqui',
      'aqui na estância' // duplicação
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (aponta local próximo ao falante)',
      'Pode ser argumento: "gosto daqui"',
      'Pode ser duplicado: "aqui na minha casa"',
      'Tem forma clítica: "cá"',
      'Pode ser elidido em contextos específicos',
      'Compartilha distribuição com pronomes pessoais'
    ]
  },
  
  cá: {
    palavra: 'cá',
    categoria: 'spatial',
    subcategoria: 'proximal',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Venha cá',
      'Fica cá comigo',
      'Cá entre nós'
    ],
    sharedPropertiesWithPronouns: [
      'Forma átona/clítica de "aqui"',
      'Função dêitica',
      'Pode ser argumento verbal'
    ]
  },
  
  // MEDIAIS (2ª pessoa - próximo ao ouvinte)
  aí: {
    palavra: 'aí',
    categoria: 'spatial',
    subcategoria: 'medial',
    deixis: true,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Você mora aí?',
      'Fica aí',
      'aí na tua casa', // duplicação
      'Aí está o problema'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (aponta local próximo ao ouvinte)',
      'Pode ser argumento: "saia daí"',
      'Pode ser duplicado: "aí no teu rancho"',
      'Corresponde a "esse/essa" nos demonstrativos',
      'Uso anafórico: "mora em Porto Alegre, aí ele conheceu Maria"'
    ]
  },
  
  // DISTAIS (3ª pessoa - distante de ambos)
  lá: {
    palavra: 'lá',
    categoria: 'spatial',
    subcategoria: 'distal',
    deixis: true,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Ele mora lá',
      'Vou lá amanhã',
      'lá na estância dele', // duplicação
      'lá nos pagos'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (aponta local distante)',
      'Pode ser argumento: "venho de lá"',
      'Pode ser duplicado: "lá no campo"',
      'Corresponde a "aquele/aquela" nos demonstrativos'
    ]
  },
  
  ali: {
    palavra: 'ali',
    categoria: 'spatial',
    subcategoria: 'distal',
    deixis: true,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Está ali',
      'Mora ali',
      'ali na esquina', // duplicação
      'ali no galpão'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (distal, mais específico que "lá")',
      'Pode ser argumento verbal',
      'Pode ser duplicado'
    ]
  },
  
  acolá: {
    palavra: 'acolá',
    categoria: 'spatial',
    subcategoria: 'distal',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Está acolá',
      'Vai para acolá',
      'acolá no horizonte'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (muito distante)',
      'Pode ser argumento verbal',
      'Forma mais literária/formal'
    ]
  },
  
  além: {
    palavra: 'além',
    categoria: 'spatial',
    subcategoria: 'distal',
    deixis: true,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Vai além',
      'além das montanhas',
      'além do horizonte'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (ultrapassar limite)',
      'Pode ser argumento: "vem de além"',
      'Sentido de transcendência espacial'
    ]
  },
  
  // OUTROS ESPACIAIS
  perto: {
    palavra: 'perto',
    categoria: 'spatial',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Mora perto',
      'Fica perto da escola',
      'perto do campo'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa proximidade relativa'
    ]
  },
  
  longe: {
    palavra: 'longe',
    categoria: 'spatial',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Mora longe',
      'Fica longe da cidade',
      'longe dos pagos'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa distância relativa'
    ]
  },
  
  dentro: {
    palavra: 'dentro',
    categoria: 'spatial',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Está dentro',
      'Entra para dentro',
      'dentro do galpão'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa interioridade'
    ]
  },
  
  fora: {
    palavra: 'fora',
    categoria: 'spatial',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Está fora',
      'Vai para fora',
      'fora da casa'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa exterioridade'
    ]
  },
  
  acima: {
    palavra: 'acima',
    categoria: 'spatial',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Olha para acima',
      'acima da cerca',
      'acima das nuvens'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa verticalidade superior'
    ]
  },
  
  abaixo: {
    palavra: 'abaixo',
    categoria: 'spatial',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Olha para abaixo',
      'abaixo da linha',
      'abaixo do esperado'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa verticalidade inferior'
    ]
  },
  
  adiante: {
    palavra: 'adiante',
    categoria: 'spatial',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Vai adiante',
      'Está mais adiante',
      'adiante no caminho'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa anterioridade no espaço'
    ]
  },
  
  atrás: {
    palavra: 'atrás',
    categoria: 'spatial',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Fica atrás',
      'Olha para atrás',
      'atrás da casa'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa posterioridade no espaço'
    ]
  },
  
  embaixo: {
    palavra: 'embaixo',
    categoria: 'spatial',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: true,
    examples: [
      'Está embaixo',
      'embaixo da mesa',
      'embaixo da árvore'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa posição inferior'
    ]
  }
};

// ============================================================================
// DÊITICOS TEMPORAIS (Pronomes Adverbiais de Tempo)
// ============================================================================

export const temporalPronounAdverbials: Record<string, PronounAdverbial> = {
  // PRESENTE
  hoje: {
    palavra: 'hoje',
    categoria: 'temporal',
    subcategoria: 'present',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Trabalho hoje',
      'Hoje é dia de campo',
      'Vou embora hoje'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (tempo presente)',
      'Pode ser argumento: "o hoje é difícil"',
      'Corresponde a "este" nos demonstrativos'
    ]
  },
  
  agora: {
    palavra: 'agora',
    categoria: 'temporal',
    subcategoria: 'present',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Faço agora',
      'Agora é a hora',
      'Vem agora'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (momento presente imediato)',
      'Pode ser argumento verbal',
      'Corresponde a "este" nos demonstrativos'
    ]
  },
  
  já: {
    palavra: 'já',
    categoria: 'temporal',
    subcategoria: 'present',
    deixis: true,
    canBeArgument: false,
    canBeCopied: false,
    examples: [
      'Vou já',
      'Já fiz',
      'Já está pronto'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (tempo imediato/concluso)',
      'Marca aspecto perfectivo'
    ]
  },
  
  // PASSADO
  ontem: {
    palavra: 'ontem',
    categoria: 'temporal',
    subcategoria: 'past',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Trabalhei ontem',
      'Ontem foi bom',
      'Voltei ontem'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (passado recente)',
      'Pode ser argumento: "o ontem já passou"',
      'Corresponde a "esse" nos demonstrativos'
    ]
  },
  
  antes: {
    palavra: 'antes',
    categoria: 'temporal',
    subcategoria: 'past',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Fiz antes',
      'Chegou antes',
      'antes do amanhecer'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (anterioridade temporal)',
      'Pode ser argumento verbal',
      'Expressa precedência'
    ]
  },
  
  outrora: {
    palavra: 'outrora',
    categoria: 'temporal',
    subcategoria: 'past',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Outrora foi diferente',
      'Viveu outrora no campo',
      'os tempos de outrora'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (passado distante)',
      'Pode ser argumento: "o outrora era melhor"',
      'Forma literária/formal'
    ]
  },
  
  antigamente: {
    palavra: 'antigamente',
    categoria: 'temporal',
    subcategoria: 'past',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Antigamente era assim',
      'Trabalhava antigamente no campo',
      'os costumes de antigamente'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (passado genérico)',
      'Pode ser argumento',
      'Expressa tempo não específico passado'
    ]
  },
  
  // FUTURO
  amanhã: {
    palavra: 'amanhã',
    categoria: 'temporal',
    subcategoria: 'future',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Vou amanhã',
      'Amanhã é outro dia',
      'Trabalho amanhã'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (futuro próximo)',
      'Pode ser argumento: "o amanhã é incerto"',
      'Corresponde a "aquele" nos demonstrativos'
    ]
  },
  
  depois: {
    palavra: 'depois',
    categoria: 'temporal',
    subcategoria: 'future',
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Faço depois',
      'Vem depois',
      'depois do almoço'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (posterioridade temporal)',
      'Pode ser argumento verbal',
      'Expressa sequência temporal'
    ]
  },
  
  logo: {
    palavra: 'logo',
    categoria: 'temporal',
    subcategoria: 'future',
    deixis: true,
    canBeArgument: false,
    canBeCopied: false,
    examples: [
      'Volto logo',
      'Logo estará pronto',
      'Vem logo'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (futuro imediato)',
      'Expressa brevidade temporal'
    ]
  },
  
  // OUTROS TEMPORAIS
  cedo: {
    palavra: 'cedo',
    categoria: 'temporal',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Acordou cedo',
      'Chegou cedo',
      'É muito cedo'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa tempo inicial do dia'
    ]
  },
  
  tarde: {
    palavra: 'tarde',
    categoria: 'temporal',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Chegou tarde',
      'É tarde demais',
      'Trabalha até tarde'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa tempo final do dia ou posterioridade'
    ]
  },
  
  sempre: {
    palavra: 'sempre',
    categoria: 'temporal',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: false,
    canBeCopied: false,
    examples: [
      'Sempre trabalha',
      'Foi sempre assim',
      'Sempre no campo'
    ],
    sharedPropertiesWithPronouns: [
      'Expressa frequência universal',
      'Marca aspecto habitual'
    ]
  },
  
  nunca: {
    palavra: 'nunca',
    categoria: 'temporal',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: false,
    canBeCopied: false,
    examples: [
      'Nunca fez isso',
      'Nunca mais',
      'Nunca vi'
    ],
    sharedPropertiesWithPronouns: [
      'Expressa frequência zero/negação temporal',
      'Polaridade negativa'
    ]
  },
  
  ainda: {
    palavra: 'ainda',
    categoria: 'temporal',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: false,
    canBeCopied: false,
    examples: [
      'Ainda está aqui',
      'Ainda trabalha',
      'Ainda não'
    ],
    sharedPropertiesWithPronouns: [
      'Expressa continuidade temporal',
      'Marca aspecto durativo'
    ]
  }
};

// ============================================================================
// PRONOMES ADVERBIAIS MODAIS
// ============================================================================

export const modalPronounAdverbials: Record<string, PronounAdverbial> = {
  assim: {
    palavra: 'assim',
    categoria: 'modal',
    subcategoria: undefined,
    deixis: true,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Faço assim',
      'É assim que funciona',
      'Assim é melhor'
    ],
    sharedPropertiesWithPronouns: [
      'Função dêitica (aponta modo)',
      'Pode ser argumento: "o assim não funciona"',
      'Função anafórica/catafórica'
    ]
  },
  
  bem: {
    palavra: 'bem',
    categoria: 'modal',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Faz bem',
      'Está bem',
      'Trabalha bem'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa modo adequado/positivo'
    ]
  },
  
  mal: {
    palavra: 'mal',
    categoria: 'modal',
    subcategoria: undefined,
    deixis: false,
    canBeArgument: true,
    canBeCopied: false,
    examples: [
      'Faz mal',
      'Está mal',
      'Trabalha mal'
    ],
    sharedPropertiesWithPronouns: [
      'Pode ser argumento verbal',
      'Expressa modo inadequado/negativo'
    ]
  }
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Retorna todos os pronomes adverbiais
 */
export function getAllPronounAdverbials(): PronounAdverbial[] {
  return [
    ...Object.values(spatialPronounAdverbials),
    ...Object.values(temporalPronounAdverbials),
    ...Object.values(modalPronounAdverbials)
  ];
}

/**
 * Busca pronome adverbial por palavra
 */
export function getPronounAdverbialByWord(word: string): PronounAdverbial | undefined {
  const normalized = word.toLowerCase();
  return getAllPronounAdverbials().find(pa => pa.palavra === normalized);
}

/**
 * Busca pronomes adverbiais por categoria
 */
export function getPronounAdverbialsByCategory(
  category: 'spatial' | 'temporal' | 'modal'
): PronounAdverbial[] {
  return getAllPronounAdverbials().filter(pa => pa.categoria === category);
}

/**
 * Busca pronomes adverbiais dêiticos
 */
export function getDeixisPronounAdverbials(): PronounAdverbial[] {
  return getAllPronounAdverbials().filter(pa => pa.deixis);
}

/**
 * Busca pronomes adverbiais que podem ser argumentos
 */
export function getArgumentPronounAdverbials(): PronounAdverbial[] {
  return getAllPronounAdverbials().filter(pa => pa.canBeArgument);
}

/**
 * Verifica se uma palavra é pronome adverbial
 */
export function isPronounAdverbial(word: string): boolean {
  return getPronounAdverbialByWord(word) !== undefined;
}

/**
 * Metadados do sistema de pronomes adverbiais
 */
export const pronounAdverbialsMetadata = {
  version: '1.0.0',
  description: 'Sistema completo de pronomes adverbiais baseado em Castilho (2010)',
  source: 'Nova Gramática do Português Brasileiro - Ataliba de Castilho (2010)',
  coverage: {
    spatial: Object.keys(spatialPronounAdverbials).length,
    temporal: Object.keys(temporalPronounAdverbials).length,
    modal: Object.keys(modalPronounAdverbials).length,
    total: getAllPronounAdverbials().length
  },
  sharedPropertiesWithPronouns: [
    '1. Forma átona/tônica (aqui/cá)',
    '2. Possibilidade de elipse',
    '3. Duplicação (aqui na minha casa)',
    '4. Colocação proclítica/enclítica',
    '5. Função dêitica',
    '6. Podem funcionar como argumentos verbais'
  ],
  reference: 'Castilho, A. T. (2010). Nova Gramática do Português Brasileiro. São Paulo: Contexto. (pp. 11000-11050)'
};
