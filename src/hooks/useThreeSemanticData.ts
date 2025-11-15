import { useMemo } from "react";
import { dominiosNormalizados } from "@/data/mockup/dominios-normalized";
import { getProsodiaSemantica } from "@/data/mockup/prosodias-map";
import { calculateAllDomainStats, calculateDomainStats, DomainStats } from "@/lib/linguisticStats";

// Tamanho do corpus
const CORPUS_SIZE = 10000;

export interface ThreeCloudNode {
  id: string;
  label: string;
  position: [number, number, number]; // Three.js Vector3
  scale: number; // Tamanho do objeto 3D
  color: string;
  type: 'domain' | 'word';
  frequency: number;
  domain: string;
  prosody: 'Positiva' | 'Negativa' | 'Neutra';
  glowIntensity: number; // 0.3-1.8
  textualWeight?: number; // percentualTematico (apenas para domínios)
  lexicalRichness?: number; // riquezaLexical (apenas para domínios)
  baseOpacity: number; // opacidade base para filtros
}

export interface DomainConnection {
  from: string;
  to: string;
  strength: number;
}

export type ViewMode = 'constellation' | 'orbital';

/**
 * Hook para gerar dados 3D da nuvem de domínios semânticos
 * Otimizado para renderização com Three.js
 */
export function useThreeSemanticData(viewMode: ViewMode = 'constellation', selectedDomainId?: string) {
  const { nodes, stats, connections } = useMemo(() => {
    const result: ThreeCloudNode[] = [];
    
    // Filtrar domínios (excluir palavras funcionais)
    const domains = dominiosNormalizados.filter(
      d => d.dominio !== "Palavras Funcionais"
    );
    
    // FASE 1: Criar nós de domínios distribuídos em círculo
    domains.forEach((dominio, index) => {
      const angle = (index / domains.length) * Math.PI * 2;
      const radius = 15; // Raio da órbita dos domínios
      
      // Calcular riqueza lexical e peso textual
      const domainStats = calculateDomainStats(dominio);
      const scale = 1.5 + domainStats.lexicalRichness * 3; // 1.5-4.5 unidades
      
      // Calcular glow intensity baseado em peso textual
      const textualWeight = dominio.percentualTematico || 0;
      const glowIntensity = 0.5 + (textualWeight / 100) * 1.3;
      
      // Posição diferente no modo orbital
      const position: [number, number, number] = viewMode === 'orbital' && selectedDomainId === dominio.dominio
        ? [0, 0, 0] // Domínio selecionado no centro
        : [
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          ];
      
      result.push({
        id: `domain-${dominio.dominio}`,
        label: dominio.dominio,
        position,
        scale,
        color: dominio.cor,
        type: 'domain',
        frequency: dominio.ocorrencias,
        domain: dominio.dominio,
        prosody: 'Neutra',
        glowIntensity,
        textualWeight,
        lexicalRichness: domainStats.lexicalRichness,
        baseOpacity: 1.0
      });
    });
    
    // FASE 2: Criar nós de palavras orbitando seus domínios
    domains.forEach((dominio, domainIndex) => {
      // Encontrar o nó de domínio correspondente
      const domainNode = result.find(n => n.id === `domain-${dominio.dominio}`);
      if (!domainNode) return;
      
      // Pegar top 15 palavras mais frequentes
      const topWords = dominio.palavrasComFrequencia
        .sort((a, b) => b.ocorrencias - a.ocorrencias)
        .slice(0, 15);
      
      topWords.forEach((palavra, wordIndex) => {
        // Distribuir palavras em círculo ao redor do domínio
        const angleOffset = (wordIndex / topWords.length) * Math.PI * 2;
        const orbitRadius = 3 + Math.random() * 2; // 3-5 unidades
        
        // Calcular frequência normalizada para tamanho
        const normalizedFreq = (palavra.ocorrencias / CORPUS_SIZE) * 1000;
        const scale = 0.3 + Math.min(1, normalizedFreq / 10) * 0.7; // 0.3-1.0
        
        // Prosódia semântica para opacidade
        const prosody = getProsodiaSemantica(palavra.palavra);
        const baseOpacity = prosody === 'Positiva' ? 1.0 : prosody === 'Neutra' ? 0.7 : 0.5;
        
        // Ocultar palavras de outros domínios no modo orbital
        const shouldHide = viewMode === 'orbital' && selectedDomainId && dominio.dominio !== selectedDomainId;
        
        if (!shouldHide) {
          result.push({
            id: `word-${palavra.palavra}`,
            label: palavra.palavra,
            position: [
              domainNode.position[0] + Math.cos(angleOffset) * orbitRadius,
              Math.sin(angleOffset * 2) * 2, // Variação vertical
              domainNode.position[2] + Math.sin(angleOffset) * orbitRadius
            ],
            scale,
            color: dominio.cor,
            type: 'word',
            frequency: palavra.ocorrencias,
            domain: dominio.dominio,
            prosody,
            glowIntensity: 0.3 + normalizedFreq / 30,
            baseOpacity
          });
        }
      });
    });
    
    // Calcular estatísticas
    const domainStats = calculateAllDomainStats(domains);
    
    // Calcular conexões entre domínios
    const connections: DomainConnection[] = [
      { from: "Cultura e Lida Gaúcha", to: "Natureza e Paisagem", strength: 0.7 },
      { from: "Sentimentos e Abstrações", to: "Qualidades e Estados", strength: 0.5 },
      { from: "Natureza e Paisagem", to: "Sentimentos e Abstrações", strength: 0.4 },
      { from: "Ações e Processos", to: "Cultura e Lida Gaúcha", strength: 0.6 }
    ];
    
    return { nodes: result, stats: domainStats, connections };
  }, [viewMode, selectedDomainId]);
  
  return { nodes, stats, connections };
}
