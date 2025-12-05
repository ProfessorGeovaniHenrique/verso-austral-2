/**
 * 📊 SYNTACTIC PROFILE TOOL
 * 
 * Análise de estruturas sintáticas, comprimento de sentenças e distribuição de POS.
 * Refatorado para usar cache centralizado do AnalysisToolsContext.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Download, Info, RefreshCw } from "lucide-react";
import { annotatePOSForCorpus } from "@/services/posAnnotationService";
import { calculateSyntacticProfile } from "@/services/syntacticAnalysisService";
import { SyntacticProfile } from "@/data/types/stylistic-analysis.types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { useToolCache } from "@/hooks/useToolCache";
import { useAnalysisTools } from "@/contexts/AnalysisToolsContext";

export function SyntacticProfileTool() {
  const { studyCorpus } = useAnalysisTools();
  const subcorpusContext = useSubcorpus();
  const { loadedCorpus } = subcorpusContext;
  
  // Cache centralizado
  const { 
    cachedData: profile, 
    hasCachedData, 
    isStale,
    cacheTimestamp,
    saveToCache,
    clearCache
  } = useToolCache<SyntacticProfile>('syntactic');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [currentSong, setCurrentSong] = useState<string>('');

  const handleAnalyze = async () => {
    if (!loadedCorpus) {
      toast.error("Nenhum corpus carregado. Selecione um corpus no seletor acima.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setProgress(5);
      setCurrentSong('');
      
      // Callback de progresso real
      const handleProgress = (processed: number, total: number, songName: string) => {
        // Progresso de 5% a 85% durante anotação POS
        const percent = 5 + Math.round((processed / total) * 80);
        setProgress(percent);
        setCurrentSong(songName);
      };
      
      const annotatedCorpus = await annotatePOSForCorpus(loadedCorpus, handleProgress);
      
      setProgress(90);
      setCurrentSong('Calculando métricas...');
      
      const syntacticProfile = calculateSyntacticProfile(annotatedCorpus);
      
      // R-1.3: Validar dados antes de salvar no cache
      const hasValidData = syntacticProfile.averageSentenceLength > 0 || 
                           Object.keys(syntacticProfile.posDistribution).length > 0;
      
      if (!hasValidData) {
        toast.error("Análise retornou dados vazios. Verifique se o corpus possui letras.");
        console.warn('[SyntacticProfile] Dados vazios não foram salvos no cache');
        return;
      }
      
      // Salvar no cache centralizado apenas se dados válidos
      saveToCache(syntacticProfile);
      setProgress(100);
      
      toast.success(`Perfil sintático gerado: ${Object.keys(syntacticProfile.posDistribution).length} categorias POS`);
    } catch (error) {
      console.error("Erro ao gerar perfil sintático:", error);
      toast.error("Erro ao gerar perfil sintático");
    } finally {
      setIsAnalyzing(false);
      setCurrentSong('');
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
    a.download = `perfil_sintatico_${profile.corpusType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Formatar timestamp do cache
  const cacheTime = cacheTimestamp 
    ? new Date(cacheTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Perfil Sintático</CardTitle>
              <CardDescription>
                Análise de estruturas sintáticas, comprimento de sentenças e distribuição de POS
              </CardDescription>
            </div>
            {hasCachedData && cacheTime && (
              <Badge variant="secondary" className="gap-1">
                Cache: {cacheTime}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aviso se não há corpus selecionado */}
          {!studyCorpus && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Selecione um corpus de estudo no seletor acima para iniciar a análise.
              </AlertDescription>
            </Alert>
          )}

          {/* Aviso de cache desatualizado */}
          {isStale && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <RefreshCw className="h-4 w-4" />
              <AlertDescription>
                O cache está desatualizado. O corpus foi alterado desde a última análise.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !studyCorpus}
            >
              <Play className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Processando..." : hasCachedData ? "Reanalisar" : "Analisar Corpus"}
            </Button>
            {profile && (
              <>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button variant="ghost" onClick={clearCache}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Limpar Cache
                </Button>
              </>
            )}
          </div>

          {isAnalyzing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {progress}% concluído
                {currentSong && <span className="block text-xs mt-1">Processando: {currentSong}</span>}
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
            !isAnalyzing && studyCorpus && (
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
