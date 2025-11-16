/**
 * 🕸️ VISUALIZAÇÃO DE REDE DE CO-OCORRÊNCIA
 * 
 * Rede interativa mostrando palavras dialetais que aparecem juntas
 */

import { useRef, useCallback, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { CoOccurrenceNetwork, CoOccurrence } from '@/services/coOccurrenceService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Network, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CoOccurrenceNetworkProps {
  network: CoOccurrenceNetwork;
  coOccurrences: CoOccurrence[];
}

const CATEGORIA_LABELS = {
  lida_campeira: 'Lida Campeira',
  fauna: 'Fauna',
  flora: 'Flora',
  vestuario: 'Vestuário',
  culinaria: 'Culinária',
  musica: 'Música',
  habitacao: 'Habitação',
  clima: 'Clima',
  social: 'Social',
  geral: 'Geral'
};

export function CoOccurrenceNetworkVisualization({ network, coOccurrences }: CoOccurrenceNetworkProps) {
  const [filterCategory, setFilterCategory] = useState('todos');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const fgRef = useRef<any>();

  // Filtrar rede por categoria
  const filteredNetwork = filterCategory === 'todos' 
    ? network 
    : {
        nodes: network.nodes.filter(n => n.category === filterCategory),
        edges: network.edges.filter(e => {
          const sourceNode = network.nodes.find(n => n.id === e.source);
          const targetNode = network.nodes.find(n => n.id === e.target);
          return sourceNode?.category === filterCategory && targetNode?.category === filterCategory;
        })
      };

  // Converter para formato react-force-graph
  const graphData = {
    nodes: filteredNetwork.nodes.map(n => ({
      id: n.id,
      name: n.label,
      val: n.size,
      color: n.color,
      category: n.category
    })),
    links: filteredNetwork.edges.map(e => ({
      source: e.source,
      target: e.target,
      value: e.weight
    }))
  };

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    // Centralizar câmera no nó
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(2, 1000);
    }
  }, []);

  // Encontrar co-ocorrências relacionadas ao nó selecionado
  const relatedCoOccurrences = selectedNode
    ? coOccurrences.filter(co => co.word1 === selectedNode.id || co.word2 === selectedNode.id)
    : [];

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Rede de Co-ocorrência de Palavras Dialetais
          </CardTitle>
          <CardDescription>
            Visualização interativa mostrando quais palavras aparecem juntas com mais frequência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filtrar por Categoria</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Estatísticas</label>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {filteredNetwork.nodes.length} palavras
                </Badge>
                <Badge variant="secondary">
                  {filteredNetwork.edges.length} conexões
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização */}
      <Card>
        <CardContent className="p-0">
          <div className="relative bg-slate-50 dark:bg-slate-900" style={{ height: '600px', width: '100%' }}>
            {filteredNetwork.nodes.length > 0 ? (
              <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                nodeLabel="name"
                nodeAutoColorBy="category"
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const label = node.name;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

                  // Desenhar círculo do nó
                  ctx.fillStyle = node.color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI, false);
                  ctx.fill();

                  // Desenhar label
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                  ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + node.val / 2 + 2, bckgDimensions[0], bckgDimensions[1]);
                  
                  ctx.fillStyle = 'white';
                  ctx.fillText(label, node.x, node.y + node.val / 2 + fontSize / 2 + 4);
                }}
                nodeCanvasObjectMode={() => 'replace'}
                onNodeClick={handleNodeClick}
                linkWidth={(link: any) => Math.log(link.value + 1)}
                linkColor={() => 'rgba(148, 163, 184, 0.6)'}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={(link: any) => Math.log(link.value + 1)}
                cooldownTicks={100}
                onEngineStop={() => fgRef.current?.zoomToFit(400)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Nenhuma palavra encontrada nesta categoria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Nó Selecionado */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Conexões de "{selectedNode.name}"
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedCoOccurrences.slice(0, 5).map((co, idx) => (
                <div key={idx} className="flex items-start justify-between border-b pb-2 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono">
                        {co.word1}
                      </Badge>
                      <span className="text-muted-foreground">↔</span>
                      <Badge variant="outline" className="font-mono">
                        {co.word2}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      "{co.contexts[0]}"
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    {co.frequency}x
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Como usar:</strong> Clique e arraste os nós para reorganizar a rede. 
          Use a roda do mouse para zoom. Clique em um nó para ver suas conexões detalhadas. 
          O tamanho dos nós representa a frequência das palavras, e a espessura das linhas representa 
          a força da co-ocorrência. As partículas animadas mostram a direção das conexões.
        </AlertDescription>
      </Alert>

      {/* Top Co-ocorrências */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Principais Co-ocorrências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {coOccurrences.slice(0, 10).map((co, idx) => (
              <div key={idx} className="flex items-start justify-between border-b pb-2 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono">
                      {co.word1}
                    </Badge>
                    <span className="text-muted-foreground">↔</span>
                    <Badge variant="outline" className="font-mono">
                      {co.word2}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    "{co.contexts[0]}"
                  </p>
                </div>
                <Badge variant="secondary" className="ml-4">
                  {co.frequency}x
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
