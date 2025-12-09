import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  RefreshCw, 
  Play, 
  Pause, 
  Square, 
  Sparkles, 
  Zap, 
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Layers,
  Target
} from 'lucide-react';
import { useSemanticRefinementJob, RefinementSample } from '@/hooks/useSemanticRefinementJob';

interface Props {
  mgCount: number;
  dsCount: number;
}

export function SemanticRefinementJobCard({ mgCount, dsCount }: Props) {
  const {
    activeJob,
    isLoading,
    progress,
    depthDistribution,
    refinementRate,
    eta,
    startJob,
    pauseJob,
    resumeJob,
    cancelJob,
  } = useSemanticRefinementJob();

  const [selectedDomain, setSelectedDomain] = useState<'MG' | 'DS' | 'all'>('MG');
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'gpt5'>('gemini');
  const [priorityMode, setPriorityMode] = useState<'impact' | 'alphabetical' | 'random'>('impact');

  const totalCount = mgCount + dsCount;

  const getCountForDomain = (domain: 'MG' | 'DS' | 'all') => {
    if (domain === 'MG') return mgCount;
    if (domain === 'DS') return dsCount;
    return totalCount;
  };

  const handleStart = () => {
    const filter = selectedDomain === 'all' ? null : selectedDomain;
    startJob(filter, selectedModel, priorityMode);
  };

  const getStatusBadge = () => {
    if (!activeJob) return null;

    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      processando: { label: 'Processando', variant: 'default' as const, icon: RefreshCw },
      pausado: { label: 'Pausado', variant: 'outline' as const, icon: Pause },
      concluido: { label: 'Concluído', variant: 'default' as const, icon: CheckCircle },
      erro: { label: 'Erro', variant: 'destructive' as const, icon: AlertTriangle },
      cancelado: { label: 'Cancelado', variant: 'secondary' as const, icon: Square },
    };

    const config = statusConfig[activeJob.status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${activeJob.status === 'processando' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  const getDomainLabel = (filter: string | null) => {
    if (filter === 'MG') return 'MG (Marcadores Gramaticais)';
    if (filter === 'DS') return 'DS (Domínios Semânticos)';
    return 'Todos os domínios';
  };

  const getPriorityLabel = (mode: string) => {
    if (mode === 'impact') return 'Por Impacto';
    if (mode === 'alphabetical') return 'Alfabético';
    return 'Aleatório';
  };

  const renderDepthChart = () => {
    const total = depthDistribution.n2 + depthDistribution.n3 + depthDistribution.n4;
    if (total === 0) return null;

    const n2Pct = Math.round((depthDistribution.n2 / total) * 100);
    const n3Pct = Math.round((depthDistribution.n3 / total) * 100);
    const n4Pct = Math.round((depthDistribution.n4 / total) * 100);

    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Distribuição por Nível</div>
        <div className="flex h-4 rounded-full overflow-hidden bg-muted">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="bg-amber-500 transition-all" 
                  style={{ width: `${n2Pct}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>N2: {depthDistribution.n2} ({n2Pct}%)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="bg-orange-500 transition-all" 
                  style={{ width: `${n3Pct}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>N3: {depthDistribution.n3} ({n3Pct}%)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="bg-green-500 transition-all" 
                  style={{ width: `${n4Pct}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>N4: {depthDistribution.n4} ({n4Pct}%)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> N2
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> N3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> N4
          </span>
        </div>
      </div>
    );
  };

  const renderSampleRefinements = (samples: RefinementSample[]) => {
    if (!samples || samples.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Últimos Refinamentos
        </div>
        <div className="space-y-1.5">
          {samples.slice(0, 5).map((sample, i) => (
            <div 
              key={i} 
              className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5"
            >
              <span className="font-medium text-foreground">"{sample.palavra}"</span>
              <span className="text-muted-foreground">{sample.oldCode}</span>
              <ArrowRight className="h-3 w-3 text-green-600" />
              <span className="text-green-600 font-medium">{sample.newCode}</span>
              <Badge variant="outline" className="text-[10px] h-4">
                {(sample.confianca * 100).toFixed(0)}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Refinamento N1→N2+
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Job Display */}
        {activeJob && activeJob.status !== 'concluido' && activeJob.status !== 'cancelado' ? (
          <div className="space-y-4">
            {/* Job Info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{getDomainLabel(activeJob.domain_filter)}</span>
              <span>{activeJob.model === 'gpt5' ? 'GPT-5' : 'Gemini'} • {getPriorityLabel(activeJob.priority_mode || 'impact')}</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{activeJob.processed.toLocaleString()} / {activeJob.total_words.toLocaleString()}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="p-2 bg-muted/50 rounded">
                <div className="font-medium text-green-600">{activeJob.refined.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Refinados</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="font-medium text-amber-600">{refinementRate}%</div>
                <div className="text-xs text-muted-foreground">Taxa</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="font-medium text-red-600">{activeJob.errors}</div>
                <div className="text-xs text-muted-foreground">Erros</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="font-medium">{eta || '-'}</div>
                <div className="text-xs text-muted-foreground">ETA</div>
              </div>
            </div>

            {/* Depth Distribution */}
            {renderDepthChart()}

            {/* Sample Refinements */}
            {renderSampleRefinements(activeJob.sample_refinements || [])}

            {/* Controls */}
            <div className="flex gap-2">
              {activeJob.status === 'processando' ? (
                <Button variant="outline" size="sm" onClick={pauseJob} className="flex-1">
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
              ) : activeJob.status === 'pausado' ? (
                <Button variant="default" size="sm" onClick={resumeJob} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Retomar
                </Button>
              ) : null}
              <Button variant="destructive" size="sm" onClick={cancelJob}>
                <Square className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          /* Start New Job Form */
          <div className="space-y-4">
            {/* Domain Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Domínio a refinar</Label>
              <RadioGroup 
                value={selectedDomain} 
                onValueChange={(v) => setSelectedDomain(v as 'MG' | 'DS' | 'all')}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MG" id="domain-mg" />
                  <Label htmlFor="domain-mg" className="text-sm cursor-pointer">
                    MG ({mgCount.toLocaleString()})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DS" id="domain-ds" />
                  <Label htmlFor="domain-ds" className="text-sm cursor-pointer">
                    Outros ({dsCount.toLocaleString()})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="domain-all" />
                  <Label htmlFor="domain-all" className="text-sm cursor-pointer">
                    Todos ({totalCount.toLocaleString()})
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Priority Mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Target className="h-4 w-4" /> Priorização
              </Label>
              <Select value={priorityMode} onValueChange={(v) => setPriorityMode(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="impact">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Por Impacto (frequência alta primeiro)
                    </div>
                  </SelectItem>
                  <SelectItem value="alphabetical">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔤</span>
                      Alfabético (A-Z)
                    </div>
                  </SelectItem>
                  <SelectItem value="random">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🎲</span>
                      Aleatório (amostragem)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Modelo de IA</Label>
              <div className="flex gap-2">
                <Button
                  variant={selectedModel === 'gemini' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedModel('gemini')}
                  className={selectedModel === 'gemini' ? 'bg-primary' : ''}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Gemini (rápido)
                </Button>
                <Button
                  variant={selectedModel === 'gpt5' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedModel('gpt5')}
                  className={selectedModel === 'gpt5' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  GPT-5 (preciso)
                </Button>
              </div>
            </div>

            {/* Estimation */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3" />
                Tempo estimado: ~{Math.ceil(getCountForDomain(selectedDomain) / 50 * 2)} minutos
              </div>
              <div className="text-[10px]">
                {Math.ceil(getCountForDomain(selectedDomain) / 50)} chunks • 50 palavras/chunk • 
                {priorityMode === 'impact' ? ' Palavras mais frequentes primeiro' : 
                 priorityMode === 'alphabetical' ? ' Ordem A-Z' : ' Amostragem aleatória'}
              </div>
            </div>

            {/* Start Button */}
            <Button 
              onClick={handleStart} 
              disabled={isLoading || getCountForDomain(selectedDomain) === 0}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Refinamento N1→N2+
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
