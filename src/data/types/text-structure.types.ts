/**
 * Types for Text Structure Analysis
 * Supports both poetry/music (line-based) and prose (sentence-based) text types
 */

import { CorpusCompleto } from './full-text-corpus.types';

export type TextType = 'poetry' | 'prose';

export interface TextStructureMetadata {
  textType: TextType;
  sentencas: string[];           // Versos (poetry) ou sentenças (prose)
  paragrafos: string[][];        // Estrofes (poetry) ou parágrafos (prose)
  unidadeBase: 'verso' | 'sentença';
  totalSentencas: number;
  totalParagrafos: number;
  avgPalavrasPorSentenca: number;
  avgSentencasPorParagrafo: number;
}

export interface CorpusCompletoEnriquecido extends CorpusCompleto {
  _textStructure?: TextStructureMetadata;
  _isUserCorpus?: boolean;
  _sourceFileName?: string;
}
