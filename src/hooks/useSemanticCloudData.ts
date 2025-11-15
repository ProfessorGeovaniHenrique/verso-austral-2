import { useMemo } from "react";
import { dominiosNormalizados } from "@/data/mockup/dominios-normalized";
import { getProsodiaSemantica } from "@/data/mockup/prosodias-map";
import { calculateAllDomainStats, DomainStats } from "@/lib/linguisticStats";

export interface CloudNode {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number; // Profundidade (0-100)
  fontSize: number;
  color: string;
  type: 'domain' | 'word';
  frequency: number;
  domain: string;
  prosody: 'Positiva' | 'Negativa' | 'Neutra';
}

/**
 * Posicionamento em espiral (Golden Angle Spiral)
 * Distribui pontos de forma natural sem colisões
 */
function getSpiralPosition(
  index: number,
  spacing: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Golden angle em radianos
  const goldenAngle = 137.5 * (Math.PI / 180);
  const angle = index * goldenAngle;
  const radius = spacing * Math.sqrt(index);
  
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius
  };
}

/**
 * Verifica se uma posição está muito próxima de nós existentes
 */
function hasCollision(
  x: number,
  y: number,
  size: number,
  existingNodes: CloudNode[],
  minDistance: number
): boolean {
  return existingNodes.some(node => {
    const dx = node.x - x;
    const dy = node.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const requiredDistance = (node.fontSize + size) / 2 + minDistance;
    return distance < requiredDistance;
  });
}

/**
 * Encontra uma posição disponível para uma palavra
 */
function findAvailablePosition(
  existingNodes: CloudNode[],
  frequency: number,
  canvasWidth: number,
  canvasHeight: number,
  attempt: number = 0
): { x: number; y: number; z: number } {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  // Espalhamento baseado na frequência (palavras mais frequentes mais perto do centro)
  const maxRadius = Math.min(canvasWidth, canvasHeight) / 2 - 100;
  const minRadius = 150;
  const radius = minRadius + (1 - frequency / 10) * (maxRadius - minRadius);
  
  // Tentar posições aleatórias
  const angle = (attempt * 17 + Math.random() * 360) * (Math.PI / 180);
  const r = radius + (Math.random() - 0.5) * 100;
  
  const x = centerX + Math.cos(angle) * r;
  const y = centerY + Math.sin(angle) * r;
  const z = Math.random() * 50; // Palavras no fundo (0-50)
  
  return { x, y, z };
}

/**
 * Hook para gerar dados da nuvem de domínios semânticos
 */
export function useSemanticCloudData() {
  const { cloudNodes, stats } = useMemo(() => {
    const nodes: CloudNode[] = [];
    
    // Filtrar domínios (excluir palavras funcionais)
    const domains = dominiosNormalizados.filter(
      d => d.dominio !== "Palavras Funcionais"
    );
    
    // Canvas dimensions
    const canvasWidth = 1400;
    const canvasHeight = 700;
    
    // FASE 1: Criar nós de domínios (grandes, destaque)
    domains.forEach((dominio, index) => {
      // Usar spiral placement para distribuir domínios uniformemente
      const position = getSpiralPosition(index, 140, canvasWidth, canvasHeight);
      
      // Tamanho baseado na frequência (40-70px)
      const fontSize = 40 + Math.min(30, dominio.ocorrencias * 3);
      
      nodes.push({
        id: `domain-${dominio.dominio}`,
        label: dominio.dominio,
        x: position.x,
        y: position.y,
        z: 60 + Math.random() * 35, // Profundidade alta (60-95) - primeiro plano
        fontSize,
        color: dominio.cor,
        type: 'domain',
        frequency: dominio.ocorrencias,
        domain: dominio.dominio,
        prosody: 'Neutra'
      });
    });
    
    // FASE 2: Criar nós de palavras (menores, background)
    domains.forEach(dominio => {
      // Pegar apenas as palavras mais frequentes de cada domínio (top 15)
      const topWords = dominio.palavrasComFrequencia
        .sort((a, b) => b.ocorrencias - a.ocorrencias)
        .slice(0, 15);
      
      topWords.forEach((palavra, wordIndex) => {
        let position;
        let attempts = 0;
        const maxAttempts = 20;
        
        // Tentar encontrar posição sem colisão
        do {
          position = findAvailablePosition(
            nodes,
            palavra.ocorrencias,
            canvasWidth,
            canvasHeight,
            attempts + wordIndex * 100
          );
          attempts++;
        } while (
          attempts < maxAttempts &&
          hasCollision(position.x, position.y, 16, nodes, 25)
        );
        
        // Tamanho baseado na frequência (12-28px)
        const fontSize = 12 + Math.min(16, palavra.ocorrencias * 4);
        
        nodes.push({
          id: `word-${palavra.palavra}`,
          label: palavra.palavra,
          x: position.x,
          y: position.y,
          z: position.z,
          fontSize,
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
    
    return { cloudNodes: nodes, stats: domainStats };
  }, []);
  
  return { cloudNodes, stats };
}
