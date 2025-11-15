import { useEffect, useRef, useState, useCallback } from "react";
import { CloudNode } from "@/hooks/useSemanticCloudData";
import { Camera, LayerMode } from "./CloudControlPanel";

interface SemanticDomainCloudProps {
  nodes: CloudNode[];
  camera: Camera;
  font: string;
  layerMode: LayerMode;
  onWordClick?: (node: CloudNode) => void;
  onWordHover?: (node: CloudNode | null) => void;
}

const canvasWidth = 1400;
const canvasHeight = 700;

export function SemanticDomainCloud({ 
  nodes, 
  camera, 
  font, 
  layerMode,
  onWordClick, 
  onWordHover 
}: SemanticDomainCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<CloudNode | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const worldToScreen = useCallback((node: CloudNode) => {
    return {
      x: (node.x - camera.x) * camera.zoom + canvasWidth / 2,
      y: (node.y - camera.y) * camera.zoom + canvasHeight / 2
    };
  }, [camera]);

  const getAdjustedNode = useCallback((node: CloudNode): CloudNode => {
    let zAdjustment = 0;
    
    switch (layerMode) {
      case 'domains':
        zAdjustment = node.type === 'domain' ? +30 : -20;
        break;
      case 'words':
        zAdjustment = node.type === 'word' ? +30 : -20;
        break;
      case 'balanced':
        zAdjustment = 0;
        break;
    }
    
    return { ...node, z: node.z + zAdjustment };
  }, [layerMode]);

  function renderDomainNode(
    ctx: CanvasRenderingContext2D,
    node: CloudNode,
    screenPos: { x: number; y: number },
    isHovered: boolean
  ) {
    const scale = 1 + (node.z / 100) * 0.5;
    const pulse = isHovered ? 1 + Math.sin(Date.now() / 200) * 0.08 : 1;
    const finalSize = node.fontSize * scale * pulse * camera.zoom;

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);

    ctx.shadowColor = node.color;
    ctx.shadowBlur = isHovered ? 40 * scale : 30 * scale;
    ctx.fillStyle = node.color;
    ctx.font = `bold ${finalSize}px "${font}", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < 3; i++) {
      ctx.fillText(node.label, 0, 0);
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(node.label, 0, 0);

    ctx.restore();
  }

  function renderWordNode(
    ctx: CanvasRenderingContext2D,
    node: CloudNode,
    screenPos: { x: number; y: number },
    isHovered: boolean
  ) {
    const scale = 0.8 + (node.z / 100) * 0.4;
    const opacity = 0.5 + (node.z / 100) * 0.5;
    const actualSize = node.fontSize * scale * camera.zoom;

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);

    if (isHovered) {
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 15;
    }

    ctx.globalAlpha = isHovered ? Math.min(1, opacity + 0.3) : opacity;
    ctx.fillStyle = node.color;
    ctx.font = `${actualSize}px "${font}", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.label, 0, 0);

    ctx.restore();
  }

  function clearCanvas(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createRadialGradient(
      canvasWidth / 2,
      canvasHeight / 2,
      0,
      canvasWidth / 2,
      canvasHeight / 2,
      Math.max(canvasWidth, canvasHeight) / 2
    );

    gradient.addColorStop(0, "hsl(222, 47%, 11%)");
    gradient.addColorStop(1, "hsl(222, 47%, 6%)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  function renderBackgroundParticles(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvasWidth;
      const y = Math.random() * canvasHeight;
      const size = 1 + Math.random() * 2;

      ctx.fillStyle = "rgba(6, 182, 212, 0.1)";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const getNodeAtPosition = useCallback(
    (screenX: number, screenY: number): CloudNode | null => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return null;

      const worldX = (screenX - canvasWidth / 2) / camera.zoom + camera.x;
      const worldY = (screenY - canvasHeight / 2) / camera.zoom + camera.y;

      const sortedNodes = nodes
        .map(n => getAdjustedNode(n))
        .sort((a, b) => b.z - a.z);

      for (const node of sortedNodes) {
        const scale = node.type === "domain" 
          ? 1 + (node.z / 100) * 0.5 
          : 0.8 + (node.z / 100) * 0.4;
        const fontSize = node.fontSize * scale;

        ctx.font = `${node.type === "domain" ? "bold " : ""}${fontSize}px "${font}", sans-serif`;
        const metrics = ctx.measureText(node.label);
        const textWidth = metrics.width;
        const textHeight = fontSize;

        if (
          worldX >= node.x - textWidth / 2 &&
          worldX <= node.x + textWidth / 2 &&
          worldY >= node.y - textHeight / 2 &&
          worldY <= node.y + textHeight / 2
        ) {
          return node;
        }
      }

      return null;
    },
    [nodes, camera, font, getAdjustedNode]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const node = getNodeAtPosition(x, y);
      if (node) {
        onWordClick?.(node);
      }
    },
    [getNodeAtPosition, onWordClick]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isPanning) {
        const dx = (e.clientX - panStart.x) / camera.zoom;
        const dy = (e.clientY - panStart.y) / camera.zoom;
        
        const event = new CustomEvent('camera-change', {
          detail: { x: camera.x - dx, y: camera.y - dy, zoom: camera.zoom }
        });
        window.dispatchEvent(event);
        
        setPanStart({ x: e.clientX, y: e.clientY });
        canvas.style.cursor = "grabbing";
      } else {
        const node = getNodeAtPosition(x, y);
        
        if (node !== hoveredNode) {
          setHoveredNode(node);
          onWordHover?.(node);
          canvas.style.cursor = node ? "pointer" : "grab";
        }
      }
    },
    [hoveredNode, onWordHover, getNodeAtPosition, isPanning, panStart, camera]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = "grab";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    onWordHover?.(null);
    setIsPanning(false);
  }, [onWordHover]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, camera.zoom * zoomFactor));
    
    const event = new CustomEvent('camera-change', {
      detail: { ...camera, zoom: newZoom }
    });
    window.dispatchEvent(event);
  }, [camera]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      clearCanvas(ctx);
      renderBackgroundParticles(ctx);

      const adjustedNodes = nodes.map(n => getAdjustedNode(n));
      const sortedNodes = adjustedNodes.sort((a, b) => a.z - b.z);

      sortedNodes.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const screenPos = worldToScreen(node);
        
        if (screenPos.x < -100 || screenPos.x > canvasWidth + 100 ||
            screenPos.y < -100 || screenPos.y > canvasHeight + 100) {
          return;
        }
        
        if (node.type === "domain") {
          renderDomainNode(ctx, node, screenPos, isHovered);
        } else {
          renderWordNode(ctx, node, screenPos, isHovered);
        }
      });
    };

    render();
  }, [nodes, hoveredNode, camera, font, layerMode, worldToScreen, getAdjustedNode]);

  return (
    <div className="relative w-full h-full bg-slate-950">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab"
      />
    </div>
  );
}
