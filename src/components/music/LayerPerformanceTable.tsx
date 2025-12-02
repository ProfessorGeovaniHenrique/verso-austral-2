import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Music, Calendar, Youtube, TrendingUp, TrendingDown } from 'lucide-react';

interface LayerPerformanceTableProps {
  layerStats: Array<{
    layer: string;
    count: number;
    avgConfidence: number;
    withComposer: number;
    withYear: number;
    withYoutube: number;
  }>;
}

export function LayerPerformanceTable({ layerStats }: LayerPerformanceTableProps) {
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">Alta</Badge>;
    } else if (confidence >= 50) {
      return <Badge variant="default" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Média</Badge>;
    } else {
      return <Badge variant="default" className="bg-red-500/10 text-red-500 border-red-500/20">Baixa</Badge>;
    }
  };

  const getLayerBadge = (layer: string) => {
    const colors: Record<string, string> = {
      'youtube_description': 'bg-red-500/10 text-red-500 border-red-500/20',
      'google_search_grounding': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'youtube_description+google_search_grounding': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'gpt5_knowledge_base': 'bg-green-500/10 text-green-500 border-green-500/20',
      'gemini_knowledge_base': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };

    const labels: Record<string, string> = {
      'youtube_description': 'YouTube API',
      'google_search_grounding': 'Google Search',
      'youtube_description+google_search_grounding': 'YouTube + Google',
      'gpt5_knowledge_base': 'GPT-5',
      'gemini_knowledge_base': 'Gemini',
    };

    return (
      <Badge variant="outline" className={colors[layer] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}>
        {labels[layer] || layer}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Camada</CardTitle>
        <CardDescription>
          Eficácia de cada camada do pipeline de enriquecimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Camada</TableHead>
              <TableHead className="text-center">Músicas</TableHead>
              <TableHead className="text-center">Confiança</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Music className="h-4 w-4" />
                  <span>Compositor</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Ano</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Youtube className="h-4 w-4" />
                  <span>YouTube</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {layerStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma música enriquecida ainda
                </TableCell>
              </TableRow>
            ) : (
              layerStats.map((layer) => (
                <TableRow key={layer.layer}>
                  <TableCell>
                    {getLayerBadge(layer.layer)}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {layer.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">{layer.avgConfidence.toFixed(1)}%</span>
                      {getConfidenceBadge(layer.avgConfidence)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-muted-foreground">{layer.withComposer}</span>
                      {layer.withComposer > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-muted-foreground">{layer.withYear}</span>
                      {layer.withYear > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-muted-foreground">{layer.withYoutube}</span>
                      {layer.withYoutube > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
