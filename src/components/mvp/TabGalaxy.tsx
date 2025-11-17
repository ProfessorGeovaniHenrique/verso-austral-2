import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { FilterInsigniaToolbar } from "@/components/FilterInsigniaToolbar";
import { useState, useEffect } from "react";
import { getDemoAnalysisResults, DemoCloudData } from "@/services/demoCorpusService";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface TabGalaxyProps {
  demo?: boolean;
}

export function TabGalaxy({ demo = false }: TabGalaxyProps) {
  const [selectedInsignias, setSelectedInsignias] = useState<string[]>([]);
  const [cloudData, setCloudData] = useState<DemoCloudData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (demo) {
      setIsLoading(true);
      getDemoAnalysisResults()
        .then(result => {
          setCloudData(result.cloudData);
          toast.success(`${result.cloudData.length} domínios carregados para visualização`);
        })
        .catch(error => {
          console.error('Erro ao carregar dados demo:', error);
          toast.error('Erro ao carregar visualização');
        })
        .finally(() => setIsLoading(false));
    }
  }, [demo]);
  
  return (
    <div className="space-y-6">
      <Card className="card-academic">
        <CardHeader>
          <CardTitle className="section-header-academic flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {demo ? 'Nuvem de Domínios - "Quando o Verso Vem pras Casa"' : 'Nuvem de Domínios Semânticos'}
          </CardTitle>
          <CardDescription className="section-description-academic">
            {demo ? 'Visualização dos domínios identificados na análise' : 'Visualização orbital interativa com KWIC - Em desenvolvimento'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!demo && (
            <>
              <FilterInsigniaToolbar
                selectedInsignias={selectedInsignias}
                onInsigniasChange={setSelectedInsignias}
              />
              {selectedInsignias.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  💡 Filtro de insígnias ativo (funcionalidade completa no Sprint 3)
                </div>
              )}
            </>
          )}

          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : demo && cloudData ? (
            <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-background via-muted/20 to-background rounded-lg border p-8">
              <div className="flex flex-wrap gap-6 justify-center items-center max-w-4xl">
                {cloudData.map((domain) => (
                  <div
                    key={domain.codigo}
                    className="transition-all hover:scale-110 cursor-pointer group"
                    style={{
                      fontSize: `${Math.max(16, domain.size * 2)}px`,
                      fontWeight: 700,
                      color: domain.color,
                      textShadow: `0 0 20px ${domain.color}80, 0 0 40px ${domain.color}40`,
                    }}
                    title={`${domain.nome}: ${domain.wordCount} palavras (score: ${domain.avgScore.toFixed(2)})`}
                  >
                    {domain.nome}
                    <div className="text-xs font-normal opacity-0 group-hover:opacity-100 transition-opacity text-center mt-1">
                      {domain.wordCount} palavras
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg border border-border">
              <p className="text-muted-foreground">
                Nuvem semântica será implementada no Sprint 3
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
