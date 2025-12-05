/**
 * 📊 STATISTICS CARDS
 * 
 * Cards de métricas estatísticas do corpus com tooltips explicativos
 * Exibe: Total de palavras, Palavras únicas, TTR, Hapax, Densidade Lexical, Tamanho médio
 */

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  FileText, 
  Hash, 
  Percent, 
  Sparkles, 
  Layers, 
  Ruler,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { useTools } from '@/contexts/ToolsContext';
import { cn } from '@/lib/utils';

interface MetricDefinition {
  id: string;
  label: string;
  tooltip: string;
  icon: React.ElementType;
  format: (value: number) => string;
  calculate: (data: MetricsData) => number;
}

interface MetricsData {
  totalTokens: number;
  uniqueTypes: number;
  hapaxCount: number;
  contentWords: number;
  totalCharacters: number;
}

const METRICS: MetricDefinition[] = [
  {
    id: 'totalTokens',
    label: 'Total de Palavras',
    tooltip: 'Número total de tokens (palavras) no corpus selecionado. Inclui todas as ocorrências, mesmo repetidas.',
    icon: FileText,
    format: (v) => v.toLocaleString('pt-BR'),
    calculate: (d) => d.totalTokens
  },
  {
    id: 'uniqueTypes',
    label: 'Palavras Únicas',
    tooltip: 'Número de types (palavras distintas). Indica a riqueza vocabular bruta do corpus.',
    icon: Hash,
    format: (v) => v.toLocaleString('pt-BR'),
    calculate: (d) => d.uniqueTypes
  },
  {
    id: 'ttr',
    label: 'TTR',
    tooltip: 'Type-Token Ratio: proporção de palavras únicas vs. total (Types ÷ Tokens). Valores mais altos indicam maior diversidade vocabular. Varia de 0 a 1.',
    icon: Percent,
    format: (v) => (v * 100).toFixed(1) + '%',
    calculate: (d) => d.totalTokens > 0 ? d.uniqueTypes / d.totalTokens : 0
  },
  {
    id: 'hapax',
    label: 'Hapax Legomena',
    tooltip: 'Palavras que aparecem uma única vez no corpus. Alta proporção indica vocabulário especializado ou diverso. Nome vem do grego "dito uma vez".',
    icon: Sparkles,
    format: (v) => v.toLocaleString('pt-BR'),
    calculate: (d) => d.hapaxCount
  },
  {
    id: 'lexicalDensity',
    label: 'Densidade Lexical',
    tooltip: 'Proporção de palavras de conteúdo (substantivos, verbos, adjetivos, advérbios) vs. palavras funcionais (artigos, preposições). Maior densidade = texto mais informativo.',
    icon: Layers,
    format: (v) => (v * 100).toFixed(1) + '%',
    calculate: (d) => d.totalTokens > 0 ? d.contentWords / d.totalTokens : 0
  },
  {
    id: 'avgWordLength',
    label: 'Tamanho Médio',
    tooltip: 'Comprimento médio das palavras em caracteres. Indica complexidade vocabular. Português médio: ~5 caracteres.',
    icon: Ruler,
    format: (v) => v.toFixed(1) + ' chars',
    calculate: (d) => d.totalTokens > 0 ? d.totalCharacters / d.totalTokens : 0
  }
];

// Palavras funcionais em português
const FUNCTIONAL_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
  'para', 'por', 'pela', 'pelo', 'pelas', 'pelos', 'com', 'sem',
  'e', 'ou', 'mas', 'que', 'se', 'como', 'quando', 'porque',
  'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas',
  'me', 'te', 'lhe', 'nos', 'vos', 'lhes', 'se',
  'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
  'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas',
  'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
  'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo',
  'não', 'sim', 'já', 'ainda', 'sempre', 'nunca', 'também', 'só', 'mais', 'menos',
  'muito', 'pouco', 'bem', 'mal', 'assim', 'aqui', 'ali', 'lá', 'onde',
  'ser', 'estar', 'ter', 'haver', 'ir', 'vir', 'fazer', 'poder', 'dever',
  'é', 'são', 'era', 'eram', 'foi', 'foram', 'está', 'estão',
  'tem', 'têm', 'tinha', 'tinham', 'há', 'vai', 'vão'
]);

/**
 * Hook para calcular métricas do corpus a partir da wordlist
 */
export function useCorpusMetrics(): { data: MetricsData | null; isLoading: boolean } {
  const { wordlistState } = useTools();
  
  const metricsData = useMemo<MetricsData | null>(() => {
    const wordlist = wordlistState.wordlist;
    
    if (!wordlist || wordlist.length === 0) {
      return null;
    }
    
    // Total de tokens (soma das frequências)
    const totalTokens = wordlist.reduce((sum, w) => sum + w.frequencia, 0);
    
    // Palavras únicas (types)
    const uniqueTypes = wordlist.length;
    
    // Hapax Legomena (frequência = 1)
    const hapaxCount = wordlist.filter(w => w.frequencia === 1).length;
    
    // Palavras de conteúdo (não funcionais)
    const contentWordCount = wordlist
      .filter(w => !FUNCTIONAL_WORDS.has(w.palavra.toLowerCase()))
      .reduce((sum, w) => sum + w.frequencia, 0);
    
    // Total de caracteres
    const totalCharacters = wordlist.reduce(
      (sum, w) => sum + (w.palavra.length * w.frequencia), 
      0
    );
    
    return {
      totalTokens,
      uniqueTypes,
      hapaxCount,
      contentWords: contentWordCount,
      totalCharacters
    };
  }, [wordlistState.wordlist]);
  
  return {
    data: metricsData,
    isLoading: false
  };
}

interface StatisticsCardsProps {
  className?: string;
}

export function StatisticsCards({ className }: StatisticsCardsProps) {
  const { data, isLoading } = useCorpusMetrics();
  
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Calculando métricas...</span>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className={cn("text-center py-4 text-sm text-muted-foreground", className)}>
        Gere uma Wordlist para ver as métricas do corpus
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3", className)}>
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const value = metric.calculate(data);
          
          return (
            <Card key={metric.id} className="relative overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {metric.label}
                    </span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {metric.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-bold">
                    {metric.format(value)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
