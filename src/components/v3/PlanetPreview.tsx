import { useRef, useEffect } from "react";
import { GalaxyNode } from "@/hooks/useGalaxyData";
import { renderSimplePlanet } from "@/lib/canvasUtils";

interface PlanetPreviewProps {
  node: GalaxyNode;
}

export function PlanetPreview({ node }: PlanetPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear com background escuro
    ctx.fillStyle = 'hsl(220, 30%, 5%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Renderizar planeta centralizado
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    const size = node.type === 'domain' ? 45 : 35;
    renderSimplePlanet(ctx, node.color, size);

    ctx.restore();

    // Adicionar label abaixo
    ctx.fillStyle = node.colorText;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label, canvas.width / 2, canvas.height / 2 + size + 8);
  }, [node]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={200}
      className="w-full h-auto"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}
