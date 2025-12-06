import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Info, Brain, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { analyzeMindStyle, exportMindStyleToCSV, MindStyleProfile } from "@/services/mindStyleAnalysisService";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { TheoryBriefCard, TheoryDetailModal, AnalysisSuggestionsCard, BlauNunesConsultant } from "@/components/theory";
import { mindStyleTheory } from "@/data/theoretical/stylistic-theory";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export function MindStyleAnalyzerTool() {
  const { loadedCorpus, isLoading: loadingCorpus, isReady } = useSubcorpus();
  const [profile, setProfile] = useState<MindStyleProfile | null>(null);
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
      toast.info("Analisando mind style e transitividade...");
      
      setProgress(60);
      const mindStyleProfile = analyzeMindStyle(loadedCorpus);
      setProfile(mindStyleProfile);
      setProgress(100);
      
      toast.success("Análise de mind style concluída!");
    } catch (error) {
      console.error("Erro ao analisar mind style:", error);
      toast.error("Erro ao analisar mind style");
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const exportToCSV = () => {
    if (!profile) return;
    
    const csv = exportMindStyleToCSV(profile);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mind_style_${profile.corpusType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const transitivityChartData = profile ? Object.entries(profile.transitivityPercentages).map(([type, percentage]) => ({
    name: type,
    value: parseFloat(percentage.toFixed(2))
  })) : [];

  const modalityChartData = profile ? [
    { name: 'Certeza', value: profile.modalityIndicators.certainty },
    { name: 'Incerteza', value: profile.modalityIndicators.uncertainty },
    { name: 'Obrigação', value: profile.modalityIndicators.obligation }
  ] : [];

  const cognitiveStyleLabels: Record<string, string> = {
    'action-oriented': 'Orientado à Ação',
    'perception-oriented': 'Orientado à Percepção',
    'balanced': 'Equilibrado'
  };

  // Removido early return para sempre exibir TheoryBriefCard e botão

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análise de Mind Style
          </CardTitle>
          <CardDescription>
            Transitividade de Halliday, agência e perspectiva cognitiva (Leech & Short 2007, Cap. 6)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TheoryBriefCard framework={mindStyleTheory} onOpenDetail={() => setShowTheoryModal(true)} />
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Analisa padrões linguísticos que revelam a perspectiva cognitiva do texto através de processos verbais, modalidade e dêixis.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !loadedCorpus}>
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analisando..." : "Analisar Mind Style"}
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
              {/* Estilo Cognitivo */}
              <Card className="border-primary/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Badge className="text-base px-4 py-2">
                      {cognitiveStyleLabels[profile.cognitiveStyle]}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">Estilo Cognitivo Dominante</p>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{profile.perceptionVsAction.perceptionVerbs}</div>
                    <div className="text-sm text-muted-foreground">Verbos Percepção</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-500">{profile.perceptionVsAction.actionVerbs}</div>
                    <div className="text-sm text-muted-foreground">Verbos Ação</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-green-500">{profile.perceptionVsAction.ratio.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Razão P/A</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-purple-500">{profile.deixis.personal}</div>
                    <div className="text-sm text-muted-foreground">Dêixis Pessoal</div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribuição de Transitividade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={transitivityChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {transitivityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Indicadores de Modalidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={modalityChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Top processos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Processos de Transitividade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.topProcesses.map((process, idx) => (
                      <div key={idx} className="border-l-4 border-primary pl-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="secondary">{process.type}</Badge>
                          <span className="text-sm font-medium">{process.count} ocorrências</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {process.examples.slice(0, 2).map((ex, i) => (
                            <p key={i}>• {ex}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Padrões de agência */}
              {profile.agencyPatterns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Padrões de Agência</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {profile.agencyPatterns.map((pattern, idx) => (
                      <div key={idx} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{pattern.description}</span>
                          <Badge variant="outline">{pattern.frequency}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pattern.examples.slice(0, 2).map((ex, i) => (
                            <p key={i} className="truncate">• {ex}</p>
                          ))}
                        </div>
                      </div>
                    ))}
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
                  "Clique em \"Analisar Mind Style\" para iniciar análise cognitiva"
                )}
              </div>
            )
          )}
          {profile && (
            <div className="space-y-4 mt-4">
              <AnalysisSuggestionsCard framework={mindStyleTheory} compact />
              <BlauNunesConsultant framework={mindStyleTheory} analysisResults={profile} compact />
            </div>
          )}
        </CardContent>
      </Card>
      <TheoryDetailModal open={showTheoryModal} onClose={() => setShowTheoryModal(false)} framework={mindStyleTheory} />
    </div>
  );
}
