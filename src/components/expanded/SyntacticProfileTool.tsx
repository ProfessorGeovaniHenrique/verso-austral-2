import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download } from "lucide-react";
import { annotatePOSForCorpus } from "@/services/posAnnotationService";
import { calculateSyntacticProfile } from "@/services/syntacticAnalysisService";
import { SyntacticProfile } from "@/data/types/stylistic-analysis.types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { UnifiedCorpusSelector } from "@/components/corpus/UnifiedCorpusSelector";
import { useSubcorpus } from "@/contexts/SubcorpusContext";

export function SyntacticProfileTool() {
  const { loadedCorpus } = useSubcorpus();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [profile, setProfile] = useState<SyntacticProfile | null>(null);

  const handleAnalyze = async () => {
    if (!loadedCorpus) {
      toast.error("Nenhum corpus selecionado");
      return;
    }

    try {
      setIsAnalyzing(true);
      setProgress(10);
      toast.info("Processando corpus...");
      
      setProgress(30);
      
      toast.info("Anotando corpus com POS tags...");
      const annotatedCorpus = await annotatePOSForCorpus(loadedCorpus);
      setProgress(70);
      
      toast.info("Calculando perfil sintático...");
      const syntacticProfile = calculateSyntacticProfile(annotatedCorpus);
      setProfile(syntacticProfile);
      setProgress(100);
      
      toast.success("Perfil sintático gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar perfil sintático:", error);
      toast.error("Erro ao gerar perfil sintático");
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const exportToCSV = () => {
    if (!profile) return;

    const csv = [
      "Métrica,Valor",
      `Comprimento Médio de Sentença,${profile.averageSentenceLength.toFixed(2)}`,
      `Desvio Padrão,${profile.sentenceLengthStdDev.toFixed(2)}`,
      `Razão Adj/Noun,${profile.modifierDensity.adjNounRatio.toFixed(2)}`,
      `Razão Adv/Verb,${profile.modifierDensity.advVerbRatio.toFixed(2)}`,
      `Complexidade Sintática,${profile.syntacticComplexity.toFixed(2)}`,
      "",
      "Distribuição de POS,Contagem,Percentual",
      ...Object.entries(profile.posDistribution).map(([pos, count]) =>
        `${pos},${count},${profile.posPercentages[pos].toFixed(2)}%`
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `perfil_sintatico_${loadedCorpus.tipo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Perfil Sintático</CardTitle>
          <CardDescription>
            Análise de estruturas sintáticas, comprimento de sentenças e distribuição de POS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UnifiedCorpusSelector />

          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Processando..." : "Analisar Corpus"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Métricas Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comprimento Médio:</span>
                    <span className="font-medium">{profile.averageSentenceLength.toFixed(2)} palavras</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desvio Padrão:</span>
                    <span className="font-medium">{profile.sentenceLengthStdDev.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Complexidade Sintática:</span>
                    <span className="font-medium">{(profile.syntacticComplexity * 100).toFixed(0)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Densidade de Modificadores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Razão Adj/Noun:</span>
                    <span className="font-medium">{profile.modifierDensity.adjNounRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Razão Adv/Verb:</span>
                    <span className="font-medium">{profile.modifierDensity.advVerbRatio.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Distribuição de POS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {Object.entries(profile.posPercentages)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 12)
                      .map(([pos, percentage]) => (
                        <div key={pos} className="flex justify-between p-2 border rounded">
                          <span className="font-medium">{pos}</span>
                          <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            !isAnalyzing && (
              <div className="text-center text-muted-foreground py-8">
                Clique em "Analisar Corpus" para gerar o perfil sintático
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
