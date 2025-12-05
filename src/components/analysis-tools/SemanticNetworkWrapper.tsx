/**
 * 🕸️ SEMANTIC NETWORK WRAPPER
 * Wrapper para integrar SigmaSemanticNetwork com AnalysisToolsContext
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Network, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { SigmaSemanticNetwork } from '@/components/SigmaSemanticNetwork';

export function SemanticNetworkWrapper() {
  const { studyCorpus } = useAnalysisTools();

  const hasCorpus = !!studyCorpus;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Rede Semântica Interativa
          </CardTitle>
          <CardDescription>
            Visualização em três níveis: Universo → Galáxia → Constelação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasCorpus ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Network className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Selecione um corpus</p>
              <p className="text-sm">Use o seletor acima para escolher um corpus de estudo</p>
            </div>
          ) : (
            <div className="h-[600px] relative rounded-lg overflow-hidden border">
              <SigmaSemanticNetwork />
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Navegação:</strong> Clique no nó central para expandir os domínios. 
          Clique em um domínio para ver suas palavras. Clique em uma palavra para ver KWIC.
          Use os controles de zoom e arraste para navegar.
        </AlertDescription>
      </Alert>
    </div>
  );
}
