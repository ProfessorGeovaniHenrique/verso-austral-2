import { useEffect, useState } from 'react';
import { useTexture } from '@react-three/drei';
import { Html } from '@react-three/drei';
import { planetTextures } from '@/assets/planets';
import * as THREE from 'three';

interface TexturePreloaderProps {
  onLoaded: (textures: THREE.Texture[]) => void;
  children: React.ReactNode;
}

/**
 * TexturePreloader - Carrega todas as texturas de planetas antes de renderizar a cena
 * 
 * Evita picos de GPU ao carregar texturas sob demanda durante a interação.
 * Carrega as 10 texturas de planetas uma única vez e as passa para os componentes filhos.
 */
export function TexturePreloader({ onLoaded, children }: TexturePreloaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Carregar todas as 10 texturas de uma vez
  const textures = useTexture(planetTextures);
  
  useEffect(() => {
    if (textures && Array.isArray(textures) && textures.length === 10) {
      // Configurar texturas para qualidade otimizada
      textures.forEach(texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
      });
      
      onLoaded(textures);
      setIsLoaded(true);
    }
  }, [textures, onLoaded]);
  
  if (!isLoaded) {
    return (
      <Html center>
        <div className="flex flex-col items-center gap-4 p-8 bg-background/90 rounded-lg border border-border backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-lg font-medium text-foreground">
              Carregando texturas dos planetas...
            </span>
          </div>
          <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-sm text-muted-foreground">
            Preparando visualização 3D
          </p>
        </div>
      </Html>
    );
  }
  
  return <>{children}</>;
}
