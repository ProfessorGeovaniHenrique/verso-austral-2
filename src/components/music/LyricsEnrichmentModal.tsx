/**
 * LyricsEnrichmentModal - Modal para análise e enriquecimento de letras
 * Estratégia 2 camadas: Letras.mus.br + Web Search (sem geração IA)
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Music,
  Globe,
} from 'lucide-react';
import { useLyricsEnrichment, LyricsAnalysis, LyricsEnrichmentResult } from '@/hooks/useLyricsEnrichment';

type CorpusType = 'gaucho' | 'sertanejo' | 'nordestino' | null;

interface LyricsEnrichmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  artistName: string;
  corpusType?: CorpusType;
  onComplete?: () => void;
}

// Configuração de fontes por corpus
const CORPUS_SOURCES = {
  gaucho: [
    {
      badge: '1º',
      name: 'Música Tradicionalista',
      description: 'Especializado em música gaúcha • Link de atribuição',
      colorClass: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900',
      iconColorClass: 'text-emerald-600',
      isPrimary: true
    },
    {
      badge: '2º',
      name: 'Letras.mus.br',
      description: 'Maior acervo brasileiro • Fallback',
      colorClass: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
      iconColorClass: 'text-blue-600',
      isPrimary: false
    }
  ],
  default: [
    {
      badge: '1º',
      name: 'Letras.mus.br',
      description: 'Maior acervo brasileiro • Link de atribuição incluído',
      colorClass: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
      iconColorClass: 'text-green-600',
      isPrimary: true
    },
    {
      badge: '2º',
      name: 'Pesquisa Web (IA)',
      description: 'Busca em sites oficiais • Não gera letras',
      colorClass: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
      iconColorClass: 'text-blue-600',
      isPrimary: false
    }
  ]
};

export function LyricsEnrichmentModal({
  open,
  onOpenChange,
  artistId,
  artistName,
  corpusType,
  onComplete
}: LyricsEnrichmentModalProps) {
  // Selecionar fontes baseado no corpus
  const sources = corpusType === 'gaucho' ? CORPUS_SOURCES.gaucho : CORPUS_SOURCES.default;
  const {
    analyzeArtist,
    analysisResult,
    isAnalyzing,
    enrichArtist,
    progress,
    isEnriching,
    reset
  } = useLyricsEnrichment();

  const [hasStartedEnrichment, setHasStartedEnrichment] = useState(false);

  // Analyze on open
  useEffect(() => {
    if (open && artistId) {
      reset();
      setHasStartedEnrichment(false);
      analyzeArtist(artistId);
    }
  }, [open, artistId, analyzeArtist, reset]);

  const handleStartEnrichment = async () => {
    setHasStartedEnrichment(true);
    await enrichArtist(artistId, analysisResult?.withoutLyrics || 50);
    onComplete?.();
  };

  const handleClose = () => {
    if (!isEnriching) {
      onOpenChange(false);
    }
  };

  const progressPercent = progress 
    ? (progress.current / progress.total) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Cobertura de Letras
          </DialogTitle>
          <DialogDescription>
            {artistName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading State */}
          {isAnalyzing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Analisando catálogo...</span>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && !hasStartedEnrichment && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{analysisResult.totalSongs}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{analysisResult.withLyrics}</div>
                    <div className="text-xs text-muted-foreground">Com Letras</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-amber-600">{analysisResult.withoutLyrics}</div>
                    <div className="text-xs text-muted-foreground">Sem Letras</div>
                  </CardContent>
                </Card>
              </div>

              {/* Coverage Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Cobertura</span>
                  <span className="font-medium">{analysisResult.coveragePercent.toFixed(1)}%</span>
                </div>
                <Progress value={analysisResult.coveragePercent} className="h-2" />
              </div>

              {/* Sources Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Fontes de Busca</h4>
                
                <div className="space-y-2">
                  {sources.map((source, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-start gap-3 p-2 rounded-lg border ${source.colorClass}`}
                    >
                      <Badge className={source.isPrimary ? "bg-green-500 text-white" : "bg-blue-500 text-white"}>
                        {source.badge}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{source.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {source.description}
                        </div>
                      </div>
                      {source.isPrimary ? (
                        <CheckCircle2 className={`h-4 w-4 ${source.iconColorClass}`} />
                      ) : (
                        <Globe className={`h-4 w-4 ${source.iconColorClass}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Aviso:</strong> Letras só são salvas se houver fonte verificável com URL. 
                  Nenhuma letra é gerada por IA.
                </div>
              </div>

              {/* Action Button */}
              {analysisResult.withoutLyrics > 0 && (
                <Button
                  className="w-full"
                  onClick={handleStartEnrichment}
                  disabled={isEnriching}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar {analysisResult.withoutLyrics} Letras Faltantes
                </Button>
              )}

              {analysisResult.withoutLyrics === 0 && (
                <div className="text-center py-4 text-green-600">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Todas as músicas têm letras!</p>
                </div>
              )}
            </>
          )}

          {/* Enrichment Progress */}
          {hasStartedEnrichment && progress && (
            <>
              <div className="text-center">
                {isEnriching ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                )}
                <p className="mt-2 font-medium">
                  {isEnriching ? 'Buscando letras...' : 'Concluído!'}
                </p>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{progress.current}/{progress.total}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="p-2 rounded bg-green-50 dark:bg-green-950/20">
                  <div className="font-bold text-green-600">{progress.enriched}</div>
                  <div className="text-xs text-muted-foreground">Encontradas</div>
                </div>
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                  <div className="font-bold text-amber-600">{progress.notFound}</div>
                  <div className="text-xs text-muted-foreground">Não encontradas</div>
                </div>
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/20">
                  <div className="font-bold text-red-600">{progress.errors}</div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
              </div>

              {/* Results List */}
              {progress.results.length > 0 && (
                <ScrollArea className="h-48 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {progress.results.map((result, idx) => (
                      <ResultItem key={idx} result={result} />
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Close Button */}
              {!isEnriching && (
                <Button variant="outline" className="w-full" onClick={handleClose}>
                  Fechar
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Result item component
function ResultItem({ result }: { result: LyricsEnrichmentResult }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded text-sm ${
      result.success 
        ? 'bg-green-50 dark:bg-green-950/20' 
        : 'bg-muted/50'
    }`}>
      {result.success ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
      
      <span className="flex-1 truncate">{result.title}</span>
      
      {result.source && (
        <Badge variant="secondary" className="text-xs">
          {result.source === 'letras.mus.br' ? 'Letras' : 'Web'}
        </Badge>
      )}
      
      {result.sourceUrl && (
        <a
          href={result.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}