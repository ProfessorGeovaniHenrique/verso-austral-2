import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getVelocityMetrics } from '@/utils/developmentVelocity';
import { TrendingUp, Calendar } from 'lucide-react';
import { mvpEpics, postMvpEpics, v2Epics } from '@/data/developer-logs/product-roadmap';

export function VelocityChart() {
  const { totalCompleted, totalPlanned, averagePerMonth, velocityData } = getVelocityMetrics();
  
  const allEpics = [...mvpEpics, ...postMvpEpics, ...v2Epics];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Velocidade de Desenvolvimento
            </CardTitle>
            <CardDescription>
              Histórias completadas por mês em 2025
            </CardDescription>
          </div>
          
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Completadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{averagePerMonth}</p>
              <p className="text-xs text-muted-foreground">Média/Mês</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{totalPlanned}</p>
              <p className="text-xs text-muted-foreground">Planejadas</p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={velocityData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="monthLabel" 
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))' 
              }}
            />
            <Legend />
            <Bar 
              dataKey="storiesCompleted" 
              name="Completadas" 
              fill="hsl(var(--success))" 
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="storiesPlanned" 
              name="Planejadas" 
              fill="hsl(var(--muted-foreground))" 
              opacity={0.3}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Timeline de épicos trabalhados */}
        <div className="pt-6 border-t">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Épicos Trabalhados por Período
          </h4>
          <div className="space-y-2">
            {velocityData.map((month, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm flex-wrap">
                <Badge variant="outline" className="w-24 shrink-0">{month.monthLabel}</Badge>
                <div className="flex gap-1 flex-wrap">
                  {month.epicsInProgress.map(epicId => {
                    const epic = allEpics.find(e => e.id === epicId);
                    return epic ? (
                      <Badge key={epicId} variant="secondary" className="text-xs">
                        {epic.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
                <span className="text-muted-foreground ml-auto">
                  {month.storiesCompleted} de {month.storiesPlanned} stories
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
