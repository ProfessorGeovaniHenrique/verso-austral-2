import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThreeSemanticCloud } from '@/components/v3/ThreeSemanticCloud';
import { ThreeControlPanel } from '@/components/v3/ThreeControlPanel';
import { StatisticalFooter } from '@/components/v3/StatisticalFooter';
import { Tooltip3D } from '@/components/v3/Tooltip3D';
import { DetailModal } from '@/components/v3/DetailModal';
import { useThreeSemanticData, ViewMode, VisualWordNode } from '@/hooks/useThreeSemanticData';
import { useInteractivityStore } from '@/store/interactivityStore';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Dashboard4() {
  const [viewMode, setViewMode] = useState<ViewMode>('constellation');
  const [selectedDomainId, setSelectedDomainId] = useState<string | undefined>(undefined);
  
  const { nodes, stats, connections } = useThreeSemanticData(viewMode, selectedDomainId);
  const { resetCamera } = useInteractivityStore();
  
  const [font, setFont] = useState('Orbitron');
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(2.0);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  
  const [minFrequency, setMinFrequency] = useState(0);
  const [prosodyFilter, setProsodyFilter] = useState<'all' | 'Positiva' | 'Negativa' | 'Neutra'>('all');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [showOnlyKeywords, setShowOnlyKeywords] = useState(false);
  
  const filteredNodeIds = useMemo(() => {
    const filtered = new Set<string>();
    nodes.forEach(node => {
      if (node.type === 'word') {
        const wordNode = node as VisualWordNode;
        const passFrequency = wordNode.frequency >= minFrequency;
        const passProsody = prosodyFilter === 'all' || wordNode.prosody === prosodyFilter;
        const passDomain = selectedDomains.length === 0 || selectedDomains.includes(wordNode.domain);
        
        let passKeyword = true;
        if (showOnlyKeywords) {
          const domainWords = nodes
            .filter(n => n.type === 'word' && (n as VisualWordNode).domain === wordNode.domain)
            .sort((a, b) => (b as VisualWordNode).frequency - (a as VisualWordNode).frequency)
            .slice(0, 10)
            .map(n => n.id);
          passKeyword = domainWords.includes(node.id);
        }
        
        if (passFrequency && passProsody && passDomain && passKeyword) {
          filtered.add(node.id);
        }
      } else {
        filtered.add(node.id);
      }
    });
    return filtered;
  }, [nodes, minFrequency, prosodyFilter, selectedDomains, showOnlyKeywords]);
  
  const handleBackToConstellation = useCallback(() => {
    setViewMode('constellation');
    setSelectedDomainId(undefined);
    resetCamera();
  }, [resetCamera]);
  
  const availableDomains = useMemo(() => {
    const domains = new Map<string, { name: string; color: string }>();
    nodes.forEach(node => {
      if (node.type === 'domain') {
        domains.set(node.label, { name: node.label, color: node.color });
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
          <div className="flex h-[800px]">
            <div className="flex-1 relative">
              <ThreeSemanticCloud
                nodes={nodes}
                connections={connections}
                font={font}
                autoRotate={autoRotate}
                autoRotateSpeed={autoRotateSpeed}
                bloomEnabled={bloomEnabled}
                showConnections={showConnections && viewMode === 'constellation'}
                filteredNodeIds={filteredNodeIds}
              />
              
              <Tooltip3D />
              <StatisticalFooter stats={stats} />
            </div>
            <ThreeControlPanel
              font={font}
              onFontChange={setFont}
              autoRotate={autoRotate}
              onAutoRotateChange={setAutoRotate}
              autoRotateSpeed={autoRotateSpeed}
              onAutoRotateSpeedChange={setAutoRotateSpeed}
              bloomEnabled={bloomEnabled}
              onBloomToggle={setBloomEnabled}
              showConnections={showConnections}
              onConnectionsToggle={setShowConnections}
              onResetCamera={resetCamera}
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
      
      <DetailModal />
    </div>
  );
}
