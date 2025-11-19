/**
 * Types for Full-Text Corpus Analysis
 * Used for KWIC, Dispersion, and N-grams tools
 */

import { CorpusType } from './corpus-tools.types';

export interface SongMetadata {
  artista: string;
  compositor?: string;      // NEW - Composer name
  album: string;
  musica: string;
  ano?: string;
  fonte?: 'manual' | 'musicbrainz' | 'ai-inferred' | 'original'; // NEW - Data source
}

export interface SongEntry {
  metadata: SongMetadata;
  letra: string;           // Full text
  linhas: string[];        // Array of lines
  palavras: string[];      // Array of words (tokenized)
  posicaoNoCorpus: number; // Relative position in total corpus
}

export interface CorpusCompleto {
  tipo: CorpusType;
  totalMusicas: number;
  totalPalavras: number;
  musicas: SongEntry[];
}

export interface KWICContext {
  palavra: string;
  contextoEsquerdo: string;
  contextoDireito: string;
  metadata: SongMetadata;
  posicaoNaMusica: number;
  linhaCompleta: string;
}

export interface DispersionPoint {
  palavra: string;
  posicaoNoCorpus: number;  // 0 to 1 (normalized)
  posicaoAbsoluta: number;  // Absolute word position
  metadata: SongMetadata;
  musicaIndex: number;
}

export interface DispersionAnalysis {
  palavra: string;
  totalOcorrencias: number;
  pontos: DispersionPoint[];
  coeficienteDispersao: number; // 0 to 1 (0 = concentrated, 1 = dispersed)
  musicasComPalavra: number;
  densidade: 'Alta' | 'Média' | 'Baixa';
}

export interface NGram {
  ngram: string;           // "de sol a sol"
  frequencia: number;
  ocorrencias: Array<{
    contexto: string;
    metadata: SongMetadata;
    posicao: number;
  }>;
}

export interface NGramAnalysis {
  n: number;
  totalNGrams: number;
  ngramsUnicos: number;
  ngrams: NGram[];
}
