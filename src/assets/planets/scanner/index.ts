/**
 * Texturas 2K para Scanner Planetário
 * Equirectangular maps para cobertura 360° perfeita
 */

import jupiterTexture from './jupiter.jpg';
import marsTexture from './mars.jpg';
import mercuryTexture from './mercury.jpg';
import neptuneTexture from './neptune.jpg';
import saturnTexture from './saturn.jpg';
import uranusTexture from './uranus.jpg';
import venusAtmosphereTexture from './venus-atmosphere.jpg';
import venusSurfaceTexture from './venus-surface.jpg';
import toxicCraterTexture from './toxic-crater.png';

export const scannerTextures = {
  jupiter: jupiterTexture,
  mars: marsTexture,
  mercury: mercuryTexture,
  neptune: neptuneTexture,
  saturn: saturnTexture,
  uranus: uranusTexture,
  venusAtmosphere: venusAtmosphereTexture,
  venusSurface: venusSurfaceTexture,
  toxicCrater: toxicCraterTexture,
} as const;

export const scannerTextureArray = [
  jupiterTexture,
  marsTexture,
  mercuryTexture,
  neptuneTexture,
  saturnTexture,
  uranusTexture,
  venusAtmosphereTexture,
  venusSurfaceTexture,
  toxicCraterTexture,
];

export type ScannerTextureName = keyof typeof scannerTextures;
