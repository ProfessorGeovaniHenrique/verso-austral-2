/**
 * Sistema de Mapeamento Inteligente de Texturas Planetárias
 * Seleciona texturas baseado em características semânticas do domínio
 */

import type { ScannerTextureName } from '@/assets/planets/scanner';

export interface TextureProfile {
  name: ScannerTextureName;
  description: string;
  category: 'gaseous' | 'ice-giant' | 'rocky' | 'special' | 'dwarf-planet' | 'exotic';
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
  
  // ===== PLANETAS ANÕES (para domínios sub-representados) =====
  ceres: {
    name: 'ceres',
    description: 'Planeta anão com crateras densas',
    category: 'dwarf-planet',
    visualTraits: { vibrant: false, turbulent: false, barren: true, mysterious: false, toxic: false },
  },
  haumea: {
    name: 'haumea',
    description: 'Mundo gelado alongado com superfície escura',
    category: 'dwarf-planet',
    visualTraits: { vibrant: false, turbulent: false, barren: true, mysterious: true, toxic: false },
  },
  makemake: {
    name: 'makemake',
    description: 'Mundo anão avermelhado do cinturão de Kuiper',
    category: 'dwarf-planet',
    visualTraits: { vibrant: true, turbulent: false, barren: true, mysterious: true, toxic: false },
  },
  
  // ===== PLANETAS EXÓTICOS (para domínios especiais/abstratos) =====
  exotic01: {
    name: 'exotic01',
    description: 'Mundo exótico com padrões únicos',
    category: 'exotic',
    visualTraits: { vibrant: true, turbulent: false, barren: false, mysterious: true, toxic: false },
  },
  exotic02: {
    name: 'exotic02',
    description: 'Planeta alienígena com atmosfera densa',
    category: 'exotic',
    visualTraits: { vibrant: true, turbulent: true, barren: false, mysterious: true, toxic: false },
  },
  exotic03: {
    name: 'exotic03',
    description: 'Mundo com características visuais únicas',
    category: 'exotic',
    visualTraits: { vibrant: true, turbulent: false, barren: false, mysterious: true, toxic: false },
  },
  exotic04: {
    name: 'exotic04',
    description: 'Planeta com superfície exótica',
    category: 'exotic',
    visualTraits: { vibrant: false, turbulent: false, barren: true, mysterious: true, toxic: false },
  },
  exotic05: {
    name: 'exotic05',
    description: 'Mundo misterioso com padrões complexos',
    category: 'exotic',
    visualTraits: { vibrant: false, turbulent: true, barren: false, mysterious: true, toxic: false },
  },
  exotic06: {
    name: 'exotic06',
    description: 'Planeta exótico com atmosfera vibrante',
    category: 'exotic',
    visualTraits: { vibrant: true, turbulent: true, barren: false, mysterious: true, toxic: true },
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
  const vibranceScore = textualWeight / 100;
  const complexityScore = lexicalRichness / 100;
  const nameLC = domainName.toLowerCase();

  // ===== ESTRATÉGIA 1: Domínios MUITO sub-representados (<3%) → Planetas anões =====
  if (dominance === 'sub-representado' && textualWeight < 3) {
    if (vibranceScore < 0.015) return 'ceres';       // Mais raro e pequeno
    if (complexityScore < 0.3) return 'haumea';      // Médio-raro
    return 'makemake';                                // Raro com cor
  }

  // ===== ESTRATÉGIA 2: Domínios super-representados → Planetas grandes e vibrantes =====
  if (dominance === 'super-representado') {
    // Usar planetas exóticos para domínios abstratos importantes
    if (nameLC.includes('abstração') || nameLC.includes('conceito')) {
      return vibranceScore > 0.3 ? 'exotic02' : 'exotic05';
    }
    
    // Planetas clássicos para domínios super-representados
    if (vibranceScore > 0.25) return 'jupiter';
    if (complexityScore > 0.5) return 'venusAtmosphere';
    return 'saturn';
  }

  // ===== ESTRATÉGIA 3: Domínios equilibrados → Gigantes de gelo ou exóticos =====
  if (dominance === 'equilibrado') {
    // Usar exóticos para domínios temáticos especiais
    if (nameLC.includes('natureza') || nameLC.includes('paisagem')) {
      return complexityScore > 0.5 ? 'exotic01' : 'uranus';
    }
    if (nameLC.includes('sentimento') || nameLC.includes('emoção')) {
      return vibranceScore > 0.15 ? 'exotic03' : 'neptune';
    }
    if (nameLC.includes('cultura') || nameLC.includes('tradição')) {
      return 'exotic04';
    }
    
    return complexityScore > 0.5 ? 'neptune' : 'uranus';
  }

  // ===== ESTRATÉGIA 4: Domínios sub-representados normais (3-10%) =====
  if (dominance === 'sub-representado') {
    // Exóticos para casos especiais
    if (nameLC.includes('qualidades') || nameLC.includes('estados')) {
      return vibranceScore < 0.08 ? 'exotic06' : 'toxicCrater';
    }
    
    // Planetas rochosos padrão
    if (vibranceScore < 0.1) return 'mercury';
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
