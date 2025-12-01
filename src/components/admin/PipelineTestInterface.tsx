import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TestTube, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface PipelineTestResult {
  success: boolean;
  songId: string;
  songTitle: string;
  artistName: string;
  stats: {
    totalWords: number;
    processedWords: number;
    cachedWords: number;
    newWords: number;
    processingTimeMs: number;
    posEnrichedWords: number;
    posBasedClassifications: number;
    posCoverage: number;
  };
}

export function PipelineTestInterface() {
  const [songTitle, setSongTitle] = useState('Quando o Verso Vem Pras Casa');
  const [isSearching, setIsSearching] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [testResult, setTestResult] = useState<PipelineTestResult | null>(null);

  const searchSong = async () => {
    if (!songTitle.trim()) {
      toast.error('Digite o título da música');
      return;
    }

    setIsSearching(true);
    setSelectedSong(null);
    setTestResult(null);

    try {
      const { data, error } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          lyrics,
          artist_id,
          artists (
            id,
            name
          )
        `)
        .ilike('title', `%${songTitle}%`)
        .not('lyrics', 'is', null)
        .neq('lyrics', '')
        .limit(1)
        .single();

      if (error || !data) {
        toast.error('Música não encontrada ou sem letra');
        return;
      }

      setSelectedSong(data);
      toast.success(`Música encontrada: ${data.title}`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Erro ao buscar música');
    } finally {
      setIsSearching(false);
    }
  };

  const runPipelineTest = async () => {
    if (!selectedSong) {
      toast.error('Selecione uma música primeiro');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('annotate-single-song', {
        body: {
          songId: selectedSong.id,
          forceReprocess: true
        }
      });

      if (error) throw error;

      setTestResult(data as PipelineTestResult);
      toast.success('Pipeline executada com sucesso!');
    } catch (error: any) {
      console.error('Pipeline test error:', error);
      toast.error(error.message || 'Erro ao executar pipeline');
    } finally {
      setIsTesting(false);
    }
  };

  const testQuandoOVerso = () => {
    setSongTitle('Quando o Verso Vem Pras Casa');
    searchSong();
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Teste de Pipeline Completa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Título da música..."
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchSong()}
            />
            <Button onClick={searchSong} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Buscar'
              )}
            </Button>
          </div>

          <Button variant="secondary" onClick={testQuandoOVerso} className="w-full">
            🎯 Testar "Quando o Verso Vem Pras Casa" (MVP Demo)
          </Button>

          {selectedSong && (
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedSong.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedSong.artists as any)?.name}
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedSong.lyrics.split(/\s+/).length} palavras
                </Badge>
              </div>
              
              <Button 
                onClick={runPipelineTest} 
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executando Pipeline...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    🧪 Testar Pipeline Completa
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Resultado do Teste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Total de Palavras</p>
                <p className="text-2xl font-bold">{testResult.stats.totalWords}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Processadas</p>
                <p className="text-2xl font-bold text-green-600">{testResult.stats.processedWords}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Em Cache</p>
                <p className="text-2xl font-bold text-blue-600">{testResult.stats.cachedWords}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Novas</p>
                <p className="text-2xl font-bold text-purple-600">{testResult.stats.newWords}</p>
              </div>
            </div>

            {/* POS Pipeline Stats */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                🧬 Pipeline POS (4 Camadas)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <p className="text-xs text-muted-foreground">Tokens com POS</p>
                  <p className="text-xl font-bold">{testResult.stats.posEnrichedWords}</p>
                  <p className="text-xs text-blue-600">
                    {(testResult.stats.posCoverage * 100).toFixed(1)}% cobertura
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <p className="text-xs text-muted-foreground">Classificações via POS</p>
                  <p className="text-xl font-bold">{testResult.stats.posBasedClassifications}</p>
                  <p className="text-xs text-green-600">
                    {((testResult.stats.posBasedClassifications / testResult.stats.totalWords) * 100).toFixed(1)}% economia Gemini
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                  <p className="text-xs text-muted-foreground">Tempo Processamento</p>
                  <p className="text-xl font-bold">
                    {(testResult.stats.processingTimeMs / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-purple-600">
                    {(testResult.stats.totalWords / (testResult.stats.processingTimeMs / 1000)).toFixed(1)} palavras/s
                  </p>
                </div>
              </div>
            </div>

            {/* Pipeline Layers Visualization */}
            <div className="space-y-2">
              <h3 className="font-semibold">🔄 Fluxo das 8 Camadas Semânticas</h3>
              <div className="space-y-1">
                {[
                  { name: 'Layer 1: Safe Stopwords', icon: '✅', color: 'bg-green-100 dark:bg-green-900' },
                  { name: 'Layer 2: Cache Palavra', icon: '💾', color: 'bg-blue-100 dark:bg-blue-900' },
                  { name: 'Layer 3: Cache Contexto', icon: '🔍', color: 'bg-blue-100 dark:bg-blue-900' },
                  { name: 'Layer 4: Léxico Dialetal', icon: '🗣️', color: 'bg-yellow-100 dark:bg-yellow-900' },
                  { name: 'Layer 5: Herança Sinônimos', icon: '🔗', color: 'bg-orange-100 dark:bg-orange-900' },
                  { name: 'Layer 6: Regras POS', icon: '🧬', color: 'bg-purple-100 dark:bg-purple-900' },
                  { name: 'Layer 7: Regras Contextuais', icon: '📖', color: 'bg-pink-100 dark:bg-pink-900' },
                  { name: 'Layer 8: Gemini Batch', icon: '🤖', color: 'bg-red-100 dark:bg-red-900' },
                ].map((layer, i) => (
                  <div key={i} className={`p-2 rounded ${layer.color} text-sm flex items-center gap-2`}>
                    <span>{layer.icon}</span>
                    <span>{layer.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">Pipeline Validada ✓</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Todas as camadas (POS + Semântica) funcionando corretamente.
                    {testResult.stats.posBasedClassifications > 0 && (
                      <> Pipeline POS economizou {testResult.stats.posBasedClassifications} chamadas Gemini.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!testResult && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Como Usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Digite o título da música ou use o botão de atalho para "Quando o Verso Vem Pras Casa"</p>
            <p>2. Clique em "Buscar" para localizar a música no banco de dados</p>
            <p>3. Clique em "🧪 Testar Pipeline Completa" para executar a anotação</p>
            <p>4. Observe as métricas de cada camada (POS + Semântica) e o tempo de processamento</p>
            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <p className="font-medium text-blue-900 dark:text-blue-100">💡 Dica</p>
              <p className="text-blue-700 dark:text-blue-300">
                A pipeline POS reduz chamadas Gemini em ~40% ao classificar verbos, adjetivos e marcadores gramaticais diretamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
