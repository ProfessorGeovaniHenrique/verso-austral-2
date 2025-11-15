/**
 * Texturas 2K para Scanner Planetário
 * Equirectangular maps para cobertura 360° perfeita
 * Total: 21 texturas (9 originais + 3 planetas anões + 9 exóticos)
 */

// Planetas originais do sistema solar
import jupiterTexture from './jupiter.jpg';
import marsTexture from './mars.jpg';
import mercuryTexture from './mercury.jpg';
import neptuneTexture from './neptune.jpg';
import saturnTexture from './saturn.jpg';
import uranusTexture from './uranus.jpg';
import venusAtmosphereTexture from './venus-atmosphere.jpg';
import venusSurfaceTexture from './venus-surface.jpg';
import toxicCraterTexture from './toxic-crater.png';

// Planetas anões (para domínios sub-representados)
import ceresTexture from './ceres.jpg';
import haumeaTexture from './haumea.jpg';
import makemakeTexture from './makemake.jpg';

// Planetas exóticos gerados (para domínios especiais)
import exotic01Texture from './exotic-01.png';
import exotic02Texture from './exotic-02.png';
import exotic03Texture from './exotic-03.png';
import exotic04Texture from './exotic-04.png';
import exotic05Texture from './exotic-05.png';
import exotic06Texture from './exotic-06.png';

export const scannerTextures = {
  // Sistema Solar
  jupiter: jupiterTexture,
  mars: marsTexture,
  mercury: mercuryTexture,
  neptune: neptuneTexture,
  saturn: saturnTexture,
  uranus: uranusTexture,
  venusAtmosphere: venusAtmosphereTexture,
  venusSurface: venusSurfaceTexture,
  toxicCrater: toxicCraterTexture,
  
  // Planetas Anões
  ceres: ceresTexture,
  haumea: haumeaTexture,
  makemake: makemakeTexture,
  
  // Planetas Exóticos
  exotic01: exotic01Texture,
  exotic02: exotic02Texture,
  exotic03: exotic03Texture,
  exotic04: exotic04Texture,
  exotic05: exotic05Texture,
  exotic06: exotic06Texture,
} as const;

export const scannerTextureArray = [
  // Sistema Solar (9)
  jupiterTexture,
  marsTexture,
  mercuryTexture,
  neptuneTexture,
  saturnTexture,
  uranusTexture,
  venusAtmosphereTexture,
  venusSurfaceTexture,
  toxicCraterTexture,
  
  // Planetas Anões (3)
  ceresTexture,
  haumeaTexture,
  makemakeTexture,
  
  // Planetas Exóticos (6)
  exotic01Texture,
  exotic02Texture,
  exotic03Texture,
  exotic04Texture,
  exotic05Texture,
  exotic06Texture,
];

export type ScannerTextureName = keyof typeof scannerTextures;
