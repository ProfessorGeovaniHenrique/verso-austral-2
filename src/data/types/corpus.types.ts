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
  riquezaLexical: number;
  ocorrencias: number;
  percentual: number;
  palavras: string[];
  cor: string;
}

export interface PalavraChave {
  palavra: string;
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
  prosodia: 'positiva' | 'negativa' | 'neutra';
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
