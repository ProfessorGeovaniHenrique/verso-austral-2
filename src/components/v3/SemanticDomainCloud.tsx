import { useRef, useEffect, useState, useCallback } from "react";
import { CloudNode } from "@/hooks/useSemanticCloudData";
import { throttle } from "lodash";

interface SemanticDomainCloudProps {
  nodes: CloudNode[];
  onWordClick?: (node: CloudNode) => void;
  onWordHover?: (node: CloudNode | null) => void;
}

/**
 * Renderiza um nó de domínio com glow neon intenso
 */
function renderDomainNode(
  ctx: CanvasRenderingContext2D,
  node: CloudNode,
  isHovered: boolean = false
) {
  const scale = 1 + (node.z / 100) * 0.3;
  const actualSize = node.fontSize * scale;
  
  ctx.save();
  ctx.translate(node.x, node.y);
  
  // Efeito de pulsação no hover
  const pulse = isHovered ? 1 + Math.sin(Date.now() / 200) * 0.08 : 1;
  const finalSize = actualSize * pulse;
  
  // Glow neon multicamadas (3 camadas para intensidade)
  ctx.font = `bold ${finalSize}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Camada 1: Glow externo intenso
  ctx.shadowColor = node.color;
  ctx.shadowBlur = isHovered ? 50 : 35;
  ctx.fillStyle = node.color;
  ctx.globalAlpha = 0.8;
  ctx.fillText(node.label, 0, 0);
  
  // Camada 2: Glow médio
  ctx.shadowBlur = isHovered ? 30 : 20;
  ctx.globalAlpha = 0.9;
  ctx.fillText(node.label, 0, 0);
  
  // Camada 3: Glow interno
  ctx.shadowBlur = isHovered ? 15 : 10;
  ctx.globalAlpha = 1;
  ctx.fillText(node.label, 0, 0);
  
  // Texto principal branco por cima
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 1;
  ctx.fillText(node.label, 0, 0);
  
  ctx.restore();
}

/**
 * Renderiza um nó de palavra com opacidade baseada em profundidade
 */
function renderWordNode(
  ctx: CanvasRenderingContext2D,
  node: CloudNode,
  isHovered: boolean = false
) {
  const scale = 0.7 + (node.z / 100) * 0.5;
  const actualSize = node.fontSize * scale;
  
  // Opacidade baseada na profundidade (z)
  // z = 0-50: palavras no fundo ficam mais transparentes
  const baseOpacity = 0.35 + (node.z / 100) * 0.5;
  const opacity = isHovered ? Math.min(1, baseOpacity + 0.3) : baseOpacity;
  
  ctx.save();
  ctx.translate(node.x, node.y);
  
  ctx.font = `${actualSize}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Sutil glow para palavras em hover
  if (isHovered) {
    ctx.shadowColor = node.color;
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = node.color;
    ctx.fillText(node.label, 0, 0);
  }
  
  // Texto da palavra
  ctx.shadowBlur = 0;
  ctx.globalAlpha = opacity;
  ctx.fillStyle = node.color;
  ctx.fillText(node.label, 0, 0);
  
  ctx.restore();
}

/**
 * Limpa o canvas com fundo gradiente escuro
 */
function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Gradiente radial do centro para as bordas
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 2
  );
  
  gradient.addColorStop(0, 'hsl(222, 47%, 11%)');
  gradient.addColorStop(1, 'hsl(222, 47%, 6%)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Encontra o nó na posição do cursor
 */
function getNodeAtPosition(
  x: number,
  y: number,
  nodes: CloudNode[]
): CloudNode | null {
  // Ordenar por z (mais próximo primeiro)
  const sortedNodes = [...nodes].sort((a, b) => b.z - a.z);
  
  for (const node of sortedNodes) {
    const scale = node.type === 'domain' 
      ? 1 + (node.z / 100) * 0.3
      : 0.7 + (node.z / 100) * 0.5;
    
    const actualSize = node.fontSize * scale;
    
    // Aproximação: usar retângulo do texto
    const width = actualSize * node.label.length * 0.6;
    const height = actualSize;
    
    const dx = Math.abs(x - node.x);
    const dy = Math.abs(y - node.y);
    
    if (dx < width / 2 && dy < height / 2) {
      return node;
    }
  }
  
  return null;
}

/**
 * Renderiza partículas de fundo sutis
 */
function renderBackgroundParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
) {
  for (let i = 0; i < 30; i++) {
    const x = (i * 137.5) % width;
    const y = ((i * 73) % height + time * 0.01 * i) % height;
    const size = 1 + (i % 3);
    const opacity = 0.05 + Math.sin(time / 1000 + i) * 0.05;
    
    ctx.fillStyle = `rgba(6, 182, 212, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function SemanticDomainCloud({
  nodes,
  onWordClick,
  onWordHover
}: SemanticDomainCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<CloudNode | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorStyle, setCursorStyle] = useState<'default' | 'pointer'>('default');
  const animationFrameRef = useRef<number>();
  
  // Renderização contínua com animações
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = (time: number) => {
      clearCanvas(ctx, canvas.width, canvas.height);
      
      // Partículas de fundo
      renderBackgroundParticles(ctx, canvas.width, canvas.height, time);
      
      // Ordenar nós por z (fundo para frente)
      const sortedNodes = [...nodes].sort((a, b) => a.z - b.z);
      
      // Renderizar palavras primeiro (background)
      sortedNodes.forEach(node => {
        if (node.type === 'word') {
          renderWordNode(ctx, node, node.id === hoveredNode?.id);
        }
      });
      
      // Renderizar domínios por cima (foreground)
      sortedNodes.forEach(node => {
        if (node.type === 'domain') {
          renderDomainNode(ctx, node, node.id === hoveredNode?.id);
        }
      });
      
      animationFrameRef.current = requestAnimationFrame(render);
    };
    
    animationFrameRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, hoveredNode]);
  
  // Manipulador de movimento do mouse (throttled)
  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      
      const node = getNodeAtPosition(x, y, nodes);
      
      if (node !== hoveredNode) {
        setHoveredNode(node);
        onWordHover?.(node);
        setCursorStyle(node ? 'pointer' : 'default');
      }
    }, 16),
    [nodes, hoveredNode, onWordHover]
  );
  
  // Manipulador de clique
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    
    const node = getNodeAtPosition(x, y, nodes);
    
    if (node && node.type === 'word') {
      onWordClick?.(node);
    }
  }, [nodes, onWordClick]);
  
  // Limpar hover ao sair
  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    onWordHover?.(null);
    setCursorStyle('default');
  }, [onWordHover]);
  
  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={700}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
      className="w-full h-auto"
      style={{
        maxWidth: '100%',
        aspectRatio: '1400 / 700',
        cursor: cursorStyle
      }}
    />
  );
}
