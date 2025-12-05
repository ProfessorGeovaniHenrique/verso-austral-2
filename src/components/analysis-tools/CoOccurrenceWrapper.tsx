/**
 * 🕸️ CO-OCCURRENCE NETWORK WRAPPER
 * Wrapper para integrar CoOccurrenceNetworkVisualization com AnalysisToolsContext
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Network, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { CoOccurrenceNetworkVisualization } from '@/components/mvp/tools/CoOccurrenceNetwork';
import { analyzeCoOccurrences, buildCoOccurrenceNetwork, CoOccurrence, CoOccurrenceNetwork } from '@/services/coOccurrenceService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function CoOccurrenceWrapper() {
  const { studyCorpus } = useAnalysisTools();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [network, setNetwork] = useState<CoOccurrenceNetwork | null>(null);
  const [coOccurrences, setCoOccurrences] = useState<CoOccurrence[]>([]);

  // Obter o tipo de corpus selecionado
  const corpusType = studyCorpus?.type === 'platform' ? studyCorpus.platformCorpus : null;

  // Buscar letras do corpus selecionado
  const { data: lyrics, isLoading } = useQuery({
    queryKey: ['corpus-lyrics-cooc', corpusType],
    queryFn: async () => {
      if (!corpusType) return [];

      // Buscar corpus_id
      const { data: corpus } = await supabase
        .from('corpora')
        .select('id')
        .eq('normalized_name', corpusType)
        .single();

      if (!corpus) return [];

      // Buscar letras das músicas
      const { data: songs } = await supabase
        .from('songs')
        .select('lyrics')
        .eq('corpus_id', corpus.id)
        .not('lyrics', 'is', null)
        .limit(100);

      return songs?.map(s => s.lyrics).filter(Boolean) || [];
    },
    enabled: !!corpusType
  });

  const handleAnalyze = () => {
    if (!lyrics || lyrics.length === 0) return;

    setIsAnalyzing(true);

    // Processar em timeout para não bloquear UI
    setTimeout(() => {
      const coOcc = analyzeCoOccurrences(lyrics as string[], 5, 2);
      const net = buildCoOccurrenceNetwork(coOcc, 2);

      setCoOccurrences(coOcc);
      setNetwork(net);
      setIsAnalyzing(false);
    }, 100);
  };

  const hasCorpus = !!studyCorpus;
  const hasData = network && coOccurrences.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Rede de Co-ocorrência
              </CardTitle>
              <CardDescription>
                Palavras que frequentemente aparecem juntas no corpus
              </CardDescription>
            </div>
            {hasCorpus && !hasData && (
              <Button 
                onClick={handleAnalyze} 
                disabled={isLoading || isAnalyzing || !lyrics?.length}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  'Analisar Co-ocorrências'
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasCorpus ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Network className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Selecione um corpus</p>
              <p className="text-sm">Use o seletor acima para escolher um corpus de estudo</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Loader2 className="h-12 w-12 mb-4 animate-spin" />
              <p>Carregando corpus...</p>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Network className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Pronto para análise</p>
              <p className="text-sm mb-4">
                {lyrics?.length || 0} textos disponíveis
              </p>
              <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analisando...' : 'Iniciar Análise'}
              </Button>
            </div>
          ) : (
            <CoOccurrenceNetworkVisualization 
              network={network} 
              coOccurrences={coOccurrences} 
            />
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Interpretação:</strong> Nós maiores indicam palavras mais frequentes.
          Linhas mais espessas mostram co-ocorrências mais fortes.
          Clique em um nó para ver suas conexões detalhadas.
        </AlertDescription>
      </Alert>
    </div>
  );
}
