/**
 * 🧪 Enrichment Validation Panel
 * UI component para executar testes de validação do enrichment pipeline
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Loader2, Play, RefreshCw } from 'lucide-react';
import { 
  runAllEnrichmentValidations, 
  quickEnrichmentStatusCheck,
  ValidationResult 
} from '@/tests/enrichment-validation.test';
import { supabase } from '@/integrations/supabase/client';

export function EnrichmentValidationPanel() {
  const [testSongId, setTestSongId] = useState('');
  const [testArtistId, setTestArtistId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [quickCheckResults, setQuickCheckResults] = useState<string>('');

  const handleAutoDetect = async () => {
    setIsRunning(true);
    try {
      const { data: song, error: songError } = await supabase
        .from('songs')
        .select('id, artist_id')
        .eq('status', 'pending')
        .limit(1)
        .single();

      if (songError || !song) {
        alert('Nenhuma música pendente encontrada. Importe músicas primeiro.');
        return;
      }

      setTestSongId(song.id);
      setTestArtistId(song.artist_id);
      
      alert(`✅ IDs detectados automaticamente!\nSong ID: ${song.id}\nArtist ID: ${song.artist_id}`);
    } catch (error) {
      console.error('Error auto-detecting IDs:', error);
      alert('Erro ao buscar IDs automaticamente');
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetSong = async () => {
    if (!testSongId) {
      alert('Por favor, preencha o Song ID primeiro');
      return;
    }

    const confirmReset = confirm(
      '⚠️ Isso resetará COMPLETAMENTE a música e biografia do artista.\n\n' +
      'Todos os dados de enrichment serão apagados:\n' +
      '• Composer, Release Year, YouTube URL\n' +
      '• Confidence Score → 0\n' +
      '• Status → pending\n' +
      '• Biografia do artista\n\n' +
      'Confirmar reset?'
    );

    if (!confirmReset) return;

    setIsRunning(true);
    try {
      // Reset song data
      const { error: songError } = await supabase
        .from('songs')
        .update({
          composer: null,
          release_year: null,
          youtube_url: null,
          enrichment_source: null,
          confidence_score: 0,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', testSongId);

      if (songError) throw songError;

      // Reset artist biography (se testArtistId estiver preenchido)
      if (testArtistId) {
        const { error: artistError } = await supabase
          .from('artists')
          .update({
            biography: null,
            biography_source: null,
            biography_updated_at: null
          })
          .eq('id', testArtistId);

        if (artistError) throw artistError;
      }

      alert('✅ Música resetada com sucesso!\n\nAgora você pode executar os testes novamente.');
    } catch (error) {
      console.error('Error resetting song:', error);
      alert(`❌ Erro ao resetar música: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunTests = async () => {
    if (!testSongId || !testArtistId) {
      alert('Por favor, preencha ambos os IDs');
      return;
    }

    setIsRunning(true);
    setResults([]);

    try {
      const testResults = await runAllEnrichmentValidations(testSongId, testArtistId);
      setResults(testResults);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleQuickCheck = async () => {
    setIsRunning(true);
    setQuickCheckResults('Carregando...');

    try {
      // Capture console.log output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
        originalLog(...args);
      };

      await quickEnrichmentStatusCheck();

      // Restore console.log
      console.log = originalLog;

      setQuickCheckResults(logs.join('\n'));
    } catch (error) {
      setQuickCheckResults(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Status Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Quick Status Check
          </CardTitle>
          <CardDescription>
            Verifica o estado atual do enrichment no banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleQuickCheck} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Executar Quick Check
              </>
            )}
          </Button>

          {quickCheckResults && (
            <ScrollArea className="h-[300px] w-full rounded border bg-muted/50 p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {quickCheckResults}
              </pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Full Validation Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Full Validation Suite
          </CardTitle>
          <CardDescription>
            Executa testes completos de persistência e UI updates (4 testes)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleAutoDetect} 
            disabled={isRunning}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            🔍 Auto-detectar IDs de Teste
          </Button>

          <Button 
            onClick={handleResetSong} 
            disabled={isRunning || !testSongId}
            variant="destructive"
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            🔄 Reset Música para Testes
          </Button>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Song ID para teste:</label>
              <Input
                placeholder="UUID da música"
                value={testSongId}
                onChange={(e) => setTestSongId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Artist ID para teste:</label>
              <Input
                placeholder="UUID do artista"
                value={testArtistId}
                onChange={(e) => setTestArtistId(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Use o botão acima para preencher automaticamente com uma música pendente
          </p>

          <Button 
            onClick={handleRunTests}
            disabled={isRunning || !testSongId || !testArtistId}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando testes...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Executar Todos os Testes
              </>
            )}
          </Button>

          {/* Test Results */}
          {results.length > 0 && (
            <div className="space-y-2 mt-6">
              <h4 className="font-semibold text-sm mb-4">Resultados:</h4>
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.passed 
                      ? 'bg-green-500/10 border-green-500/50' 
                      : 'bg-red-500/10 border-red-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{result.test}</span>
                        <Badge variant={result.passed ? 'default' : 'destructive'}>
                          {result.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {result.details}
                      </p>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-primary hover:underline">
                            Ver dados completos
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h5 className="font-semibold text-sm mb-2">Resumo:</h5>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{results.length}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {results.filter(r => r.passed).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">
                      {results.filter(r => !r.passed).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Como usar:</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>1. <strong>Quick Check:</strong> Verifica estado geral do enrichment sem modificar dados</p>
          <p>2. <strong>Auto-detectar IDs:</strong> Busca automaticamente uma música pendente</p>
          <p>3. <strong>Reset Música:</strong> Apaga todos os dados de enrichment da música selecionada (útil para testes repetidos)</p>
          <p>4. <strong>Full Suite:</strong> Executa 4 testes que chamam edge functions e verificam persistência:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Test 1: Metadata enrichment (composer, year) + database persistence</li>
            <li>Test 2: YouTube enrichment + URL persistence</li>
            <li>Test 3: Artist biography enrichment + database persistence</li>
            <li>Test 4: UI update simulation após enrichment</li>
          </ul>
          <p className="mt-4 text-amber-600">
            ⚠️ <strong>Nota:</strong> Full Suite faz chamadas reais às APIs e pode consumir quota. Use com moderação.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
