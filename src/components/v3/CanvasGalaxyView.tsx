import { useRef, useEffect, useState, useCallback } from "react";
import { GalaxyNode } from "@/hooks/useGalaxyData";
import { Camera, getViewportBounds, isInViewport, renderNode, clearCanvas, getNodeAtPosition } from "@/lib/canvasUtils";
import { throttle } from "@/lib/performanceUtils";

interface CanvasGalaxyViewProps {
  nodes: GalaxyNode[];
  onNodeClick?: (node: GalaxyNode) => void;
  onNodeHover?: (node: GalaxyNode | null) => void;
}

export function CanvasGalaxyView({ nodes, onNodeClick, onNodeHover }: CanvasGalaxyViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [isDirty, setIsDirty] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GalaxyNode | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Calcular nós visíveis usando viewport culling
  const visibleNodes = useCallback(() => {
    const viewport = getViewportBounds(camera, 1400, 800);
    return nodes.filter(node => isInViewport(node, viewport));
  }, [nodes, camera]);

  // Render loop - apenas quando dirty
  useEffect(() => {
    if (!isDirty) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Clear com background gradiente
    clearCanvas(ctx, canvas.width, canvas.height);

    // Renderizar apenas nós visíveis
    const visible = visibleNodes();
    
    // Renderizar palavras primeiro (menor z-index)
    visible
      .filter(n => n.type === 'word')
      .forEach(node => renderNode(ctx, node, camera));
    
    // Renderizar domínios por cima
    visible
      .filter(n => n.type === 'domain')
      .forEach(node => renderNode(ctx, node, camera));

    // Highlight do nó em hover
    if (hoveredNode) {
      const screenPos = {
        x: (hoveredNode.x - camera.x) * camera.zoom + 700,
        y: (hoveredNode.y - camera.y) * camera.zoom + 400
      };
      const size = hoveredNode.size * camera.zoom;

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, size + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    setIsDirty(false);
  }, [isDirty, nodes, camera, hoveredNode, visibleNodes]);

  // Marcar como dirty quando camera ou nodes mudam
  useEffect(() => {
    setIsDirty(true);
  }, [camera, nodes]);

  // Mouse move com throttle
  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setCamera(prev => ({
          ...prev,
          x: prev.x - dx / prev.zoom,
          y: prev.y - dy / prev.zoom
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const node = getNodeAtPosition(x, y, nodes, camera);

      if (node !== hoveredNode) {
        setHoveredNode(node);
        onNodeHover?.(node);
        setIsDirty(true);
      }
    }, 16),
    [isPanning, panStart, nodes, camera, hoveredNode, onNodeHover]
  );

  // Mouse down - iniciar pan
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  // Mouse up - finalizar pan ou clicar
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
    } else {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const node = getNodeAtPosition(x, y, nodes, camera);

      if (node) {
        onNodeClick?.(node);
      }
    }
  }, [isPanning, nodes, camera, onNodeClick]);

  // Wheel - zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.3, Math.min(3, prev.zoom * delta))
    }));
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={800}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsPanning(false);
        if (hoveredNode) {
          setHoveredNode(null);
          onNodeHover?.(null);
          setIsDirty(true);
        }
      }}
      onWheel={handleWheel}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      style={{
        maxWidth: '100%',
        height: 'auto',
        aspectRatio: '1400 / 800'
      }}
    />
  );
}
