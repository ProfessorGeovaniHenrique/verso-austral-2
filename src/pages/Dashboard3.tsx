import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SemanticDomainCloud } from "@/components/v3/SemanticDomainCloud";
import { StatisticalFooter } from "@/components/v3/StatisticalFooter";
import { CloudControlPanel, Camera, LayerMode } from "@/components/v3/CloudControlPanel";
import { KWICModal } from "@/components/KWICModal";
import { useSemanticCloudData, CloudNode } from "@/hooks/useSemanticCloudData";
import { kwicDataMap } from "@/data/mockup/kwic";

export default function Dashboard3() {
  const [activeTab, setActiveTab] = useState("galaxy");
  const { cloudNodes, stats } = useSemanticCloudData();
  const [selectedWord, setSelectedWord] = useState<CloudNode | null>(null);
  const [hoveredWord, setHoveredWord] = useState<CloudNode | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [font, setFont] = useState("Orbitron");
  const [layerMode, setLayerMode] = useState<LayerMode>("balanced");
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const updateFps = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(updateFps);
    };
    
    const rafId = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const handleCameraChange = (e: Event) => {
      const customEvent = e as CustomEvent<Camera>;
      setCamera(customEvent.detail);
    };
    
    window.addEventListener('camera-change', handleCameraChange);
    return () => window.removeEventListener('camera-change', handleCameraChange);
  }, []);

  const handleWordClick = (node: CloudNode) => {
    if (node.type === 'word') {
      setSelectedWord(node);
    }
  };

  const handleWordHover = (node: CloudNode | null) => {
    setHoveredWord(node);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleCloseModal = () => {
    setSelectedWord(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-[1800px]" onMouseMove={handleMouseMove}>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight font-orbitron">
          Análise Estilística de Corpus
        </h1>
        <p className="text-muted-foreground">
          Visualização interativa de domínios semânticos e análise linguística computacional
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="galaxy">Nuvem</TabsTrigger>
          <TabsTrigger value="network">Rede</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="galaxy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-orbitron">Nuvem de Domínios Semânticos</CardTitle>
              <CardDescription>
                Arraste para mover, scroll para zoom, clique em palavras para ver concordâncias
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex h-[800px]">
                <div className="flex-1 relative">
                  <SemanticDomainCloud
                    nodes={cloudNodes}
                    camera={camera}
                    font={font}
                    layerMode={layerMode}
                    onWordClick={handleWordClick}
                    onWordHover={handleWordHover}
                  />
                  
                  {hoveredWord && (
                    <div
                      className="absolute bg-slate-900/95 border border-cyan-500/50 
                                rounded-lg p-3 pointer-events-none z-50 backdrop-blur-sm
                                shadow-lg shadow-cyan-500/20"
                      style={{
                        left: mousePosition.x + 20,
                        top: mousePosition.y + 20
                      }}
                    >
                      <p className="font-bold text-cyan-400 text-sm mb-1">{hoveredWord.label}</p>
                      <div className="text-xs text-slate-300 space-y-0.5">
                        <p>Domínio: <span className="text-cyan-300">{hoveredWord.domain}</span></p>
                        <p>Frequência: <span className="text-cyan-300">{hoveredWord.frequency}</span></p>
                        <p>Prosódia: <span className="text-cyan-300">{hoveredWord.prosody}</span></p>
                      </div>
                    </div>
                  )}

                  <StatisticalFooter stats={stats} />
                </div>

                <CloudControlPanel
                  camera={camera}
                  onCameraChange={setCamera}
                  font={font}
                  onFontChange={setFont}
                  layerMode={layerMode}
                  onLayerModeChange={setLayerMode}
                  stats={{
                    fps,
                    visibleNodes: cloudNodes.length
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle>Rede Semântica</CardTitle>
              <CardDescription>Em desenvolvimento</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas Detalhadas</CardTitle>
              <CardDescription>Em desenvolvimento</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedWord && (
        <KWICModal
          open={!!selectedWord}
          onOpenChange={handleCloseModal}
          word={selectedWord.label}
          data={kwicDataMap[selectedWord.label] || []}
        />
      )}
    </div>
  );
}
