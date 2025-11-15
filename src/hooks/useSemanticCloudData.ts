import { useMemo } from 'react';
import { dominiosNormalizados } from '@/data/mockup/dominios-normalized';
import { getProsodiaSemantica } from '@/data/mockup/prosodias-map';
import { calculateAllDomainStats } from '@/lib/linguisticStats';

export interface CloudNode {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  fontSize: number;
  color: string;
  type: 'domain' | 'word';
  frequency: number;
  domain: string;
  prosody: string;
}

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 700;
const CORPUS_SIZE = 10000;

function getCirclePosition(
  index: number,
  total: number,
  radius: number,
  centerX: number,
  centerY: number
): { x: number; y: number } {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius
  };
}

function getOrbitPosition(
  domainX: number,
  domainY: number,
  wordIndex: number,
  totalWords: number,
  orbitRadius: number,
  randomness: number = 0.2
): { x: number; y: number } {
  const angle = (wordIndex / totalWords) * Math.PI * 2 + Math.random() * randomness;
  const radiusVariation = orbitRadius * (1 + (Math.random() - 0.5) * 0.3);
  
  return {
    x: domainX + Math.cos(angle) * radiusVariation,
    y: domainY + Math.sin(angle) * radiusVariation
  };
}

export function useSemanticCloudData() {
  const { cloudNodes, stats } = useMemo(() => {
    const nodes: CloudNode[] = [];
    
    const domains = dominiosNormalizados.filter(
      d => d.dominio !== "Palavras Funcionais"
    );
    
    const domainStats = calculateAllDomainStats(domains);
    const statsMap = new Map(domainStats.map(s => [s.domain, s]));
    
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const domainCircleRadius = 220;
    
    const richnesses = domainStats.map(s => s.lexicalRichness);
    const minRichness = Math.min(...richnesses);
    const maxRichness = Math.max(...richnesses);
    
    domains.forEach((dominio, index) => {
      const position = getCirclePosition(
        index, 
        domains.length, 
        domainCircleRadius,
        centerX,
        centerY
      );
      
      const stats = statsMap.get(dominio.dominio);
      const richness = stats?.lexicalRichness || 0.5;
      
      const normalizedRichness = (richness - minRichness) / (maxRichness - minRichness);
      const fontSize = 45 + normalizedRichness * 40;
      
      nodes.push({
        id: `domain-${dominio.dominio}`,
        label: dominio.dominio,
        x: position.x,
        y: position.y,
        z: 60 + Math.random() * 20,
        fontSize,
        color: dominio.cor,
        type: 'domain',
        frequency: dominio.ocorrencias,
        domain: dominio.dominio,
        prosody: 'Neutra'
      });
    });
    
    domains.forEach((dominio) => {
      const domainNode = nodes.find(n => n.id === `domain-${dominio.dominio}`);
      if (!domainNode) return;
      
      const topWords = dominio.palavrasComFrequencia
        .sort((a, b) => b.ocorrencias - a.ocorrencias)
        .slice(0, 15);
      
      const normalizedFreqs = topWords.map(p => (p.ocorrencias / CORPUS_SIZE) * 1000);
      const minFreq = Math.min(...normalizedFreqs);
      const maxFreq = Math.max(...normalizedFreqs);
      
      topWords.forEach((palavra, wordIndex) => {
        const normalizedFreq = (palavra.ocorrencias / CORPUS_SIZE) * 1000;
        
        const normalizedValue = maxFreq > minFreq 
          ? (normalizedFreq - minFreq) / (maxFreq - minFreq)
          : 0.5;
        const fontSize = 14 + normalizedValue * 18;
        
        const orbitRadius = 85 + (1 - normalizedValue) * 35;
        
        const position = getOrbitPosition(
          domainNode.x,
          domainNode.y,
          wordIndex,
          topWords.length,
          orbitRadius
        );
        
        nodes.push({
          id: `word-${palavra.palavra}-${dominio.dominio}`,
          label: palavra.palavra,
          x: position.x,
          y: position.y,
          z: 20 + Math.random() * 25,
          fontSize,
          color: dominio.cor,
          type: 'word',
          frequency: palavra.ocorrencias,
          domain: dominio.dominio,
          prosody: getProsodiaSemantica(palavra.palavra)
        });
      });
    });
    
    return { cloudNodes: nodes, stats: domainStats };
  }, []);
  
  return { cloudNodes, stats };
}
