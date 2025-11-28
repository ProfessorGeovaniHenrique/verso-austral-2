import { useEffect, useReducer, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, 
  Pause, 
  Play, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface EnrichmentState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  startTime: number | null;
  logs: Array<{
    songId: string;
    title: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    message?: string;
    timestamp: number;
  }>;
}

type EnrichmentAction =
  | { type: 'START'; total: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'CANCEL' }
  | { type: 'SONG_START'; songId: string; title: string }
  | { type: 'SONG_SUCCESS'; songId: string; message: string }
  | { type: 'SONG_ERROR'; songId: string; error: string }
  | { type: 'COMPLETE' }
  | { type: 'RESTORE'; state: EnrichmentState };

const enrichmentReducer = (state: EnrichmentState, action: EnrichmentAction): EnrichmentState => {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: 'running',
        total: action.total,
        completed: 0,
        succeeded: 0,
        failed: 0,
        startTime: Date.now(),
        logs: [],
      };
    case 'PAUSE':
      return { ...state, status: 'paused' };
    case 'RESUME':
      return { ...state, status: 'running' };
    case 'CANCEL':
      return { ...state, status: 'cancelled' };
    case 'SONG_START':
      return {
        ...state,
        logs: [
          ...state.logs,
          {
            songId: action.songId,
            title: action.title,
            status: 'processing',
            timestamp: Date.now(),
          },
        ],
      };
    case 'SONG_SUCCESS':
      return {
        ...state,
        completed: state.completed + 1,
        succeeded: state.succeeded + 1,
        logs: state.logs.map((log) =>
          log.songId === action.songId
            ? { ...log, status: 'success' as const, message: action.message }
            : log
        ),
      };
    case 'SONG_ERROR':
      return {
        ...state,
        completed: state.completed + 1,
        failed: state.failed + 1,
        logs: state.logs.map((log) =>
          log.songId === action.songId
            ? { ...log, status: 'error' as const, message: action.error }
            : log
        ),
      };
    case 'COMPLETE':
      return { ...state, status: 'completed' };
    case 'RESTORE':
      return action.state;
    default:
      return state;
  }
};

interface EnrichmentBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songs: Array<{ id: string; title: string; artist: string }>;
  onEnrich: (songId: string, forceReenrich?: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
  onComplete: () => void;
}

export function EnrichmentBatchModal({
  open,
  onOpenChange,
  songs,
  onEnrich,
  onComplete,
}: EnrichmentBatchModalProps) {
  const [state, dispatch] = useReducer(enrichmentReducer, {
    status: 'idle',
    total: 0,
    completed: 0,
    succeeded: 0,
    failed: 0,
    startTime: null,
    logs: [],
  });

  const [forceReenrich, setForceReenrich] = useState(false);
  const [clearBeforeEnrich, setClearBeforeEnrich] = useState(false);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Restore state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('enrichment-progress');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.status === 'running' || parsed.status === 'paused') {
          dispatch({ type: 'RESTORE', state: parsed });
        }
      } catch (error) {
        console.error('Failed to restore enrichment state:', error);
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (state.status !== 'idle') {
      localStorage.setItem('enrichment-progress', JSON.stringify(state));
    }
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    if (state.status === 'completed' || state.status === 'cancelled') {
      localStorage.removeItem('enrichment-progress');
    }
  }, [state.status]);

  // Prevent accidental close during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.status === 'running') {
        e.preventDefault();
        e.returnValue = 'Enriquecimento em progresso. Tem certeza que deseja sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.status]);

  // Calculate metrics
  const progress = state.total > 0 ? (state.completed / state.total) * 100 : 0;
  const elapsedMs = state.startTime ? Date.now() - state.startTime : 0;
  const avgTimePerSong = state.completed > 0 ? elapsedMs / state.completed : 0;
  const remainingSongs = state.total - state.completed;
  const estimatedRemainingMs = avgTimePerSong * remainingSongs;
  const speedPerMin = state.completed > 0 ? (state.completed / elapsedMs) * 60000 : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const startEnrichment = async () => {
    dispatch({ type: 'START', total: songs.length });
    isPausedRef.current = false;
    isCancelledRef.current = false;

    // If clearBeforeEnrich is enabled, clear metadata first
    if (clearBeforeEnrich) {
      try {
        dispatch({ 
          type: 'SONG_START',
          songId: 'system-clear',
          title: `🧹 Limpando metadados de ${songs.length} música(s)...`
        });

        const { data, error } = await supabase.functions.invoke('clear-song-metadata', {
          body: { songIds: songs.map(s => s.id) }
        });

        if (error) {
          dispatch({ 
            type: 'SONG_ERROR',
            songId: 'system-clear',
            error: `❌ Erro ao limpar metadados: ${error.message}`
          });
          dispatch({ type: 'COMPLETE' });
          return;
        }

        dispatch({ 
          type: 'SONG_SUCCESS',
          songId: 'system-clear',
          message: `✅ Metadados limpos. Iniciando enriquecimento...`
        });
      } catch (error) {
        console.error('Failed to clear metadata:', error);
        dispatch({ 
          type: 'SONG_ERROR',
          songId: 'system-clear',
          error: `❌ Erro ao limpar metadados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
        dispatch({ type: 'COMPLETE' });
        return;
      }
    }

    // Dynamic import of p-limit
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(3); // Concurrency limit of 3

    const tasks = songs.map((song) =>
      limit(async () => {
        // Check for pause
        while (isPausedRef.current && !isCancelledRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Check for cancel
        if (isCancelledRef.current) {
          return;
        }

        dispatch({ type: 'SONG_START', songId: song.id, title: song.title });

        try {
          const result = await onEnrich(song.id, forceReenrich);

          if (result.success) {
            dispatch({
              type: 'SONG_SUCCESS',
              songId: song.id,
              message: result.message || 'Enriquecido com sucesso',
            });
          } else {
            dispatch({
              type: 'SONG_ERROR',
              songId: song.id,
              error: result.error || 'Erro desconhecido',
            });
          }
        } catch (error: any) {
          dispatch({
            type: 'SONG_ERROR',
            songId: song.id,
            error: error.message || 'Erro ao processar',
          });
        }

        // Rate limit delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
      })
    );

    await Promise.all(tasks);

    if (!isCancelledRef.current) {
      dispatch({ type: 'COMPLETE' });

      // Notify user
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Enriquecimento concluído!', {
          body: `${state.succeeded + 1} músicas enriquecidas com sucesso`,
        });
      }

      onComplete();
    }
  };

  const handleClose = () => {
    if (state.status === 'running') {
      const confirm = window.confirm(
        'O enriquecimento está em progresso. Deseja realmente cancelar?'
      );
      if (!confirm) return;
      
      isCancelledRef.current = true;
      dispatch({ type: 'CANCEL' });
    }
    onOpenChange(false);
  };

  const handlePauseResume = () => {
    if (state.status === 'running') {
      isPausedRef.current = true;
      dispatch({ type: 'PAUSE' });
    } else if (state.status === 'paused') {
      isPausedRef.current = false;
      dispatch({ type: 'RESUME' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enriquecimento em Lote
          </DialogTitle>
          <DialogDescription>
            {state.status === 'idle' && `${songs.length} músicas serão enriquecidas`}
            {state.status !== 'idle' && `Processando ${state.completed}/${state.total} músicas`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Force Re-enrich Option */}
          {state.status === 'idle' && (
            <>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/30">
                <Checkbox 
                  id="force-reenrich"
                  checked={forceReenrich}
                  onCheckedChange={(checked) => setForceReenrich(checked as boolean)}
                />
                <Label 
                  htmlFor="force-reenrich" 
                  className="text-sm cursor-pointer leading-tight"
                >
                  <div className="font-medium">Forçar re-enriquecimento</div>
                  <div className="text-xs text-muted-foreground">
                    Buscar co-autores mesmo em músicas que já possuem compositor
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border border-destructive/30 rounded-md bg-destructive/5">
                <Checkbox 
                  id="clear-before"
                  checked={clearBeforeEnrich}
                  onCheckedChange={(checked) => setClearBeforeEnrich(checked as boolean)}
                />
                <Label 
                  htmlFor="clear-before" 
                  className="text-sm cursor-pointer leading-tight"
                >
                  <div className="font-medium text-destructive">🗑️ Limpar metadados antes</div>
                  <div className="text-xs text-muted-foreground">
                    Remove compositor, ano e confidence existentes para forçar busca completa (recomendado para re-enriquecimento)
                  </div>
                </Label>
              </div>
            </>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Progresso</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Metrics */}
          {state.status !== 'idle' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  Sucesso
                </div>
                <div className="text-2xl font-bold text-green-600">{state.succeeded}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <XCircle className="h-3 w-3" />
                  Falhas
                </div>
                <div className="text-2xl font-bold text-red-600">{state.failed}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Restante
                </div>
                <div className="text-2xl font-bold">
                  {state.status === 'running' ? formatTime(estimatedRemainingMs) : '--'}
                </div>
              </div>
            </div>
          )}

          {/* Speed */}
          {state.status === 'running' && speedPerMin > 0 && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                Velocidade: {speedPerMin.toFixed(1)} músicas/min | 
                Tempo decorrido: {formatTime(elapsedMs)}
              </AlertDescription>
            </Alert>
          )}

          {/* Logs */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Log de Processamento</div>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              <div className="space-y-2">
                {state.logs.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Aguardando início...
                  </div>
                )}
                {state.logs.map((log, index) => (
                  <div
                    key={`${log.songId}-${index}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    {log.status === 'processing' && (
                      <Badge variant="outline" className="bg-blue-500/10 shrink-0">
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse mr-1" />
                        Processando
                      </Badge>
                    )}
                    {log.status === 'success' && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Sucesso
                      </Badge>
                    )}
                    {log.status === 'error' && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-700 shrink-0">
                        <XCircle className="h-3 w-3 mr-1" />
                        Erro
                      </Badge>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{log.title}</div>
                      {log.message && (
                        <div className="text-xs text-muted-foreground">{log.message}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Rate Limit Warning */}
          {state.failed > 3 && state.status === 'running' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Múltiplas falhas detectadas. Pode haver limite de taxa das APIs.
                O sistema está aplicando delays automáticos.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {state.status === 'idle' && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={startEnrichment}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Iniciar Enriquecimento
                </Button>
              </>
            )}
            {(state.status === 'running' || state.status === 'paused') && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handlePauseResume}>
                  {state.status === 'paused' ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Retomar
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </>
                  )}
                </Button>
              </>
            )}
            {(state.status === 'completed' || state.status === 'cancelled') && (
              <Button onClick={handleClose}>Fechar</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
