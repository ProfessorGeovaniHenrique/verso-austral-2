/**
 * Configuração centralizada dos dicionários
 * Define metadados, endpoints e comportamentos de cada dicionário
 */

export interface DictionaryConfig {
  id: string;
  name: string;
  fullName: string;
  description: string;
  table: 'dialectal_lexicon' | 'gutenberg_lexicon' | 'lexical_synonyms';
  importEndpoint: string;
  color: string;
  icon: string;
  estimatedEntries: number;
  validationRoute?: string;
}

export const DICTIONARY_CONFIG: Record<string, DictionaryConfig> = {
  gaucho: {
    id: 'gaucho_unificado',
    name: 'Gaúcho',
    fullName: 'Dicionário Gaúcho Unificado',
    description: 'Léxico da cultura pampeana sul-rio-grandense',
    table: 'dialectal_lexicon',
    importEndpoint: 'import-dialectal-backend',
    color: 'hsl(var(--chart-1))',
    icon: '🐎',
    estimatedEntries: 1757,
    validationRoute: '/admin/dictionary-validation/gaucho_unificado',
  },
  navarro: {
    id: 'navarro_nordeste_2014',
    name: 'Navarro 2014',
    fullName: 'Dicionário do Nordeste (Navarro)',
    description: 'Léxico nordestino brasileiro',
    table: 'dialectal_lexicon',
    importEndpoint: 'import-navarro-backend',
    color: 'hsl(var(--chart-2))',
    icon: '☀️',
    estimatedEntries: 3500,
    validationRoute: '/admin/navarro-validation',
  },
  pombo: {
    id: 'pombo_abl',
    name: 'Rocha Pombo',
    fullName: 'Dicionário de Sinônimos (ABL)',
    description: 'Academia Brasileira de Letras',
    table: 'lexical_synonyms',
    importEndpoint: 'import-rocha-pombo-backend',
    color: 'hsl(var(--chart-3))',
    icon: '📚',
    estimatedEntries: 8000,
    validationRoute: '/admin/dictionary-validation/rocha_pombo',
  },
  gutenberg: {
    id: 'gutenberg',
    name: 'Gutenberg',
    fullName: 'Léxico Gutenberg',
    description: 'Dicionário geral da língua portuguesa',
    table: 'gutenberg_lexicon',
    importEndpoint: 'import-gutenberg-backend',
    color: 'hsl(var(--chart-4))',
    icon: '📖',
    estimatedEntries: 45000,
    validationRoute: '/admin/dictionary-validation/gutenberg',
  },
};

export const DICTIONARY_LIST = Object.values(DICTIONARY_CONFIG);
