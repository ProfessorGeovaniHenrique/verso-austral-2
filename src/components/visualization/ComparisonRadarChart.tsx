import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';

interface RadarDataPoint {
  metric: string;
  study: number;
  reference: number;
}

interface ComparisonRadarChartProps {
  data: RadarDataPoint[];
  studyLabel?: string;
  referenceLabel?: string;
  title?: string;
  description?: string;
}

export function ComparisonRadarChart({
  data,
  studyLabel = 'Estudo',
  referenceLabel = 'Referência',
  title = 'Comparação de Perfis',
  description
}: ComparisonRadarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <PolarRadiusAxis 
              domain={[0, 100]} 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Radar
              name={studyLabel}
              dataKey="study"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
            />
            <Radar
              name={referenceLabel}
              dataKey="reference"
              stroke="hsl(var(--secondary))"
              fill="hsl(var(--secondary))"
              fillOpacity={0.6}
            />
            <Legend />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
