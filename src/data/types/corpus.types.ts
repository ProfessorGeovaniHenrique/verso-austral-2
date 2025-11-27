import { LucideIcon } from "lucide-react";

export interface KWICEntry {
  leftContext: string;
  keyword: string;
  rightContext: string;
  source: string;
}

export type KWICDataMap = Record<string, KWICEntry[]>;

export interface DominioSemantico {
  dominio: string;
  descricao?: string; // Campo adicionado para compatibilidade com CorpusDomain
  riquezaLexical: number;
  ocorrencias: number;
  percentual: number;
  avgLL?: number; // Campo adicionado para compatibilidade com CorpusDomain
  avgMI?: number; // Campo adicionado para compatibilidade com CorpusDomain
  palavras: string[];
  palavrasComFrequencia: Array<{ palavra: string; ocorrencias: number }>;
  cor: string;
  corTexto: string;
  frequenciaNormalizada: number;
  percentualTematico: number;
  comparacaoCorpus: 'super-representado' | 'equilibrado' | 'sub-representado';
  diferencaCorpus: number;
  percentualCorpusNE: number;
}

export interface PalavraChave {
  palavra: string;
  lema?: string;
  ll: number;
  mi: number;
  frequenciaBruta: number;
  frequenciaNormalizada: number;
  significancia: string;
  efeito: string;
  efeitoIcon: LucideIcon;
}

export interface ScoreData {
  palavra: string;
  valor: number;
  cor: string;
}

export interface PalavraStats {
  frequencia: number;
  prosodia: ProsodiaType;
}

export type PalavraStatsMap = Record<string, PalavraStats>;

export type ProsodiaType = 'Positiva' | 'Negativa' | 'Neutra';

export interface ProsodiaData {
  lema: string;
  prosody: ProsodiaType;
  justificativa: string;
}

export interface LematizacaoData {
  formaFlexionada: string;
  lema: string;
  ocorrencias: number;
}
