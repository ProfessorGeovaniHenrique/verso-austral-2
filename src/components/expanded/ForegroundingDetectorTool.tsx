import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Info, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { CrossCorpusSelectorWithRatio, CrossCorpusSelection } from "@/components/corpus/CrossCorpusSelectorWithRatio";
import { SignificanceIndicator } from "@/components/visualization/SignificanceIndicator";
import { analyzeForegrounding, exportForegroundingToCSV, ForegroundingProfile } from "@/services/foregroundingAnalysisService";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8'];

export function ForegroundingDetectorTool() {
  const { loadedCorpus, isLoading: loadingCorpus } = useSubcorpus();
  const [crossSelection, setCrossSelection] = useState<CrossCorpusSelection | null>(null);
  const [profile, setProfile] = useState<ForegroundingProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAnalyze = async () => {
    if (!loadedCorpus) {
      toast.error("Selecione um corpus primeiro");
      return;
    }

    try {
      setIsAnalyzing(true);
      setProgress(20);
      toast.info("Detectando padrões de foregrounding...");
      
      setProgress(60);
      const foregroundingProfile = analyzeForegrounding(loadedCorpus);
      setProfile(foregroundingProfile);
      setProgress(100);
      
      toast.success(`${foregroundingProfile.totalDeviations} desvios detectados!`);
    } catch (error) {
      console.error("Erro ao analisar foregrounding:", error);
      toast.error("Erro ao analisar foregrounding");
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const exportToCSV = () => {
    if (!profile) return;
    
    const csv = exportForegroundingToCSV(profile);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foregrounding_${profile.corpusType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeDistributionData = profile ? [
    { name: 'Desvio Interno', value: profile.internalDeviations },
    { name: 'Desvio Externo', value: profile.externalDeviations },
    { name: 'Paralelismo', value: profile.parallelisms }
  ] : [];

  const categoryDistributionData = profile ? Object.entries(profile.distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([category, count]) => ({
      category,
      count
    })) : [];

  const typeLabels: Record<string, string> = {
    'internal': 'Desvio Interno',
    'external': 'Desvio Externo',
    'parallelism': 'Paralelismo'
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Detector de Foregrounding
          </CardTitle>
          <CardDescription>
            Deautomatização e proeminência estilística (Escola de Praga / Leech & Short 2007)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Detecta desvio interno, desvio externo e paralelismo para identificar padrões proeminentes que chamam atenção do leitor.
            </AlertDescription>
          </Alert>

          <CrossCorpusSelectorWithRatio
            mode="study-only"
            showRatioControl={false}
            onSelectionChange={setCrossSelection}
            availableArtists={[]}
          />

          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !loadedCorpus}>
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analisando..." : "Detectar Foregrounding"}
            </Button>
            {profile && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
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
                    <div className="text-2xl font-bold">{profile.totalDeviations}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-500">{profile.internalDeviations}</div>
                    <div className="text-sm text-muted-foreground">Desvio Interno</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-green-500">{profile.externalDeviations}</div>
                    <div className="text-sm text-muted-foreground">Desvio Externo</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-purple-500">{profile.parallelisms}</div>
                    <div className="text-sm text-muted-foreground">Paralelismo</div>
                  </CardContent>
                </Card>
              </div>

              {/* Score de proeminência */}
              <Card className="border-primary/30">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-primary">
                    {(profile.overallProminenceScore * 100).toFixed(0)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Score Geral de Proeminência</p>
                </CardContent>
              </Card>

              {/* Gráficos */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={typeDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {typeDistributionData.map((entry, index) => (
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
                    <CardTitle className="text-base">Top 10 Categorias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryDistributionData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="category" type="category" width={150} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Padrões proeminentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Padrões Mais Proeminentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {profile.prominentPatterns.slice(0, 10).map((pattern, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{pattern.pattern}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{pattern.frequency}x</Badge>
                          <Badge variant="outline">
                            {(pattern.avgProminence * 100).toFixed(0)}% proeminência
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Instâncias detalhadas */}
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="internal">Interno</TabsTrigger>
                  <TabsTrigger value="external">Externo</TabsTrigger>
                  <TabsTrigger value="parallelism">Paralelismo</TabsTrigger>
                </TabsList>

                {['all', 'internal', 'external', 'parallelism'].map(type => (
                  <TabsContent key={type} value={type} className="space-y-2 mt-4">
                    <div className="max-h-[500px] overflow-y-auto space-y-2">
                      {profile.instances
                        .filter(inst => type === 'all' || inst.type === type)
                        .slice(0, 30)
                        .map((inst, idx) => (
                          <Card key={idx}>
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                <Badge>{inst.category}</Badge>
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm font-medium">{inst.description}</p>
                                  <p className="text-sm text-muted-foreground">{inst.example}</p>
                                  {inst.metadata && (
                                    <p className="text-xs text-muted-foreground">
                                      {inst.metadata.artista} - {inst.metadata.musica}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className="shrink-0">
                                  {(inst.prominenceScore * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          ) : (
            !isAnalyzing && (
              <div className="text-center text-muted-foreground py-8">
                Selecione um corpus e clique em "Detectar Foregrounding" para identificar padrões proeminentes
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
