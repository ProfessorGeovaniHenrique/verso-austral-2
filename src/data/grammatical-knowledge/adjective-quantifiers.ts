/**
 * Adjetivos Quantificadores e Delimitadores do Português Brasileiro
 * Baseado na Nova Gramática do Português Brasileiro - Ataliba de Castilho (2010)
 * 
 * Classifica adjetivos que modificam a interpretação semântica de substantivos
 * através de quantificação, delimitação de domínio ou aspectualização.
 */

export interface AdjectiveQuantifier {
  palavra: string;
  tipo: 'aspectualizador' | 'delimitador_especifico' | 'delimitador_generico' | 'delimitador_dominio';
  efeito: string;
  instrucao_interpretativa: string;
  graduavel: boolean;
  examples: string[];
  dominioSemantico?: string; // Para delimitadores de domínio
}

// ============================================================================
// ASPECTUALIZADORES - Quantificação Temporal/Frequencial
// ============================================================================

export const aspectualizadores: Record<string, AdjectiveQuantifier> = {
  habitual: {
    palavra: 'habitual',
    tipo: 'aspectualizador',
    efeito: 'Indica frequência alta, ação ou estado recorrente',
    instrucao_interpretativa: 'Interpretar como evento que se repete regularmente',
    graduavel: true,
    examples: [
      'comportamento habitual',
      'costume habitual',
      'prática habitual'
    ]
  },
  
  normal: {
    palavra: 'normal',
    tipo: 'aspectualizador',
    efeito: 'Indica padrão esperado, frequência média',
    instrucao_interpretativa: 'Interpretar como dentro da normalidade estatística',
    graduavel: true,
    examples: [
      'procedimento normal',
      'dia normal',
      'temperatura normal'
    ]
  },
  
  costumeiro: {
    palavra: 'costumeiro',
    tipo: 'aspectualizador',
    efeito: 'Indica habitualidade, algo que é costume',
    instrucao_interpretativa: 'Interpretar como ação repetida por hábito',
    graduavel: true,
    examples: [
      'passeio costumeiro',
      'gesto costumeiro',
      'rota costumeira'
    ]
  },
  
  usual: {
    palavra: 'usual',
    tipo: 'aspectualizador',
    efeito: 'Indica uso frequente, comum',
    instrucao_interpretativa: 'Interpretar como prática corrente',
    graduavel: true,
    examples: [
      'método usual',
      'caminho usual',
      'horário usual'
    ]
  },
  
  diário: {
    palavra: 'diário',
    tipo: 'aspectualizador',
    efeito: 'Quantificação específica: uma vez por dia',
    instrucao_interpretativa: 'Interpretar como evento que ocorre todos os dias',
    graduavel: false,
    examples: [
      'trabalho diário',
      'pão diário',
      'rotina diária'
    ]
  },
  
  semanal: {
    palavra: 'semanal',
    tipo: 'aspectualizador',
    efeito: 'Quantificação específica: uma vez por semana',
    instrucao_interpretativa: 'Interpretar como evento que ocorre todas as semanas',
    graduavel: false,
    examples: [
      'reunião semanal',
      'revista semanal',
      'pagamento semanal'
    ]
  },
  
  mensal: {
    palavra: 'mensal',
    tipo: 'aspectualizador',
    efeito: 'Quantificação específica: uma vez por mês',
    instrucao_interpretativa: 'Interpretar como evento que ocorre todos os meses',
    graduavel: false,
    examples: [
      'salário mensal',
      'prestação mensal',
      'relatório mensal'
    ]
  },
  
  anual: {
    palavra: 'anual',
    tipo: 'aspectualizador',
    efeito: 'Quantificação específica: uma vez por ano',
    instrucao_interpretativa: 'Interpretar como evento que ocorre todos os anos',
    graduavel: false,
    examples: [
      'festa anual',
      'relatório anual',
      'celebração anual'
    ]
  },
  
  frequente: {
    palavra: 'frequente',
    tipo: 'aspectualizador',
    efeito: 'Quantificação não específica: alta frequência',
    instrucao_interpretativa: 'Interpretar como evento que se repete muitas vezes',
    graduavel: true,
    examples: [
      'visita frequente',
      'erro frequente',
      'problema frequente'
    ]
  },
  
  raro: {
    palavra: 'raro',
    tipo: 'aspectualizador',
    efeito: 'Quantificação não específica: baixa frequência',
    instrucao_interpretativa: 'Interpretar como evento que se repete poucas vezes',
    graduavel: true,
    examples: [
      'visita rara',
      'fenômeno raro',
      'oportunidade rara'
    ]
  },
  
  ocasional: {
    palavra: 'ocasional',
    tipo: 'aspectualizador',
    efeito: 'Quantificação não específica: frequência irregular',
    instrucao_interpretativa: 'Interpretar como evento que ocorre de vez em quando',
    graduavel: true,
    examples: [
      'trabalho ocasional',
      'encontro ocasional',
      'chuva ocasional'
    ]
  },
  
  esporádico: {
    palavra: 'esporádico',
    tipo: 'aspectualizador',
    efeito: 'Quantificação não específica: frequência muito baixa e irregular',
    instrucao_interpretativa: 'Interpretar como evento raro e sem padrão',
    graduavel: true,
    examples: [
      'aparição esporádica',
      'contato esporádico',
      'chuva esporádica'
    ]
  }
};

// ============================================================================
// DELIMITADORES ESPECÍFICOS - Sentido Literal/Denotativo
// ============================================================================

export const delimitadoresEspecificos: Record<string, AdjectiveQuantifier> = {
  essencial: {
    palavra: 'essencial',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao sentido básico, fundamental, literal',
    instrucao_interpretativa: 'Selecionar TODOS os traços semânticos do substantivo, interpretação estrita',
    graduavel: true,
    examples: [
      'componentes essenciais do cristianismo',
      'elementos essenciais da cultura gaúcha',
      'características essenciais do pampa'
    ]
  },
  
  básico: {
    palavra: 'básico',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao sentido fundamental, primário',
    instrucao_interpretativa: 'Selecionar traços semânticos nucleares do substantivo',
    graduavel: true,
    examples: [
      'princípios básicos',
      'educação básica',
      'necessidades básicas'
    ]
  },
  
  fundamental: {
    palavra: 'fundamental',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao sentido essencial, que serve de fundamento',
    instrucao_interpretativa: 'Selecionar traços semânticos que formam a base do conceito',
    graduavel: true,
    examples: [
      'direitos fundamentais',
      'valores fundamentais',
      'princípios fundamentais'
    ]
  },
  
  autêntico: {
    palavra: 'autêntico',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao sentido genuíno, verdadeiro, original',
    instrucao_interpretativa: 'Selecionar traços semânticos prototípicos, excluir sentidos derivados',
    graduavel: true,
    examples: [
      'gaúcho autêntico',
      'cultura autêntica',
      'arte autêntica'
    ]
  },
  
  particular: {
    palavra: 'particular',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação a um caso específico, não genérico',
    instrucao_interpretativa: 'Interpretar como instância individual, não categoria geral',
    graduavel: false,
    examples: [
      'caso particular',
      'situação particular',
      'exemplo particular'
    ]
  },
  
  pessoal: {
    palavra: 'pessoal',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao domínio individual, privado',
    instrucao_interpretativa: 'Interpretar como pertencente à esfera pessoal, não pública',
    graduavel: false,
    examples: [
      'opinião pessoal',
      'vida pessoal',
      'experiência pessoal'
    ]
  },
  
  próprio: {
    palavra: 'próprio',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao sentido de propriedade exclusiva, característico',
    instrucao_interpretativa: 'Interpretar como inerente, característico, não emprestado',
    graduavel: false,
    examples: [
      'nome próprio',
      'casa própria',
      'estilo próprio'
    ]
  },
  
  verdadeiro: {
    palavra: 'verdadeiro',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao sentido genuíno, real, não falso',
    instrucao_interpretativa: 'Excluir interpretações figuradas ou metafóricas',
    graduavel: false,
    examples: [
      'amigo verdadeiro',
      'gaúcho verdadeiro',
      'história verdadeira'
    ]
  },
  
  real: {
    palavra: 'real',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao sentido concreto, existente, não imaginário',
    instrucao_interpretativa: 'Interpretar como factual, concreto, não hipotético',
    graduavel: false,
    examples: [
      'perigo real',
      'mundo real',
      'problema real'
    ]
  },
  
  concreto: {
    palavra: 'concreto',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao sentido material, tangível, específico',
    instrucao_interpretativa: 'Interpretar como algo material, palpável, não abstrato',
    graduavel: false,
    examples: [
      'exemplo concreto',
      'caso concreto',
      'objeto concreto'
    ]
  },
  
  literal: {
    palavra: 'literal',
    tipo: 'delimitador_especifico',
    efeito: 'Restringe interpretação ao sentido exato, não figurado',
    instrucao_interpretativa: 'Interpretar ao pé da letra, excluir metáforas',
    graduavel: false,
    examples: [
      'sentido literal',
      'tradução literal',
      'interpretação literal'
    ]
  }
};

// ============================================================================
// DELIMITADORES GENÉRICOS - Sentido Aproximativo/Conotativo
// ============================================================================

export const delimitadoresGenericos: Record<string, AdjectiveQuantifier> = {
  genérico: {
    palavra: 'genérico',
    tipo: 'delimitador_generico',
    efeito: 'Amplia interpretação para sentido geral, não específico',
    instrucao_interpretativa: 'Interpretar de forma ampla, incluir variações e casos gerais',
    graduavel: false,
    examples: [
      'termo genérico',
      'marca genérica',
      'conceito genérico'
    ]
  },
  
  relativo: {
    palavra: 'relativo',
    tipo: 'delimitador_generico',
    efeito: 'Introduz conotação aproximativa, não absoluta',
    instrucao_interpretativa: 'Interpretar como dependente de contexto, não fixo',
    graduavel: false,
    examples: [
      'verdade relativa',
      'conceito relativo',
      'valor relativo'
    ]
  },
  
  aproximado: {
    palavra: 'aproximado',
    tipo: 'delimitador_generico',
    efeito: 'Introduz conotação de inexatidão, estimativa',
    instrucao_interpretativa: 'Interpretar como valor estimado, não exato',
    graduavel: true,
    examples: [
      'valor aproximado',
      'horário aproximado',
      'número aproximado'
    ]
  },
  
  'meio-': {
    palavra: 'meio-',
    tipo: 'delimitador_generico',
    efeito: 'Introduz conotação aproximativa, parcial (prefixo)',
    instrucao_interpretativa: 'Interpretar como parcialmente, não completamente',
    graduavel: false,
    examples: [
      'meio-irmão',
      'meio-dia',
      'meio-termo'
    ]
  },
  
  quase: {
    palavra: 'quase',
    tipo: 'delimitador_generico',
    efeito: 'Introduz conotação de proximidade, não completude',
    instrucao_interpretativa: 'Interpretar como próximo de, mas não exatamente',
    graduavel: false,
    examples: [
      'quase perfeito',
      'quase pronto',
      'quase verdade'
    ]
  },
  
  aparente: {
    palavra: 'aparente',
    tipo: 'delimitador_generico',
    efeito: 'Introduz conotação de superficialidade, não necessariamente real',
    instrucao_interpretativa: 'Interpretar como o que parece ser, não necessariamente o que é',
    graduavel: true,
    examples: [
      'contradição aparente',
      'calma aparente',
      'simplicidade aparente'
    ]
  },
  
  suposto: {
    palavra: 'suposto',
    tipo: 'delimitador_generico',
    efeito: 'Introduz conotação de incerteza, hipótese',
    instrucao_interpretativa: 'Interpretar como presumido, não confirmado',
    graduavel: false,
    examples: [
      'culpado suposto',
      'crime suposto',
      'autor suposto'
    ]
  },
  
  provável: {
    palavra: 'provável',
    tipo: 'delimitador_generico',
    efeito: 'Introduz conotação de possibilidade alta, não certeza',
    instrucao_interpretativa: 'Interpretar como com alta probabilidade, não definitivo',
    graduavel: true,
    examples: [
      'causa provável',
      'resultado provável',
      'explicação provável'
    ]
  },
  
  possível: {
    palavra: 'possível',
    tipo: 'delimitador_generico',
    efeito: 'Introduz conotação de possibilidade, não certeza',
    instrucao_interpretativa: 'Interpretar como dentro das possibilidades, não confirmado',
    graduavel: true,
    examples: [
      'solução possível',
      'caminho possível',
      'explicação possível'
    ]
  }
};

// ============================================================================
// DELIMITADORES DE DOMÍNIO - Restrição a Campo Semântico Específico
// ============================================================================

export const delimitadoresDominio: Record<string, AdjectiveQuantifier> = {
  econômico: {
    palavra: 'econômico',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da economia',
    instrucao_interpretativa: 'Interpretar do ponto de vista econômico, relativo a finanças e recursos',
    graduavel: false,
    dominioSemantico: 'economia',
    examples: [
      'crise econômica',
      'desenvolvimento econômico',
      'política econômica'
    ]
  },
  
  político: {
    palavra: 'político',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da política',
    instrucao_interpretativa: 'Interpretar do ponto de vista político, relativo a governo e poder',
    graduavel: false,
    dominioSemantico: 'política',
    examples: [
      'partido político',
      'sistema político',
      'crise política'
    ]
  },
  
  literário: {
    palavra: 'literário',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da literatura',
    instrucao_interpretativa: 'Interpretar do ponto de vista literário, relativo à arte da escrita',
    graduavel: false,
    dominioSemantico: 'literatura',
    examples: [
      'obra literária',
      'estilo literário',
      'crítica literária'
    ]
  },
  
  científico: {
    palavra: 'científico',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da ciência',
    instrucao_interpretativa: 'Interpretar do ponto de vista científico, relativo a método e pesquisa',
    graduavel: false,
    dominioSemantico: 'ciência',
    examples: [
      'método científico',
      'pesquisa científica',
      'conhecimento científico'
    ]
  },
  
  filosófico: {
    palavra: 'filosófico',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da filosofia',
    instrucao_interpretativa: 'Interpretar do ponto de vista filosófico, relativo a pensamento abstrato',
    graduavel: false,
    dominioSemantico: 'filosofia',
    examples: [
      'questão filosófica',
      'pensamento filosófico',
      'problema filosófico'
    ]
  },
  
  histórico: {
    palavra: 'histórico',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da história',
    instrucao_interpretativa: 'Interpretar do ponto de vista histórico, relativo ao passado documentado',
    graduavel: false,
    dominioSemantico: 'história',
    examples: [
      'momento histórico',
      'contexto histórico',
      'fato histórico'
    ]
  },
  
  social: {
    palavra: 'social',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da sociedade',
    instrucao_interpretativa: 'Interpretar do ponto de vista social, relativo à vida em coletividade',
    graduavel: false,
    dominioSemantico: 'sociedade',
    examples: [
      'problema social',
      'classe social',
      'movimento social'
    ]
  },
  
  cultural: {
    palavra: 'cultural',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da cultura',
    instrucao_interpretativa: 'Interpretar do ponto de vista cultural, relativo a costumes e expressões',
    graduavel: false,
    dominioSemantico: 'cultura',
    examples: [
      'patrimônio cultural',
      'identidade cultural',
      'manifestação cultural'
    ]
  },
  
  artístico: {
    palavra: 'artístico',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da arte',
    instrucao_interpretativa: 'Interpretar do ponto de vista artístico, relativo à criação estética',
    graduavel: false,
    dominioSemantico: 'arte',
    examples: [
      'valor artístico',
      'expressão artística',
      'movimento artístico'
    ]
  },
  
  religioso: {
    palavra: 'religioso',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da religião',
    instrucao_interpretativa: 'Interpretar do ponto de vista religioso, relativo à fé e espiritualidade',
    graduavel: false,
    dominioSemantico: 'religião',
    examples: [
      'líder religioso',
      'cerimônia religiosa',
      'crença religiosa'
    ]
  },
  
  jurídico: {
    palavra: 'jurídico',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio do direito',
    instrucao_interpretativa: 'Interpretar do ponto de vista jurídico, relativo às leis',
    graduavel: false,
    dominioSemantico: 'direito',
    examples: [
      'sistema jurídico',
      'processo jurídico',
      'norma jurídica'
    ]
  },
  
  médico: {
    palavra: 'médico',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da medicina',
    instrucao_interpretativa: 'Interpretar do ponto de vista médico, relativo à saúde',
    graduavel: false,
    dominioSemantico: 'medicina',
    examples: [
      'tratamento médico',
      'diagnóstico médico',
      'procedimento médico'
    ]
  },
  
  psicológico: {
    palavra: 'psicológico',
    tipo: 'delimitador_dominio',
    efeito: 'Restringe interpretação ao domínio da psicologia',
    instrucao_interpretativa: 'Interpretar do ponto de vista psicológico, relativo à mente e comportamento',
    graduavel: false,
    dominioSemantico: 'psicologia',
    examples: [
      'aspecto psicológico',
      'trauma psicológico',
      'perfil psicológico'
    ]
  }
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Retorna todos os quantificadores adjetivais
 */
export function getAllAdjectiveQuantifiers(): AdjectiveQuantifier[] {
  return [
    ...Object.values(aspectualizadores),
    ...Object.values(delimitadoresEspecificos),
    ...Object.values(delimitadoresGenericos),
    ...Object.values(delimitadoresDominio)
  ];
}

/**
 * Busca quantificador por palavra
 */
export function getAdjectiveQuantifierByWord(word: string): AdjectiveQuantifier | undefined {
  const normalized = word.toLowerCase();
  return getAllAdjectiveQuantifiers().find(aq => aq.palavra === normalized);
}

/**
 * Busca quantificadores por tipo
 */
export function getAdjectiveQuantifiersByType(
  type: 'aspectualizador' | 'delimitador_especifico' | 'delimitador_generico' | 'delimitador_dominio'
): AdjectiveQuantifier[] {
  return getAllAdjectiveQuantifiers().filter(aq => aq.tipo === type);
}

/**
 * Verifica se palavra é quantificador adjetival
 */
export function isAdjectiveQuantifier(word: string): boolean {
  return getAdjectiveQuantifierByWord(word) !== undefined;
}

/**
 * Analisa efeito semântico de adjetivo + substantivo
 */
export function analyzeAdjectiveEffect(adjective: string, noun: string): {
  tipo: string;
  efeito: string;
  exemplo: string;
} | null {
  const quantifier = getAdjectiveQuantifierByWord(adjective);
  if (!quantifier) return null;
  
  return {
    tipo: quantifier.tipo,
    efeito: quantifier.efeito,
    exemplo: `"${adjective} ${noun}": ${quantifier.instrucao_interpretativa}`
  };
}

/**
 * Metadados do sistema de quantificadores adjetivais
 */
export const adjectiveQuantifiersMetadata = {
  version: '1.0.0',
  description: 'Sistema de quantificadores e delimitadores adjetivais baseado em Castilho (2010)',
  source: 'Nova Gramática do Português Brasileiro - Ataliba de Castilho (2010)',
  coverage: {
    aspectualizadores: Object.keys(aspectualizadores).length,
    delimitadores_especificos: Object.keys(delimitadoresEspecificos).length,
    delimitadores_genericos: Object.keys(delimitadoresGenericos).length,
    delimitadores_dominio: Object.keys(delimitadoresDominio).length,
    total: getAllAdjectiveQuantifiers().length
  },
  reference: 'Castilho, A. T. (2010). Nova Gramática do Português Brasileiro. São Paulo: Contexto. (pp. 12000-12050)'
};
