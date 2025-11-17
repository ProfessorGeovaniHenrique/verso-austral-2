/**
 * 🎯 DEMO CORPUS SERVICE
 * 
 * Carrega dados processados da música "Quando o Verso Vem pras Casa"
 * a partir da edge function process-demo-corpus
 */

import { supabase } from '@/integrations/supabase/client';

export interface DemoKeyword {
  palavra: string;
  frequencia: number;
  ll: number;
  mi: number;
  significancia: string;
  dominio: string;
  cor: string;
  prosody: string; // ✅ Agora string: "Positiva", "Negativa", "Neutra"
}

export interface DemoDomain {
  dominio: string;
  descricao: string;
  cor: string;
  palavras: string[];
  ocorrencias: number;
  avgLL: number;
  avgMI: number;
  riquezaLexical: number;
  percentual: number;
}

export interface DemoCloudData {
  codigo: string;
  nome: string;
  size: number;
  color: string;
  wordCount: number;
  avgScore: number;
}

export interface DemoAnalysisResult {
  keywords: DemoKeyword[];
  dominios: DemoDomain[];
  cloudData: DemoCloudData[];
  estatisticas: {
    totalPalavras: number;
    palavrasUnicas: number;
    dominiosIdentificados: number;
    palavrasChaveSignificativas: number;
    prosodiaDistribution: {
      positivas: number;
      negativas: number;
      neutras: number;
      percentualPositivo: number;
      percentualNegativo: number;
      percentualNeutro: number;
    };
  };
}

let cachedData: DemoAnalysisResult | null = null;

/**
 * Busca dados processados do corpus demo
 */
export async function getDemoAnalysisResults(): Promise<DemoAnalysisResult> {
  // Retornar cache se disponível
  if (cachedData) {
    return cachedData;
  }

  try {
    console.log('📊 Buscando análise do corpus demo...');

    const { data, error } = await supabase.functions.invoke('process-demo-corpus');

    if (error) {
      console.error('Erro ao buscar análise demo:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Nenhum dado retornado da edge function');
    }

    // Armazenar em cache
    cachedData = data as DemoAnalysisResult;

    console.log(`✅ Análise carregada: ${cachedData.keywords.length} palavras-chave, ${cachedData.dominios.length} domínios`);

    return cachedData;
  } catch (error) {
    console.error('Erro ao processar corpus demo:', error);
    throw error;
  }
}

/**
 * Limpa o cache (útil para forçar reload)
 */
export function clearDemoCache() {
  cachedData = null;
}
