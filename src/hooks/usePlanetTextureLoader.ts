import { useTexture } from '@react-three/drei';
import { scannerTextureArray } from '@/assets/planets/scanner';
import { skyboxTextures } from '@/assets/skybox';
import * as THREE from 'three';
import { useEffect } from 'react';

/**
 * Hook para preload de todas as texturas do Scanner (21 planetas + skybox)
 * Evita picos de GPU ao carregar texturas sob demanda
 */
export function usePlanetTextureLoader() {
  const planetTextures = useTexture(scannerTextureArray);
  const starfieldTexture = useTexture(skyboxTextures.milkyWay);

  useEffect(() => {
    if (Array.isArray(planetTextures) && planetTextures.length === 18) {
      // Configurar todas as texturas planetárias para qualidade otimizada
      planetTextures.forEach((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        
        // CRÍTICO: Configurar wrapping para cobertura 360° sem costuras
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    // Configurar skybox 8K
    if (starfieldTexture) {
      starfieldTexture.mapping = THREE.EquirectangularReflectionMapping;
      starfieldTexture.colorSpace = THREE.SRGBColorSpace;
      starfieldTexture.minFilter = THREE.LinearFilter;
      starfieldTexture.magFilter = THREE.LinearFilter;
      starfieldTexture.needsUpdate = true;
    }
  }, [planetTextures, starfieldTexture]);

  return {
    textures: Array.isArray(planetTextures) ? planetTextures : [],
    starfieldTexture,
    isLoaded: Array.isArray(planetTextures) && planetTextures.length === 18 && starfieldTexture !== null,
  };
}
