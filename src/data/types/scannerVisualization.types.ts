import { ProsodiaType } from './corpus.types';

// ===== DADOS DO SCANNER PLANETÁRIO =====
export interface ScannerPlanet {
  id: string;
  name: string;
  color: string;
  textColor: string;
  position: [number, number, number];
  radius: number;
  rotationSpeed: number;
  probes: ScannerProbe[];
  stats: {
    totalWords: number;
    lexicalRichness: number;
    dominance: 'super-representado' | 'equilibrado' | 'sub-representado';
    normalizedFrequency: number;
    textualWeight: number;
  };
}

export interface ScannerProbe {
  id: string;
  word: string;
  latitude: number;  // -90 a +90
  longitude: number; // -180 a +180
  frequency: number;
  prosody: ProsodiaType;
  isScanned: boolean;
  surfacePosition: [number, number, number]; // Posição 3D calculada
}

export interface ScannerState {
  activePlanetId: string | null;
  cameraMode: 'universe' | 'orbit' | 'scan';
  selectedProbeId: string | null;
  hudVisible: boolean;
}

export interface ProbeStats {
  word: string;
  frequency: number;
  prosody: ProsodiaType;
  kwicEntries: Array<{
    leftContext: string;
    keyword: string;
    rightContext: string;
    source: string;
  }>;
}
