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
}

/**
 * Hook para gerar dados 3D da nuvem de domínios semânticos
 * Otimizado para renderização com Three.js
 */
export function useThreeSemanticData() {
  const { nodes, stats } = useMemo(() => {
    const result: ThreeCloudNode[] = [];
    
    // Filtrar domínios (excluir palavras funcionais)
    const domains = dominiosNormalizados.filter(
      d => d.dominio !== "Palavras Funcionais"
    );
    
    // FASE 1: Criar nós de domínios distribuídos em círculo
    domains.forEach((dominio, index) => {
      const angle = (index / domains.length) * Math.PI * 2;
      const radius = 15; // Raio da órbita dos domínios
      
      // Calcular riqueza lexical
      const domainStats = calculateDomainStats(dominio);
      const scale = 1.5 + domainStats.lexicalRichness * 3; // 1.5-4.5 unidades
      
      result.push({
        id: `domain-${dominio.dominio}`,
        label: dominio.dominio,
        position: [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ],
        scale,
        color: dominio.cor,
        type: 'domain',
        frequency: dominio.ocorrencias,
        domain: dominio.dominio,
        prosody: 'Neutra'
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
          prosody: getProsodiaSemantica(palavra.palavra)
        });
      });
    });
    
    // Calcular estatísticas
    const domainStats = calculateAllDomainStats(domains);
    
    return { nodes: result, stats: domainStats };
  }, []);
  
  return { nodes, stats };
}
