import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, Layers, Hash } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { dominiosNormalizados } from "@/data/mockup/dominios-normalized";
import { frequenciaNormalizadaData } from "@/data/mockup/frequencia-normalizada";
import { ACADEMIC_RS_COLORS } from "@/config/themeColors";

export function TabStatistics() {
  // Calcular estatísticas gerais
  const totalPalavras = 212;
  const totalDominios = dominiosNormalizados.length;
  const totalPalavrasTematicas = 117;
  const riquezaLexicalMedia = Math.round(
    dominiosNormalizados.reduce((acc, d) => acc + d.riquezaLexical, 0) / totalDominios
  );

  // Preparar dados para gráfico de distribuição de domínios
  const dominiosChartData = dominiosNormalizados
    .map(d => ({
      dominio: d.dominio.length > 25 ? d.dominio.substring(0, 25) + "..." : d.dominio,
      percentual: d.percentualTematico,
      riquezaLexical: d.riquezaLexical,
      status: d.comparacaoCorpus
    }))
    .sort((a, b) => b.percentual - a.percentual);

  // Preparar dados para gráfico de palavras mais frequentes (top 15)
  const palavrasFrequentesData = frequenciaNormalizadaData
    .slice(0, 15)
    .map(p => ({
      palavra: p.palavra,
      frequencia: p.frequenciaNormalizada
    }));

  // Cores por status de comparação
  const getBarColor = (status: string) => {
    switch (status) {
      case 'super-representado':
        return ACADEMIC_RS_COLORS.verde.main;
      case 'equilibrado':
        return ACADEMIC_RS_COLORS.amarelo.main;
      case 'sub-representado':
        return ACADEMIC_RS_COLORS.vermelho.main;
      default:
        return ACADEMIC_RS_COLORS.verde.main;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas-Chave */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-academic">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Palavras</p>
                <p className="text-2xl font-bold text-foreground">{totalPalavras}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-academic">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Domínios Semânticos</p>
                <p className="text-2xl font-bold text-foreground">{totalDominios}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-academic">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Palavras Temáticas</p>
                <p className="text-2xl font-bold text-foreground">{totalPalavrasTematicas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-academic">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Riqueza Lexical Média</p>
                <p className="text-2xl font-bold text-foreground">{riquezaLexicalMedia}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Distribuição de Domínios */}
      <Card className="card-academic">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="section-header-academic">
                Distribuição de Domínios Semânticos
              </CardTitle>
              <CardDescription className="section-description-academic">
                Percentual temático normalizado (sobre 117 palavras temáticas)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge className="badge-verde">Super-representado</Badge>
              <Badge className="badge-amarelo">Equilibrado</Badge>
              <Badge className="badge-vermelho">Sub-representado</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={dominiosChartData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="dominio" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(2)}% | ${props.payload.riquezaLexical} palavras`,
                    'Percentual'
                  ]}
                />
                <Bar dataKey="percentual" radius={[0, 4, 4, 0]}>
                  {dominiosChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Palavras Mais Frequentes */}
      <Card className="card-academic">
        <CardHeader>
          <CardTitle className="section-header-academic">
            Top 15 Palavras por Frequência Normalizada
          </CardTitle>
          <CardDescription className="section-description-academic">
            Frequência por 1.000 palavras no corpus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={palavrasFrequentesData}
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="palavra" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [value.toFixed(2), 'Frequência']}
                />
                <Bar 
                  dataKey="frequencia" 
                  fill={ACADEMIC_RS_COLORS.verde.main}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
