import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboardAnaliseContext } from '@/contexts/DashboardAnaliseContext';
import { Database, Download, FileText, TrendingUp, BarChart3, Lightbulb, AlertCircle, Target } from 'lucide-react';
import { toast } from 'sonner';

export function TabDominios() {
  const { processamentoData } = useDashboardAnaliseContext();
  const dominios = processamentoData.analysisResults?.dominios || [];
  const keywords = processamentoData.analysisResults?.keywords || [];
  const [searchTerm, setSearchTerm] = useState("");

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

  // Função de normalização de texto (remove acentos)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Buscar dados de palavra nos keywords
  const findWordData = (palavra: string) => {
    if (!keywords) return null;
    const normalizedPalavra = normalizeText(palavra);
    return keywords.find(k => normalizeText(k.palavra) === normalizedPalavra);
  };

  const dominiosFiltrados = useMemo(() => {
    if (!dominios) return [];
    return dominios.filter(d => 
      d.dominio.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dominios, searchTerm]);

  const insights = useMemo(() => {
    if (!dominios || dominios.length === 0) return null;
    
    const dominante = dominios.reduce((max, d) => d.percentual > max.percentual ? d : max);
    const totalOcorrencias = dominios.reduce((sum, d) => sum + d.ocorrencias, 0);
    const totalPalavras = dominios.reduce((sum, d) => sum + d.palavras.length, 0);
    const densidadeLexical = totalOcorrencias / totalPalavras;
    
    return { dominante, densidadeLexical };
  }, [dominios]);

  const handleExportCSV = () => {
    if (!dominios) return;
    
    const csvHeader = "Domínio,Descrição,Percentual,Ocorrências,Riqueza Lexical,Palavras\n";
    const csvRows = dominios.map(d => 
      `"${d.dominio}","${d.descricao || ''}",${d.percentual.toFixed(2)},${d.ocorrencias},${d.riquezaLexical},"${d.palavras.join(', ')}"`
    ).join("\n");
    
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dominios-semanticos-analise.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso');
  };

  return (
    <div className="space-y-6">
      {/* Header com busca e exportação */}
      <Card className="card-academic">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="section-header-academic flex items-center gap-2">
                <Database className="w-5 h-5" />
                Domínios Semânticos Identificados
              </CardTitle>
              <CardDescription className="section-description-academic mt-2">
                Análise completa dos domínios semânticos com métricas detalhadas
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
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
          <TooltipProvider delayDuration={300}>
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
                        {dominio.codigo || dominio.dominio.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl font-bold">{dominio.dominio}</CardTitle>
                          <Badge variant="secondary" className="text-xs">{dominio.codigo}</Badge>
                        </div>
                        {dominio.descricao && (
                          <CardDescription className="mt-1">{dominio.descricao}</CardDescription>
                        )}
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground cursor-help">Representatividade</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Peso textual do domínio no corpus analisado</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="font-medium">{dominio.percentual.toFixed(2)}%</span>
                    </div>
                    <Progress value={dominio.percentual} className="h-3" />
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center p-3 bg-muted/50 rounded-lg cursor-help">
                          <div className="text-2xl font-bold text-foreground">{dominio.ocorrencias}</div>
                          <div className="text-xs text-muted-foreground mt-1">Ocorrências</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Número total de vezes que palavras deste domínio aparecem</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center p-3 bg-muted/50 rounded-lg cursor-help">
                          <div className="text-2xl font-bold text-foreground">{dominio.riquezaLexical}</div>
                          <div className="text-xs text-muted-foreground mt-1">Lemas Únicos</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Quantidade de palavras diferentes (riqueza lexical) neste domínio</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center p-3 bg-muted/50 rounded-lg cursor-help">
                          <div className="text-2xl font-bold text-foreground">{dominio.avgLL?.toFixed(1) || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground mt-1">LL Médio</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Log-Likelihood médio das palavras (significância estatística)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Pills de Palavras com Tooltips */}
                  <div>
                    <p className="text-sm font-medium mb-2">Palavras-chave identificadas ({dominio.palavras.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {dominio.palavras.map((palavra, idx) => {
                        const wordData = findWordData(palavra);
                        
                        return (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Badge 
                                  variant="outline"
                                  className="cursor-help hover:scale-105 transition-all"
                                  style={{ 
                                    borderColor: dominio.cor,
                                    color: dominio.cor,
                                    backgroundColor: `${dominio.cor}10`
                                  }}
                                >
                                  {palavra}
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            {wordData ? (
                              <TooltipContent side="top" className="w-80 p-4 z-[9999]" sideOffset={5}>
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-base">{palavra}</h4>
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Frequência:</span>
                                      <p className="font-mono font-semibold text-sm">{wordData.frequencia.toFixed(2)}%</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Prosódia:</span>
                                      <Badge 
                                        variant="outline" 
                                        className={
                                          wordData.prosody === 'Positiva' 
                                            ? 'bg-green-500/10 text-green-600 border-green-500/30'
                                            : wordData.prosody === 'Negativa'
                                            ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                            : 'bg-muted/20 text-muted-foreground border-border'
                                        }
                                      >
                                        {wordData.prosody}
                                      </Badge>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">LL Score:</span>
                                      <p className="font-mono text-sm">{wordData.ll.toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">MI Score:</span>
                                      <p className="font-mono text-sm">{wordData.mi.toFixed(2)}</p>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t">
                                    <Badge variant="secondary" className="text-xs">
                                      {wordData.significancia}
                                    </Badge>
                                  </div>
                                </div>
                              </TooltipContent>
                            ) : (
                              <TooltipContent side="top" className="w-60 p-3 z-[9999]" sideOffset={5}>
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">{palavra}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    Dados estatísticos não disponíveis para esta palavra.
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {dominio.dominio}
                                  </Badge>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TooltipProvider>
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
                      <div className="font-bold text-lg mb-1">{insights.dominante.dominio}</div>
                      <div className="text-2xl font-bold mb-2" style={{ color: insights.dominante.cor }}>
                        {insights.dominante.percentual.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {insights.dominante.ocorrencias} ocorrências
                      </div>
                    </div>
                  </div>

                  {/* Densidade Lexical */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Densidade Lexical</h4>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold mb-1">
                        {insights.densidadeLexical.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ocorrências por lema único
                      </div>
                    </div>
                  </div>

                  {/* Distribuição Temática */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Distribuição Temática</h4>
                    </div>
                    <div className="space-y-2">
                      {dominios.slice(0, 5).map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: d.cor }}
                            />
                            <span className="text-xs truncate max-w-[120px]">{d.dominio}</span>
                          </div>
                          <span className="font-semibold text-xs">{d.percentual.toFixed(1)}%</span>
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
