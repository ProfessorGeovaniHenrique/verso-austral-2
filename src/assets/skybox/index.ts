/**
 * Texturas 8K para Skybox (Background do Universo)
 * Equirectangular maps para cobertura 360° perfeita
 */

import starsTexture from './stars.jpg';
import milkyWayTexture from './milky-way.jpg';
import sunTexture from './sun.jpg';

export const skyboxTextures = {
  stars: starsTexture,        // Starfield minimalista
  milkyWay: milkyWayTexture,  // Via Láctea cinematográfica
  sun: sunTexture,            // Textura solar (futuro)
} as const;

export type SkyboxTextureName = keyof typeof skyboxTextures;
