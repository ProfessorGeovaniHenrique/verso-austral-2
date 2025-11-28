import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Search, Trash2 } from "lucide-react";
import { useDeduplication } from "@/hooks/useDeduplication";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export function DuplicateMonitoringCard() {
  const { analyze, execute, isAnalyzing, isExecuting, result, clearResult } = useDeduplication();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleAnalyze = async () => {
    clearResult();
    await analyze();
  };

  const handleExecute = async () => {
    setShowConfirmDialog(false);
    await execute();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Deduplicação de Músicas
        </CardTitle>
        <CardDescription>
          Identifique e consolide músicas duplicadas preservando todos os metadados de álbuns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || isExecuting}
            variant="outline"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analisar Duplicatas
              </>
            )}
          </Button>

          {result && !result.dryRun && (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isAnalyzing || isExecuting}
              variant="destructive"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Executar Deduplicação
                </>
              )}
            </Button>
          )}
        </div>

        {/* Analysis Results */}
        {result && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
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

            {result.dryRun && result.duplicatesRemoved > 0 && (
              <Button
                onClick={() => setShowConfirmDialog(true)}
                variant="destructive"
                className="w-full"
              >
                Executar Deduplicação
              </Button>
            )}
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Deduplicação</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá consolidar {result?.duplicatesRemoved} registros duplicados em {result?.consolidated} músicas únicas.
                <br /><br />
                <strong>Metadados preservados:</strong>
                <ul className="list-disc list-inside mt-2">
                  <li>{result?.releasesPreserved} releases serão armazenados em JSONB</li>
                  <li>Compositor, letra, YouTube URL serão mesclados</li>
                  <li>Ano de lançamento será o mais antigo</li>
                  <li>Constraint UNIQUE será adicionada</li>
                </ul>
                <br />
                Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleExecute}>
                Executar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
