import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDashboardAnaliseContext } from '@/contexts/DashboardAnaliseContext';
import { BarChart3, PieChart, TrendingUp, FileText, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function TabEstatisticas() {
  const { processamentoData } = useDashboardAnaliseContext();
  const stats = processamentoData.analysisResults?.estatisticas;
  const dominios = processamentoData.analysisResults?.dominios || [];

  if (!processamentoData.isProcessed || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estatísticas Linguísticas
          </CardTitle>
          <CardDescription>
            Métricas quantitativas sobre o corpus analisado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Processe um corpus na aba <strong>Processamento</strong> para visualizar as estatísticas linguísticas.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const ttr = ((stats.palavrasUnicas / stats.totalPalavras) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Total de Palavras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPalavras.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Palavras Únicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.palavrasUnicas.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">TTR (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ttr}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Domínios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dominiosIdentificados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Domínio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Distribuição por Domínio
          </CardTitle>
          <CardDescription>
            Peso textual de cada domínio semântico no corpus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dominios.slice(0, 8).map((dominio, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dominio.cor }}
                    />
                    <span className="font-medium">{dominio.dominio}</span>
                  </div>
                  <span className="font-semibold">{dominio.percentual}%</span>
                </div>
                <Progress 
                  value={dominio.percentual} 
                  className="h-2"
                  style={{ 
                    // @ts-ignore
                    '--progress-background': dominio.cor 
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribuição de Prosódia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChart className="h-4 w-4" />
            Prosódia Semântica
          </CardTitle>
          <CardDescription>
            Distribuição do sentimento das palavras-chave
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-green-500">
                  {stats.prosodiaDistribution.percentualPositivo}%
                </div>
                <div className="text-xs text-muted-foreground">Positivas</div>
                <div className="text-xs text-muted-foreground">
                  ({stats.prosodiaDistribution.positivas} palavras)
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-red-500">
                  {stats.prosodiaDistribution.percentualNegativo}%
                </div>
                <div className="text-xs text-muted-foreground">Negativas</div>
                <div className="text-xs text-muted-foreground">
                  ({stats.prosodiaDistribution.negativas} palavras)
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-muted-foreground">
                  {stats.prosodiaDistribution.percentualNeutro}%
                </div>
                <div className="text-xs text-muted-foreground">Neutras</div>
                <div className="text-xs text-muted-foreground">
                  ({stats.prosodiaDistribution.neutras} palavras)
                </div>
              </div>
            </div>

            <div className="flex h-4 rounded-full overflow-hidden">
              <div 
                className="bg-green-500" 
                style={{ width: `${stats.prosodiaDistribution.percentualPositivo}%` }}
              />
              <div 
                className="bg-red-500" 
                style={{ width: `${stats.prosodiaDistribution.percentualNegativo}%` }}
              />
              <div 
                className="bg-muted" 
                style={{ width: `${stats.prosodiaDistribution.percentualNeutro}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords Significativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Palavras-Chave Estatísticas
          </CardTitle>
          <CardDescription>
            Palavras com alta significância estatística (Log-likelihood)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold">{stats.palavrasChaveSignificativas}</div>
            <p className="text-sm text-muted-foreground">
              Palavras com LL &gt; 15.13 (p &lt; 0.0001)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}