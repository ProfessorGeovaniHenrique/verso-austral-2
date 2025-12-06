import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Info, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { analyzeSpeechThoughtPresentation, exportSpeechThoughtToCSV, SpeechThoughtProfile } from "@/services/speechThoughtAnalysisService";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TheoryBriefCard, TheoryDetailModal, AnalysisSuggestionsCard, BlauNunesConsultant } from "@/components/theory";
import { speechThoughtTheory } from "@/data/theoretical/stylistic-theory";

export function SpeechThoughtPresentationTool() {
  const { loadedCorpus, isLoading: loadingCorpus, isReady } = useSubcorpus();
  const [profile, setProfile] = useState<SpeechThoughtProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTheoryModal, setShowTheoryModal] = useState(false);

  const handleAnalyze = async () => {
    if (!loadedCorpus) {
      toast.error("Selecione um corpus primeiro");
      return;
    }

    try {
      setIsAnalyzing(true);
      setProgress(20);
      toast.info("Detectando apresentação de fala e pensamento...");
      
      setProgress(60);
      const speechThoughtProfile = analyzeSpeechThoughtPresentation(loadedCorpus);
      setProfile(speechThoughtProfile);
      setProgress(100);
      
      toast.success(`${speechThoughtProfile.totalInstances} instâncias detectadas!`);
    } catch (error) {
      console.error("Erro ao analisar fala/pensamento:", error);
      toast.error("Erro ao analisar apresentação de fala/pensamento");
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const exportToCSV = () => {
    if (!profile) return;
    
    const csv = exportSpeechThoughtToCSV(profile);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speech_thought_${profile.corpusType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const speechChartData = profile ? Object.entries(profile.distribution.speech).map(([key, value]) => ({
    category: key,
    count: value
  })) : [];

  const thoughtChartData = profile ? Object.entries(profile.distribution.thought).map(([key, value]) => ({
    category: key,
    count: value
  })) : [];

  const categoryLabels: Record<string, string> = {
    DS: 'Discurso Direto',
    IS: 'Discurso Indireto',
    FIS: 'Discurso Indireto Livre',
    FDS: 'Discurso Direto Livre',
    NRSA: 'Atos de Fala Narrados',
    DT: 'Pensamento Direto',
    IT: 'Pensamento Indireto',
    FIT: 'Pensamento Indireto Livre',
    FDT: 'Pensamento Direto Livre',
    NRTA: 'Atos Mentais Narrados'
  };

  // Removido early return para sempre exibir TheoryBriefCard e botão

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{speechThoughtTheory.icon} Apresentação de Fala e Pensamento</CardTitle>
          <CardDescription>
            Análise de Speech & Thought Presentation (Leech & Short 2007, Cap. 10)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TheoryBriefCard framework={speechThoughtTheory} onOpenDetail={() => setShowTheoryModal(true)} />
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Detecta categorias nas escalas DS→NRSA (fala) e DT→NRTA (pensamento) usando padrões linguísticos.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !loadedCorpus}>
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analisando..." : "Analisar Corpus"}
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

          {isAnalyzing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {progress}% concluído
              </p>
            </div>
          )}

          {profile ? (
            <div className="space-y-4">
              {/* Métricas gerais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{profile.totalInstances}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-500">{profile.speechInstances}</div>
                    <div className="text-sm text-muted-foreground">Fala</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-purple-500">{profile.thoughtInstances}</div>
                    <div className="text-sm text-muted-foreground">Pensamento</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Badge variant="secondary" className="text-xs">
                      {categoryLabels[profile.dominantCategory.speech] || profile.dominantCategory.speech}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">Categoria Dominante</div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos de distribuição */}
              <Tabs defaultValue="speech" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="speech">Fala</TabsTrigger>
                  <TabsTrigger value="thought">Pensamento</TabsTrigger>
                </TabsList>

                <TabsContent value="speech" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribuição de Apresentação de Fala</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={speechChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="hsl(var(--primary))" name="Ocorrências" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Instâncias de Fala</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto space-y-2">
                      {profile.instances
                        .filter(inst => inst.type === 'speech')
                        .slice(0, 20)
                        .map((inst, idx) => (
                          <div key={idx} className="p-3 border rounded">
                            <div className="flex items-start gap-2 mb-2">
                              <Badge>{inst.category}</Badge>
                              <span className="text-sm font-medium">{inst.example}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{inst.context}</p>
                            {inst.metadata && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {inst.metadata.artista} - {inst.metadata.musica}
                              </p>
                            )}
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="thought" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribuição de Apresentação de Pensamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={thoughtChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="hsl(var(--secondary))" name="Ocorrências" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Instâncias de Pensamento</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto space-y-2">
                      {profile.instances
                        .filter(inst => inst.type === 'thought')
                        .slice(0, 20)
                        .map((inst, idx) => (
                          <div key={idx} className="p-3 border rounded">
                            <div className="flex items-start gap-2 mb-2">
                              <Badge variant="secondary">{inst.category}</Badge>
                              <span className="text-sm font-medium">{inst.example}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{inst.context}</p>
                            {inst.metadata && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {inst.metadata.artista} - {inst.metadata.musica}
                              </p>
                            )}
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </TabsContent>
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
                  "Clique em \"Analisar Corpus\" para detectar apresentação de fala e pensamento"
                )}
              </div>
            )
          )}
          {profile && (
            <div className="space-y-4 mt-4">
              <AnalysisSuggestionsCard framework={speechThoughtTheory} compact />
              <BlauNunesConsultant framework={speechThoughtTheory} analysisResults={profile} compact />
            </div>
          )}
        </CardContent>
      </Card>
      <TheoryDetailModal open={showTheoryModal} onClose={() => setShowTheoryModal(false)} framework={speechThoughtTheory} />
    </div>
  );
}
