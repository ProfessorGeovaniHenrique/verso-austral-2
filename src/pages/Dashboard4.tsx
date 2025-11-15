import { useState, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThreeSemanticCloud } from '@/components/v3/ThreeSemanticCloud';
import { ThreeControlPanel } from '@/components/v3/ThreeControlPanel';
import { StatisticalFooter } from '@/components/v3/StatisticalFooter';
import { SmartTooltip3D } from '@/components/v3/SmartTooltip3D';
import { DetailedAnalysisModal } from '@/components/v3/DetailedAnalysisModal';
import { useThreeSemanticData, ViewMode, ThreeCloudNode } from '@/hooks/useThreeSemanticData';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import gsap from 'gsap';

export default function Dashboard4() {
  const [viewMode, setViewMode] = useState<ViewMode>('constellation');
  const [selectedDomainId, setSelectedDomainId] = useState<string | undefined>(undefined);
  
  const { nodes, stats, connections } = useThreeSemanticData(viewMode, selectedDomainId);
  
  const [selectedWord, setSelectedWord] = useState<ThreeCloudNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ThreeCloudNode | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const [font, setFont] = useState('Orbitron');
  const [autoRotate, setAutoRotate] = useState(false);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  
  const [minFrequency, setMinFrequency] = useState(0);
  const [prosodyFilter, setProsodyFilter] = useState<'all' | 'Positiva' | 'Negativa' | 'Neutra'>('all');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [showOnlyKeywords, setShowOnlyKeywords] = useState(false);
  
  const cameraRef = useRef<any>(null);
  
  const filteredNodeIds = useMemo(() => {
    const filtered = new Set<string>();
    nodes.forEach(node => {
      const passFrequency = node.frequency >= minFrequency;
      const passProsody = prosodyFilter === 'all' || node.prosody === prosodyFilter;
      const passDomain = selectedDomains.length === 0 || selectedDomains.includes(node.domain);
      
      let passKeyword = true;
      if (showOnlyKeywords && node.type === 'word') {
        const domainWords = nodes
          .filter(n => n.type === 'word' && n.domain === node.domain)
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 10)
          .map(n => n.id);
        passKeyword = domainWords.includes(node.id);
      }
      
      if (passFrequency && passProsody && passDomain && passKeyword) {
        filtered.add(node.id);
      }
    });
    return filtered;
  }, [nodes, minFrequency, prosodyFilter, selectedDomains, showOnlyKeywords]);
  
  const handleWordClick = useCallback((node: ThreeCloudNode) => {
    if (node.type === 'word') setSelectedWord(node);
  }, []);
  
  const handleDomainClick = useCallback((node: ThreeCloudNode) => {
    if (node.type === 'domain' && viewMode === 'constellation') {
      setSelectedDomainId(node.domain);
      setViewMode('orbital');
      if (cameraRef.current) {
        gsap.to(cameraRef.current.position, {
          x: node.position[0] + 10,
          y: node.position[1] + 8,
          z: node.position[2] + 12,
          duration: 1.5,
          ease: "power2.inOut"
        });
      }
    }
  }, [viewMode]);
  
  const handleResetCamera = useCallback(() => {
    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        x: 0, y: 15, z: 30,
        duration: 1.5,
        ease: "power2.inOut"
      });
    }
  }, []);
  
  const handleBackToConstellation = useCallback(() => {
    setViewMode('constellation');
    setSelectedDomainId(undefined);
    handleResetCamera();
  }, [handleResetCamera]);
  
  const availableDomains = useMemo(() => {
    const domains = new Map<string, { name: string; color: string }>();
    nodes.forEach(node => {
      if (node.type === 'domain') {
        domains.set(node.domain, { name: node.domain, color: node.color });
      }
    });
    return Array.from(domains.values());
  }, [nodes]);
  
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-[1800px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link to="/dashboard3">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Canvas 2D
              </Button>
            </Link>
            <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/50">
              Three.js
            </Badge>
            <Badge variant="outline" className={viewMode === 'orbital' ? "bg-cyan-500/20" : ""}>
              {viewMode === 'constellation' ? 'Constelação' : 'Orbital'}
            </Badge>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Nuvem Semântica 3D
          </h1>
        </div>
        {viewMode === 'orbital' && (
          <Button onClick={handleBackToConstellation} variant="outline">
            Voltar à Constelação
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Visualização 3D Completa</CardTitle>
          <CardDescription>{filteredNodeIds.size} de {nodes.length} nós visíveis</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-[800px]" onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}>
            <div className="flex-1 relative">
              <ThreeSemanticCloud
                nodes={nodes}
                connections={connections}
                font={font}
                autoRotate={autoRotate}
                bloomEnabled={bloomEnabled}
                showConnections={showConnections && viewMode === 'constellation'}
                onWordClick={handleWordClick}
                onWordHover={setHoveredNode}
                onDomainClick={handleDomainClick}
                cameraRef={cameraRef}
                filteredNodeIds={filteredNodeIds}
              />
              {hoveredNode && (
                <SmartTooltip3D
                  data={{
                    title: hoveredNode.label,
                    domain: { name: hoveredNode.domain, color: hoveredNode.color },
                    frequency: { raw: hoveredNode.frequency, normalized: (hoveredNode.frequency / 10000) * 100 },
                    prosody: { type: hoveredNode.prosody },
                    type: hoveredNode.type,
                    lexicalRichness: hoveredNode.lexicalRichness,
                    textualWeight: hoveredNode.textualWeight
                  }}
                  position={mousePosition}
                />
              )}
              <StatisticalFooter stats={stats} />
            </div>
            <ThreeControlPanel
              font={font}
              onFontChange={setFont}
              autoRotate={autoRotate}
              onAutoRotateChange={setAutoRotate}
              bloomEnabled={bloomEnabled}
              onBloomToggle={setBloomEnabled}
              showConnections={showConnections}
              onConnectionsToggle={setShowConnections}
              onResetCamera={handleResetCamera}
              stats={{ fps: 60, triangles: nodes.length * 100, nodes: nodes.length, domains: availableDomains.length, words: nodes.filter(n => n.type === 'word').length }}
              minFrequency={minFrequency}
              onMinFrequencyChange={setMinFrequency}
              prosodyFilter={prosodyFilter}
              onProsodyFilterChange={setProsodyFilter}
              selectedDomains={selectedDomains}
              onSelectedDomainsChange={setSelectedDomains}
              availableDomains={availableDomains}
              showOnlyKeywords={showOnlyKeywords}
              onShowOnlyKeywordsChange={setShowOnlyKeywords}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </CardContent>
      </Card>
      
      <DetailedAnalysisModal
        open={!!selectedWord}
        onOpenChange={(open) => !open && setSelectedWord(null)}
        node={selectedWord}
      />
    </div>
  );
}
