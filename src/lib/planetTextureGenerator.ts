import * as THREE from 'three';

/**
 * Gera uma textura equiretangular a partir de uma imagem comum
 * Garante cobertura 360° na esfera
 */
export function generateEquirectangularTexture(
  sourceTexture: THREE.Texture,
  targetWidth: number = 2048,
  targetHeight: number = 1024
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  
  // Carregar a imagem source
  const img = sourceTexture.image as CanvasImageSource;
  
  // ESTRATÉGIA: Repetir a imagem 4 vezes na horizontal com espelhamento
  const sectionWidth = targetWidth / 4;
  
  for (let i = 0; i < 4; i++) {
    const x = i * sectionWidth;
    
    // Espelhar em seções alternadas para criar continuidade
    if (i % 2 === 0) {
      ctx.drawImage(img, x, 0, sectionWidth, targetHeight);
    } else {
      ctx.save();
      ctx.translate(x + sectionWidth, 0);
      ctx.scale(-1, 1); // Espelhar horizontalmente
      ctx.drawImage(img, 0, 0, sectionWidth, targetHeight);
      ctx.restore();
    }
  }
  
  // Adicionar gradiente nos polos para suavizar
  const gradient = ctx.createLinearGradient(0, 0, 0, targetHeight);
  gradient.addColorStop(0, 'rgba(0,0,0,0.2)'); // Polo norte escuro
  gradient.addColorStop(0.5, 'rgba(0,0,0,0)'); // Equador normal
  gradient.addColorStop(1, 'rgba(0,0,0,0.2)'); // Polo sul escuro
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  
  // Criar textura do canvas
  const canvasTexture = new THREE.CanvasTexture(canvas);
  canvasTexture.wrapS = THREE.RepeatWrapping;
  canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
  canvasTexture.minFilter = THREE.LinearMipmapLinearFilter;
  canvasTexture.magFilter = THREE.LinearFilter;
  canvasTexture.anisotropy = 16;
  
  return canvasTexture;
}

/**
 * Cache de texturas processadas
 */
const textureCache = new Map<string, THREE.CanvasTexture>();

export function getOrCreatePlanetTexture(
  sourceTexture: THREE.Texture,
  planetId: string
): THREE.CanvasTexture {
  if (textureCache.has(planetId)) {
    return textureCache.get(planetId)!;
  }
  
  const processedTexture = generateEquirectangularTexture(sourceTexture);
  textureCache.set(planetId, processedTexture);
  
  return processedTexture;
}
