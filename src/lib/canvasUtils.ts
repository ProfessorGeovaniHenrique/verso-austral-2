import { GalaxyNode } from "@/hooks/useGalaxyData";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Viewport {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Converte coordenadas do mundo para coordenadas da tela
 */
export function worldToScreen(node: GalaxyNode, camera: Camera): { x: number; y: number } {
  return {
    x: (node.x - camera.x) * camera.zoom + 700,
    y: (node.y - camera.y) * camera.zoom + 400
  };
}

/**
 * Converte coordenadas da tela para coordenadas do mundo
 */
export function screenToWorld(screenX: number, screenY: number, camera: Camera): { x: number; y: number } {
  return {
    x: (screenX - 700) / camera.zoom + camera.x,
    y: (screenY - 400) / camera.zoom + camera.y
  };
}

/**
 * Calcula os limites do viewport atual
 */
export function getViewportBounds(camera: Camera, canvasWidth = 1400, canvasHeight = 800): Viewport {
  const topLeft = screenToWorld(0, 0, camera);
  const bottomRight = screenToWorld(canvasWidth, canvasHeight, camera);
  
  return {
    left: topLeft.x,
    right: bottomRight.x,
    top: topLeft.y,
    bottom: bottomRight.y
  };
}

/**
 * Verifica se um nó está dentro do viewport (com margem)
 */
export function isInViewport(node: GalaxyNode, viewport: Viewport, margin = 100): boolean {
  return (
    node.x > viewport.left - margin &&
    node.x < viewport.right + margin &&
    node.y > viewport.top - margin &&
    node.y < viewport.bottom + margin
  );
}

/**
 * Encontra o nó na posição do mouse
 */
export function getNodeAtPosition(
  screenX: number,
  screenY: number,
  nodes: GalaxyNode[],
  camera: Camera
): GalaxyNode | null {
  const worldPos = screenToWorld(screenX, screenY, camera);
  
  // Buscar de trás para frente (nós no topo primeiro)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const dx = worldPos.x - node.x;
    const dy = worldPos.y - node.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= node.size) {
      return node;
    }
  }
  
  return null;
}

/**
 * Renderiza um planeta simples (usado no preview)
 */
export function renderSimplePlanet(
  ctx: CanvasRenderingContext2D,
  color: string,
  size: number
) {
  // Extrair HSL do formato "hsl(h, s%, l%)"
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!hslMatch) return;
  
  const [_, h, s, l] = hslMatch;
  
  // Glow externo
  const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.8);
  glowGradient.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, 0.3)`);
  glowGradient.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, 0.1)`);
  glowGradient.addColorStop(1, 'transparent');
  
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
  ctx.fill();
  
  // Planeta principal
  const planetGradient = ctx.createRadialGradient(
    -size * 0.3, -size * 0.3, 0,
    0, 0, size
  );
  planetGradient.addColorStop(0, `hsl(${h}, ${s}%, ${Math.min(parseInt(l) + 20, 90)}%)`);
  planetGradient.addColorStop(1, color);
  
  ctx.fillStyle = planetGradient;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  
  // Highlight especular
  const highlightGradient = ctx.createRadialGradient(
    -size * 0.4, -size * 0.4, 0,
    -size * 0.4, -size * 0.4, size * 0.6
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  highlightGradient.addColorStop(1, 'transparent');
  
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  
  // Borda
  ctx.strokeStyle = `hsla(${h}, ${s}%, ${Math.max(parseInt(l) - 20, 10)}%, 0.5)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Renderiza um nó com sistema LOD (Level of Detail)
 */
export function renderNode(
  ctx: CanvasRenderingContext2D,
  node: GalaxyNode,
  camera: Camera,
  cache?: Map<string, OffscreenCanvas>
) {
  const screenPos = worldToScreen(node, camera);
  const apparentSize = node.size * camera.zoom;
  
  // LOD 0: Ponto simples (muito pequeno ou muito longe)
  if (apparentSize < 3) {
    ctx.fillStyle = node.color;
    ctx.fillRect(screenPos.x - 1, screenPos.y - 1, 2, 2);
    return;
  }
  
  // LOD 1: Círculo com glow suave
  if (apparentSize < 15) {
    const hslMatch = node.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) return;
    
    const [_, h, s, l] = hslMatch;
    
    const gradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, apparentSize * 1.5
    );
    gradient.addColorStop(0, node.color);
    gradient.addColorStop(0.7, `hsla(${h}, ${s}%, ${l}%, 0.5)`);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, apparentSize * 1.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  
  // LOD 2: Planeta completo com detalhes
  ctx.save();
  ctx.translate(screenPos.x, screenPos.y);
  ctx.scale(camera.zoom, camera.zoom);
  
  renderSimplePlanet(ctx, node.color, node.size);
  
  // Label para nós maiores
  if (apparentSize > 20 && node.type === 'domain') {
    ctx.restore();
    ctx.fillStyle = node.colorText;
    ctx.font = `${Math.min(14, apparentSize / 2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label, screenPos.x, screenPos.y + apparentSize + 5);
    return;
  }
  
  ctx.restore();
}

/**
 * Limpa o canvas com gradiente de background
 */
export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Background gradiente estilo espacial
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) / 2
  );
  gradient.addColorStop(0, 'hsl(220, 25%, 10%)');
  gradient.addColorStop(1, 'hsl(220, 30%, 5%)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
