import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Search } from "lucide-react";
import { useDeduplication } from "@/hooks/useDeduplication";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";

export function DuplicateMonitoringCard() {
  const { analyze, isAnalyzing, result, clearResult } = useDeduplication();

  const handleAnalyze = async () => {
    clearResult();
    await analyze();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Deduplicação de Músicas
        </CardTitle>
        <CardDescription>
          Sistema de prevenção automática de duplicatas via constraint UNIQUE
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Alert */}
        <Alert className="bg-primary/10 border-primary/20">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>Proteção Automática Ativa:</strong> O constraint <code className="bg-muted px-1 py-0.5 rounded text-xs">UNIQUE (normalized_title, artist_id)</code> previne 
            automaticamente a criação de duplicatas. 
            <span className="block mt-1 text-sm">
              ✅ 5.609 duplicatas foram removidas em 28/11/2024 
            </span>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            variant="outline"
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Verificar Estatísticas
              </>
            )}
          </Button>
        </div>

        {/* Analysis Results */}
        {result && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {result.dryRun ? (
                  <>
                    <strong>Modo Análise:</strong> Nenhuma alteração foi feita no banco de dados.
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 inline mr-1" />
                    <strong>Deduplicação concluída com sucesso!</strong>
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Grupos Processados</p>
                <p className="text-2xl font-bold">{result.processed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Músicas Consolidadas</p>
                <p className="text-2xl font-bold">{result.consolidated}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Duplicatas Removidas</p>
                <p className="text-2xl font-bold text-destructive">{result.duplicatesRemoved}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Releases Preservados</p>
                <p className="text-2xl font-bold text-green-600">{result.releasesPreserved}</p>
              </div>
            </div>

            {/* Top Consolidated Songs */}
            {result.topConsolidated.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Top Músicas Consolidadas:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.topConsolidated.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="text-sm truncate flex-1">{item.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.releasesCount} releases</Badge>
                        <Badge variant="outline">{item.yearsSpan}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Dialog - Removido pois deduplicação é automática */}
      </CardContent>
    </Card>
  );
}
