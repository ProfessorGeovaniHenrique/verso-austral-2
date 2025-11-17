import { Card } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface ComparisonStats {
  uniqueWords: number;
  totalOccurrences: number;
  avgLL: number;
  lexicalRichness: number;
}

interface ComparisonStatsCardProps {
  domainA: string;
  domainB: string;
  statsA: ComparisonStats;
  statsB: ComparisonStats;
}

export function ComparisonStatsCard({
  domainA,
  domainB,
  statsA,
  statsB,
}: ComparisonStatsCardProps) {
  return (
    <Card className="mt-4 p-4 bg-muted/20">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        Comparação Estatística
      </h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-2">Métrica</div>
          <div className="space-y-2">
            <div className="font-medium">Palavras únicas</div>
            <div className="font-medium">Ocorrências totais</div>
            <div className="font-medium">LL médio</div>
            <div className="font-medium">Riqueza lexical</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">{domainA}</div>
          <div className="space-y-2">
            <div className="font-semibold text-primary">{statsA.uniqueWords}</div>
            <div className="font-semibold text-primary">{statsA.totalOccurrences}</div>
            <div className="font-semibold text-primary">{statsA.avgLL.toFixed(2)}</div>
            <div className="font-semibold text-primary">{statsA.lexicalRichness.toFixed(2)}</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">{domainB}</div>
          <div className="space-y-2">
            <div className="font-semibold text-secondary">{statsB.uniqueWords}</div>
            <div className="font-semibold text-secondary">{statsB.totalOccurrences}</div>
            <div className="font-semibold text-secondary">{statsB.avgLL.toFixed(2)}</div>
            <div className="font-semibold text-secondary">{statsB.lexicalRichness.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
