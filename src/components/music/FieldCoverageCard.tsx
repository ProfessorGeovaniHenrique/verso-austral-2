import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Music, Calendar, Youtube, FileText, Link } from 'lucide-react';

interface FieldCoverageCardProps {
  fieldCoverage: {
    composer: { count: number; percentage: number };
    releaseYear: { count: number; percentage: number };
    youtubeUrl: { count: number; percentage: number };
    lyrics: { count: number; percentage: number };
    enrichmentSource: { count: number; percentage: number };
  };
  totalSongs: number;
}

export function FieldCoverageCard({ fieldCoverage, totalSongs }: FieldCoverageCardProps) {
  const fields = [
    {
      icon: Music,
      label: 'Compositor',
      data: fieldCoverage.composer,
      color: 'text-blue-500',
    },
    {
      icon: Calendar,
      label: 'Ano de Lançamento',
      data: fieldCoverage.releaseYear,
      color: 'text-green-500',
    },
    {
      icon: Youtube,
      label: 'YouTube URL',
      data: fieldCoverage.youtubeUrl,
      color: 'text-red-500',
    },
    {
      icon: FileText,
      label: 'Letras',
      data: fieldCoverage.lyrics,
      color: 'text-purple-500',
    },
    {
      icon: Link,
      label: 'Fonte de Enriquecimento',
      data: fieldCoverage.enrichmentSource,
      color: 'text-orange-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobertura de Campos</CardTitle>
        <CardDescription>
          Percentual de músicas com cada campo preenchido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.map(({ icon: Icon, label, data, color }) => (
          <div key={label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {data.count.toLocaleString()} / {totalSongs.toLocaleString()}
                </span>
                <span className="text-sm font-bold">
                  {data.percentage.toFixed(2)}%
                </span>
              </div>
            </div>
            <Progress 
              value={data.percentage} 
              className="h-2"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
