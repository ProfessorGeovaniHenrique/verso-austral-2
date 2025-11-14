import { NodeDisplayData, PartialButFor } from 'sigma/types';

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
  
  // Save context state
  context.save();
  
  // Translate to node position
  context.translate(x, y);
  
  // === LAYER 1: Outer Glow (4 concentric circles with decreasing opacity) ===
  for (let i = 4; i >= 1; i--) {
    const glowRadius = size * (1 + i * 0.15);
    const gradient = context.createRadialGradient(0, 0, size, 0, 0, glowRadius);
    gradient.addColorStop(0, `${color}00`);
    gradient.addColorStop(0.5, `${color}${Math.floor(20 / i).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${color}00`);
    
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, glowRadius, 0, Math.PI * 2);
    context.fill();
  }
  
  // === LAYER 2: Pulsing Ring (animated via opacity) ===
  const time = Date.now() / 1000; // seconds
  const pulseOpacity = 0.6 + 0.4 * Math.sin(time * 2); // oscillates between 0.6 and 1.0
  const ringRadius = size * 1.3;
  
  context.strokeStyle = `#00E5FF${Math.floor(pulseOpacity * 255).toString(16).padStart(2, '0')}`;
  context.lineWidth = 2;
  context.setLineDash([5, 3]);
  context.beginPath();
  context.arc(0, 0, ringRadius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]); // reset dash
  
  // === LAYER 3: Core Planet with Radial Gradient ===
  const coreGradient = context.createRadialGradient(
    -size * 0.3, -size * 0.3, 0,  // light source offset (top-left)
    0, 0, size
  );
  
  // Parse hex color to RGB for gradient manipulation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };
  
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
  
  // === LAYER 4: Highlight (small bright spot for 3D effect) ===
  const highlightGradient = context.createRadialGradient(
    -size * 0.4, -size * 0.4, 0,
    -size * 0.4, -size * 0.4, size * 0.5
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  context.fillStyle = highlightGradient;
  context.beginPath();
  context.arc(-size * 0.4, -size * 0.4, size * 0.5, 0, Math.PI * 2);
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
