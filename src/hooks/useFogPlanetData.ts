import { useState, useMemo, useCallback } from 'react';
import { enrichedSemanticData } from '@/data/mockup/enrichedSemanticData';
import { dominiosSeparated } from '@/data/mockup/dominios-separated';
import {
  FogDomain,
  SemanticConnection,
  VisualizationFilters,
  SemanticWord
} from '@/data/types/fogPlanetVisualization.types';

// ===== INTERFACES =====
interface UseFogPlanetDataProps {
  initialFilters?: Partial<VisualizationFilters>;
}

interface UseFogPlanetDataReturn {
  domains: FogDomain[];
  connections: SemanticConnection[];
  totalWords: number;
  totalOccurrences: number;
  isLoading: boolean;
  error: string | null;
  filters: VisualizationFilters;
  setFilters: (filters: Partial<VisualizationFilters>) => void;
  resetFilters: () => void;
}

// ===== FILTROS DEFAULT =====
const defaultFilters: VisualizationFilters = {
  selectedDomainId: undefined,
  minFrequency: 1,           // Mostrar todas as palavras inicialmente
  maxWords: 15,              // Aumentar para 15 palavras por domínio
  showLabels: true,
  fogIntensity: 0.85,        // 85% de intensidade (mais visível)
  prosodyFilter: undefined   // Sem filtro de prosódia inicialmente
};

// ===== FUNÇÃO: Agrupar Palavras por Domínio =====
function groupWordsByDomain(words: SemanticWord[]): Map<string, SemanticWord[]> {
  const grouped = new Map<string, SemanticWord[]>();
  
  for (const word of words) {
    const domainWords = grouped.get(word.dominio) || [];
    domainWords.push(word);
    grouped.set(word.dominio, domainWords);
  }
  
  return grouped;
}

// ===== FUNÇÃO: Calcular Posição 3D do Domínio =====
function calculateDomainPosition(
  domainIndex: number, 
  totalDomains: number
): [number, number, number] {
  // Distribuir em círculo no plano XZ
  const radius = 8; // Raio da constelação
  const angle = (domainIndex / totalDomains) * Math.PI * 2;
  
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  
  // Variação vertical aleatória (mas determinística)
  const y = Math.sin(domainIndex * 1.3) * 2; // -2 a 2
  
  return [x, y, z];
}

// ===== FUNÇÃO: Calcular Propriedades FOG do Domínio =====
function calculateFogProperties(
  domainData: typeof dominiosSeparated[0],
  wordCount: number
): {
  fogRadius: number;
  pulsationSpeed: number;
  emissiveIntensity: number;
  noiseScale: number;
  baseOpacity: number;
} {
  // Raio proporcional à riqueza lexical (número de palavras únicas)
  const fogRadius = 1.8 + (wordCount / 15) * 1.2; // 1.8 a 3.0
  
  // Pulsação mais rápida para domínios super-representados
  const pulsationSpeed = domainData.comparacaoCorpus === 'super-representado' ? 0.4 : 0.25;
  
  // Intensidade do brilho aumentada para material nativo (sem fresnel)
  const emissiveIntensity = domainData.comparacaoCorpus === 'super-representado' ? 1.8 : 1.5;
  
  // Escala do noise (turbulência da nuvem)
  const noiseScale = 1.5 + Math.random() * 0.5; // 1.5 a 2.0 (variação visual)
  
  // Opacidade base ajustada para material nativo
  const baseOpacity = 0.85 + (domainData.percentualTematico / 100) * 0.15; // 0.85 a 1.0
  
  return {
    fogRadius,
    pulsationSpeed,
    emissiveIntensity,
    noiseScale,
    baseOpacity
  };
}

// ===== FUNÇÃO: Aplicar Filtros =====
function applyFilters(
  domains: FogDomain[],
  filters: VisualizationFilters
): FogDomain[] {
  return domains
    .map(domain => {
      // Filtrar palavras
      let filteredWords = domain.palavras
        .filter(word => word.ocorrencias >= filters.minFrequency);
      
      // Filtro de prosódia (se aplicável)
      if (filters.prosodyFilter && filters.prosodyFilter.length > 0) {
        filteredWords = filteredWords.filter(word => 
          filters.prosodyFilter!.includes(word.prosody)
        );
      }
      
      // Limitar número de palavras (as mais frequentes)
      filteredWords = filteredWords
        .sort((a, b) => b.ocorrencias - a.ocorrencias)
        .slice(0, filters.maxWords);
      
      // Ajustar opacidade baseado em fogIntensity
      // Garantir opacidade mínima para visibilidade
      const adjustedOpacity = Math.max(
        domain.baseOpacity * filters.fogIntensity,
        0.5  // Mínimo 50% de opacidade
      );
      
      return {
        ...domain,
        palavras: filteredWords,
        baseOpacity: adjustedOpacity
      };
    })
    .filter(domain => domain.palavras.length > 0); // Remover domínios vazios
}

// ===== FUNÇÃO: Calcular Conexões Semânticas =====
function calculateConnections(domains: FogDomain[]): SemanticConnection[] {
  const connections: SemanticConnection[] = [];
  
  for (let i = 0; i < domains.length; i++) {
    for (let j = i + 1; j < domains.length; j++) {
      const domainA = domains[i];
      const domainB = domains[j];
      
      // Encontrar palavras compartilhadas (mesmo texto)
      const wordsA = new Set(domainA.palavras.map(w => w.palavra.toLowerCase()));
      const wordsB = new Set(domainB.palavras.map(w => w.palavra.toLowerCase()));
      const sharedWords = [...wordsA].filter(w => wordsB.has(w));
      
      // Se houver palavras compartilhadas, criar conexão
      if (sharedWords.length > 0) {
        // Força da conexão: % de sobreposição (Índice de Jaccard)
        const totalUnique = new Set([...wordsA, ...wordsB]).size;
        const strength = sharedWords.length / totalUnique;
        
        connections.push({
          from: domainA.dominio,
          to: domainB.dominio,
          strength,
          sharedWords
        });
      }
    }
  }
  
  // Ordenar por força (mais fortes primeiro)
  return connections.sort((a, b) => b.strength - a.strength);
}

// ===== FUNÇÃO: Calcular Estatísticas Globais =====
function calculateStats(domains: FogDomain[]): {
  totalWords: number;
  totalOccurrences: number;
} {
  const totalWords = domains.reduce((sum, d) => sum + d.palavras.length, 0);
  const totalOccurrences = domains.reduce(
    (sum, d) => sum + d.palavras.reduce((s, w) => s + w.ocorrencias, 0), 
    0
  );
  
  return { totalWords, totalOccurrences };
}

// ===== FUNÇÃO: Criar Domínios FOG Completos =====
function createFogDomains(words: SemanticWord[]): FogDomain[] {
  // Agrupar palavras por domínio
  const wordsByDomain = groupWordsByDomain(words);
  
  // Criar domínios FOG
  const fogDomains: FogDomain[] = [];
  let domainIndex = 0;
  
  for (const domainInfo of dominiosSeparated) {
    const domainName = domainInfo.dominio;
    
    // Ignorar "Palavras Funcionais" (não são temáticas)
    if (domainName === "Palavras Funcionais") continue;
    
    const domainWords = wordsByDomain.get(domainName) || [];
    if (domainWords.length === 0) continue;
    
    // Calcular posição 3D
    const position = calculateDomainPosition(domainIndex, 6); // 6 domínios temáticos
    
    // Calcular propriedades FOG
    const fogProps = calculateFogProperties(domainInfo, domainWords.length);
    
    // Criar domínio FOG
    const fogDomain: FogDomain = {
      dominio: domainName,
      cor: domainInfo.cor,
      corTexto: domainInfo.corTexto,
      palavras: domainWords,
      riquezaLexical: domainInfo.riquezaLexical,
      ocorrencias: domainInfo.ocorrencias,
      frequenciaNormalizada: domainInfo.frequenciaNormalizada,
      percentualTematico: domainInfo.percentualTematico,
      comparacaoCorpus: domainInfo.comparacaoCorpus,
      diferencaCorpus: domainInfo.diferencaCorpus,
      position,
      ...fogProps
    };
    
    fogDomains.push(fogDomain);
    domainIndex++;
  }
  
  return fogDomains;
}

// ===== HOOK PRINCIPAL =====
export function useFogPlanetData(
  props?: UseFogPlanetDataProps
): UseFogPlanetDataReturn {
  // Estado dos filtros
  const [filters, setFilters] = useState<VisualizationFilters>({
    ...defaultFilters,
    ...props?.initialFilters
  });
  
  // Estados de controle (mock data, sem loading real)
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  
  // Criar domínios FOG base (sem filtros)
  const baseDomains = useMemo(() => {
    return createFogDomains(enrichedSemanticData);
  }, []);
  
  // Aplicar filtros aos domínios
  const filteredDomains = useMemo(() => {
    return applyFilters(baseDomains, filters);
  }, [baseDomains, filters]);
  
  // Calcular conexões semânticas
  const connections = useMemo(() => {
    return calculateConnections(filteredDomains);
  }, [filteredDomains]);
  
  // Calcular estatísticas globais
  const stats = useMemo(() => {
    return calculateStats(filteredDomains);
  }, [filteredDomains]);
  
  // Atualizar filtros (merge parcial)
  const updateFilters = useCallback((newFilters: Partial<VisualizationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  
  // Reset filtros
  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilters, ...props?.initialFilters });
  }, [props?.initialFilters]);
  
  return {
    domains: filteredDomains,
    connections,
    totalWords: stats.totalWords,
    totalOccurrences: stats.totalOccurrences,
    isLoading,
    error,
    filters,
    setFilters: updateFilters,
    resetFilters
  };
}

// ===== EXPORTAR TIPOS =====
export type { UseFogPlanetDataProps, UseFogPlanetDataReturn };
