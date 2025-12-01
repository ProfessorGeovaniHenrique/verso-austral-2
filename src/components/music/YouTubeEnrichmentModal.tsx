/**
 * Modal para enriquecimento de YouTube com controle de quantidade
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Youtube, AlertCircle, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { useYouTubeEnrichment } from '@/hooks/useYouTubeEnrichment';
import { supabase } from '@/integrations/supabase/client';

interface YouTubeEnrichmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingSongs: any[];
  onComplete: () => void;
}

export function YouTubeEnrichmentModal({
  open,
  onOpenChange,
  pendingSongs,
  onComplete
}: YouTubeEnrichmentModalProps) {
  const { enrichYouTubeBatch, batchProgress } = useYouTubeEnrichment();
  const [limit, setLimit] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const isCancelledRef = useRef(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    used: number;
    remaining: number;
    percentage: number;
  } | null>(null);
  const [results, setResults] = useState<{
    success: number;
    notFound: number;
    error: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadQuotaInfo();
      setResults(null);
      setIsProcessing(false);
      isCancelledRef.current = false;
    }
  }, [open]);

  const loadQuotaInfo = async () => {
    try {
      const { data, error } = await supabase.rpc('get_youtube_quota_usage');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setQuotaInfo({
          used: data[0].queries_used || 0,
          remaining: data[0].queries_remaining || 10000,
          percentage: data[0].usage_percentage || 0
        });
      }
    } catch (error) {
      console.error('[YouTubeEnrichmentModal] Error loading quota:', error);
    }
  };

  const handleStartEnrichment = async () => {
    if (pendingSongs.length === 0) return;
    
    setIsProcessing(true);
    setResults(null);
    isCancelledRef.current = false;
    
    try {
      const songIds = pendingSongs.map(s => s.id);
      const batchResults = await enrichYouTubeBatch(songIds, limit, isCancelledRef);
      
      // Se foi cancelado, não processar resultados
      if (isCancelledRef.current) {
        setIsProcessing(false);
        return;
      }
      
      setResults(batchResults);
      
      // Atualizar quota info
      await loadQuotaInfo();
      
      // Aguardar um pouco antes de fechar
      setTimeout(() => {
        onComplete();
        onOpenChange(false);
      }, 3000);
      
    } catch (error) {
      console.error('[YouTubeEnrichmentModal] Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsProcessing(false);
  };

  const canProcess = pendingSongs.length > 0 && limit > 0 && limit <= pendingSongs.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Enriquecer com YouTube
          </DialogTitle>
          <DialogDescription>
            {pendingSongs.length} {pendingSongs.length === 1 ? 'música sem' : 'músicas sem'} link do YouTube
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quota Info */}
          {quotaInfo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uso da API YouTube hoje:</span>
                    <span className="font-medium">{quotaInfo.used}/10.000</span>
                  </div>
                  <Progress value={quotaInfo.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Restam {quotaInfo.remaining.toLocaleString()} consultas hoje
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Input de quantidade */}
          {!isProcessing && !results && (
            <div className="space-y-2">
              <Label htmlFor="limit">Quantidade a processar</Label>
              <Input
                id="limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                min={1}
                max={pendingSongs.length}
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ Cada consulta conta para o limite diário de 10.000 da API do YouTube
              </p>
            </div>
          )}

          {/* Progress */}
          {isProcessing && batchProgress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Processando...</span>
                <span className="font-medium">
                  {batchProgress.current}/{batchProgress.total}
                </span>
              </div>
              <Progress 
                value={(batchProgress.current / batchProgress.total) * 100} 
                className="h-2"
              />
              {batchProgress.currentSongId && (
                <p className="text-xs text-muted-foreground">
                  ID: {batchProgress.currentSongId}
                </p>
              )}
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{results.success}</p>
                <p className="text-xs text-muted-foreground">Encontrados</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-center">
                <AlertCircle className="h-5 w-5 mx-auto mb-1 text-yellow-600 dark:text-yellow-400" />
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{results.notFound}</p>
                <p className="text-xs text-muted-foreground">Não encontrados</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
                <XCircle className="h-5 w-5 mx-auto mb-1 text-red-600 dark:text-red-400" />
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{results.error}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!isProcessing && !results && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleStartEnrichment}
                disabled={!canProcess}
              >
                <Youtube className="h-4 w-4 mr-2" />
                Iniciar ({limit} {limit === 1 ? 'música' : 'músicas'})
              </Button>
            </>
          )}
          
          {isProcessing && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </Button>
            </>
          )}
          
          {results && (
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
