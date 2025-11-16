import { LucideIcon } from "lucide-react";

export type CorpusType = 'gaucho' | 'nordestino' | 'marenco-verso';

export const CORPUS_CONFIG = {
  gaucho: {
    label: 'Corpus de Música Gaúcha',
    icon: '🎸',
    description: 'Letras de músicas gaúchas tradicionais',
    estudoPath: '/src/data/corpus/corpus-estudo-gaucho.txt',
    referenciaPath: '/src/data/corpus/corpus-referencia-nordestino.txt'
  },
  nordestino: {
    label: 'Corpus de Música Nordestina',
    icon: '🪘',
    description: 'Letras de forró e música nordestina',
    estudoPath: '/src/data/corpus/corpus-referencia-nordestino.txt',
    referenciaPath: '/src/data/corpus/corpus-estudo-gaucho.txt'
  },
  'marenco-verso': {
    label: 'Luiz Marenco - Quando o verso vem pras casa',
    icon: '🎵',
    description: 'Letra individual para análise estilística',
    estudoPath: '/src/data/corpus/corpus-luiz-marenco-verso.txt',
    referenciaPath: '/src/data/corpus/corpus-estudo-gaucho.txt'
  }
} as const;

export interface CorpusWord {
  headword: string;
  rank: number;
  freq: number;
  range: number;
  normFreq: number;
  normRange: number;
}

export interface KeywordEntry {
  palavra: string;
  freqEstudo: number;
  freqReferencia: number;
  normFreqEstudo: number;
  normFreqReferencia: number;
  ll: number;              // Log-Likelihood
  mi: number;              // Mutual Information
  efeito: 'super-representado' | 'sub-representado';
  significancia: 'Alta' | 'Média' | 'Baixa';
  efeitoIcon: LucideIcon;
}

export interface DispersionData {
  palavra: string;
  freq: number;
  range: number;
  dispersao: number;
  categoria: 'Alta dispersão' | 'Média dispersão' | 'Baixa dispersão';
}
