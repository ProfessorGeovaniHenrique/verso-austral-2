import { KeywordEntry } from '@/data/types/corpus-tools.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface KeywordsComparisonChartProps {
  keywordsA: KeywordEntry[];
  keywordsB: KeywordEntry[];
  artistaA: string;
  artistaB: string;
}

export function KeywordsComparisonChart({
  keywordsA,
  keywordsB,
  artistaA,
  artistaB
}: KeywordsComparisonChartProps) {
  // Preparar dados para o gráfico (top 10)
  const dataA = keywordsA.slice(0, 10).map(kw => ({
    palavra: kw.palavra,
    ll: parseFloat(kw.ll.toFixed(1)),
    freq: kw.freqEstudo
  }));
  
  const dataB = keywordsB.slice(0, 10).map(kw => ({
    palavra: kw.palavra,
    ll: parseFloat(kw.ll.toFixed(1)),
    freq: kw.freqEstudo
  }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Visualização Comparativa de Keywords
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico A */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">{artistaA}</h4>
              <Badge variant="secondary">Top 10 Keywords</Badge>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={dataA}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="palavra" className="text-xs" width={70} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'll') return [`${value}`, 'Log-Likelihood'];
                    if (name === 'freq') return [`${value}`, 'Frequência'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="ll" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Gráfico B */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">{artistaB}</h4>
              <Badge variant="secondary">Top 10 Keywords</Badge>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={dataB}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="palavra" className="text-xs" width={70} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'll') return [`${value}`, 'Log-Likelihood'];
                    if (name === 'freq') return [`${value}`, 'Frequência'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="ll" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
