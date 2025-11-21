import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Youtube, Sparkles, Search } from 'lucide-react';

interface EnrichmentProgressProps {
  currentSong?: {
    title: string;
    artist: string;
  };
  completed: number;
  total: number;
  averageConfidence: number;
  successRate: number;
  apis: {
    youtube: boolean;
    gemini: boolean;
  };
}

export function EnrichmentProgress({
  currentSong,
  completed,
  total,
  averageConfidence,
  successRate,
  apis,
}: EnrichmentProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getApiIcon = (api: 'youtube' | 'gemini') => {
    const icons = {
      youtube: Youtube,
      gemini: Sparkles,
    };
    const Icon = icons[api];
    const isActive = apis[api];
    
    return (
      <div
        className={`flex items-center gap-1 ${
          isActive ? 'text-green-500' : 'text-muted-foreground'
        }`}
      >
        <Icon className="h-4 w-4" />
        {isActive && <CheckCircle2 className="h-3 w-3" />}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Current Song */}
          {currentSong && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Enriquecendo agora:</p>
              <p className="font-semibold text-lg">{currentSong.title}</p>
              <p className="text-sm text-muted-foreground">{currentSong.artist}</p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Progresso do Enriquecimento</span>
              <span className="text-primary font-semibold">{percentage}%</span>
            </div>
            <Progress value={percentage} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completed} concluídas</span>
              <span>{total - completed} restantes</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Confidence Médio</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getConfidenceColor(averageConfidence)}`}>
                  {Math.round(averageConfidence)}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-500">
                  {Math.round(successRate)}%
                </span>
              </div>
            </div>
          </div>

          {/* APIs Status */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">APIs em Uso</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {getApiIcon('youtube')}
                <span className="text-sm">YouTube</span>
              </div>
              <div className="flex items-center gap-2">
                {getApiIcon('gemini')}
                <span className="text-sm">Gemini</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
