/**
 * 🔗 SERVIÇO DE ANÁLISE DE CO-OCORRÊNCIA
 * 
 * Identifica quais palavras dialetais aparecem juntas com mais frequência
 */

import { getDialectalWords } from './dialectalDictionaryService';

export interface CoOccurrence {
  word1: string;
  word2: string;
  frequency: number;
  mutualInformation: number; // Medida de associação estatística
  contexts: string[]; // Exemplos de contextos onde aparecem juntas
}

export interface CoOccurrenceNode {
  id: string;
  label: string;
  size: number; // Baseado na frequência total
  category?: string;
  color?: string;
}

export interface CoOccurrenceEdge {
  source: string;
  target: string;
  weight: number; // Frequência de co-ocorrência
  mutualInformation: number;
}

export interface CoOccurrenceNetwork {
  nodes: CoOccurrenceNode[];
  edges: CoOccurrenceEdge[];
}

/**
 * Extrai palavras dialetais de um texto
 */
function extractDialectalWords(text: string): string[] {
  const dialectalDict = getDialectalWords();
  const words = text.toLowerCase().split(/\s+/);
  
  return words.filter(word => {
    const cleanWord = word.replace(/[.,!?;:()'"]/g, '');
    return dialectalDict.some(d => d.verbete.toLowerCase() === cleanWord);
  });
}

/**
 * Calcula co-ocorrências dentro de uma janela de contexto
 */
export function analyzeCoOccurrences(
  texts: string[],
  windowSize: number = 5,
  minFrequency: number = 2
): CoOccurrence[] {
  const coOccurrenceMap = new Map<string, {
    frequency: number;
    contexts: Set<string>;
  }>();

  // Para cada texto
  texts.forEach(text => {
    const dialectalWords = extractDialectalWords(text);
    const words = text.toLowerCase().split(/\s+/);

    // Para cada palavra dialetal
    dialectalWords.forEach((word1, idx1) => {
      const word1Index = words.indexOf(word1, idx1);
      
      // Buscar outras palavras dialetais na janela de contexto
      dialectalWords.forEach((word2, idx2) => {
        if (idx1 >= idx2) return; // Evitar duplicatas e auto-referência
        
        const word2Index = words.indexOf(word2, idx2);
        const distance = Math.abs(word2Index - word1Index);
        
        if (distance <= windowSize) {
          // Criar par ordenado
          const pair = [word1, word2].sort().join('|');
          
          // Extrair contexto
          const startIdx = Math.max(0, Math.min(word1Index, word2Index) - 3);
          const endIdx = Math.min(words.length, Math.max(word1Index, word2Index) + 4);
          const context = words.slice(startIdx, endIdx).join(' ');
          
          if (!coOccurrenceMap.has(pair)) {
            coOccurrenceMap.set(pair, {
              frequency: 0,
              contexts: new Set()
            });
          }
          
          const entry = coOccurrenceMap.get(pair)!;
          entry.frequency++;
          entry.contexts.add(context);
        }
      });
    });
  });

  // Calcular frequências individuais para MI
  const wordFrequencies = new Map<string, number>();
  texts.forEach(text => {
    const dialectalWords = extractDialectalWords(text);
    dialectalWords.forEach(word => {
      wordFrequencies.set(word, (wordFrequencies.get(word) || 0) + 1);
    });
  });

  const totalPairs = Array.from(coOccurrenceMap.values()).reduce((sum, v) => sum + v.frequency, 0);

  // Converter para array e calcular Mutual Information
  const coOccurrences: CoOccurrence[] = [];
  
  coOccurrenceMap.forEach((data, pair) => {
    if (data.frequency < minFrequency) return;
    
    const [word1, word2] = pair.split('|');
    const freq1 = wordFrequencies.get(word1) || 1;
    const freq2 = wordFrequencies.get(word2) || 1;
    
    // Mutual Information: log2(P(x,y) / (P(x) * P(y)))
    const pXY = data.frequency / totalPairs;
    const pX = freq1 / totalPairs;
    const pY = freq2 / totalPairs;
    const mi = Math.log2(pXY / (pX * pY));
    
    coOccurrences.push({
      word1,
      word2,
      frequency: data.frequency,
      mutualInformation: mi,
      contexts: Array.from(data.contexts).slice(0, 5) // Limitar a 5 exemplos
    });
  });

  // Ordenar por frequência
  return coOccurrences.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Converte co-ocorrências em formato de rede
 */
export function buildCoOccurrenceNetwork(
  coOccurrences: CoOccurrence[],
  minEdgeWeight: number = 2
): CoOccurrenceNetwork {
  // Calcular frequências dos nós
  const nodeFrequencies = new Map<string, number>();
  const nodeCategories = new Map<string, string>();
  
  coOccurrences.forEach(co => {
    nodeFrequencies.set(co.word1, (nodeFrequencies.get(co.word1) || 0) + co.frequency);
    nodeFrequencies.set(co.word2, (nodeFrequencies.get(co.word2) || 0) + co.frequency);
  });

  // Obter categorias do dicionário
  const dialectalDict = getDialectalWords();
  nodeFrequencies.forEach((_, word) => {
    const entry = dialectalDict.find(d => d.verbete.toLowerCase() === word.toLowerCase());
    if (entry?.categoria) {
      nodeCategories.set(word, entry.categoria);
    }
  });

  // Criar nós
  const nodes: CoOccurrenceNode[] = Array.from(nodeFrequencies.entries()).map(([word, freq]) => ({
    id: word,
    label: word,
    size: Math.log(freq + 1) * 10, // Escala logarítmica para tamanho
    category: nodeCategories.get(word),
    color: getCategoryColor(nodeCategories.get(word))
  }));

  // Criar arestas
  const edges: CoOccurrenceEdge[] = coOccurrences
    .filter(co => co.frequency >= minEdgeWeight)
    .map(co => ({
      source: co.word1,
      target: co.word2,
      weight: co.frequency,
      mutualInformation: co.mutualInformation
    }));

  return { nodes, edges };
}

/**
 * Cores para categorias
 */
function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    lida_campeira: '#ef4444',
    fauna: '#f59e0b',
    flora: '#10b981',
    vestuario: '#3b82f6',
    culinaria: '#8b5cf6',
    musica: '#ec4899',
    habitacao: '#6366f1',
    clima: '#06b6d4',
    social: '#14b8a6',
  };
  
  return colors[category || 'geral'] || '#64748b';
}

/**
 * Filtra rede por categoria
 */
export function filterNetworkByCategory(
  network: CoOccurrenceNetwork,
  category: string
): CoOccurrenceNetwork {
  if (category === 'todos') return network;
  
  const filteredNodes = network.nodes.filter(n => n.category === category);
  const nodeIds = new Set(filteredNodes.map(n => n.id));
  
  const filteredEdges = network.edges.filter(e => 
    nodeIds.has(e.source) && nodeIds.has(e.target)
  );
  
  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Encontra clusters/comunidades na rede
 */
export function findClusters(network: CoOccurrenceNetwork): Map<string, string[]> {
  // Algoritmo simples de clusterização baseado em categorias
  const clusters = new Map<string, string[]>();
  
  network.nodes.forEach(node => {
    const cluster = node.category || 'geral';
    if (!clusters.has(cluster)) {
      clusters.set(cluster, []);
    }
    clusters.get(cluster)!.push(node.id);
  });
  
  return clusters;
}
