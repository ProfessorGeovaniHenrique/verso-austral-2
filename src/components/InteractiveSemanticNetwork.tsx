import { useState, useRef, useEffect, useCallback } from "react";
import { NavigationToolbar } from "@/components/NavigationToolbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NetworkNode {
  id: string;
  label: string;
  x: number;
  y: number;
  distance: number;
  frequency: number;
  prosody: "positive" | "neutral" | "melancholic" | "contemplative";
}

interface WordStats {
  frequency: number;
  distance: number;
  prosody: "positive" | "neutral" | "melancholic" | "contemplative";
  associations: string[];
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
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== "circle") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleCanvasPanMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isPanning, panStart]
  );

  const handleCanvasPanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel((prev) => Math.max(0.3, Math.min(3, prev + delta)));
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

  const handleClick = (label: string, node: NetworkNode) => {
    if (!stateRef.current.hasDragged) {
      setSelectedWord(label);
      setStatsModalOpen(true);
    }
  };

  const handleFitToView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getWordStats = (word: string): WordStats | null => {
    const node = nodes.find(n => n.label === word);
    if (!node) return null;

    const prosodyLabels = {
      positive: "Positiva",
      neutral: "Neutra",
      melancholic: "Melancólica",
      contemplative: "Contemplativa"
    };

    const associations = nodes
      .filter(n => n.distance > 0 && n.label !== word)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(n => n.label);

    return {
      frequency: node.frequency,
      distance: node.distance,
      prosody: node.prosody,
      associations
    };
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

  useEffect(() => {
    if (isPanning) {
      window.addEventListener("mousemove", handleCanvasPanMove);
      window.addEventListener("mouseup", handleCanvasPanEnd);

      return () => {
        window.removeEventListener("mousemove", handleCanvasPanMove);
        window.removeEventListener("mouseup", handleCanvasPanEnd);
      };
    }
  }, [isPanning, handleCanvasPanMove, handleCanvasPanEnd]);

  const centerNode = nodes.find((n) => n.distance === 0);

  const selectedWordStats = selectedWord ? getWordStats(selectedWord) : null;
  const selectedNode = nodes.find(n => n.label === selectedWord);

  const prosodyLabels = {
    positive: "Positiva",
    neutral: "Neutra",
    melancholic: "Melancólica",
    contemplative: "Contemplativa"
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}>
      <div className="text-sm text-muted-foreground text-center">
        💡 Arraste as palavras para reorganizar. Use a roda do mouse para zoom. Arraste o fundo para navegar.
      </div>

      <div
        ref={containerRef}
        className="border border-border rounded-lg bg-background/50 overflow-hidden relative"
        style={{ width: "100%", height: isFullscreen ? "calc(100vh - 100px)" : "500px" }}
        onWheel={handleWheel}
      >
        <NavigationToolbar
          onZoomIn={() => setZoomLevel((prev) => Math.min(3, prev + 0.2))}
          onZoomOut={() => setZoomLevel((prev) => Math.max(0.3, prev - 0.2))}
          onReset={() => {
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
          }}
          onFitToView={handleFitToView}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
        />

        <div
          className={`w-full h-full ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={handleCanvasMouseDown}
          style={{ userSelect: "none" }}
        >
          <svg
            width="100%"
            height="100%"
            style={{ position: "absolute", top: 0, left: 0, userSelect: "none" }}
          >
            <g
              transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
              style={{
                transition: isPanning ? "none" : "transform 150ms ease-out",
                willChange: "transform",
                userSelect: "none",
              }}
            >
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
                      userSelect: "none",
                    }}
                    onMouseDown={() => handleMouseDown(node.id)}
                    onClick={() => handleClick(node.label, node)}
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
            </g>
          </svg>
        </div>
      </div>

      {/* Modal de Estatísticas */}
      <Dialog open={statsModalOpen} onOpenChange={setStatsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedNode && (
                <>
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: prosodyColors[selectedNode.prosody] }}
                  />
                  <span>{selectedWord}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedWordStats && selectedNode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold">{selectedWordStats.frequency}</div>
                  <p className="text-sm text-muted-foreground">Frequência</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold">
                    {(selectedWordStats.distance * 100).toFixed(0)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Distância Semântica</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  Prosódia Semântica
                </h4>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: prosodyColors[selectedNode.prosody] }}
                  />
                  <span className="text-lg">{prosodyLabels[selectedNode.prosody]}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  A aura emocional que esta palavra adquire pelo contexto em que aparece no corpus.
                </p>
              </div>

              {selectedWordStats.associations.length > 0 && (
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3">Palavras Mais Próximas</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedWordStats.associations.map((word) => {
                      const assocNode = nodes.find(n => n.label === word);
                      return (
                        <div
                          key={word}
                          className="px-3 py-1.5 rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: assocNode ? prosodyColors[assocNode.prosody] : 'hsl(var(--muted))',
                            color: assocNode ? prosodyTextColors[assocNode.prosody] : 'hsl(var(--foreground))',
                          }}
                        >
                          {word}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button 
                  onClick={() => {
                    setStatsModalOpen(false);
                    onWordClick(selectedWord!);
                  }}
                  className="w-full"
                >
                  Ver Concordância (KWIC)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
