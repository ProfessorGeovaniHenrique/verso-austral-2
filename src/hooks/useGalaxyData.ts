import { useMemo } from "react";
import { dominiosNormalizados } from "@/data/mockup/dominios-normalized";
import { getProsodiaSemantica } from "@/data/mockup/prosodias-map";

export interface GalaxyNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  colorText: string;
  size: number;
  domain: string;
  frequency: number;
  prosody: 'Positiva' | 'Negativa' | 'Neutra';
  type: 'domain' | 'word';
}

/**
 * Hook para processar dados normalizados em layout orbital
 * Distribui domínios em círculo e palavras orbitando cada domínio
 */
export function useGalaxyData() {
  const nodes = useMemo(() => {
    const galaxyNodes: GalaxyNode[] = [];
    
    // Centro da galáxia (canvas 1400x800)
    const centerX = 700;
    const centerY = 400;
    
    // Filtrar domínios (excluir palavras funcionais)
    const domains = dominiosNormalizados.filter(
      d => d.dominio !== "Palavras Funcionais"
    );
    
    // Distribuir domínios em círculo
    const domainRadius = 250; // Raio da órbita dos domínios
    
    domains.forEach((dominio, domainIndex) => {
      const angle = (domainIndex / domains.length) * Math.PI * 2;
      const domainX = centerX + Math.cos(angle) * domainRadius;
      const domainY = centerY + Math.sin(angle) * domainRadius;
      
      // Adicionar nó do domínio (planeta central)
      galaxyNodes.push({
        id: `domain-${dominio.dominio}`,
        label: dominio.dominio,
        x: domainX,
        y: domainY,
        color: dominio.cor,
        colorText: dominio.corTexto,
        size: 35, // Tamanho fixo para domínios
        domain: dominio.dominio,
        frequency: dominio.ocorrencias,
        prosody: 'Neutra',
        type: 'domain'
      });
      
      // Distribuir palavras em órbita ao redor do domínio
      const palavras = dominio.palavrasComFrequencia;
      const wordOrbitRadius = 80; // Raio base da órbita das palavras
      
      palavras.forEach((palavra, wordIndex) => {
        const wordAngle = (wordIndex / palavras.length) * Math.PI * 2;
        
        // Criar camadas de órbita (3 camadas)
        const layer = wordIndex % 3;
        const layerRadius = wordOrbitRadius + layer * 25;
        
        const wordX = domainX + Math.cos(wordAngle) * layerRadius;
        const wordY = domainY + Math.sin(wordAngle) * layerRadius;
        
        // Tamanho da palavra baseado na frequência (5 a 15)
        const wordSize = Math.min(15, 5 + palavra.ocorrencias * 2);
        
        galaxyNodes.push({
          id: `word-${palavra.palavra}`,
          label: palavra.palavra,
          x: wordX,
          y: wordY,
          color: dominio.cor,
          colorText: dominio.corTexto,
          size: wordSize,
          domain: dominio.dominio,
          frequency: palavra.ocorrencias,
          prosody: getProsodiaSemantica(palavra.palavra),
          type: 'word'
        });
      });
    });
    
    return galaxyNodes;
  }, []);
  
  return { nodes };
}
