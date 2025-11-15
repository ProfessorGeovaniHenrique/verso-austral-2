import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThreeSemanticCloud } from '@/components/v3/ThreeSemanticCloud';
import { ThreeControlPanel } from '@/components/v3/ThreeControlPanel';
import { StatisticalFooter } from '@/components/v3/StatisticalFooter';
import { KWICModal } from '@/components/KWICModal';
import { useThreeSemanticData } from '@/hooks/useThreeSemanticData';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { kwicDataMap } from '@/data/mockup/kwic';

export default function Dashboard4() {
  const { nodes, stats } = useThreeSemanticData();
  const cameraRef = useRef<any>(null);
  
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [font, setFont] = useState('Orbitron');
  const [autoRotate, setAutoRotate] = useState(false);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  
  const handleWordClick = (node: any) => {
    if (node.type === 'word') {
      setSelectedWord(node.label);
    }
  };
  
  const handleResetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 15, 30);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };
  
  // Calcular estatísticas
  const domainCount = nodes.filter(n => n.type === 'domain').length;
  const wordCount = nodes.filter(n => n.type === 'word').length;
  
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-[1800px]">
      {/* Header com link de volta */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link to="/dashboard3">
              <Button variant="ghost" size="sm" className="hover:bg-cyan-500/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Canvas 2D
              </Button>
            </Link>
            <Badge 
              variant="outline" 
              className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-3 py-1"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Experimental - Three.js
            </Badge>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Nuvem Semântica 3D
          </h1>
          <p className="text-slate-400 mt-2">
            Visualização experimental com Three.js - Compare performance e interatividade com Canvas 2D
          </p>
        </div>
      </div>
      
      {/* Visualização principal */}
      <Card className="border-purple-500/30">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Nuvem de Domínios Semânticos 3D
          </CardTitle>
          <CardDescription>
            Arraste para rotacionar • Scroll para zoom • Clique em palavras para KWIC • Rotação orbital livre 360°
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-[800px]">
            {/* Canvas Three.js */}
            <div className="flex-1 relative">
              <ThreeSemanticCloud
                nodes={nodes}
                font={font}
                autoRotate={autoRotate}
                bloomEnabled={bloomEnabled}
                onWordClick={handleWordClick}
                onWordHover={setHoveredNode}
                cameraRef={cameraRef}
              />
              
              {/* Tooltip hover */}
              {hoveredNode && (
                <div className="absolute top-4 left-4 bg-slate-900/95 border border-cyan-500/50 rounded-lg p-3 backdrop-blur z-10 shadow-lg shadow-cyan-500/20">
                  <p className="font-bold text-cyan-400">{hoveredNode.label}</p>
                  <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                    <p>Tipo: <span className="text-slate-300">{hoveredNode.type === 'domain' ? 'Domínio' : 'Palavra'}</span></p>
                    <p>Domínio: <span className="text-slate-300">{hoveredNode.domain}</span></p>
                    <p>Frequência: <span className="text-slate-300">{hoveredNode.frequency}</span></p>
                    <p>Prosódia: <span className="text-slate-300">{hoveredNode.prosody}</span></p>
                  </div>
                </div>
              )}
              
              {/* Rodapé estatístico */}
              <StatisticalFooter stats={stats} />
            </div>
            
            {/* Painel de controles */}
            <ThreeControlPanel
              font={font}
              onFontChange={setFont}
              autoRotate={autoRotate}
              onAutoRotateChange={setAutoRotate}
              bloomEnabled={bloomEnabled}
              onBloomToggle={setBloomEnabled}
              onResetCamera={handleResetCamera}
              stats={{
                nodeCount: nodes.length,
                domainCount,
                wordCount
              }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Seção de comparação */}
      <Card className="border-cyan-500/30">
        <CardHeader>
          <CardTitle>Comparação: Canvas 2D vs Three.js 3D</CardTitle>
          <CardDescription>
            Avalie performance, funcionalidade e experiência visual entre as duas abordagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-cyan-500/30">
              <h3 className="font-semibold text-cyan-400 mb-3">Canvas 2D (Dashboard3)</h3>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>✅ Performance leve e rápida</li>
                <li>✅ Código simples (~400 linhas)</li>
                <li>✅ Zoom/Pan 2D tradicional</li>
                <li>✅ Glow via CSS + Canvas</li>
                <li>✅ Melhor para MVP e validação</li>
              </ul>
            </div>
            
            <div className="bg-slate-900/50 p-4 rounded-lg border border-purple-500/30">
              <h3 className="font-semibold text-purple-400 mb-3">Three.js 3D (Dashboard4)</h3>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>✨ Rotação orbital livre 360°</li>
                <li>✨ Bloom real-time (post-processing)</li>
                <li>✨ Profundidade 3D real</li>
                <li>✨ Campo de estrelas animado</li>
                <li>✨ Impacto visual maior</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Modal KWIC */}
      <KWICModal
        open={!!selectedWord}
        onOpenChange={(open) => !open && setSelectedWord(null)}
        word={selectedWord || ''}
        data={selectedWord ? (kwicDataMap[selectedWord] || []) : []}
      />
    </div>
  );
}
