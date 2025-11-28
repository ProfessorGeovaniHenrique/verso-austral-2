import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, Percent, TrendingUp, Layers } from "lucide-react";

interface DomainDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainName: string;
  domainCode: string;
  domainColor: string;
  keywords: Array<{
    palavra: string;
    frequencia: number;
    ll: number;
    significancia: string;
  }>;
  stats: {
    totalOcorrencias: number;
    riquezaLexical: number;
    percentualCorpus: number;
    nivel: number;
  };
}

export function DomainDetailsDialog({
  open,
  onOpenChange,
  domainName,
  domainCode,
  domainColor,
  keywords,
  stats
}: DomainDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full border-2" 
              style={{ 
                backgroundColor: domainColor,
                borderColor: domainColor
              }} 
            />
            <div>
              <DialogTitle className="text-xl">{domainName}</DialogTitle>
              <DialogDescription>
                Código: <Badge variant="outline">{domainCode}</Badge> • Nível N{stats.nivel}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Estatísticas */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Estatísticas do Domínio
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Ocorrências</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.totalOcorrencias}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Peso Textual</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.percentualCorpus.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Riqueza Lexical</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.riquezaLexical}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Palavras-chave */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Palavras-chave do Domínio ({keywords.length})
              </h3>
              <div className="space-y-2">
                {keywords.slice(0, 20).map((keyword, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground w-6">{idx + 1}</span>
                      <span 
                        className="font-semibold"
                        style={{ color: domainColor }}
                      >
                        {keyword.palavra}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <span>{keyword.frequencia}</span>
                      </div>
                      <Badge 
                        variant={
                          keyword.significancia === 'Alta' ? 'default' : 
                          keyword.significancia === 'Média' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {keyword.significancia}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        LL: {keyword.ll.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {keywords.length > 20 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Mostrando 20 de {keywords.length} palavras-chave
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
