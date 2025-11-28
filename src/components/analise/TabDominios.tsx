import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDashboardAnaliseContext } from '@/contexts/DashboardAnaliseContext';
import { Target, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TabDominios() {
  const { processamentoData } = useDashboardAnaliseContext();
  const dominios = processamentoData.analysisResults?.dominios || [];

  if (!processamentoData.isProcessed || dominios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Domínios Semânticos
          </CardTitle>
          <CardDescription>
            Explore os domínios semânticos identificados na análise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Processe um corpus na aba <strong>Processamento</strong> para visualizar os domínios semânticos identificados.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getComparisonBadge = (percentual: number) => {
    if (percentual > 20) {
      return (
        <Badge variant="default" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          SUPER
        </Badge>
      );
    } else if (percentual < 10) {
      return (
        <Badge variant="secondary" className="gap-1">
          <TrendingDown className="h-3 w-3" />
          SUB
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="h-3 w-3" />
        Equilibrado
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Domínios Semânticos Identificados
          </CardTitle>
          <CardDescription>
            {dominios.length} domínios encontrados na análise do corpus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domínio</TableHead>
                <TableHead className="text-center">Riqueza Lexical</TableHead>
                <TableHead className="text-center">Peso Textual (%)</TableHead>
                <TableHead className="text-center">Comparativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dominios.map((dominio, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dominio.cor }}
                      />
                      <span className="font-medium">{dominio.dominio}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{dominio.riquezaLexical}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold">{dominio.percentual}%</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getComparisonBadge(dominio.percentual)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card com detalhes expandidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Palavras por Domínio</CardTitle>
          <CardDescription>
            Exemplos de lemas identificados em cada domínio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dominios.slice(0, 5).map((dominio, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: dominio.cor }}
                  />
                  <span className="font-medium text-sm">{dominio.dominio}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {dominio.palavras.length} palavras
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {dominio.palavras.slice(0, 10).map((palavra, pIdx) => (
                    <Badge key={pIdx} variant="secondary" className="font-normal">
                      {palavra}
                    </Badge>
                  ))}
                  {dominio.palavras.length > 10 && (
                    <Badge variant="outline" className="font-normal">
                      +{dominio.palavras.length - 10} mais
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}