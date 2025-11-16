/**
 * Sistema de Papéis Temáticos (Thematic Roles)
 * Baseado na Nova Gramática do Português Brasileiro - Ataliba de Castilho (2010)
 * 
 * Integra três sistemas teóricos:
 * - Fillmore (1968): Sistema de Casos
 * - Chafe (1970): Papéis Semânticos
 * - Radford (1988): Papéis Temáticos Expandidos
 */

export interface ThematicRole {
  id: string;
  nome: string;
  definition: string;
  markers: string[]; // Preposições ou marcadores sintáticos
  examples: string[];
  features: string[]; // Traços semânticos ([+animado], [+controle], etc.)
  source: string; // Fillmore, Chafe ou Radford
}

export interface ThematicArgument {
  role: string;
  phrase: string;
  features: string[];
  marker?: string;
}

export interface ArgumentStructure {
  predicate: string | null;
  predicateType?: 'action' | 'state' | 'process';
  arguments: ThematicArgument[];
}

// ============================================================================
// SISTEMA DE FILLMORE (1968) - Casos Profundos
// ============================================================================

export const fillmoreCases: Record<string, ThematicRole> = {
  AGENTIVO: {
    id: 'AGT',
    nome: 'Agentivo',
    definition: 'O caso do ser animado instigador da ação identificada pelo verbo',
    markers: ['por', 'pelo', 'pela'],
    examples: [
      'João cortou o pão',
      'Maria escreveu a carta',
      'O professor explicou a matéria'
    ],
    features: ['+animado', '+controle', '+volição', '+instigador'],
    source: 'Fillmore (1968)'
  },
  
  INSTRUMENTAL: {
    id: 'INS',
    nome: 'Instrumental',
    definition: 'O caso da força ou objeto inanimado causalmente envolvido na ação ou estado',
    markers: ['com', 'através de', 'por meio de'],
    examples: [
      'cortou o pão com a faca',
      'escreveu com caneta',
      'abriu a porta com a chave'
    ],
    features: ['-animado', '+causa_imediata', '+ferramenta'],
    source: 'Fillmore (1968)'
  },
  
  DATIVO: {
    id: 'DAT',
    nome: 'Dativo',
    definition: 'O caso do ser animado afetado pelo estado ou ação identificados pelo verbo',
    markers: ['a', 'para'],
    examples: [
      'deu o livro a Maria',
      'contou a história para João',
      'entregou o presente ao professor'
    ],
    features: ['+animado', '+afetado', '+recipiente'],
    source: 'Fillmore (1968)'
  },
  
  FACTUAL: {
    id: 'FAC',
    nome: 'Factual',
    definition: 'O caso das entidades ou estados de coisas que são resultado da ação ou estado',
    markers: [],
    examples: [
      'construíram a casa',
      'criou uma teoria',
      'fez um bolo'
    ],
    features: ['+resultado', '+produto'],
    source: 'Fillmore (1968)'
  },
  
  LOCATIVO: {
    id: 'LOC',
    nome: 'Locativo',
    definition: 'O caso que identifica a localização ou orientação espacial do estado ou ação',
    markers: ['em', 'sobre', 'sob', 'junto a', 'perto de'],
    examples: [
      'trabalha em São Paulo',
      'colocou o livro sobre a mesa',
      'mora perto da escola'
    ],
    features: ['+lugar', '+espacial'],
    source: 'Fillmore (1968)'
  },
  
  OBJETIVO: {
    id: 'OBJ',
    nome: 'Objetivo',
    definition: 'O caso semanticamente mais neutro, a entidade afetada pela ação ou estado',
    markers: [],
    examples: [
      'leu o livro',
      'viu o filme',
      'ouviu a música'
    ],
    features: ['+afetado', '+tema'],
    source: 'Fillmore (1968)'
  }
};

// ============================================================================
// SISTEMA DE CHAFE (1970) - Papéis Semânticos
// ============================================================================

export const chafeRoles: Record<string, ThematicRole> = {
  AGENTE: {
    id: 'AGE',
    nome: 'Agente',
    definition: 'O instigador da ação, tipicamente animado e com controle sobre a ação',
    markers: ['por', 'pelo', 'pela'],
    examples: [
      'O gaúcho domou o cavalo',
      'O peão laçou o novilho',
      'A prenda teceu o poncho'
    ],
    features: ['+animado', '+humano', '+controle', '+volição', '+responsável'],
    source: 'Chafe (1970)'
  },
  
  PACIENTE: {
    id: 'PAC',
    nome: 'Paciente',
    definition: 'A entidade que sofre mudança de estado ou é afetada pela ação',
    markers: [],
    examples: [
      'cortou o pão',
      'quebrou o vidro',
      'pintou a parede'
    ],
    features: ['+afetado', '-controle', '+mudança_de_estado'],
    source: 'Chafe (1970)'
  },
  
  EXPERIENCIADOR: {
    id: 'EXP',
    nome: 'Experienciador',
    definition: 'O ser animado que experimenta um estado psicológico ou sensorial',
    markers: ['a', 'para'],
    examples: [
      'agrada a Maria',
      'parece a João que...',
      'preocupa o professor',
      'gosto de mate'
    ],
    features: ['+animado', '+sentiente', '-controle', '+psicológico'],
    source: 'Chafe (1970)'
  },
  
  BENEFICIARIO: {
    id: 'BEN',
    nome: 'Beneficiário',
    definition: 'O ser animado que se beneficia da ação expressa pelo verbo',
    markers: ['para', 'a', 'em favor de'],
    examples: [
      'comprou flores para a mãe',
      'fez o trabalho para o colega',
      'preparou o chimarrão para os visitantes'
    ],
    features: ['+animado', '+beneficiado', '+recipiente'],
    source: 'Chafe (1970)'
  },
  
  INSTRUMENTO: {
    id: 'INS',
    nome: 'Instrumento',
    definition: 'O objeto inanimado usado pelo agente para realizar a ação',
    markers: ['com', 'mediante', 'através de', 'por meio de'],
    examples: [
      'cortou com a faca',
      'escreveu com lápis',
      'laçou com o rebenque',
      'marcou com o ferro'
    ],
    features: ['-animado', '+ferramenta', '+meio'],
    source: 'Chafe (1970)'
  },
  
  COMPLEMENTO: {
    id: 'CMP',
    nome: 'Complemento',
    definition: 'A entidade que completa o significado do verbo sem sofrer mudança',
    markers: [],
    examples: [
      'é professor',
      'virou médico',
      'ficou feliz'
    ],
    features: ['+predicativo', '-mudança_de_estado'],
    source: 'Chafe (1970)'
  },
  
  LUGAR: {
    id: 'LUG',
    nome: 'Lugar',
    definition: 'A localização espacial onde ocorre a ação ou estado',
    markers: ['em', 'sobre', 'sob', 'junto a', 'dentro de', 'fora de'],
    examples: [
      'trabalha no campo',
      'mora na estância',
      'estudou em Porto Alegre'
    ],
    features: ['+espacial', '+locativo', '+estático'],
    source: 'Chafe (1970)'
  }
};

// ============================================================================
// SISTEMA DE RADFORD (1988) - Papéis Temáticos Expandidos
// ============================================================================

export const radfordRoles: Record<string, ThematicRole> = {
  BENEFACTIVO: {
    id: 'BENF',
    nome: 'Benefactivo',
    definition: 'A entidade em favor da qual a ação é realizada',
    markers: ['para', 'a', 'em favor de', 'em benefício de'],
    examples: [
      'construiu uma casa para a família',
      'lutou pela liberdade',
      'trabalhou para os filhos'
    ],
    features: ['+beneficiado', '+finalidade'],
    source: 'Radford (1988)'
  },
  
  LOCATIVO_ESTATICO: {
    id: 'LOC-EST',
    nome: 'Locativo Estático',
    definition: 'O lugar onde algo está situado, sem movimento',
    markers: ['em', 'sobre', 'sob'],
    examples: [
      'o livro está na mesa',
      'mora em Porto Alegre',
      'fica no centro'
    ],
    features: ['+espacial', '+estático', '-movimento'],
    source: 'Radford (1988)'
  },
  
  META: {
    id: 'MET',
    nome: 'Meta/Alvo',
    definition: 'O destino ou ponto final de um movimento ou ação direcionada',
    markers: ['a', 'para', 'até', 'em direção a'],
    examples: [
      'foi para o campo',
      'viajou a Porto Alegre',
      'correu até a porteira',
      'chegou ao galpão'
    ],
    features: ['+espacial', '+direção', '+alvo', '+télico'],
    source: 'Radford (1988)'
  },
  
  FONTE_ORIGEM: {
    id: 'FON',
    nome: 'Fonte/Origem',
    definition: 'O ponto de partida de um movimento ou a origem de algo',
    markers: ['de', 'desde', 'a partir de'],
    examples: [
      'veio do campo',
      'saiu de casa',
      'partiu de Porto Alegre',
      'descendeu dos farrapos'
    ],
    features: ['+espacial', '+origem', '+ponto_inicial'],
    source: 'Radford (1988)'
  },
  
  TEMA_DESLOCADO: {
    id: 'TEM-DES',
    nome: 'Tema Deslocado',
    definition: 'A entidade que se move ou é movida de um lugar a outro',
    markers: [],
    examples: [
      'levou o cavalo ao campo',
      'trouxe o gado da invernada',
      'carregou a mala para casa'
    ],
    features: ['+móvel', '+deslocamento', '+trajetória'],
    source: 'Radford (1988)'
  }
};

// ============================================================================
// SISTEMA UNIFICADO - Mapeamento para uso no anotador
// ============================================================================

export const unifiedThematicRoles: Record<string, ThematicRole> = {
  AGENT: {
    id: 'AGENT',
    nome: 'Agente',
    definition: 'Instigador da ação, com traço [+animado, +controle, +volição]',
    markers: ['por', 'pelo', 'pela'],
    examples: [
      'João cortou o pão',
      'O gaúcho domou o potro',
      'Maria escreveu a carta'
    ],
    features: ['+animado', '+humano', '+controle', '+volição', '+instigador'],
    source: 'Unified (Fillmore/Chafe)'
  },
  
  PATIENT: {
    id: 'PATIENT',
    nome: 'Paciente',
    definition: 'Entidade que sofre mudança de estado ou é afetada pela ação',
    markers: [],
    examples: [
      'cortou o pão',
      'domou o potro',
      'escreveu a carta'
    ],
    features: ['+afetado', '-controle', '+mudança_de_estado', '+tema'],
    source: 'Unified (Fillmore/Chafe)'
  },
  
  EXPERIENCER: {
    id: 'EXPERIENCER',
    nome: 'Experienciador',
    definition: 'Ser animado que experimenta estado psicológico ou sensorial',
    markers: ['a', 'para'],
    examples: [
      'agrada a Maria',
      'parece a João',
      'preocupa o professor',
      'gosto de chimarrão'
    ],
    features: ['+animado', '+sentiente', '-controle', '+psicológico'],
    source: 'Unified (Chafe)'
  },
  
  BENEFICIARY: {
    id: 'BENEFICIARY',
    nome: 'Beneficiário',
    definition: 'Ser animado que se beneficia da ação',
    markers: ['para', 'a', 'em favor de'],
    examples: [
      'comprou para a mãe',
      'trabalhou para os filhos',
      'preparou o mate para os visitantes'
    ],
    features: ['+animado', '+beneficiado', '+recipiente'],
    source: 'Unified (Chafe/Radford)'
  },
  
  INSTRUMENT: {
    id: 'INSTRUMENT',
    nome: 'Instrumento',
    definition: 'Objeto inanimado usado para realizar a ação',
    markers: ['com', 'mediante', 'através de', 'por meio de'],
    examples: [
      'cortou com a faca',
      'laçou com o laço',
      'marcou com o ferro',
      'escreveu com lápis'
    ],
    features: ['-animado', '+ferramenta', '+meio', '+causa_imediata'],
    source: 'Unified (Fillmore/Chafe)'
  },
  
  LOCATION: {
    id: 'LOCATION',
    nome: 'Locativo',
    definition: 'Lugar onde ocorre a ação ou estado',
    markers: ['em', 'sobre', 'sob', 'junto a', 'dentro de', 'no', 'na'],
    examples: [
      'trabalha no campo',
      'mora na estância',
      'estudou em Porto Alegre',
      'colocou sobre a mesa'
    ],
    features: ['+espacial', '+locativo', '+estático'],
    source: 'Unified (Fillmore/Chafe/Radford)'
  },
  
  GOAL: {
    id: 'GOAL',
    nome: 'Meta',
    definition: 'Destino ou ponto final de movimento',
    markers: ['a', 'para', 'até', 'em direção a'],
    examples: [
      'foi para o campo',
      'viajou a Porto Alegre',
      'correu até a porteira'
    ],
    features: ['+espacial', '+direção', '+alvo', '+télico', '+movimento'],
    source: 'Unified (Radford)'
  },
  
  SOURCE: {
    id: 'SOURCE',
    nome: 'Fonte/Origem',
    definition: 'Ponto de partida ou origem',
    markers: ['de', 'desde', 'a partir de'],
    examples: [
      'veio do campo',
      'saiu de casa',
      'partiu de Porto Alegre'
    ],
    features: ['+espacial', '+origem', '+ponto_inicial', '+movimento'],
    source: 'Unified (Radford)'
  },
  
  THEME: {
    id: 'THEME',
    nome: 'Tema',
    definition: 'Entidade sobre a qual algo é dito ou que se move',
    markers: [],
    examples: [
      'falou sobre política',
      'pensou no problema',
      'levou o cavalo'
    ],
    features: ['+tema', '+tópico'],
    source: 'Unified (General)'
  },
  
  RECIPIENT: {
    id: 'RECIPIENT',
    nome: 'Recipiente',
    definition: 'Entidade que recebe algo',
    markers: ['a', 'para'],
    examples: [
      'deu o livro a Maria',
      'enviou a carta para João',
      'entregou o recado ao professor'
    ],
    features: ['+animado', '+recipiente', '+alvo'],
    source: 'Unified (General)'
  }
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Retorna todos os papéis temáticos como array
 */
export function getAllThematicRoles(): ThematicRole[] {
  return Object.values(unifiedThematicRoles);
}

/**
 * Busca papel temático por ID
 */
export function getThematicRoleById(id: string): ThematicRole | undefined {
  return unifiedThematicRoles[id];
}

/**
 * Busca papéis temáticos por marcador (preposição)
 */
export function getThematicRolesByMarker(marker: string): ThematicRole[] {
  return Object.values(unifiedThematicRoles).filter(role =>
    role.markers.includes(marker)
  );
}

/**
 * Busca papéis temáticos por traço semântico
 */
export function getThematicRolesByFeature(feature: string): ThematicRole[] {
  return Object.values(unifiedThematicRoles).filter(role =>
    role.features.includes(feature)
  );
}

/**
 * Verifica se uma palavra pode ter papel temático de AGENTE
 */
export function canBeAgent(features: string[]): boolean {
  return features.includes('+animado') && 
         (features.includes('+humano') || features.includes('+controle'));
}

/**
 * Verifica se uma palavra pode ter papel temático de INSTRUMENTO
 */
export function canBeInstrument(features: string[]): boolean {
  return features.includes('-animado') && 
         features.includes('+ferramenta');
}

/**
 * Metadados do sistema de papéis temáticos
 */
export const thematicRolesMetadata = {
  version: '1.0.0',
  description: 'Sistema unificado de papéis temáticos baseado em Fillmore (1968), Chafe (1970) e Radford (1988)',
  source: 'Nova Gramática do Português Brasileiro - Ataliba de Castilho (2010)',
  coverage: {
    fillmore: 6,
    chafe: 7,
    radford: 5,
    unified: 10
  },
  references: [
    'Fillmore, C. J. (1968). The case for case. In Bach & Harms (Eds.), Universals in Linguistic Theory.',
    'Chafe, W. L. (1970). Meaning and the Structure of Language.',
    'Radford, A. (1988). Transformational Grammar.',
    'Castilho, A. T. (2010). Nova Gramática do Português Brasileiro. São Paulo: Contexto.'
  ]
};
