import { useState, useCallback } from "react";
import { CanvasGalaxyView } from "./CanvasGalaxyView";
import { GalaxyConsole } from "./GalaxyConsole";
import { useGalaxyData, GalaxyNode } from "@/hooks/useGalaxyData";

export function GalaxyVisualization() {
  const { nodes } = useGalaxyData();
  const [selectedNode, setSelectedNode] = useState<GalaxyNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GalaxyNode | null>(null);

  const handleNodeClick = useCallback((node: GalaxyNode) => {
    if (node.type === 'word') {
      setSelectedNode(node);
    }
  }, []);

  const handleNodeHover = useCallback((node: GalaxyNode | null) => {
    // Apenas atualizar hover se não houver seleção ou se for diferente
    if (!selectedNode || node?.id !== selectedNode.id) {
      setHoveredNode(node);
    }
  }, [selectedNode]);

  const handleCloseConsole = useCallback(() => {
    setSelectedNode(null);
    setHoveredNode(null);
  }, []);

  return (
    <div className="flex h-[800px] overflow-hidden">
      {/* Canvas principal */}
      <div className="flex-1 relative">
        <CanvasGalaxyView
          nodes={nodes}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
        />
      </div>

      {/* Console lateral */}
      <GalaxyConsole
        selectedNode={selectedNode}
        hoveredNode={hoveredNode}
        onClose={handleCloseConsole}
      />
    </div>
  );
}
