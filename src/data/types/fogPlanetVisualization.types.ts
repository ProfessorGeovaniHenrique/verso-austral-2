import { ProsodiaType, KWICEntry } from './corpus.types';

/**
 * Tipos para a Visualização FOG & PLANETS (Fase 4)
 * 
 * Esta estrutura de dados representa:
 * - Domínios Semânticos como nuvens volumétricas (FOG)
 * - Palavras como mini-planetas texturizados orbitando
 */

// ===== PALAVRA ENRIQUECIDA (Mini-Planeta) =====
export interface SemanticWord {
  // Dados básicos
  palavra: string;
  ocorrencias: number;
  dominio: string;
  
  // Prosódia Semântica
  prosody: ProsodiaType;
  prosodyJustification: string; // Explicação da classificação de prosódia
  
  // Contexto Linguístico
  contextualDefinition: string; // Definição no contexto gaúcho
  concordances: KWICEntry[]; // Exemplos de uso (KWIC)
  relatedWords: string[]; // Palavras co-ocorrentes/relacionadas
  
  // Propriedades Visuais (Planeta)
  planetTexture: string; // URL da textura do planeta
  hueShift: number; // Rotação no círculo cromático (-180 a 180)
  
  // Propriedades Orbitais
  orbitalRadius: number; // Distância do centro do domínio
  orbitalAngle: number; // Ângulo inicial na órbita (radianos)
  orbitalSpeed: number; // Velocidade de rotação orbital
  orbitalEccentricity: number; // Excentricidade da elipse (0 = círculo, 0.5 = elipse)
  
  // Metadados Estatísticos (para tooltip/debug)
  miScore?: number; // Mutual Information Score (força de associação)
}

// ===== DOMÍNIO SEMÂNTICO (Nuvem FOG) =====
export interface FogDomain {
  // Dados Estatísticos
  dominio: string;
  cor: string; // HSL format
  corTexto: string; // HSL format
  palavras: SemanticWord[];
  riquezaLexical: number;
  ocorrencias: number;
  frequenciaNormalizada: number;
  percentualTematico: number;
  comparacaoCorpus: 'super-representado' | 'equilibrado' | 'sub-representado';
  diferencaCorpus: number;
  
  // Propriedades FOG (Visuais)
  position: [number, number, number]; // Posição 3D no espaço
  fogRadius: number; // Raio da nuvem volumétrica
  pulsationSpeed: number; // Velocidade da pulsação
  emissiveIntensity: number; // Intensidade do brilho
  noiseScale: number; // Escala do noise displacement
  baseOpacity: number; // Opacidade base (0-1)
}

// ===== CONEXÕES ENTRE DOMÍNIOS =====
export interface SemanticConnection {
  from: string; // ID do domínio origem
  to: string; // ID do domínio destino
  strength: number; // Força da conexão (0-1)
  sharedWords: string[]; // Palavras compartilhadas entre domínios
}

// ===== DADOS COMPLETOS DA VISUALIZAÇÃO =====
export interface FogPlanetVisualizationData {
  domains: FogDomain[];
  connections: SemanticConnection[];
  totalWords: number;
  totalOccurrences: number;
}

// ===== TIPOS DE FILTROS =====
export interface VisualizationFilters {
  selectedDomainId?: string;
  minFrequency: number;
  maxWords: number;
  showLabels: boolean;
  fogIntensity: number; // 0-1
  glowIntensity: number; // 0-1.5
  prosodyFilter?: ProsodiaType[];
}
