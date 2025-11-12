import { useState, useRef, useEffect, useCallback } from "react";

interface NetworkNode {
  id: string;
  label: string;
  x: number;
  y: number;
  distance: number;
  frequency: number;
  prosody: "positive" | "neutral" | "melancholic" | "contemplative";
}

interface InteractiveSemanticNetworkProps {
  onWordClick: (word: string) => void;
}

const prosodyColors = {
  positive: "hsl(142, 35%, 25%)",
  neutral: "hsl(221, 40%, 25%)",
  melancholic: "hsl(45, 40%, 25%)",
  contemplative: "hsl(291, 35%, 25%)",
};

const prosodyTextColors = {
  positive: "hsl(142, 80%, 75%)",
  neutral: "hsl(221, 85%, 75%)",
  melancholic: "hsl(45, 95%, 75%)",
  contemplative: "hsl(291, 75%, 75%)",
};

const MIN_ORBIT_RADIUS = 120;

export function InteractiveSemanticNetwork({ onWordClick }: InteractiveSemanticNetworkProps) {
  const [nodes, setNodes] = useState<NetworkNode[]>([
    {
      id: "verso",
      label: "verso",
      x: 300,
      y: 200,
      distance: 0,
      prosody: "contemplative",
      frequency: 45,
    },
    {
      id: "saudade",
      label: "saudade",
      x: 300,
      y: 80,
      distance: 0.08,
      prosody: "melancholic",
      frequency: 42,
    },
    {
      id: "tarumã",
      label: "tarumã",
      x: 450,
      y: 120,
      distance: 0.12,
      prosody: "neutral",
      frequency: 38,
    },
    {
      id: "galpão",
      label: "galpão",
      x: 470,
      y: 240,
      distance: 0.15,
      prosody: "neutral",
      frequency: 35,
    },
    {
      id: "várzea",
      label: "várzea",
      x: 430,
      y: 340,
      distance: 0.22,
      prosody: "positive",
      frequency: 28,
    },
    {
      id: "sonhos",
      label: "sonhos",
      x: 300,
      y: 370,
      distance: 0.25,
      prosody: "contemplative",
      frequency: 26,
    },
    {
      id: "coxilha",
      label: "coxilha",
      x: 160,
      y: 340,
      distance: 0.28,
      prosody: "positive",
      frequency: 24,
    },
    {
      id: "mate",
      label: "mate",
      x: 100,
      y: 240,
      distance: 0.3,
      prosody: "neutral",
      frequency: 22,
    },
    {
      id: "gateada",
      label: "gateada",
      x: 100,
      y: 130,
      distance: 0.35,
      prosody: "neutral",
      frequency: 18,
    },
    {
      id: "campanha",
      label: "campanha",
      x: 180,
      y: 70,
      distance: 0.38,
      prosody: "positive",
      frequency: 16,
    },
    {
      id: "querência",
      label: "querência",
      x: 360,
      y: 50,
      distance: 0.4,
      prosody: "contemplative",
      frequency: 15,
    },
    {
      id: "prenda",
      label: "prenda",
      x: 500,
      y: 180,
      distance: 0.43,
      prosody: "positive",
      frequency: 14,
    },
    {
      id: "arreios",
      label: "arreios",
      x: 520,
      y: 300,
      distance: 0.5,
      prosody: "neutral",
      frequency: 12,
    },
    {
      id: "coplas",
      label: "coplas",
      x: 420,
      y: 380,
      distance: 0.55,
      prosody: "contemplative",
      frequency: 11,
    },
    {
      id: "mansidão",
      label: "mansidão",
      x: 180,
      y: 380,
      distance: 0.58,
      prosody: "contemplative",
      frequency: 10,
    },
    {
      id: "maragato",
      label: "maragato",
      x: 80,
      y: 300,
      distance: 0.62,
      prosody: "neutral",
      frequency: 9,
    },
    {
      id: "esporas",
      label: "esporas",
      x: 80,
      y: 180,
      distance: 0.65,
      prosody: "neutral",
      frequency: 8,
    },
  ]);

  const [dragging, setDragging] = useState<string | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ dragging: null as string | null, nodes, hasDragged: false });

  useEffect(() => {
    stateRef.current = { dragging, nodes, hasDragged };
  }, [dragging, nodes, hasDragged]);

  const handleMouseDown = (nodeId: string) => {
    const node = stateRef.current.nodes.find((n) => n.id === nodeId);
    if (node?.distance === 0) return;

    setDragging(nodeId);
    setHasDragged(false);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = containerRef.current.getBoundingClientRect();
    const allNodes = stateRef.current.nodes;
    const centerNode = allNodes.find((n) => n.distance === 0);
    const draggedNode = allNodes.find((n) => n.id === stateRef.current.dragging);

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const angle = Math.atan2(mouseY - centerNode.y, mouseX - centerNode.x);
    const radius = Math.max(MIN_ORBIT_RADIUS, MIN_ORBIT_RADIUS + draggedNode.distance * 150);

    const newX = centerNode.x + Math.cos(angle) * radius;
    const newY = centerNode.y + Math.sin(angle) * radius;

    setHasDragged(true);
    setNodes((prev) =>
      prev.map((node) => (node.id === stateRef.current.dragging ? { ...node, x: newX, y: newY } : node)),
    );
  }, []);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleClick = (label: string) => {
    if (!stateRef.current.hasDragged) {
      onWordClick(label);
    }
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const centerNode = nodes.find((n) => n.distance === 0);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground text-center">
        💡 Arraste as palavras para reorganizar. A distância reflete a força de associação.
      </div>

      <div
        ref={containerRef}
        className="border border-border rounded-lg bg-background/50 overflow-hidden"
        style={{ width: "100%", height: "500px", position: "relative" }}
      >
        <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
          {centerNode &&
            nodes.map((node) => {
              if (node.distance === 0) return null;

              return (
                <line
                  key={`line-${node.id}`}
                  x1={centerNode.x}
                  y1={centerNode.y}
                  x2={node.x}
                  y2={node.y}
                  stroke={prosodyColors[node.prosody]}
                  strokeWidth="2"
                  opacity="0.3"
                  pointerEvents="none"
                />
              );
            })}

          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r="25"
                fill={prosodyColors[node.prosody]}
                stroke={prosodyTextColors[node.prosody]}
                strokeWidth="2"
                style={{
                  cursor: node.distance === 0 ? "default" : "grab",
                  opacity: dragging && dragging !== node.id ? 0.5 : 1,
                  transition: dragging === node.id ? "none" : "opacity 0.2s",
                }}
                onMouseDown={() => handleMouseDown(node.id)}
                onClick={() => handleClick(node.label)}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={prosodyTextColors[node.prosody]}
                fontSize="12"
                fontWeight="bold"
                pointerEvents="none"
                style={{ userSelect: "none" }}
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
