import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Trash2, Loader2 } from "lucide-react";
import { detectRhetoricalFigures } from "@/services/rhetoricalAnalysisService";
import { RhetoricalProfile } from "@/data/types/stylistic-analysis.types";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { TheoryBriefCard, TheoryDetailModal, AnalysisSuggestionsCard, BlauNunesConsultant } from "@/components/theory";
import { rhetoricalTheory } from "@/data/theoretical/stylistic-theory";

export function RhetoricalFiguresTool() {
  const { loadedCorpus, isLoading: loadingCorpus, isReady } = useSubcorpus();
  const [profile, setProfile] = useState<RhetoricalProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTheoryModal, setShowTheoryModal] = useState(false);

  const handleAnalyze = async () => {
    if (!loadedCorpus) {
      toast.error("Nenhum corpus selecionado");
      return;
    }

    try {
      setIsAnalyzing(true);
      toast.info("Detectando figuras retóricas...");
      
      const rhetoricalProfile = detectRhetoricalFigures(loadedCorpus);
      setProfile(rhetoricalProfile);
      
      toast.success("Figuras retóricas identificadas!");
    } catch (error) {
      console.error("Erro ao detectar figuras retóricas:", error);
      toast.error("Erro ao detectar figuras retóricas");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportToCSV = () => {
    if (!profile || !loadedCorpus) return;

    const csv = [
      "Tipo,Exemplo,Contexto,Posição",
      ...profile.figures.map(fig =>
        `"${fig.type}","${fig.example}","${fig.context}",${fig.position}`
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `figuras_retoricas_${loadedCorpus.tipo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const figureTypeLabels: Record<string, string> = {
    repetition: "Repetição",
    alliteration: "Aliteração",
    assonance: "Assonância",
    anaphora: "Anáfora",
    parallelism: "Paralelismo"
  };

  // Removido early return para sempre exibir TheoryBriefCard e botão

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{rhetoricalTheory.icon} Figuras Retóricas</CardTitle>
          <CardDescription>
            Detecção de repetição, aliteração, assonância, anáfora e paralelismo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TheoryBriefCard framework={rhetoricalTheory} onOpenDetail={() => setShowTheoryModal(true)} />
          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !loadedCorpus}>
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analisando..." : "Analisar Figuras"}
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(profile.figuresByType).map(([type, count]) => (
                  <Card key={type}>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground">
                        {figureTypeLabels[type] || type}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Estatísticas Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de Figuras:</span>
                    <span className="font-medium">{profile.totalFigures}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Densidade:</span>
                    <span className="font-medium">{profile.figureDensity.toFixed(2)} por 100 palavras</span>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="repetition">Repetição</TabsTrigger>
                  <TabsTrigger value="alliteration">Aliteração</TabsTrigger>
                  <TabsTrigger value="assonance">Assonância</TabsTrigger>
                  <TabsTrigger value="anaphora">Anáfora</TabsTrigger>
                  <TabsTrigger value="parallelism">Paralelismo</TabsTrigger>
                </TabsList>

                {['all', 'repetition', 'alliteration', 'assonance', 'anaphora', 'parallelism'].map(type => (
                  <TabsContent key={type} value={type} className="space-y-2 mt-4">
                    {profile.figures
                      .filter(fig => type === 'all' || fig.type === type)
                      .map((fig, idx) => (
                        <Card key={idx}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <Badge variant="secondary">
                                {figureTypeLabels[fig.type] || fig.type}
                              </Badge>
                              <div className="flex-1 space-y-1">
                                <p className="font-medium">{fig.example}</p>
                                <p className="text-sm text-muted-foreground">{fig.context}</p>
                                {fig.metadata && (
                                  <p className="text-xs text-muted-foreground">
                                    {fig.metadata.artista} - {fig.metadata.musica}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    {profile.figures.filter(fig => type === 'all' || fig.type === type).length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        Nenhuma figura deste tipo encontrada
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
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
                  "Clique em \"Analisar Figuras\" para detectar figuras retóricas"
                )}
              </div>
            )
          )}
          {profile && (
            <div className="space-y-4 mt-4">
              <AnalysisSuggestionsCard framework={rhetoricalTheory} compact />
              <BlauNunesConsultant framework={rhetoricalTheory} analysisResults={profile} compact />
            </div>
          )}
        </CardContent>
      </Card>
      <TheoryDetailModal open={showTheoryModal} onClose={() => setShowTheoryModal(false)} framework={rhetoricalTheory} />
    </div>
  );
}
