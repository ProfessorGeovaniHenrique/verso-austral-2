import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock,
  Zap,
  Database,
  Globe,
  Brain,
  AlertTriangle
} from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'success';
  message: string;
  layer?: string;
  duration?: number;
}

interface EnrichmentLiveLogProps {
  songId: string;
  songTitle: string;
  isProcessing: boolean;
}

export function EnrichmentLiveLog({ songId, songTitle, isProcessing }: EnrichmentLiveLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isProcessing) return;

    // Simular logs em tempo real baseados nos console.logs do backend
    // Em produção, isso seria substituído por um SSE (Server-Sent Events) ou WebSocket
    const mockLogs: LogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `🎵 Iniciando enriquecimento: "${songTitle}"`,
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '🔄 Pipeline de 6 camadas: GPT-5 → Gemini fallback',
      },
    ];

    setLogs(mockLogs);

    // Simular recebimento de logs
    const interval = setInterval(() => {
      if (!isProcessing) {
        clearInterval(interval);
        return;
      }

      const layerLogs: LogEntry[] = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '🔍 Camada 1: YouTube API',
          layer: 'youtube',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '⏱️ YouTube Response: 200 in 450ms',
          layer: 'youtube',
          duration: 450,
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '🔍 Camada 2: GPT-5 Knowledge Base',
          layer: 'gpt5',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '📝 Raw Response Text (500 chars)',
          layer: 'gpt5',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'success',
          message: '✅ Direct JSON parse successful',
          layer: 'gpt5',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '🔍 Camada 3: Google Search Grounding',
          layer: 'google',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'success',
          message: '✅ JSON extracted from text successfully',
          layer: 'google',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '🔄 Cross-validation: 2 sources | confidence: 85%',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'success',
          message: '💾 Metadados salvos no banco de dados',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'success',
          message: '✅ Enriquecimento concluído com sucesso!',
        },
      ];

      // Adicionar logs gradualmente
      setLogs((prev) => {
        if (prev.length < mockLogs.length + layerLogs.length) {
          const nextLog = layerLogs[prev.length - mockLogs.length];
          if (nextLog) {
            return [...prev, nextLog];
          }
        }
        return prev;
      });
    }, 800);

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isProcessing, songTitle]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-600" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-600" />;
      default:
        return <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />;
    }
  };

  const getLayerBadge = (layer?: string) => {
    if (!layer) return null;

    const layerConfig: Record<string, { icon: any; color: string; label: string }> = {
      youtube: { icon: Globe, color: 'bg-red-500/10 text-red-700', label: 'YouTube' },
      gpt5: { icon: Brain, color: 'bg-purple-500/10 text-purple-700', label: 'GPT-5' },
      google: { icon: Zap, color: 'bg-blue-500/10 text-blue-700', label: 'Google' },
      gemini: { icon: Brain, color: 'bg-orange-500/10 text-orange-700', label: 'Gemini' },
      cache: { icon: Database, color: 'bg-green-500/10 text-green-700', label: 'Cache' },
    };

    const config = layerConfig[layer];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`text-xs ${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (!isProcessing && logs.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4 border-primary/20">
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span className="text-sm font-medium">Log de Enriquecimento</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {logs.length} eventos
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[300px]" ref={scrollRef}>
        <div className="p-4 space-y-2">
          {logs.map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-xs font-mono p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">{getIcon(log.level)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                  </span>
                  {getLayerBadge(log.layer)}
                  {log.duration && (
                    <Badge variant="outline" className="text-xs bg-slate-500/10 text-slate-700 border-0">
                      <Clock className="h-3 w-3 mr-1" />
                      {log.duration}ms
                    </Badge>
                  )}
                </div>
                <p className={`
                  ${log.level === 'error' ? 'text-red-600' : ''}
                  ${log.level === 'success' ? 'text-green-600' : ''}
                  ${log.level === 'warning' ? 'text-yellow-600' : ''}
                  ${log.level === 'info' ? 'text-foreground' : ''}
                `}>
                  {log.message}
                </p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Aguardando próxima camada...</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
