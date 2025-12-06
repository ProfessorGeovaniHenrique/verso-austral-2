import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Trash2, Loader2 } from "lucide-react";
import { analyzeCohesion } from "@/services/cohesionAnalysisService";
import { CohesionProfile } from "@/data/types/stylistic-analysis.types";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { TheoryBriefCard, TheoryDetailModal, AnalysisSuggestionsCard, BlauNunesConsultant } from "@/components/theory";
import { cohesionTheory } from "@/data/theoretical/stylistic-theory";

export function CohesionAnalysisTool() {
  const { loadedCorpus, isLoading: loadingCorpus, isReady } = useSubcorpus();
  const [profile, setProfile] = useState<CohesionProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTheoryModal, setShowTheoryModal] = useState(false);

  const handleAnalyze = async () => {
    if (!loadedCorpus) {
      toast.error("Nenhum corpus selecionado");
      return;
    }

    try {
      setIsAnalyzing(true);
      toast.info("Analisando elementos de coesão...");
      
      const cohesionProfile = analyzeCohesion(loadedCorpus);
      setProfile(cohesionProfile);
      
      toast.success("Análise de coesão concluída!");
    } catch (error) {
      console.error("Erro ao analisar coesão:", error);
      toast.error("Erro ao analisar coesão");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportToCSV = () => {
    if (!profile || !loadedCorpus) return;

    const csv = [
      "Métrica,Valor",
      `Densidade de Conectivos,${profile.connectiveDensity.toFixed(2)}`,
      `Variação de Conectivos,${profile.connectiveVariation}`,
      "",
      "Conectivo,Tipo,Contagem",
      ...profile.connectives.map(c => `${c.word},${c.type},${c.count}`)
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coesao_${loadedCorpus.tipo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const connectiveTypeLabels: Record<string, string> = {
    additive: "Aditivo",
    adversative: "Adversativo",
    causal: "Causal",
    temporal: "Temporal",
    conclusive: "Conclusivo"
  };

  const connectiveTypeColors: Record<string, string> = {
    additive: "bg-blue-100 text-blue-800",
    adversative: "bg-red-100 text-red-800",
    causal: "bg-green-100 text-green-800",
    temporal: "bg-purple-100 text-purple-800",
    conclusive: "bg-yellow-100 text-yellow-800"
  };

  // Removido early return para sempre exibir TheoryBriefCard e botão

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{cohesionTheory.icon} Análise de Coesão</CardTitle>
          <CardDescription>
            Conectivos, cadeias lexicais e referências anafóricas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TheoryBriefCard framework={cohesionTheory} onOpenDetail={() => setShowTheoryModal(true)} />
          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !loadedCorpus}>
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analisando..." : "Analisar Coesão"}
            </Button>
            {profile && (
              <>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => { setProfile(null); toast.success("Cache limpo!"); }}
                  title="Limpar cache"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {profile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Métricas Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Densidade de Conectivos:</span>
                      <span className="font-medium">{profile.connectiveDensity.toFixed(2)} por sentença</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Variação de Conectivos:</span>
                      <span className="font-medium">{profile.connectiveVariation} únicos</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(
                        profile.connectives.reduce((acc, c) => {
                          acc[c.type] = (acc[c.type] || 0) + c.count;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <Badge className={connectiveTypeColors[type]}>
                            {connectiveTypeLabels[type] || type}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Conectivos Identificados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {profile.connectives
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 20)
                      .map((connective, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${connectiveTypeColors[connective.type]}`}
                            >
                              {connectiveTypeLabels[connective.type]?.substring(0, 3)}
                            </Badge>
                            <span className="font-medium">{connective.word}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{connective.count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {profile.lexicalChains.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cadeias Lexicais</CardTitle>
                    <CardDescription>
                      Grupos de palavras relacionadas semanticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {profile.lexicalChains.slice(0, 10).map((chain, idx) => (
                        <div key={idx} className="p-3 border rounded">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {chain.words.map((word, widx) => (
                              <Badge key={widx} variant="secondary">{word}</Badge>
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {chain.occurrences} ocorrências
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            !isAnalyzing && (
              <div className="text-center text-muted-foreground py-8">
                {loadingCorpus ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Carregando corpus...</span>
                  </div>
                ) : !loadedCorpus ? (
                  <span>
                    Selecione um corpus no seletor acima para iniciar a análise
                    {!isReady && <span className="text-xs ml-1">(Aguardando dados...)</span>}
                  </span>
                ) : (
                  "Clique em \"Analisar Coesão\" para identificar elementos coesivos"
                )}
              </div>
            )
          )}
          {profile && (
            <div className="space-y-4 mt-4">
              <AnalysisSuggestionsCard framework={cohesionTheory} compact />
              <BlauNunesConsultant framework={cohesionTheory} analysisResults={profile} compact />
            </div>
          )}
        </CardContent>
      </Card>
      <TheoryDetailModal open={showTheoryModal} onClose={() => setShowTheoryModal(false)} framework={cohesionTheory} />
    </div>
  );
}
