import { useTexture } from '@react-three/drei';
import { scannerTextureArray } from '@/assets/planets/scanner';
import * as THREE from 'three';
import { useEffect } from 'react';

/**
 * Hook para preload de todas as texturas 2K do Scanner
 * Evita picos de GPU ao carregar texturas sob demanda
 */
export function usePlanetTextureLoader() {
  const textures = useTexture(scannerTextureArray);

  useEffect(() => {
    if (Array.isArray(textures) && textures.length === 9) {
      // Configurar todas as texturas para qualidade otimizada
      textures.forEach((texture) => {
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
  }, [textures]);

  return {
    textures: Array.isArray(textures) ? textures : [],
    isLoaded: Array.isArray(textures) && textures.length === 9,
  };
}
