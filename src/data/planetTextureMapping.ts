/**
 * Sistema de Mapeamento Inteligente de Texturas Planetárias
 * Seleciona texturas baseado em características semânticas do domínio
 */

import type { ScannerTextureName } from '@/assets/planets/scanner';

export interface TextureProfile {
  name: ScannerTextureName;
  description: string;
  category: 'gaseous' | 'ice-giant' | 'rocky' | 'special';
  visualTraits: {
    vibrant: boolean;      // Cores vibrantes
    turbulent: boolean;    // Atmosfera turbulenta
    barren: boolean;       // Árido/desolado
    mysterious: boolean;   // Atmosfera misteriosa
    toxic: boolean;        // Aparência tóxica/hostil
  };
}

export const textureProfiles: Record<ScannerTextureName, TextureProfile> = {
  jupiter: {
    name: 'jupiter',
    description: 'Gigante gasoso com tempestades violentas',
    category: 'gaseous',
    visualTraits: { vibrant: true, turbulent: true, barren: false, mysterious: false, toxic: false },
  },
  saturn: {
    name: 'saturn',
    description: 'Atmosfera dourada com faixas suaves',
    category: 'gaseous',
    visualTraits: { vibrant: true, turbulent: false, barren: false, mysterious: false, toxic: false },
  },
  neptune: {
    name: 'neptune',
    description: 'Azul profundo e misterioso',
    category: 'ice-giant',
    visualTraits: { vibrant: false, turbulent: true, barren: false, mysterious: true, toxic: false },
  },
  uranus: {
    name: 'uranus',
    description: 'Azul-esverdeado pálido e sereno',
    category: 'ice-giant',
    visualTraits: { vibrant: false, turbulent: false, barren: false, mysterious: true, toxic: false },
  },
  mars: {
    name: 'mars',
    description: 'Deserto vermelho com cânions',
    category: 'rocky',
    visualTraits: { vibrant: false, turbulent: false, barren: true, mysterious: false, toxic: false },
  },
  mercury: {
    name: 'mercury',
    description: 'Crateras cinzentas e árido',
    category: 'rocky',
    visualTraits: { vibrant: false, turbulent: false, barren: true, mysterious: false, toxic: false },
  },
  venusAtmosphere: {
    name: 'venusAtmosphere',
    description: 'Nuvens ácidas amareladas',
    category: 'rocky',
    visualTraits: { vibrant: true, turbulent: true, barren: false, mysterious: false, toxic: true },
  },
  venusSurface: {
    name: 'venusSurface',
    description: 'Superfície vulcânica hostil',
    category: 'rocky',
    visualTraits: { vibrant: true, turbulent: false, barren: true, mysterious: false, toxic: true },
  },
  toxicCrater: {
    name: 'toxicCrater',
    description: 'Cratera tóxica alienígena',
    category: 'special',
    visualTraits: { vibrant: true, turbulent: false, barren: true, mysterious: true, toxic: true },
  },
};

/**
 * Seleciona textura apropriada baseado em características do domínio
 */
export function selectTextureForDomain(
  dominance: 'super-representado' | 'equilibrado' | 'sub-representado',
  lexicalRichness: number,
  textualWeight: number,
  domainName: string
): ScannerTextureName {
  // Calcular "vibrance score" (0-1)
  const vibranceScore = textualWeight / 100;
  
  // Calcular "complexity score" (0-1)
  const complexityScore = lexicalRichness / 100;

  // Estratégia 1: Domínios super-representados → Planetas vibrantes e turbulentos
  if (dominance === 'super-representado') {
    if (vibranceScore > 0.25) return 'jupiter';
    if (complexityScore > 0.5) return 'venusAtmosphere';
    return 'saturn';
  }

  // Estratégia 2: Domínios equilibrados → Gigantes de gelo ou planetas intermediários
  if (dominance === 'equilibrado') {
    if (domainName.toLowerCase().includes('natureza') || domainName.toLowerCase().includes('paisagem')) {
      return 'uranus';
    }
    if (domainName.toLowerCase().includes('sentimento') || domainName.toLowerCase().includes('abstração')) {
      return 'neptune';
    }
    return complexityScore > 0.5 ? 'neptune' : 'uranus';
  }

  // Estratégia 3: Domínios sub-representados → Planetas áridos ou especiais
  if (dominance === 'sub-representado') {
    if (vibranceScore < 0.1) return 'mercury';
    if (domainName.toLowerCase().includes('qualidades') || domainName.toLowerCase().includes('estados')) {
      return 'toxicCrater';
    }
    if (complexityScore < 0.3) return 'mars';
    return 'venusSurface';
  }

  // Fallback padrão
  return 'mars';
}

/**
 * Obtém perfil da textura
 */
export function getTextureProfile(textureName: ScannerTextureName): TextureProfile {
  return textureProfiles[textureName];
}
