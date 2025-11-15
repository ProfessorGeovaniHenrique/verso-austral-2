import * as THREE from 'three';

/**
 * Gera uma textura equiretangular a partir de uma imagem comum
 * Garante cobertura 360° na esfera
 */
export function generateEquirectangularTexture(
  sourceTexture: THREE.Texture,
  targetWidth: number = 2048,
  targetHeight: number = 1024
): THREE.CanvasTexture | null {
  // ✅ FASE 2: Validação corrigida para diferentes tipos de imagem
  const img = sourceTexture.image;
  
  // CORREÇÃO: Aceitar diferentes tipos de imagem
  if (!img) {
    console.error('❌ sourceTexture.image é null/undefined');
    return null;
  }
  
  // Log detalhado para debug
  console.log('🎨 Gerando textura equirectangular:', img.constructor.name);
  
  // CORREÇÃO: Para HTMLImageElement, verificar carregamento
  if (img instanceof HTMLImageElement) {
    if (!img.complete || img.naturalWidth === 0) {
      console.warn('⚠️ HTMLImageElement ainda não carregada');
      return null;
    }
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('❌ Canvas 2D context não disponível');
    return null;
  }
  
  // ESTRATÉGIA: Repetir a imagem 4 vezes na horizontal com espelhamento
  const sectionWidth = targetWidth / 4;
  
  try {
    for (let i = 0; i < 4; i++) {
      const x = i * sectionWidth;
      
      // Espelhar em seções alternadas para criar continuidade
      if (i % 2 === 0) {
        ctx.drawImage(img as CanvasImageSource, x, 0, sectionWidth, targetHeight);
      } else {
        ctx.save();
        ctx.translate(x + sectionWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img as CanvasImageSource, 0, 0, sectionWidth, targetHeight);
        ctx.restore();
      }
    }
  } catch (error) {
    console.error('❌ Erro ao desenhar imagem no canvas:', error);
    return null;
  }
  
  // Adicionar gradiente nos polos para suavizar
  const gradient = ctx.createLinearGradient(0, 0, 0, targetHeight);
  gradient.addColorStop(0, 'rgba(0,0,0,0.2)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  
  // Criar textura do canvas
  const canvasTexture = new THREE.CanvasTexture(canvas);
  canvasTexture.wrapS = THREE.RepeatWrapping;
  canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
  canvasTexture.minFilter = THREE.LinearMipmapLinearFilter;
  canvasTexture.magFilter = THREE.LinearFilter;
  canvasTexture.anisotropy = 16;
  
  console.log('✅ Textura equirectangular criada com sucesso');
  return canvasTexture;
}

/**
 * Cache de texturas processadas
 */
const textureCache = new Map<string, THREE.CanvasTexture>();

export function getOrCreatePlanetTexture(
  sourceTexture: THREE.Texture,
  planetId: string
): THREE.CanvasTexture | null {
  if (textureCache.has(planetId)) {
    return textureCache.get(planetId)!;
  }
  
  const processedTexture = generateEquirectangularTexture(sourceTexture);
  
  if (processedTexture) {
    textureCache.set(planetId, processedTexture);
  }
  
  return processedTexture;
}
