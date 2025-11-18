import { DominioSemantico } from '@/data/types/corpus.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { Target } from 'lucide-react';

interface DomainRadarComparisonProps {
  dominiosA: DominioSemantico[];
  dominiosB: DominioSemantico[];
  artistaA: string;
  artistaB: string;
}

export function DomainRadarComparison({
  dominiosA,
  dominiosB,
  artistaA,
  artistaB
}: DomainRadarComparisonProps) {
  // Pegar os top 6 domínios de cada artista
  const topDomainsA = dominiosA
    .sort((a, b) => b.percentual - a.percentual)
    .slice(0, 6);
  
  const topDomainsB = dominiosB
    .sort((a, b) => b.percentual - a.percentual)
    .slice(0, 6);
  
  // Criar união dos domínios (pode ter sobreposição)
  const allDomains = new Set([
    ...topDomainsA.map(d => d.dominio),
    ...topDomainsB.map(d => d.dominio)
  ]);
  
  // Preparar dados para o radar
  const radarData = Array.from(allDomains).map(dominio => {
    const domA = dominiosA.find(d => d.dominio === dominio);
    const domB = dominiosB.find(d => d.dominio === dominio);
    
    return {
      dominio: dominio.length > 15 ? dominio.substring(0, 15) + '...' : dominio,
      dominioCompleto: dominio,
      [artistaA]: domA ? parseFloat(domA.percentual.toFixed(1)) : 0,
      [artistaB]: domB ? parseFloat(domB.percentual.toFixed(1)) : 0
    };
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Distribuição de Domínios Semânticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm font-medium">{artistaA}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-sm font-medium">{artistaB}</span>
          </div>
          <Badge variant="outline">{radarData.length} domínios</Badge>
        </div>
        
        <ResponsiveContainer width="100%" height={500}>
          <RadarChart data={radarData}>
            <PolarGrid strokeDasharray="3 3" className="stroke-muted" />
            <PolarAngleAxis 
              dataKey="dominio" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 'auto']}
              className="text-xs"
            />
            <Radar
              name={artistaA}
              dataKey={artistaA}
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.5}
              strokeWidth={2}
            />
            <Radar
              name={artistaB}
              dataKey={artistaB}
              stroke="hsl(var(--accent))"
              fill="hsl(var(--accent))"
              fillOpacity={0.5}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number) => [`${value}%`, 'Percentual']}
              labelFormatter={(label) => {
                const item = radarData.find(d => d.dominio === label);
                return item?.dominioCompleto || label;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Comparação percentual dos principais domínios semânticos identificados
        </div>
      </CardContent>
    </Card>
  );
}
