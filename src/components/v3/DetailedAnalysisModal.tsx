import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ThreeCloudNode } from '@/hooks/useThreeSemanticData';
import { kwicDataMap } from '@/data/mockup/kwic';
import { Sparkles, BarChart3, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailedAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: ThreeCloudNode | null;
}

export function DetailedAnalysisModal({ open, onOpenChange, node }: DetailedAnalysisModalProps) {
  if (!node) return null;

  const concordances = kwicDataMap[node.label] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <span style={{ color: node.color }}>{node.label}</span>
            <Badge style={{ backgroundColor: `${node.color}33`, color: node.color }}>
              {node.domain}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Análise linguística detalhada da {node.type === 'domain' ? 'domínio semântico' : 'palavra'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="kwic" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              KWIC
            </TabsTrigger>
            <TabsTrigger value="related" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Relacionadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm text-slate-400 mb-2">Frequência e Distribuição</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Frequência Bruta:</span>
                    <span className="font-mono font-bold text-cyan-400">{node.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Tipo:</span>
                    <span className="font-semibold capitalize">{node.type === 'domain' ? 'Domínio' : 'Palavra'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm text-slate-400 mb-2">Prosódia Semântica</h4>
                <div className="flex items-center gap-3">
                  <Sparkles className={cn(
                    "w-6 h-6",
                    node.prosody === 'Positiva' && "text-green-400",
                    node.prosody === 'Negativa' && "text-red-400",
                    node.prosody === 'Neutra' && "text-slate-400"
                  )} />
                  <div>
                    <p className={cn(
                      "font-bold text-lg",
                      node.prosody === 'Positiva' && "text-green-400",
                      node.prosody === 'Negativa' && "text-red-400",
                      node.prosody === 'Neutra' && "text-slate-400"
                    )}>
                      {node.prosody}
                    </p>
                    <p className="text-xs text-slate-400">Avaliação semântica</p>
                  </div>
                </div>
              </div>

              <div className="col-span-2 bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm text-slate-400 mb-2">Domínio Semântico</h4>
                <Badge 
                  className="text-base px-4 py-2"
                  style={{ backgroundColor: `${node.color}33`, color: node.color }}
                >
                  {node.domain}
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kwic" className="mt-4">
            <div className="space-y-2">
              <h4 className="text-sm text-slate-400 mb-3">
                Concordâncias no Corpus ({concordances.length} ocorrências)
              </h4>
              {concordances.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {concordances.map((conc, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-800/50 rounded p-3 font-mono text-sm hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-baseline gap-1">
                        <span className="text-slate-400 text-right" style={{ minWidth: '40%' }}>
                          {conc.leftContext}
                        </span>
                        <span 
                          className="font-bold px-1"
                          style={{ color: node.color }}
                        >
                          {conc.keyword}
                        </span>
                        <span className="text-slate-400">
                          {conc.rightContext}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Fonte: {conc.source}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  Nenhuma concordância disponível para esta palavra.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="related" className="mt-4">
            <div className="bg-slate-800/50 rounded-lg p-6 text-center">
              <Network className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p className="text-slate-400">
                Análise de palavras relacionadas em desenvolvimento
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Futuramente mostrará colocações e n-gramas
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
