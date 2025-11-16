/**
 * Índice da Base de Conhecimento Gramatical
 * Exporta todas as regras e estruturas morfossintáticas
 */

export * from './verbal-morphology';
export * from './nominal-morphology';
export * from './adjectival-patterns';
export * from './adverbial-patterns';
export * from './pronoun-system';
export * from './semantic-categories';

// Metadados da base de conhecimento
export const grammarKnowledgeMetadata = {
  version: '1.0.0',
  description: 'Base de conhecimento gramatical do Português Brasileiro',
  source: 'Regras linguísticas consolidadas do português brasileiro',
  coverage: {
    verbos: {
      regulares: '100%',
      irregulares: '50+ formas mais comuns',
    },
    substantivos: {
      plural: 'Regras principais',
      genero: 'Padrões gerais',
    },
    adjetivos: {
      flexao: 'Padrões principais',
      graus: 'Completo',
    },
    adverbios: {
      formacao: 'Regra -mente',
      classificacao: 'Completa',
    },
    pronomes: {
      sistema: 'Completo',
      regional: 'Variação tu/você',
    },
  },
  lastUpdated: new Date().toISOString(),
};
