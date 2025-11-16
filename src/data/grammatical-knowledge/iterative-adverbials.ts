/**
 * Adverbiais de Iteratividade e Quantificação do Português Brasileiro
 * Baseado na Nova Gramática do Português Brasileiro - Ataliba de Castilho (2010)
 * 
 * Sistema de expressões adverbiais que codificam frequência, repetição e quantificação
 * de eventos, incluindo o sistema de "vez" e suas variantes.
 */

export interface IterativeAdverbial {
  expressao: string;
  categoria: 'vetorial' | 'escalar' | 'ensejo';
  tipo_quantificacao?: 'determinada' | 'indeterminada' | 'universal' | 'partitiva' | 'distributiva';
  significado: string;
  exemplos: string[];
  tracos_semanticos: string[];
  frequencia?: 'alta' | 'média' | 'baixa' | 'zero';
}

// ============================================================================
// SISTEMA "VEZ" - Quantificação Iterativa
// ============================================================================

export const sistemaVez: Record<string, IterativeAdverbial> = {
  // QUANTIFICAÇÃO DETERMINADA (número exato)
  uma_vez: {
    expressao: 'uma vez',
    categoria: 'vetorial',
    tipo_quantificacao: 'determinada',
    significado: 'Iteração única, ocorrência singular',
    exemplos: [
      'Fui ao campo uma vez',
      'Li o livro uma vez',
      'Visitei a estância uma vez'
    ],
    tracos_semanticos: ['+iterativo', '+determinado', '+singular', '+contável'],
    frequencia: 'baixa'
  },
  
  duas_vezes: {
    expressao: 'duas vezes',
    categoria: 'vetorial',
    tipo_quantificacao: 'determinada',
    significado: 'Iteração dupla, duas ocorrências',
    exemplos: [
      'Voltei lá duas vezes',
      'Repeti o exercício duas vezes',
      'Telefonei duas vezes'
    ],
    tracos_semanticos: ['+iterativo', '+determinado', '+plural', '+contável'],
    frequencia: 'baixa'
  },
  
  tres_vezes: {
    expressao: 'três vezes',
    categoria: 'vetorial',
    tipo_quantificacao: 'determinada',
    significado: 'Três ocorrências',
    exemplos: [
      'Tentei três vezes',
      'Liguei três vezes',
      'Fui promovido três vezes'
    ],
    tracos_semanticos: ['+iterativo', '+determinado', '+plural', '+contável'],
    frequencia: 'baixa'
  },
  
  muitas_vezes: {
    expressao: 'muitas vezes',
    categoria: 'vetorial',
    tipo_quantificacao: 'indeterminada',
    significado: 'Alta frequência de ocorrências, número indefinido',
    exemplos: [
      'Estive lá muitas vezes',
      'Já ouvi isso muitas vezes',
      'Voltou ao campo muitas vezes'
    ],
    tracos_semanticos: ['+iterativo', '-determinado', '+plural', '+alta_frequencia'],
    frequencia: 'alta'
  },
  
  poucas_vezes: {
    expressao: 'poucas vezes',
    categoria: 'vetorial',
    tipo_quantificacao: 'indeterminada',
    significado: 'Baixa frequência de ocorrências, número indefinido',
    exemplos: [
      'Fui lá poucas vezes',
      'Vi isso poucas vezes',
      'Aconteceu poucas vezes'
    ],
    tracos_semanticos: ['+iterativo', '-determinado', '+plural', '+baixa_frequencia'],
    frequencia: 'baixa'
  },
  
  várias_vezes: {
    expressao: 'várias vezes',
    categoria: 'vetorial',
    tipo_quantificacao: 'indeterminada',
    significado: 'Múltiplas ocorrências, frequência moderada a alta',
    exemplos: [
      'Tentei várias vezes',
      'Expliquei várias vezes',
      'Vi aquele filme várias vezes'
    ],
    tracos_semanticos: ['+iterativo', '-determinado', '+plural', '+moderada_alta_frequencia'],
    frequencia: 'média'
  },
  
  // QUANTIFICAÇÃO UNIVERSAL
  toda_vez: {
    expressao: 'toda vez',
    categoria: 'vetorial',
    tipo_quantificacao: 'universal',
    significado: 'Todas as ocorrências sem exceção',
    exemplos: [
      'Toda vez que vou lá, chove',
      'Toda vez que ele chega, sorri',
      'Toda vez é a mesma coisa'
    ],
    tracos_semanticos: ['+iterativo', '+universal', '+exaustivo', '+sem_exceção'],
    frequencia: 'alta'
  },
  
  todas_as_vezes: {
    expressao: 'todas as vezes',
    categoria: 'vetorial',
    tipo_quantificacao: 'universal',
    significado: 'Totalidade das ocorrências, ênfase na universalidade',
    exemplos: [
      'Todas as vezes que fui, gostei',
      'Todas as vezes é diferente',
      'Acontece todas as vezes'
    ],
    tracos_semanticos: ['+iterativo', '+universal', '+exaustivo', '+plural_enfático'],
    frequencia: 'alta'
  },
  
  sempre: {
    expressao: 'sempre',
    categoria: 'vetorial',
    tipo_quantificacao: 'universal',
    significado: 'Universalidade temporal, todas as ocasiões',
    exemplos: [
      'Sempre vou lá',
      'Sempre foi assim',
      'Ele sempre chega cedo'
    ],
    tracos_semanticos: ['+iterativo', '+universal', '+habitual', '+atemporal'],
    frequencia: 'alta'
  },
  
  // QUANTIFICAÇÃO PARTITIVA
  algumas_vezes: {
    expressao: 'algumas vezes',
    categoria: 'vetorial',
    tipo_quantificacao: 'partitiva',
    significado: 'Parte das ocorrências, não todas',
    exemplos: [
      'Algumas vezes funciona',
      'Fui lá algumas vezes',
      'Algumas vezes ele acerta'
    ],
    tracos_semanticos: ['+iterativo', '+partitivo', '+indefinido', '+moderada_frequencia'],
    frequencia: 'média'
  },
  
  às_vezes: {
    expressao: 'às vezes',
    categoria: 'vetorial',
    tipo_quantificacao: 'partitiva',
    significado: 'Ocasionalmente, em algumas ocasiões',
    exemplos: [
      'Às vezes vou ao campo',
      'Às vezes chove',
      'Ele às vezes reclama'
    ],
    tracos_semanticos: ['+iterativo', '+partitivo', '+ocasional', '+irregular'],
    frequencia: 'média'
  },
  
  // QUANTIFICAÇÃO DISTRIBUTIVA
  cada_vez: {
    expressao: 'cada vez',
    categoria: 'vetorial',
    tipo_quantificacao: 'distributiva',
    significado: 'Distribuição individual, uma por uma',
    exemplos: [
      'Cada vez que vou, aprendo mais',
      'Cada vez melhor',
      'Cada vez é diferente'
    ],
    tracos_semanticos: ['+iterativo', '+distributivo', '+individual', '+progressivo'],
    frequencia: 'média'
  },
  
  de_vez_em_quando: {
    expressao: 'de vez em quando',
    categoria: 'vetorial',
    tipo_quantificacao: 'partitiva',
    significado: 'Ocasionalmente, sem regularidade',
    exemplos: [
      'De vez em quando vou lá',
      'De vez em quando chove',
      'Ele aparece de vez em quando'
    ],
    tracos_semanticos: ['+iterativo', '+partitivo', '+ocasional', '+baixa_frequencia'],
    frequencia: 'baixa'
  },
  
  // QUANTIFICAÇÃO ZERO/NEGATIVA
  nenhuma_vez: {
    expressao: 'nenhuma vez',
    categoria: 'vetorial',
    tipo_quantificacao: 'determinada',
    significado: 'Negação de ocorrência, zero iterações',
    exemplos: [
      'Nenhuma vez fui lá',
      'Nenhuma vez aconteceu',
      'Nenhuma vez vi isso'
    ],
    tracos_semanticos: ['+iterativo', '+determinado', '+negativo', '+zero_ocorrência'],
    frequencia: 'zero'
  },
  
  nunca: {
    expressao: 'nunca',
    categoria: 'vetorial',
    tipo_quantificacao: 'universal',
    significado: 'Negação universal, em nenhuma ocasião',
    exemplos: [
      'Nunca fui lá',
      'Nunca vi isso',
      'Nunca aconteceu'
    ],
    tracos_semanticos: ['+iterativo', '+universal', '+negativo', '+atemporal'],
    frequencia: 'zero'
  },
  
  jamais: {
    expressao: 'jamais',
    categoria: 'vetorial',
    tipo_quantificacao: 'universal',
    significado: 'Negação universal enfática, nunca em tempo algum',
    exemplos: [
      'Jamais faria isso',
      'Jamais vi tal coisa',
      'Jamais voltarei'
    ],
    tracos_semanticos: ['+iterativo', '+universal', '+negativo', '+enfático', '+atemporal'],
    frequencia: 'zero'
  }
};

// ============================================================================
// SISTEMA "VEZ" (2) - Ensejo/Oportunidade Narrativa
// ============================================================================

export const sistemaVezEnsejo: Record<string, IterativeAdverbial> = {
  certa_vez: {
    expressao: 'certa vez',
    categoria: 'ensejo',
    significado: 'Introduz evento narrativo, em certa ocasião',
    exemplos: [
      'Certa vez, um gaúcho saiu a campear',
      'Certa vez, encontrei um velho conhecido',
      'Certa vez, houve uma grande festa'
    ],
    tracos_semanticos: ['+narrativo', '+episódico', '+passado', '+indefinido'],
    frequencia: 'média'
  },
  
  uma_vez_narrativo: {
    expressao: 'uma vez',
    categoria: 'ensejo',
    significado: 'Introduz evento narrativo (uso não-iterativo)',
    exemplos: [
      'Uma vez, no tempo dos antigos...',
      'Uma vez, havia um rei...',
      'Uma vez, quando eu era guri...'
    ],
    tracos_semanticos: ['+narrativo', '+episódico', '+passado', '+indefinido', '+contos'],
    frequencia: 'média'
  },
  
  desta_vez: {
    expressao: 'desta vez',
    categoria: 'ensejo',
    significado: 'Nesta ocasião específica, agora',
    exemplos: [
      'Desta vez vai dar certo',
      'Desta vez não erro',
      'Desta vez é diferente'
    ],
    tracos_semanticos: ['+ensejo', '+presente', '+dêitico', '+contraste_implícito'],
    frequencia: 'média'
  },
  
  daquela_vez: {
    expressao: 'daquela vez',
    categoria: 'ensejo',
    significado: 'Naquela ocasião específica, passado distante',
    exemplos: [
      'Daquela vez foi difícil',
      'Lembra daquela vez?',
      'Daquela vez ele não veio'
    ],
    tracos_semanticos: ['+ensejo', '+passado', '+dêitico', '+específico'],
    frequencia: 'média'
  }
};

// ============================================================================
// ADVERBIAIS ESCALARES - Quantificação Temporal Determinada
// ============================================================================

export const adverbiaisEscalares: Record<string, IterativeAdverbial> = {
  todo_mes: {
    expressao: 'todo mês',
    categoria: 'escalar',
    tipo_quantificacao: 'universal',
    significado: 'Iteração mensal regular',
    exemplos: [
      'Pago aluguel todo mês',
      'Viajo todo mês',
      'Recebo salário todo mês'
    ],
    tracos_semanticos: ['+escalar', '+temporal', '+regular', '+mensal', '+universal'],
    frequencia: 'alta'
  },
  
  todo_ano: {
    expressao: 'todo ano',
    categoria: 'escalar',
    tipo_quantificacao: 'universal',
    significado: 'Iteração anual regular',
    exemplos: [
      'Viajo todo ano',
      'Todo ano é a mesma coisa',
      'Fazemos festa todo ano'
    ],
    tracos_semanticos: ['+escalar', '+temporal', '+regular', '+anual', '+universal'],
    frequencia: 'alta'
  },
  
  todo_dia: {
    expressao: 'todo dia',
    categoria: 'escalar',
    tipo_quantificacao: 'universal',
    significado: 'Iteração diária regular',
    exemplos: [
      'Trabalho todo dia',
      'Todo dia é a mesma rotina',
      'Tomo mate todo dia'
    ],
    tracos_semanticos: ['+escalar', '+temporal', '+regular', '+diário', '+universal', '+habitual'],
    frequencia: 'alta'
  },
  
  toda_hora: {
    expressao: 'toda hora',
    categoria: 'escalar',
    tipo_quantificacao: 'universal',
    significado: 'Iteração constante, altíssima frequência',
    exemplos: [
      'Ele reclama toda hora',
      'Toca o telefone toda hora',
      'Toda hora é a mesma coisa'
    ],
    tracos_semanticos: ['+escalar', '+temporal', '+continuo', '+alta_frequencia', '+hiperbólico'],
    frequencia: 'alta'
  },
  
  cada_tres_meses: {
    expressao: 'cada três meses',
    categoria: 'escalar',
    tipo_quantificacao: 'distributiva',
    significado: 'Iteração trimestral regular',
    exemplos: [
      'Viajo a Porto Alegre cada três meses',
      'Pago prestação cada três meses',
      'Faço exames cada três meses'
    ],
    tracos_semanticos: ['+escalar', '+temporal', '+regular', '+trimestral', '+distributivo'],
    frequencia: 'média'
  },
  
  de_hora_em_hora: {
    expressao: 'de hora em hora',
    categoria: 'escalar',
    tipo_quantificacao: 'distributiva',
    significado: 'Iteração horária, distribuição temporal contínua',
    exemplos: [
      'Passa ônibus de hora em hora',
      'Toma remédio de hora em hora',
      'Olha o relógio de hora em hora'
    ],
    tracos_semanticos: ['+escalar', '+temporal', '+distributivo', '+regular', '+horário'],
    frequencia: 'média'
  },
  
  de_dois_em_dois_dias: {
    expressao: 'de dois em dois dias',
    categoria: 'escalar',
    tipo_quantificacao: 'distributiva',
    significado: 'Iteração a cada dois dias',
    exemplos: [
      'Treino de dois em dois dias',
      'Rega as plantas de dois em dois dias',
      'Toma banho de dois em dois dias'
    ],
    tracos_semanticos: ['+escalar', '+temporal', '+distributivo', '+intervalo_fixo'],
    frequencia: 'média'
  },
  
  a_cada_passo: {
    expressao: 'a cada passo',
    categoria: 'escalar',
    tipo_quantificacao: 'distributiva',
    significado: 'Iteração espacial/temporal constante (hiperbólico)',
    exemplos: [
      'A cada passo, uma surpresa',
      'Erra a cada passo',
      'A cada passo, algo novo'
    ],
    tracos_semanticos: ['+escalar', '+espacial', '+distributivo', '+continuo', '+hiperbólico'],
    frequencia: 'alta'
  }
};

// ============================================================================
// OUTRAS EXPRESSÕES ITERATIVAS
// ============================================================================

export const outrasIterativas: Record<string, IterativeAdverbial> = {
  raramente: {
    expressao: 'raramente',
    categoria: 'vetorial',
    tipo_quantificacao: 'indeterminada',
    significado: 'Baixa frequência, poucas vezes',
    exemplos: [
      'Raramente vou lá',
      'Raramente chove aqui',
      'Ele raramente falta'
    ],
    tracos_semanticos: ['+iterativo', '+baixa_frequencia', '+adverbial'],
    frequencia: 'baixa'
  },
  
  frequentemente: {
    expressao: 'frequentemente',
    categoria: 'vetorial',
    tipo_quantificacao: 'indeterminada',
    significado: 'Alta frequência, muitas vezes',
    exemplos: [
      'Frequentemente viajo',
      'Frequentemente chove',
      'Ele frequentemente chega cedo'
    ],
    tracos_semanticos: ['+iterativo', '+alta_frequencia', '+adverbial'],
    frequencia: 'alta'
  },
  
  ocasionalmente: {
    expressao: 'ocasionalmente',
    categoria: 'vetorial',
    tipo_quantificacao: 'partitiva',
    significado: 'De tempos em tempos, sem regularidade',
    exemplos: [
      'Ocasionalmente viajo',
      'Ocasionalmente chove',
      'Ele ocasionalmente falta'
    ],
    tracos_semanticos: ['+iterativo', '+partitivo', '+ocasional', '+adverbial'],
    frequencia: 'baixa'
  },
  
  constantemente: {
    expressao: 'constantemente',
    categoria: 'vetorial',
    tipo_quantificacao: 'universal',
    significado: 'De forma contínua, sem interrupção',
    exemplos: [
      'Trabalha constantemente',
      'Constantemente reclama',
      'Muda constantemente'
    ],
    tracos_semanticos: ['+iterativo', '+continuo', '+universal', '+adverbial'],
    frequencia: 'alta'
  },
  
  repetidamente: {
    expressao: 'repetidamente',
    categoria: 'vetorial',
    tipo_quantificacao: 'indeterminada',
    significado: 'Múltiplas repetições',
    exemplos: [
      'Tentou repetidamente',
      'Repetidamente avisou',
      'Errou repetidamente'
    ],
    tracos_semanticos: ['+iterativo', '+repetição', '+múltiplo', '+adverbial'],
    frequencia: 'média'
  },
  
  reiteradamente: {
    expressao: 'reiteradamente',
    categoria: 'vetorial',
    tipo_quantificacao: 'indeterminada',
    significado: 'Com ênfase na repetição insistente',
    exemplos: [
      'Pediu reiteradamente',
      'Reiteradamente negou',
      'Insistiu reiteradamente'
    ],
    tracos_semanticos: ['+iterativo', '+repetição', '+insistente', '+formal', '+adverbial'],
    frequencia: 'média'
  }
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Retorna todos os adverbiais iterativos
 */
export function getAllIterativeAdverbials(): IterativeAdverbial[] {
  return [
    ...Object.values(sistemaVez),
    ...Object.values(sistemaVezEnsejo),
    ...Object.values(adverbiaisEscalares),
    ...Object.values(outrasIterativas)
  ];
}

/**
 * Busca adverbial iterativo por expressão
 */
export function getIterativeAdverbialByExpression(expression: string): IterativeAdverbial | undefined {
  const normalized = expression.toLowerCase().trim();
  return getAllIterativeAdverbials().find(ia => ia.expressao === normalized);
}

/**
 * Busca adverbiais por categoria
 */
export function getIterativeAdverbialsByCategory(
  category: 'vetorial' | 'escalar' | 'ensejo'
): IterativeAdverbial[] {
  return getAllIterativeAdverbials().filter(ia => ia.categoria === category);
}

/**
 * Busca adverbiais por tipo de quantificação
 */
export function getIterativeAdverbialsByQuantificationType(
  type: 'determinada' | 'indeterminada' | 'universal' | 'partitiva' | 'distributiva'
): IterativeAdverbial[] {
  return getAllIterativeAdverbials().filter(ia => ia.tipo_quantificacao === type);
}

/**
 * Busca adverbiais por frequência
 */
export function getIterativeAdverbialsByFrequency(
  frequency: 'alta' | 'média' | 'baixa' | 'zero'
): IterativeAdverbial[] {
  return getAllIterativeAdverbials().filter(ia => ia.frequencia === frequency);
}

/**
 * Verifica se uma expressão é adverbial iterativo
 */
export function isIterativeAdverbial(expression: string): boolean {
  return getIterativeAdverbialByExpression(expression) !== undefined;
}

/**
 * Metadados do sistema de adverbiais iterativos
 */
export const iterativeAdverbialsMetadata = {
  version: '1.0.0',
  description: 'Sistema completo de adverbiais iterativos e de quantificação baseado em Castilho (2010)',
  source: 'Nova Gramática do Português Brasileiro - Ataliba de Castilho (2010)',
  coverage: {
    sistema_vez_iterativo: Object.keys(sistemaVez).length,
    sistema_vez_ensejo: Object.keys(sistemaVezEnsejo).length,
    adverbiais_escalares: Object.keys(adverbiaisEscalares).length,
    outras_iterativas: Object.keys(outrasIterativas).length,
    total: getAllIterativeAdverbials().length
  },
  categorias: {
    vetorial: 'Quantificação por número de vezes/ocorrências',
    escalar: 'Quantificação por intervalos temporais regulares',
    ensejo: 'Introdução de eventos narrativos, uso não-quantificacional'
  },
  tipos_quantificacao: {
    determinada: 'Número exato de ocorrências (uma vez, duas vezes)',
    indeterminada: 'Número indefinido (muitas vezes, poucas vezes)',
    universal: 'Todas as ocorrências (toda vez, sempre)',
    partitiva: 'Parte das ocorrências (às vezes, algumas vezes)',
    distributiva: 'Distribuição individual (cada vez, de hora em hora)'
  },
  reference: 'Castilho, A. T. (2010). Nova Gramática do Português Brasileiro. São Paulo: Contexto. (pp. 13000-13050)'
};
