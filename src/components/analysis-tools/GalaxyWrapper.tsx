/**
 * 🌌 GALAXY WRAPPER
 * Wrapper para integrar GalaxyVisualization com AnalysisToolsContext
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { GalaxyVisualization } from '@/components/v3/GalaxyVisualization';

export function GalaxyWrapper() {
  const { studyCorpus } = useAnalysisTools();

  const hasCorpus = !!studyCorpus;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Galáxia de Domínios Semânticos
          </CardTitle>
          <CardDescription>
            Domínios como estrelas centrais, palavras orbitando como satélites
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasCorpus ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Sparkles className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Selecione um corpus</p>
              <p className="text-sm">Use o seletor acima para escolher um corpus de estudo</p>
            </div>
          ) : (
            <div className="h-[700px] relative rounded-lg overflow-hidden border bg-background">
              <GalaxyVisualization />
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Interação:</strong> Arraste para mover a visualização, use a roda do mouse para zoom.
          Clique em uma palavra para ver detalhes no console lateral.
          O tamanho das palavras representa sua frequência no corpus.
        </AlertDescription>
      </Alert>
    </div>
  );
}
