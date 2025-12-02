import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Filter, AlertTriangle, Link2, Pencil, Award, Eye, Sparkles, Layers } from 'lucide-react';
import { SemanticLexiconFilters as FiltersType, LexiconStats } from '@/hooks/useSemanticLexiconData';
import { cn } from '@/lib/utils';

interface Props {
  filters: FiltersType;
  stats: LexiconStats | null;
  onUpdateFilter: <K extends keyof FiltersType>(key: K, value: FiltersType[K]) => void;
  onToggleFlag: (flag: keyof FiltersType['flags']) => void;
  onReset: () => void;
}

const SOURCES = [
  { value: 'gemini_flash', label: 'Gemini', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'gpt5', label: 'GPT-5', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { value: 'rule_based', label: 'Regras', color: 'bg-green-500/10 text-green-600 border-green-200' },
  { value: 'manual', label: 'Manual', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
];

const CONFIDENCE_LEVELS = [
  { value: 'all' as const, label: 'Todas', color: 'bg-muted text-foreground' },
  { value: 'low' as const, label: '< 70%', color: 'bg-red-500/10 text-red-600 border-red-200' },
  { value: 'medium' as const, label: '70-90%', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
  { value: 'high' as const, label: '> 90%', color: 'bg-green-500/10 text-green-600 border-green-200' },
];

export function SemanticLexiconFilters({ filters, stats, onUpdateFilter, onToggleFlag, onReset }: Props) {
  const hasActiveFilters = 
    filters.search || 
    filters.domainN1 || 
    filters.fonte || 
    filters.confidenceLevel !== 'all' ||
    Object.values(filters.flags).some(v => v);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar palavra..."
            value={filters.search}
            onChange={(e) => onUpdateFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Source filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground flex items-center mr-2">
          <Filter className="h-3 w-3 mr-1" />
          Fonte:
        </span>
        {SOURCES.map(source => {
          const count = stats?.bySource[source.value] || 0;
          const isActive = filters.fonte === source.value;
          return (
            <Badge
              key={source.value}
              variant="outline"
              className={cn(
                'cursor-pointer transition-all hover:scale-105',
                isActive ? source.color : 'opacity-60 hover:opacity-100'
              )}
              onClick={() => onUpdateFilter('fonte', isActive ? null : source.value)}
            >
              {source.label}
              <span className="ml-1 text-xs opacity-70">({count.toLocaleString()})</span>
            </Badge>
          );
        })}
      </div>

      {/* Confidence filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground flex items-center mr-2">
          Confiança:
        </span>
        {CONFIDENCE_LEVELS.map(level => {
          const isActive = filters.confidenceLevel === level.value;
          return (
            <Badge
              key={level.value}
              variant="outline"
              className={cn(
                'cursor-pointer transition-all hover:scale-105',
                isActive ? level.color : 'opacity-60 hover:opacity-100'
              )}
              onClick={() => onUpdateFilter('confidenceLevel', level.value)}
            >
              {level.label}
            </Badge>
          );
        })}
      </div>

      {/* Flag filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground flex items-center mr-2">
          Flags:
        </span>
        
        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-all hover:scale-105',
            filters.flags.needsReview 
              ? 'bg-red-500/10 text-red-600 border-red-200' 
              : 'opacity-60 hover:opacity-100'
          )}
          onClick={() => onToggleFlag('needsReview')}
        >
          <Eye className="h-3 w-3 mr-1" />
          Precisa Revisão
          <span className="ml-1 text-xs opacity-70">({stats?.needsReview || 0})</span>
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-all hover:scale-105',
            filters.flags.mgOnlyN1 
              ? 'bg-blue-500/10 text-blue-600 border-blue-200' 
              : 'opacity-60 hover:opacity-100'
          )}
          onClick={() => onToggleFlag('mgOnlyN1')}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          MG apenas N1
          <span className="ml-1 text-xs opacity-70">({stats?.mgOnlyN1 || 0})</span>
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-all hover:scale-105',
            filters.flags.dsOnlyN1 
              ? 'bg-purple-500/10 text-purple-600 border-purple-200' 
              : 'opacity-60 hover:opacity-100'
          )}
          onClick={() => onToggleFlag('dsOnlyN1')}
        >
          <Layers className="h-3 w-3 mr-1" />
          DS apenas N1
          <span className="ml-1 text-xs opacity-70">({stats?.dsOnlyN1 || 0})</span>
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-all hover:scale-105',
            filters.flags.polysemous 
              ? 'bg-purple-500/10 text-purple-600 border-purple-200' 
              : 'opacity-60 hover:opacity-100'
          )}
          onClick={() => onToggleFlag('polysemous')}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Polissêmica
          <span className="ml-1 text-xs opacity-70">({stats?.polysemous || 0})</span>
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-all hover:scale-105',
            filters.flags.mwe 
              ? 'bg-blue-500/10 text-blue-600 border-blue-200' 
              : 'opacity-60 hover:opacity-100'
          )}
          onClick={() => onToggleFlag('mwe')}
        >
          <Link2 className="h-3 w-3 mr-1" />
          MWE
          <span className="ml-1 text-xs opacity-70">({stats?.mwe || 0})</span>
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-all hover:scale-105',
            filters.flags.spellingDeviation 
              ? 'bg-amber-500/10 text-amber-600 border-amber-200' 
              : 'opacity-60 hover:opacity-100'
          )}
          onClick={() => onToggleFlag('spellingDeviation')}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Desvio Ortográfico
          <span className="ml-1 text-xs opacity-70">({stats?.spellingDeviations || 0})</span>
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-all hover:scale-105',
            filters.flags.withInsignias 
              ? 'bg-green-500/10 text-green-600 border-green-200' 
              : 'opacity-60 hover:opacity-100'
          )}
          onClick={() => onToggleFlag('withInsignias')}
        >
          <Award className="h-3 w-3 mr-1" />
          Com Insígnias
          <span className="ml-1 text-xs opacity-70">({stats?.withInsignias || 0})</span>
        </Badge>
      </div>

      {/* Domain filters - Top 8 */}
      {stats && Object.keys(stats.byDomain).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground flex items-center mr-2">
            Domínio N1:
          </span>
          {Object.entries(stats.byDomain)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([domain, count]) => {
              const isActive = filters.domainN1 === domain;
              return (
                <Badge
                  key={domain}
                  variant="outline"
                  className={cn(
                    'cursor-pointer transition-all hover:scale-105',
                    isActive 
                      ? 'bg-primary/10 text-primary border-primary/30' 
                      : 'opacity-60 hover:opacity-100'
                  )}
                  onClick={() => onUpdateFilter('domainN1', isActive ? null : domain)}
                >
                  {domain}
                  <span className="ml-1 text-xs opacity-70">({count.toLocaleString()})</span>
                </Badge>
              );
            })}
        </div>
      )}
    </div>
  );
}
