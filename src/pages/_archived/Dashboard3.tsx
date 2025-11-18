import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SemanticDomainCloud } from "@/components/v3/SemanticDomainCloud";
import { StatisticalFooter } from "@/components/v3/StatisticalFooter";
import { KWICModal } from "@/components/KWICModal";
import { useSemanticCloudData, CloudNode } from "@/hooks/useSemanticCloudData";
import { kwicDataMap } from "@/data/mockup/kwic";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export default function Dashboard3() {
  const [activeTab, setActiveTab] = useState("galaxy");
  const { cloudNodes, stats } = useSemanticCloudData();
  const [selectedWord, setSelectedWord] = useState<CloudNode | null>(null);
  const [hoveredWord, setHoveredWord] = useState<CloudNode | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleWordClick = (node: CloudNode) => {
    if (node.type === 'word') {
      setSelectedWord(node);
    }
  };

  const handleWordHover = (node: CloudNode | null) => {
    setHoveredWord(node);
  };

  const handleCloseModal = () => {
    setSelectedWord(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-[1600px]">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
            Análise de Domínios Semânticos
          </h1>
          <p className="text-muted-foreground">
            Visualização orbital interativa - Canvas 2D otimizado
          </p>
        </div>
        <Link to="/dashboard4">
          <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/10">
            <Sparkles className="w-4 h-4 mr-2" />
            Ver versão 3D (Three.js)
          </Button>
        </Link>
      </header>

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="galaxy" className="flex items-center gap-2">
            <span>🌌</span>
            <span>Galáxia</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <span>🕸️</span>
            <span>Rede</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <span>📊</span>
            <span>Estatísticas</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Nuvem de Domínios */}
        <TabsContent value="galaxy" className="mt-6" onMouseMove={handleMouseMove}>
          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle>Nuvem de Domínios Semânticos 3D</CardTitle>
              <CardDescription>
                Clique em qualquer palavra para ver suas concordâncias (KWIC). Domínios em destaque com glow neon.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 relative">
              <div className="relative">
                {/* Canvas da nuvem */}
                <SemanticDomainCloud
                  nodes={cloudNodes}
                  onWordClick={handleWordClick}
                  onWordHover={handleWordHover}
                />
                
                {/* Tooltip de hover */}
                {hoveredWord && (
                  <div
                    className="absolute bg-slate-900/95 border border-cyan-500/50 
                                rounded-lg p-3 pointer-events-none z-50 backdrop-blur-sm
                                shadow-lg shadow-cyan-500/20"
                    style={{
                      left: mousePosition.x - 100,
                      top: mousePosition.y - 150,
                    }}
                  >
                    <p className="font-bold text-cyan-400 text-sm">
                      {hoveredWord.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Domínio: <span className="text-slate-300">{hoveredWord.domain}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Frequência: <span className="text-slate-300 font-mono">{hoveredWord.frequency}</span>
                    </p>
                    {hoveredWord.type === 'word' && (
                      <p className="text-xs text-slate-400">
                        Prosódia: <span className={`font-semibold ${
                          hoveredWord.prosody === 'Positiva' ? 'text-green-400' :
                          hoveredWord.prosody === 'Negativa' ? 'text-red-400' :
                          'text-slate-300'
                        }`}>
                          {hoveredWord.prosody}
                        </span>
                      </p>
                    )}
                  </div>
                )}
                
                {/* Rodapé estatístico retrátil */}
                <StatisticalFooter stats={stats} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Rede */}
        <TabsContent value="network" className="mt-6">
          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle>Rede Semântica</CardTitle>
              <CardDescription>
                Visualização de rede com conexões entre palavras e domínios
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[600px] flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-lg">
                <p className="text-muted-foreground">Em desenvolvimento - Fase 6</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Estatísticas */}
        <TabsContent value="stats" className="mt-6">
          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle>Análise Estatística</CardTitle>
              <CardDescription>
                Frequências, distribuições e métricas dos domínios semânticos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[600px] flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-lg">
                <p className="text-muted-foreground">Em desenvolvimento - Fase 7</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal KWIC */}
      {selectedWord && (
        <KWICModal
          open={!!selectedWord}
          onOpenChange={(open) => !open && handleCloseModal()}
          word={selectedWord.label}
          data={kwicDataMap[selectedWord.label] || []}
        />
      )}
    </div>
  );
}
