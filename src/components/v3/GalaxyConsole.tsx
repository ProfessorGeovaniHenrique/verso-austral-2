import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GalaxyNode } from "@/hooks/useGalaxyData";
import { X } from "lucide-react";
import { PlanetPreview } from "./PlanetPreview";

interface GalaxyConsoleProps {
  selectedNode: GalaxyNode | null;
  hoveredNode: GalaxyNode | null;
  onClose: () => void;
}

export function GalaxyConsole({ selectedNode, hoveredNode, onClose }: GalaxyConsoleProps) {
  const displayNode = selectedNode || hoveredNode;
  const isPinned = !!selectedNode;

  if (!displayNode) {
    return (
      <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-l border-cyan-500/30 p-6 flex items-center justify-center">
        <p className="text-cyan-400/60 text-sm font-mono text-center">
          Passe o mouse sobre uma palavra<br />para ver seus detalhes
        </p>
      </div>
    );
  }

  const getProsodyColor = (prosody: string) => {
    switch (prosody) {
      case 'Positiva': return 'hsl(142, 71%, 45%)';
      case 'Negativa': return 'hsl(0, 84%, 60%)';
      default: return 'hsl(200, 70%, 50%)';
    }
  };

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-l border-cyan-500/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-cyan-400 truncate">
              {displayNode.label}
            </h3>
            <p className="text-xs text-cyan-400/60 font-mono mt-1">
              {displayNode.type === 'domain' ? 'Domínio Semântico' : 'Palavra'}
            </p>
          </div>
          {isPinned && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-cyan-400 hover:text-cyan-300"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview holográfico */}
      <div className="p-4 bg-slate-950/50">
        <div className="rounded-lg overflow-hidden border border-cyan-500/20">
          <PlanetPreview node={displayNode} />
        </div>
      </div>

      {/* Estatísticas */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="space-y-2">
          <StatRow label="Domínio" value={displayNode.domain} />
          <StatRow label="Frequência" value={displayNode.frequency.toString()} />
          
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-cyan-400/60 font-mono">Prosódia</span>
            <Badge
              style={{
                backgroundColor: getProsodyColor(displayNode.prosody),
                color: 'white'
              }}
            >
              {displayNode.prosody}
            </Badge>
          </div>
        </div>

        {displayNode.type === 'word' && (
          <>
            <Separator className="bg-cyan-500/20" />
            
            <div className="space-y-2">
              <p className="text-xs text-cyan-400/60 font-mono uppercase tracking-wider">
                Análise Contextual
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Esta palavra ocorre {displayNode.frequency} {displayNode.frequency === 1 ? 'vez' : 'vezes'} no corpus,
                pertencendo ao domínio semântico "{displayNode.domain}".
              </p>
            </div>

            {isPinned && (
              <>
                <Separator className="bg-cyan-500/20" />
                <Button
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => console.log('KWIC para:', displayNode.label)}
                >
                  Ver Concordância (KWIC)
                </Button>
              </>
            )}
          </>
        )}

        {displayNode.type === 'domain' && (
          <>
            <Separator className="bg-cyan-500/20" />
            <div className="space-y-2">
              <p className="text-xs text-cyan-400/60 font-mono uppercase tracking-wider">
                Sobre o Domínio
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Domínio semântico composto por múltiplas palavras que compartilham
                características temáticas relacionadas a "{displayNode.domain}".
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer com dica */}
      <div className="p-4 border-t border-cyan-500/20 bg-slate-950/30">
        <p className="text-xs text-cyan-400/40 font-mono text-center">
          {isPinned ? 'Console fixado - clique em ✕ para fechar' : 'Clique em uma palavra para fixar'}
        </p>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-cyan-400/60 font-mono">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  );
}
