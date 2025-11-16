/**
 * 🔍 SERVIÇO DE ENRIQUECIMENTO DIALETAL
 * 
 * Integra dados do Dicionário Pampeano com análise estatística de Keywords
 * para categorizar e pontuar marcas linguísticas regionais
 */

import { KeywordEntry } from '@/data/types/corpus-tools.types';
import { findInDictionary, DIALECTAL_DICTIONARY } from '@/data/dialectal-dictionary';
import { EnrichedDialectalMark } from '@/data/types/dialectal-dictionary.types';
import { isDialectalStopword, hasDialectalCharacteristics } from '@/data/dialectal-stopwords';

/**
 * Enriquece uma palavra-chave com dados do dicionário dialetal
 * Filtra falsos positivos (palavras gramaticais e termos comuns)
 */
export function enrichWordWithDictionary(
  palavra: string,
  keywordData: KeywordEntry
): EnrichedDialectalMark | null {
  
  // FILTRO 1: Stopwords dialetais (palavras gramaticais)
  if (isDialectalStopword(palavra)) {
    console.log(`🚫 Filtered stopword: ${palavra}`);
    return null;
  }
  
  const dictionaryEntry = findInDictionary(palavra);
  
  // FILTRO 2: Se não está no dicionário E não tem características dialetais E tem LL baixo
  if (!dictionaryEntry && !hasDialectalCharacteristics(palavra) && keywordData.ll < 20) {
    console.log(`🚫 Filtered non-dialectal: ${palavra} (LL: ${keywordData.ll.toFixed(2)})`);
    return null;
  }
  
  // Se não está no dicionário, classifica apenas estatisticamente
  if (!dictionaryEntry) {
    return {
      termo: palavra,
      tipo: classifyByStatistics(keywordData),
      categoria: 'geral',
      ll: keywordData.ll,
      mi: keywordData.mi,
      score: calculateStatisticalScore(keywordData),
      fonteClassificacao: 'estatistica'
    };
  }
  
  // Enriquecimento com dados do dicionário
  const tipo = classifyWithDictionary(keywordData, dictionaryEntry);
  const bonus = calculateDictionaryBonus(dictionaryEntry, keywordData);
  const score = calculateEnrichedScore(keywordData, bonus);
  
  return {
    termo: palavra,
    tipo,
    categoria: dictionaryEntry.categoria,
    ll: keywordData.ll,
    mi: keywordData.mi,
    score,
    definicao: dictionaryEntry.definicao,
    origem: dictionaryEntry.origem,
    statusTemporal: dictionaryEntry.statusTemporal,
    frequencia: dictionaryEntry.frequencia,
    classeGramatical: dictionaryEntry.classeGramatical,
    exemplos: dictionaryEntry.exemplos,
    fonteClassificacao: 'dicionario'
  };
}

/**
 * Classifica palavra apenas por estatísticas (quando não está no dicionário)
 */
function classifyByStatistics(keywordData: KeywordEntry): 'regionalismo' | 'lexical' {
  if (keywordData.ll > 20 && keywordData.efeito === 'super-representado') {
    return 'regionalismo';
  }
  return 'lexical';
}

/**
 * Classifica palavra usando dados do dicionário
 */
function classifyWithDictionary(
  keywordData: KeywordEntry,
  dictionaryEntry: any
): 'regionalismo' | 'arcaismo' | 'platinismo' | 'lexical' {
  
  // Arcaísmo: palavra antiga, em desuso
  if (dictionaryEntry.statusTemporal?.includes('ANT')) {
    return 'arcaismo';
  }
  
  // Platinismo: origem platina + alta distintividade
  if (dictionaryEntry.origem === 'PLAT' && keywordData.ll > 15) {
    return 'platinismo';
  }
  
  // Regionalismo: origem brasileira + super-representado
  if (dictionaryEntry.origem === 'BRAS' && keywordData.ll > 15) {
    return 'regionalismo';
  }
  
  return 'lexical';
}

/**
 * Calcula bônus por estar no dicionário
 */
function calculateDictionaryBonus(
  dictionaryEntry: any,
  keywordData: KeywordEntry
): number {
  let bonus = 20; // Base por estar no dicionário
  
  // Arcaísmos têm alto valor cultural
  if (dictionaryEntry.statusTemporal?.includes('ANT')) {
    bonus += 50;
  }
  
  // Platinismos marcam identidade regional
  if (dictionaryEntry.origem === 'PLAT') {
    bonus += 40;
  }
  
  // Brasileirismos distintivos
  if (dictionaryEntry.origem === 'BRAS' && keywordData.ll > 15) {
    bonus += 30;
  }
  
  // Penaliza palavras de uso raro
  if (dictionaryEntry.frequencia === 'r/us') {
    bonus -= 10;
  }
  
  // Bônus para categorias culturalmente relevantes
  if (['musica', 'lida_campeira', 'vestuario'].includes(dictionaryEntry.categoria)) {
    bonus += 15;
  }
  
  return bonus;
}

/**
 * Calcula score composto (estatística + dicionário)
 */
function calculateEnrichedScore(
  keywordData: KeywordEntry,
  bonus: number
): number {
  const statisticalScore = (keywordData.ll * 0.4) + (keywordData.mi * 0.3);
  return statisticalScore + bonus;
}

/**
 * Calcula score apenas estatístico (sem dicionário)
 */
function calculateStatisticalScore(keywordData: KeywordEntry): number {
  return (keywordData.ll * 0.5) + (keywordData.mi * 0.5);
}

/**
 * Gera análise dialetal completa a partir de keywords
 */
export function generateDialectalAnalysis(keywords: KeywordEntry[]) {
  const marcasDialetais = keywords
    .filter(kw => kw.ll > 10 && kw.efeito === 'super-representado')
    .map(kw => enrichWordWithDictionary(kw.palavra, kw))
    .filter((marca): marca is EnrichedDialectalMark => marca !== null) // Remove nulls
    .sort((a, b) => b.score - a.score);
  
  // Estatísticas
  const totalMarcas = marcasDialetais.length;
  const noDicionario = marcasDialetais.filter(m => m.fonteClassificacao === 'dicionario').length;
  const arcaismos = marcasDialetais.filter(m => m.tipo === 'arcaismo').length;
  const platinismos = marcasDialetais.filter(m => m.tipo === 'platinismo').length;
  const regionalismos = marcasDialetais.filter(m => m.tipo === 'regionalismo').length;
  
  // Estatísticas por categoria
  const porCategoria: Record<string, number> = {};
  marcasDialetais.forEach(marca => {
    porCategoria[marca.categoria] = (porCategoria[marca.categoria] || 0) + 1;
  });
  
  // Estatísticas por origem
  const porOrigem: Record<string, number> = {};
  marcasDialetais.forEach(marca => {
    if (marca.origem) {
      porOrigem[marca.origem] = (porOrigem[marca.origem] || 0) + 1;
    }
  });
  
  return {
    marcasDialetais,
    estatisticas: {
      totalMarcas,
      noDicionario,
      arcaismos,
      platinismos,
      regionalismos,
      porCategoria,
      porOrigem,
      coberturaDicionario: totalMarcas > 0 ? ((noDicionario / totalMarcas) * 100).toFixed(1) : '0'
    },
    ranking: marcasDialetais.slice(0, 50) // Top 50
  };
}

/**
 * Busca todas as palavras de uma categoria no corpus analisado
 */
export function getWordsByCategory(
  marcasDialetais: EnrichedDialectalMark[],
  categoria: string
): EnrichedDialectalMark[] {
  return marcasDialetais
    .filter(marca => marca.categoria === categoria)
    .sort((a, b) => b.score - a.score);
}

/**
 * Estatísticas gerais do dicionário
 */
export function getDictionaryStats() {
  const total = DIALECTAL_DICTIONARY.length;
  const arcaismos = DIALECTAL_DICTIONARY.filter(e => e.statusTemporal?.includes('ANT')).length;
  const platinismos = DIALECTAL_DICTIONARY.filter(e => e.origem === 'PLAT').length;
  const brasileirismos = DIALECTAL_DICTIONARY.filter(e => e.origem === 'BRAS').length;
  
  return {
    total,
    arcaismos,
    platinismos,
    brasileirismos,
    percentualArcaismos: ((arcaismos / total) * 100).toFixed(1),
    percentualPlatinismos: ((platinismos / total) * 100).toFixed(1)
  };
}

/**
 * Retorna todas as palavras do dicionário dialetal
 */
export function getDialectalWords() {
  return DIALECTAL_DICTIONARY;
}
