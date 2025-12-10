/**
 * Definições centralizadas de métricas da pipeline semântica
 * Usado para tooltips explicativos e documentação inline
 */

export interface MetricDefinition {
  label: string;
  tooltip: string;
  unit?: string;
}

export const PIPELINE_METRIC_DEFINITIONS = {
  // === Cache Stats ===
  cacheStats: {
    totalWords: {
      label: 'Cache Coverage',
      tooltip: 'Total de palavras únicas armazenadas no cache de classificação semântica. Cada palavra é mapeada para um ou mais domínios semânticos (N1-N4).',
      unit: 'palavras'
    },
    ncWords: {
      label: 'NC Words',
      tooltip: 'Palavras Não Classificadas (NC = Not Classified): tokens que o sistema não conseguiu atribuir a nenhum domínio semântico. Requerem curadoria manual ou refinamento do algoritmo de classificação.',
      unit: 'palavras'
    },
    avgConfidence: {
      label: 'Confidence',
      tooltip: 'Confiança média das classificações (0-100%). Valores acima de 85% indicam alta certeza na atribuição do domínio semântico. Calculada como média ponderada de todas as classificações no cache.',
      unit: '%'
    },
    uniqueTagsets: {
      label: 'Domínios Únicos',
      tooltip: 'Quantidade de domínios semânticos distintos (tagsets) presentes no cache. Indica a diversidade de classificações.',
      unit: 'domínios'
    },
    geminiPercentage: {
      label: 'Gemini',
      tooltip: 'Porcentagem de palavras classificadas usando IA Gemini. Este método é usado quando regras e POS não conseguem classificar.',
      unit: '%'
    },
    posBasedPercentage: {
      label: 'POS',
      tooltip: 'Porcentagem de palavras classificadas usando análise morfossintática (Part-of-Speech tagging). Método baseado em regras gramaticais.',
      unit: '%'
    },
    ruleBasedPercentage: {
      label: 'Rules',
      tooltip: 'Porcentagem de palavras classificadas usando regras heurísticas do léxico semântico pré-definido.',
      unit: '%'
    },
    wordsWithInsignias: {
      label: 'Com Insígnias',
      tooltip: 'Palavras que possuem marcadores culturais regionais (insígnias culturais). Ex: Gaúcho, Nordestino, Sertanejo.',
      unit: 'palavras'
    },
    polysemousWords: {
      label: 'Polissêmicas',
      tooltip: 'Palavras com múltiplos significados dependentes do contexto. Requerem análise KWIC (Keyword In Context) para desambiguação.',
      unit: 'palavras'
    }
  },

  // === Semantic Lexicon ===
  semanticLexicon: {
    totalEntries: {
      label: 'Entradas',
      tooltip: 'Total de entradas no léxico semântico base. Cada entrada contém uma palavra com seu domínio semântico pré-classificado.',
      unit: 'entradas'
    },
    status: {
      label: 'Status',
      tooltip: 'Estado do léxico: Vazio (sem dados), Parcial (incompleto), Completo (pronto para uso).'
    }
  },

  // === Batch Seeding ===
  batchSeeding: {
    morfologico: {
      label: 'Morfológico',
      tooltip: 'Palavras classificadas usando regras morfológicas (sufixos, prefixos, padrões). Ex: "-eiro" → profissão, "-eza" → qualidade abstrata.',
      unit: 'palavras'
    },
    heranca: {
      label: 'Herança',
      tooltip: 'Palavras que herdaram classificação de lemas relacionados ou variantes ortográficas já classificadas.',
      unit: 'palavras'
    },
    gemini: {
      label: 'Gemini',
      tooltip: 'Palavras classificadas via API Gemini (Google AI). Usado quando regras e herança não são suficientes.',
      unit: 'palavras'
    },
    gpt5: {
      label: 'GPT-5',
      tooltip: 'Palavras classificadas via GPT-5 como fallback após falha do Gemini ou quando precisão extra é necessária.',
      unit: 'palavras'
    },
    successRate: {
      label: 'Taxa de Sucesso',
      tooltip: 'Porcentagem de palavras classificadas com sucesso em relação ao total processado. Falhas incluem timeouts e respostas inválidas.',
      unit: '%'
    },
    processedWords: {
      label: 'Processadas',
      tooltip: 'Total de palavras processadas pelo job de seeding atual.',
      unit: 'palavras'
    }
  },

  // === Annotation Jobs ===
  annotationJobs: {
    tempo: {
      label: 'Tempo',
      tooltip: 'Tempo decorrido desde o início do job de anotação. Inclui tempo de processamento e pausas.',
      unit: 'tempo'
    },
    taxa: {
      label: 'Taxa',
      tooltip: 'Velocidade de processamento atual. Calculada como palavras processadas por segundo ou por minuto.',
      unit: 'palavras/seg'
    },
    eta: {
      label: 'ETA',
      tooltip: 'Estimated Time of Arrival: tempo restante estimado para conclusão baseado na taxa atual de processamento.',
      unit: 'tempo'
    },
    chunks: {
      label: 'Chunks',
      tooltip: 'Blocos de 50 palavras processados. Cada chunk é uma unidade de trabalho que pode ser retomada em caso de falha.',
      unit: 'blocos'
    },
    autoRetomada: {
      label: 'Auto-retomada',
      tooltip: 'Detecção automática de jobs travados (sem atividade por 5+ minutos). Sistema tenta retomar automaticamente até 3 vezes.'
    },
    processedWords: {
      label: 'Palavras',
      tooltip: 'Número de palavras processadas / total de palavras a processar no job.',
      unit: 'palavras'
    }
  },

  // === NC Curation ===
  ncCuration: {
    validated: {
      label: 'Validadas',
      tooltip: 'Palavras NC que já foram revisadas e classificadas manualmente por um curador.',
      unit: 'palavras'
    },
    suggested: {
      label: 'Sugestões',
      tooltip: 'Palavras NC com sugestão automática de classificação aguardando validação humana.',
      unit: 'palavras'
    },
    highConfidence: {
      label: 'Alta Confiança',
      tooltip: 'Sugestões com confiança >= 85%. Podem ser validadas em lote com menor risco de erro.',
      unit: 'palavras'
    }
  }
} as const;

// Helper para obter definição de uma métrica
export function getMetricDefinition(
  category: keyof typeof PIPELINE_METRIC_DEFINITIONS,
  metric: string
): MetricDefinition | undefined {
  const categoryDefs = PIPELINE_METRIC_DEFINITIONS[category];
  return categoryDefs?.[metric as keyof typeof categoryDefs] as MetricDefinition | undefined;
}
