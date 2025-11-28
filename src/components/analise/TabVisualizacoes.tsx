import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDashboardAnaliseContext } from '@/contexts/DashboardAnaliseContext';
import { Network, Cloud, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function TabVisualizacoes() {
  const { processamentoData } = useDashboardAnaliseContext();
  const cloudData = processamentoData.analysisResults?.cloudData || [];

  if (!processamentoData.isProcessed || cloudData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Visualizações Científicas
          </CardTitle>
          <CardDescription>
            Representações visuais dos dados linguísticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Processe um corpus na aba <strong>Processamento</strong> para visualizar as representações gráficas dos domínios semânticos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Nuvem de Domínios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Nuvem de Domínios Semânticos
          </CardTitle>
          <CardDescription>
            Tamanho proporcional ao peso textual de cada domínio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 justify-center items-center min-h-[400px] p-8">
            {cloudData.map((item, idx) => {
              const fontSize = Math.max(14, Math.min(48, item.size));
              return (
                <div
                  key={idx}
                  className="transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: item.color,
                    fontWeight: 'bold',
                  }}
                  title={`${item.nome} - ${item.wordCount} palavras`}
                >
                  {item.codigo}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rede Semântica (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4" />
            Rede Semântica
          </CardTitle>
          <CardDescription>
            Conexões entre domínios semânticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cloudData.slice(0, 8).map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:border-primary transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: item.color }}
                >
                  {item.codigo}
                </div>
                <div className="text-xs text-center font-medium">{item.nome}</div>
                <Badge variant="secondary" className="text-xs">
                  {item.wordCount} palavras
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}