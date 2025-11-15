import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { skyboxTextures } from '@/assets/skybox';

interface Starfield8KProps {
  variant?: 'stars' | 'milkyWay';
  radius?: number;
}

/**
 * Skybox 8K de alta qualidade usando equirectangular map
 * Cria uma esfera envolvente com textura de estrelas/galáxia
 */
export function Starfield8K({ 
  variant = 'milkyWay', 
  radius = 500 
}: Starfield8KProps) {
  // Carregar textura 8K selecionada
  const texture = useTexture(skyboxTextures[variant]);

  // Configurar textura equirectangular
  useMemo(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshBasicMaterial 
        map={texture} 
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}
