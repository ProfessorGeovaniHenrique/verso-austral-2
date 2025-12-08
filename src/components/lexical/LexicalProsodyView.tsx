/**
 * LexicalProsodyView - Visualização de Prosódia Semântica
 * Sprint LF-5 Fase 3: Distribuição de prosódia positiva/negativa/neutra
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Smile, Frown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ProsodyDistribution, LexicalKeyword } from '@/hooks/useLexicalDomainsData';

interface LexicalProsodyViewProps {
  prosodyDistribution: ProsodyDistribution | null;
  onWordClick?: (word: string) => void;
}

const PROSODY_COLORS = {
  positive: 'hsl(142, 76%, 36%)',
  negative: 'hsl(0, 84%, 60%)',
  neutral: 'hsl(220, 8%, 46%)',
};

export function LexicalProsodyView({ prosodyDistribution, onWordClick }: LexicalProsodyViewProps) {
  if (!prosodyDistribution) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Dados de prosódia não disponíveis.</p>
      </Card>
    );
  }

  const total = prosodyDistribution.positive + prosodyDistribution.negative + prosodyDistribution.neutral;
  const chartData = [
    { name: 'Positiva', value: prosodyDistribution.positive, color: PROSODY_COLORS.positive },
    { name: 'Negativa', value: prosodyDistribution.negative, color: PROSODY_COLORS.negative },
    { name: 'Neutra', value: prosodyDistribution.neutral, color: PROSODY_COLORS.neutral },
  ];

  const percentages = {
    positive: ((prosodyDistribution.positive / total) * 100).toFixed(1),
    negative: ((prosodyDistribution.negative / total) * 100).toFixed(1),
    neutral: ((prosodyDistribution.neutral / total) * 100).toFixed(1),
  };

  const handleExportCSV = () => {
    const allWords = [
      ...prosodyDistribution.positiveWords.map(w => ({ ...w, prosody: 'Positiva' })),
      ...prosodyDistribution.negativeWords.map(w => ({ ...w, prosody: 'Negativa' })),
      ...prosodyDistribution.neutralWords.map(w => ({ ...w, prosody: 'Neutra' })),
    ];
    
    const headers = ['Palavra', 'Domínio', 'Prosódia', 'Frequência'];
    const rows = allWords.map(w => [w.word, w.domain, w.prosody, w.frequency.toString()]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prosodia-semantica-${Date.now()}.csv`;
    link.click();
  };

  const WordCard = ({ title, icon: Icon, words, color }: { 
    title: string; 
    icon: typeof Smile; 
    words: LexicalKeyword[]; 
    color: string;
  }) => (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          {title}
          <Badge variant="secondary" className="ml-auto">
            {words.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="flex flex-wrap gap-1.5">
            {words.slice(0, 30).map((w, idx) => (
              <Badge
                key={`${w.word}-${idx}`}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-muted"
                style={{ borderColor: color }}
                onClick={() => onWordClick?.(w.word)}
              >
                {w.word}
              </Badge>
            ))}
            {words.length > 30 && (
              <span className="text-xs text-muted-foreground px-2">
                +{words.length - 30} mais
              </span>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header com estatísticas resumidas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prosódia Semântica</h3>
          <p className="text-sm text-muted-foreground">
            Distribuição de conotações positivas, negativas e neutras
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4" style={{ borderLeftColor: PROSODY_COLORS.positive, borderLeftWidth: 4 }}>
          <div className="flex items-center gap-3">
            <Smile className="w-8 h-8" style={{ color: PROSODY_COLORS.positive }} />
            <div>
              <div className="text-2xl font-bold">{percentages.positive}%</div>
              <div className="text-sm text-muted-foreground">Positiva</div>
            </div>
          </div>
          <Progress 
            value={parseFloat(percentages.positive)} 
            className="mt-2 h-1.5"
            style={{ '--progress-color': PROSODY_COLORS.positive } as React.CSSProperties}
          />
        </Card>

        <Card className="p-4" style={{ borderLeftColor: PROSODY_COLORS.negative, borderLeftWidth: 4 }}>
          <div className="flex items-center gap-3">
            <Frown className="w-8 h-8" style={{ color: PROSODY_COLORS.negative }} />
            <div>
              <div className="text-2xl font-bold">{percentages.negative}%</div>
              <div className="text-sm text-muted-foreground">Negativa</div>
            </div>
          </div>
          <Progress 
            value={parseFloat(percentages.negative)} 
            className="mt-2 h-1.5"
            style={{ '--progress-color': PROSODY_COLORS.negative } as React.CSSProperties}
          />
        </Card>

        <Card className="p-4" style={{ borderLeftColor: PROSODY_COLORS.neutral, borderLeftWidth: 4 }}>
          <div className="flex items-center gap-3">
            <Minus className="w-8 h-8" style={{ color: PROSODY_COLORS.neutral }} />
            <div>
              <div className="text-2xl font-bold">{percentages.neutral}%</div>
              <div className="text-sm text-muted-foreground">Neutra</div>
            </div>
          </div>
          <Progress 
            value={parseFloat(percentages.neutral)} 
            className="mt-2 h-1.5"
            style={{ '--progress-color': PROSODY_COLORS.neutral } as React.CSSProperties}
          />
        </Card>
      </div>

      {/* Gráfico de barras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Prosódia</CardTitle>
          <CardDescription>Total de {total.toLocaleString()} palavras analisadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), 'Palavras']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cards de palavras por prosódia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WordCard 
          title="Positiva" 
          icon={Smile} 
          words={prosodyDistribution.positiveWords} 
          color={PROSODY_COLORS.positive} 
        />
        <WordCard 
          title="Negativa" 
          icon={Frown} 
          words={prosodyDistribution.negativeWords} 
          color={PROSODY_COLORS.negative} 
        />
        <WordCard 
          title="Neutra" 
          icon={Minus} 
          words={prosodyDistribution.neutralWords} 
          color={PROSODY_COLORS.neutral} 
        />
      </div>
    </div>
  );
}
