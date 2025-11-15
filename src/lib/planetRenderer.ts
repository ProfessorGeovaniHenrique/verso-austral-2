import { NodeDisplayData, PartialButFor } from 'sigma/types';
import { planetTextures } from '@/assets/planets';

// ============= TEXTURE CACHE SYSTEM =============
const planetImageCache = new Map<string, HTMLImageElement>();
let texturesLoaded = false;

/**
 * Carrega e cacheia todas as texturas de planetas
 * Deve ser chamado uma vez durante inicialização
 */
export async function loadPlanetTextures(): Promise<void> {
  if (texturesLoaded) return;
  
  const loadPromises = planetTextures.map((textureSrc, index) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        planetImageCache.set(`planet-${index}`, img);
        resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load planet texture ${index}`);
        reject();
      };
      img.src = textureSrc;
    });
  });
  
  try {
    await Promise.all(loadPromises);
    texturesLoaded = true;
    console.log('✅ Planet textures loaded:', planetImageCache.size);
  } catch (error) {
    console.error('❌ Failed to load planet textures:', error);
  }
}

/**
 * Seleciona textura de planeta baseada no seed da palavra
 */
function getPlanetTexture(label: string): HTMLImageElement | null {
  const seed = generateSeed(label);
  const index = seed % planetTextures.length;
  return planetImageCache.get(`planet-${index}`) || null;
}

/**
 * Gera um seed numérico baseado no label da palavra
 * Usado para criar variações consistentes e únicas para cada planeta
 */
function generateSeed(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash) + label.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Gera parâmetros visuais únicos baseados no seed
 */
function getPlanetVariation(seed: number) {
  const random = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };
  
  return {
    // Variação de brilho (0.7 a 1.3)
    brightness: 0.7 + random(1) * 0.6,
    
    // Número de anéis (1 a 3)
    numRings: Math.floor(random(2) * 3) + 1,
    
    // Posição do highlight (variação de -0.5 a -0.3)
    highlightX: -0.3 - random(3) * 0.2,
    highlightY: -0.3 - random(4) * 0.2,
    
    // Intensidade do glow (0.5 a 1.0)
    glowIntensity: 0.5 + random(5) * 0.5,
    
    // Padrão de superfície (0-3: liso, listras, pontos, manchas)
    surfacePattern: Math.floor(random(6) * 4),
    
    // Velocidade de pulso (0.5x a 2x)
    pulseSpeed: 0.5 + random(7) * 1.5
  };
}

/**
 * Custom Sigma.js node renderer for Mass Effect-style planets
 * Creates multi-layered planets with glow effects, pulsing rings, and radial gradients
 */
export function drawPlanetNode(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  settings: any
): void {
  const { x, y, size, color, label } = data;
  
  // 🌌 CASO ESPECIAL: Núcleo Galáctico (centro com tamanho grande)
  if (size >= 40 && (label === 'Universo Gaúcho' || label === 'center')) {
    drawGalacticCore(context, x, y, size);
    return;
  }
  
  // ✨ GERAR VARIAÇÕES ÚNICAS PARA ESTE PLANETA
  const seed = generateSeed(label || 'default');
  const variant = getPlanetVariation(seed);
  
  // Save context state
  context.save();
  
  // Translate to node position
  context.translate(x, y);
  
  // === LAYER 1: Outer Glow (4 concentric circles with decreasing opacity) ===
  for (let i = 4; i >= 1; i--) {
    const glowRadius = size * (1 + i * 0.15);
    const gradient = context.createRadialGradient(0, 0, size, 0, 0, glowRadius);
    const opacity = Math.floor((20 / i) * variant.glowIntensity);
    gradient.addColorStop(0, `${color}00`);
    gradient.addColorStop(0.5, `${color}${opacity.toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${color}00`);
    
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, glowRadius, 0, Math.PI * 2);
    context.fill();
  }
  
  // === LAYER 2: Múltiplos Anéis Pulsantes ===
  const time = Date.now() / 1000;
  for (let i = 0; i < variant.numRings; i++) {
    const pulseOpacity = 0.4 + 0.3 * Math.sin(time * variant.pulseSpeed + i);
    const ringRadius = size * (1.2 + i * 0.15);
    
    context.strokeStyle = `#00E5FF${Math.floor(pulseOpacity * 255).toString(16).padStart(2, '0')}`;
    context.lineWidth = 1.5;
    context.setLineDash([5, 3]);
    context.beginPath();
    context.arc(0, 0, ringRadius, 0, Math.PI * 2);
    context.stroke();
  }
  context.setLineDash([]);
  
  // === LAYER 3: Textured Planet Core with Color Filter ===
  const texture = getPlanetTexture(label || 'default');
  
  // Parse hex color to RGB for gradient manipulation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };
  
  if (texture && texturesLoaded) {
    // 3A. Criar máscara circular para clip
    context.save();
    context.beginPath();
    context.arc(0, 0, size, 0, Math.PI * 2);
    context.clip();
    
    // 3B. Desenhar textura base (escala para cobrir o círculo)
    context.globalCompositeOperation = 'source-over';
    const textureSize = size * 2.2; // Slightly larger for no gaps
    context.drawImage(
      texture,
      -textureSize / 2, -textureSize / 2,
      textureSize, textureSize
    );
    
    // 3C. Aplicar filtro de cor do domínio (multiplicação)
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = color;
    context.fillRect(-size, -size, size * 2, size * 2);
    
    // 3D. Restaurar luminosidade (screen blend)
    context.globalCompositeOperation = 'screen';
    const rgb = hexToRgb(color);
    context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
    context.fillRect(-size, -size, size * 2, size * 2);
    
    // 3E. Adicionar brilho direcional (specular highlight)
    const highlightGradient = context.createRadialGradient(
      variant.highlightX * size, 
      variant.highlightY * size, 
      0,
      0, 0, size
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    highlightGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.globalCompositeOperation = 'screen';
    context.fillStyle = highlightGradient;
    context.beginPath();
    context.arc(0, 0, size, 0, Math.PI * 2);
    context.fill();
    
    // 3F. Adicionar sombra do lado oposto ao highlight
    const shadowGradient = context.createRadialGradient(
      -variant.highlightX * size * 0.8, 
      -variant.highlightY * size * 0.8, 
      0,
      0, 0, size
    );
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = shadowGradient;
    context.beginPath();
    context.arc(0, 0, size, 0, Math.PI * 2);
    context.fill();
    
    context.restore();
    
  } else {
    // FALLBACK: Renderização procedural original (caso texturas não carreguem)
    const coreGradient = context.createRadialGradient(
      -size * 0.3, -size * 0.3, 0,
      0, 0, size
    );
    
    const rgb = hexToRgb(color);
    const lighterColor = `rgb(${Math.min(rgb.r + 60, 255)}, ${Math.min(rgb.g + 60, 255)}, ${Math.min(rgb.b + 60, 255)})`;
    const darkerColor = `rgb(${Math.max(rgb.r - 40, 0)}, ${Math.max(rgb.g - 40, 0)}, ${Math.max(rgb.b - 40, 0)})`;
    
    coreGradient.addColorStop(0, lighterColor);
    coreGradient.addColorStop(0.6, color);
    coreGradient.addColorStop(1, darkerColor);
    
    context.fillStyle = coreGradient;
    context.beginPath();
    context.arc(0, 0, size, 0, Math.PI * 2);
    context.fill();
    
    // === LAYER 3.5: Padrões de Superfície (Bolinhas de Gude) ===
    context.save();
    context.globalAlpha = 0.3;
    
    switch (variant.surfacePattern) {
      case 1: // Listras
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          context.strokeStyle = darkerColor;
          context.lineWidth = size * 0.15;
          context.beginPath();
          context.arc(0, 0, size * 0.7, angle, angle + Math.PI / 8);
          context.stroke();
        }
        break;
        
      case 2: // Pontos (crateras)
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8 + seed;
          const dist = size * (0.3 + (i % 3) * 0.2);
          const dotX = Math.cos(angle) * dist;
          const dotY = Math.sin(angle) * dist;
          
          context.fillStyle = darkerColor;
          context.beginPath();
          context.arc(dotX, dotY, size * 0.1, 0, Math.PI * 2);
          context.fill();
        }
        break;
        
      case 3: // Manchas (nuvens)
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3;
          const spotX = Math.cos(angle) * size * 0.4;
          const spotY = Math.sin(angle) * size * 0.4;
          
          const spotGradient = context.createRadialGradient(
            spotX, spotY, 0,
            spotX, spotY, size * 0.4
          );
          spotGradient.addColorStop(0, `${darkerColor}80`);
          spotGradient.addColorStop(1, `${darkerColor}00`);
          
          context.fillStyle = spotGradient;
          context.beginPath();
          context.arc(spotX, spotY, size * 0.4, 0, Math.PI * 2);
          context.fill();
        }
        break;
        
      // case 0: Liso (sem padrão adicional)
    }
    
    context.restore();
  }
  
  // === LAYER 4: Highlight com posição variável ===
  const highlightGradient = context.createRadialGradient(
    size * variant.highlightX, size * variant.highlightY, 0,
    size * variant.highlightX, size * variant.highlightY, size * 0.5
  );
  highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.6 * variant.brightness})`);
  highlightGradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.2 * variant.brightness})`);
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  context.fillStyle = highlightGradient;
  context.beginPath();
  context.arc(size * variant.highlightX, size * variant.highlightY, size * 0.5, 0, Math.PI * 2);
  context.fill();
  
  // === LAYER 5: Border ===
  context.strokeStyle = `${color}AA`;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(0, 0, size, 0, Math.PI * 2);
  context.stroke();
  
  // Restore context state
  context.restore();
  
  // === LABEL: Futuristic floating text below planet ===
  if (label) {
    context.save();
    context.translate(x, y);
    
    // Text shadow/glow
    context.shadowColor = '#00E5FF';
    context.shadowBlur = 8;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    
    context.fillStyle = '#00E5FF';
    context.font = `bold ${Math.max(size * 0.6, 10)}px "Courier New", monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'top';
    
    const labelText = label.toUpperCase();
    context.fillText(labelText, 0, size + 8);
    
    context.restore();
  }
}

/**
 * Custom hover renderer - enlarges planet and increases glow
 */
export function drawPlanetNodeHover(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  settings: any
): void {
  // Enlarge by 20% when hovering
  const enlargedData = {
    ...data,
    size: data.size * 1.2
  };
  
  drawPlanetNode(context, enlargedData, settings);
}

/**
 * Internal helper: Galactic Core rendering logic
 */
function drawGalacticCore(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const time = Date.now() / 1000;
  
  context.save();
  context.translate(x, y);
  
  // LAYER 1: Outer Nebula Glow (multi-layered)
  for (let i = 6; i >= 1; i--) {
    const glowRadius = size * (1 + i * 0.2);
    const gradient = context.createRadialGradient(0, 0, size * 0.3, 0, 0, glowRadius);
    const pulse = 0.3 + 0.2 * Math.sin(time * 1.5 + i * 0.5);
    
    gradient.addColorStop(0, `rgba(255, 215, 0, ${pulse * 0.8})`);
    gradient.addColorStop(0.3, `rgba(255, 140, 0, ${pulse * 0.5})`);
    gradient.addColorStop(0.6, `rgba(138, 43, 226, ${pulse * 0.3})`);
    gradient.addColorStop(1, `rgba(75, 0, 130, 0)`);
    
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, glowRadius, 0, Math.PI * 2);
    context.fill();
  }
  
  // LAYER 2: Rotating Energy Rings
  for (let i = 0; i < 4; i++) {
    const ringRadius = size * (1.5 + i * 0.2);
    const rotation = time * (0.5 + i * 0.2) + i * Math.PI / 2;
    const opacity = 0.4 + 0.3 * Math.sin(time * 2 + i);
    
    context.save();
    context.rotate(rotation);
    context.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
    context.lineWidth = 2;
    context.setLineDash([10, 5]);
    context.beginPath();
    context.ellipse(0, 0, ringRadius, ringRadius * 0.3, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
  context.setLineDash([]);
  
  // LAYER 3: Pulsating Core
  const coreGradient = context.createRadialGradient(0, 0, 0, 0, 0, size);
  const corePulse = 0.7 + 0.3 * Math.sin(time * 3);
  coreGradient.addColorStop(0, `rgba(255, 255, 255, ${corePulse})`);
  coreGradient.addColorStop(0.2, `rgba(255, 215, 0, ${corePulse * 0.9})`);
  coreGradient.addColorStop(0.5, `rgba(255, 140, 0, ${corePulse * 0.7})`);
  coreGradient.addColorStop(1, `rgba(218, 165, 32, ${corePulse * 0.4})`);
  
  context.fillStyle = coreGradient;
  context.beginPath();
  context.arc(0, 0, size, 0, Math.PI * 2);
  context.fill();
  
  // LAYER 4: Orbiting Particles (matter being absorbed)
  for (let i = 0; i < 12; i++) {
    const particleAngle = (time * 0.8 + i * (Math.PI * 2 / 12)) % (Math.PI * 2);
    const particleRadius = size * (1.8 + 0.3 * Math.sin(time * 2 + i));
    const px = Math.cos(particleAngle) * particleRadius;
    const py = Math.sin(particleAngle) * particleRadius;
    const particleOpacity = 0.5 + 0.5 * Math.sin(time * 3 + i);
    
    context.fillStyle = `rgba(255, 215, 0, ${particleOpacity})`;
    context.beginPath();
    context.arc(px, py, 2, 0, Math.PI * 2);
    context.fill();
  }
  
  // LAYER 5: Label with Neon Effect
  context.font = `bold ${size * 0.22}px "Orbitron", monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  context.shadowColor = '#FFD700';
  context.shadowBlur = 15;
  context.fillStyle = '#FFFFFF';
  context.fillText('☀️ UNIVERSO', 0, -size * 0.15);
  context.fillText('GAÚCHO', 0, size * 0.15);
  
  context.restore();
}
