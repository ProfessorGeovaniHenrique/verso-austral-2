import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Database, Download, FileText, TrendingUp, BarChart3, Lightbulb } from "lucide-react";
import { getDemoAnalysisResults, DemoDomain } from "@/services/demoCorpusService";
import { toast } from "sonner";

interface TabDomainsProps {
  demo?: boolean;
}

export function TabDomains({ demo = false }: TabDomainsProps) {
  const [demoData, setDemoData] = useState<DemoDomain[] | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (demo) {
      setIsLoadingDemo(true);
      getDemoAnalysisResults()
        .then(result => {
          setDemoData(result.dominios);
          toast.success(`${result.dominios.length} domínios carregados`);
        })
        .catch(error => {
          console.error('Erro ao carregar dados demo:', error);
          toast.error('Erro ao carregar análise demo');
        })
        .finally(() => setIsLoadingDemo(false));
    }
  }, [demo]);

  const dominiosFiltrados = useMemo(() => {
    if (!demoData) return [];
    return demoData.filter(d => 
      d.dominio.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [demoData, searchTerm]);

  const insights = useMemo(() => {
    if (!demoData || demoData.length === 0) return null;
    
    const dominante = demoData.reduce((max, d) => d.percentual > max.percentual ? d : max);
    const totalOcorrencias = demoData.reduce((sum, d) => sum + d.ocorrencias, 0);
    const totalPalavras = demoData.reduce((sum, d) => sum + d.palavras.length, 0);
    const densidadeLexical = totalOcorrencias / totalPalavras;
    
    return { dominante, densidadeLexical };
  }, [demoData]);

  const handleExportCSV = () => {
    if (!demoData) return;
    
    const csvHeader = "Domínio,Descrição,Percentual,Ocorrências,Riqueza Lexical,Palavras\n";
    const csvRows = demoData.map(d => 
      `"${d.dominio}","${d.descricao}",${d.percentual.toFixed(2)},${d.ocorrencias},${d.riquezaLexical},"${d.palavras.join(', ')}"`
    ).join("\n");
    
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dominios-semanticos-demo.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso');
  };

  const handleGenerateReport = () => {
    toast.info('Funcionalidade de relatório PDF em desenvolvimento');
  };

  if (isLoadingDemo) {
    return (
      <div className="space-y-6">
        <Card className="card-academic">
          <CardHeader>
            <Skeleton className="h-8 w-96" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!demo || !demoData) {
    return (
      <Card className="card-academic">
        <CardHeader>
          <CardTitle className="section-header-academic flex items-center gap-2">
            <Database className="w-5 h-5" />
            Análise de Domínios Semânticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Dados disponíveis apenas em modo demo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com busca e exportação */}
      <Card className="card-academic">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="section-header-academic flex items-center gap-2">
                <Database className="w-5 h-5" />
                Domínios Semânticos - "Quando o Verso Vem pras Casa"
              </CardTitle>
              <CardDescription className="section-description-academic mt-2">
                Análise pré-processada com suporte computacional, utilizando métricas de keyness (Log-Likelihood e Mutual Information)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateReport}>
                <FileText className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Buscar domínio..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cards de Domínios (2/3 da largura) */}
        <div className="xl:col-span-2 space-y-4">
          {dominiosFiltrados.map((dominio) => (
            <Card key={dominio.dominio} className="card-academic overflow-hidden">
              {/* Header do Card */}
              <div 
                className="h-2" 
                style={{ backgroundColor: dominio.cor }}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: dominio.cor }}
                    >
                      {dominio.dominio.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold">{dominio.dominio}</CardTitle>
                      <CardDescription className="mt-1">{dominio.descricao}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold" style={{ color: dominio.cor }}>
                      {dominio.percentual.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">do corpus</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Barra de Progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Representatividade</span>
                    <span className="font-medium">{dominio.percentual.toFixed(2)}%</span>
                  </div>
                  <Progress value={dominio.percentual} className="h-3" />
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{dominio.ocorrencias}</div>
                    <div className="text-xs text-muted-foreground mt-1">Ocorrências</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{dominio.riquezaLexical}</div>
                    <div className="text-xs text-muted-foreground mt-1">Lemas Únicos</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{dominio.avgLL.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground mt-1">LL Médio</div>
                  </div>
                </div>

                {/* Pills de Palavras */}
                <div>
                  <p className="text-sm font-medium mb-2">Palavras-chave identificadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {dominio.palavras.slice(0, 12).map((palavra, idx) => (
                      <Badge 
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ 
                          borderColor: dominio.cor,
                          color: dominio.cor,
                          backgroundColor: `${dominio.cor}10`
                        }}
                      >
                        {palavra}
                      </Badge>
                    ))}
                    {dominio.palavras.length > 12 && (
                      <Badge variant="secondary">
                        +{dominio.palavras.length - 12} palavras
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Painel Lateral de Insights (1/3 da largura) */}
        <div className="space-y-4">
          <Card className="card-academic">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Insights da Análise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Domínio Dominante */}
              {insights && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Domínio Dominante</h4>
                    </div>
                    <div className="p-4 rounded-lg border-2" style={{ borderColor: insights.dominante.cor }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: insights.dominante.cor }}
                        />
                        <span className="font-bold">{insights.dominante.dominio}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{insights.dominante.descricao}</p>
                      <div className="text-2xl font-bold" style={{ color: insights.dominante.cor }}>
                        {insights.dominante.percentual.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Densidade Lexical */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Densidade Lexical</h4>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-3xl font-bold text-foreground">
                        {insights.densidadeLexical.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        ocorrências por palavra-chave
                      </p>
                    </div>
                  </div>

                  {/* Equilíbrio Temático */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Distribuição Temática</h4>
                    </div>
                    <div className="space-y-2">
                      {demoData.slice().sort((a, b) => b.percentual - a.percentual).map((d) => (
                        <div key={d.dominio} className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: d.cor }}
                          />
                          <span className="text-xs flex-1 truncate">{d.dominio}</span>
                          <span className="text-xs font-medium">{d.percentual.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
