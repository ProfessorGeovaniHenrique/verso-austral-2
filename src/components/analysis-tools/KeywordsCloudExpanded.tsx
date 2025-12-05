/**
 * ☁️ KEYWORDS CLOUD EXPANDED
 * Versão expandida da nuvem de keywords para a aba de Visualizações
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Cloud, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { KeywordsCloud } from './KeywordsCloud';
import { AnalysisToolsBridge } from './ContextBridge';

export function KeywordsCloudExpanded() {
  const { studyCorpus, referenceCorpus } = useAnalysisTools();

  const hasCorpora = !!studyCorpus && !!referenceCorpus;

  return (
    <AnalysisToolsBridge>
      <div className="space-y-4">
        {!hasCorpora ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Nuvem de Keywords Estatísticas
              </CardTitle>
              <CardDescription>
                Visualização interativa baseada em Log-Likelihood
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                <Cloud className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Configure os corpora</p>
                <p className="text-sm text-center max-w-md">
                  Selecione um corpus de estudo e um corpus de referência acima, 
                  depois gere Keywords na aba "Ferramentas Básicas" para visualizar a nuvem
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <KeywordsCloud className="h-auto" />
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Estatísticas:</strong> O tamanho das palavras é proporcional ao Log-Likelihood (LL).
            <span className="text-[hsl(var(--chart-2))]"> Verde</span> = super-representado no corpus de estudo.
            <span className="text-[hsl(var(--chart-1))]"> Vermelho</span> = sub-representado.
            Clique em uma palavra para ver seu contexto (KWIC).
          </AlertDescription>
        </Alert>
      </div>
    </AnalysisToolsBridge>
  );
}
