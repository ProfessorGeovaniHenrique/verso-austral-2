/**
 * 📚 TIPOS PARA DICIONÁRIO DIALETAL
 * Baseado no "Dicionário da Cultura Pampeana Sul-Rio-Grandense" de Aldyr Garcia Schlee
 */

export type OrigemDialetal = 'BRAS' | 'PLAT' | 'PORT' | 'ESP' | 'AME' | 'IND';

export type StatusTemporal = 'ANT' | 'DES' | 'ANT DES';

export type FrequenciaUso = 'r/us' | 'm/us' | 'n/d';

export type CategoriaDialetal = 
  | 'lida_campeira'      // Trabalho rural, gado, campo
  | 'fauna'              // Animais da região
  | 'flora'              // Plantas, árvores, vegetação
  | 'vestuario'          // Roupas, acessórios tradicionais
  | 'culinaria'          // Comidas e bebidas típicas
  | 'musica'             // Instrumentos, danças, tradições
  | 'habitacao'          // Construções rurais
  | 'clima'              // Fenômenos climáticos regionais
  | 'social'             // Relações sociais, hierarquias
  | 'geral';             // Outros termos

export interface DictionaryEntry {
  verbete: string;                    // Palavra ou expressão principal
  origem: OrigemDialetal;             // Origem etimológica
  statusTemporal?: StatusTemporal;    // ANT (antigo), DES (desuso), ANT DES (ambos)
  frequencia?: FrequenciaUso;         // r/us (raro), m/us (médio), n/d (não determinado)
  classeGramatical: string;           // S.m., S.f., Adj., Tr.dir., etc.
  definicao: string;                  // Definição principal
  referenciaCruzada?: string[];       // Palavras relacionadas (após →)
  categoria: CategoriaDialetal;       // Categoria temática
  exemplos?: string[];                // Expressões de uso
  sinonimos?: string[];               // Sinônimos no dicionário
}

export interface DialectalDictionary {
  entries: DictionaryEntry[];
  stats: {
    total: number;
    porOrigem: Record<OrigemDialetal, number>;
    porCategoria: Record<CategoriaDialetal, number>;
    arcaismos: number;
    platinismos: number;
    brasileirismos: number;
  };
}

export interface EnrichedDialectalMark {
  termo: string;
  tipo: 'regionalismo' | 'arcaismo' | 'platinismo' | 'lexical' | 'expressao';
  categoria: CategoriaDialetal;
  ll: number;
  mi: number;
  score: number;
  definicao?: string;
  origem?: OrigemDialetal;
  statusTemporal?: StatusTemporal;
  frequencia?: FrequenciaUso;
  fonteClassificacao: 'dicionario' | 'estatistica';
  classeGramatical?: string;
  exemplos?: string[];
}
