import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DemoDomain } from "@/services/demoCorpusService";

interface DomainComparisonProps {
  dominios: DemoDomain[];
}

export function DomainComparison({ dominios }: DomainComparisonProps) {
  const [dominio1, setDominio1] = useState<string>("");
  const [dominio2, setDominio2] = useState<string>("");

  const domain1Data = dominios.find(d => d.dominio === dominio1);
  const domain2Data = dominios.find(d => d.dominio === dominio2);

  // Calcular palavras exclusivas e compartilhadas
  const palavrasCompartilhadas = domain1Data && domain2Data 
    ? domain1Data.palavras.filter(p => domain2Data.palavras.includes(p))
    : [];
  
  const palavrasExclusivas1 = domain1Data && domain2Data
    ? domain1Data.palavras.filter(p => !domain2Data.palavras.includes(p))
    : [];
    
  const palavrasExclusivas2 = domain1Data && domain2Data
    ? domain2Data.palavras.filter(p => !domain1Data.palavras.includes(p))
    : [];

  const handleSwap = () => {
    const temp = dominio1;
    setDominio1(dominio2);
    setDominio2(temp);
  };

  return (
    <Card className="card-academic">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5" />
          Comparação de Domínios Semânticos
        </CardTitle>
        <CardDescription>
          Compare dois domínios para identificar palavras exclusivas e compartilhadas
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Seleção de Domínios */}
        <div className="grid grid-cols-3 gap-4 items-center">
          <Select value={dominio1} onValueChange={setDominio1}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o primeiro domínio" />
            </SelectTrigger>
            <SelectContent>
              {dominios.map((d) => (
                <SelectItem key={d.dominio} value={d.dominio}>
                  {d.dominio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex justify-center">
            <Button variant="outline" size="icon" onClick={handleSwap}>
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          </div>

          <Select value={dominio2} onValueChange={setDominio2}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o segundo domínio" />
            </SelectTrigger>
            <SelectContent>
              {dominios.map((d) => (
                <SelectItem key={d.dominio} value={d.dominio}>
                  {d.dominio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comparação Visual */}
        {domain1Data && domain2Data && (
          <>
            {/* Cards de Métricas Comparativas */}
            <div className="grid grid-cols-2 gap-4">
              {/* Domínio 1 */}
              <Card style={{ borderTop: `4px solid ${domain1Data.cor}` }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{domain1Data.dominio}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Percentual:</span>
                      <span className="font-semibold">{domain1Data.percentual.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ocorrências:</span>
                      <span className="font-semibold">{domain1Data.ocorrencias}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lemas Únicos:</span>
                      <span className="font-semibold">{domain1Data.riquezaLexical}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LL Médio:</span>
                      <span className="font-semibold">{domain1Data.avgLL.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Domínio 2 */}
              <Card style={{ borderTop: `4px solid ${domain2Data.cor}` }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{domain2Data.dominio}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Percentual:</span>
                      <span className="font-semibold">{domain2Data.percentual.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ocorrências:</span>
                      <span className="font-semibold">{domain2Data.ocorrencias}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lemas Únicos:</span>
                      <span className="font-semibold">{domain2Data.riquezaLexical}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LL Médio:</span>
                      <span className="font-semibold">{domain2Data.avgLL.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Análise de Diferenças */}
            <div className="grid grid-cols-3 gap-4">
              {/* Palavras Exclusivas do Domínio 1 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: domain1Data.cor }} />
                    Exclusivas de {domain1Data.dominio}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {palavrasExclusivas1.length} palavras únicas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                    {palavrasExclusivas1.map((palavra, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline"
                        style={{ 
                          borderColor: domain1Data.cor,
                          color: domain1Data.cor
                        }}
                      >
                        {palavra}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Palavras Compartilhadas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Minus className="w-4 h-4 text-muted-foreground" />
                    Compartilhadas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {palavrasCompartilhadas.length} palavras em comum
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                    {palavrasCompartilhadas.map((palavra, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary"
                      >
                        {palavra}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Palavras Exclusivas do Domínio 2 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" style={{ color: domain2Data.cor }} />
                    Exclusivas de {domain2Data.dominio}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {palavrasExclusivas2.length} palavras únicas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                    {palavrasExclusivas2.map((palavra, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline"
                        style={{ 
                          borderColor: domain2Data.cor,
                          color: domain2Data.cor
                        }}
                      >
                        {palavra}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insights Comparativos */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">💡 Insights da Comparação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>{domain1Data.dominio}</strong> representa{' '}
                    <strong>{domain1Data.percentual.toFixed(2)}%</strong> do corpus, enquanto{' '}
                    <strong>{domain2Data.dominio}</strong> representa{' '}
                    <strong>{domain2Data.percentual.toFixed(2)}%</strong>.
                  </p>
                  <p>
                    {palavrasCompartilhadas.length > 0 ? (
                      <>
                        Há <strong>{palavrasCompartilhadas.length} palavras compartilhadas</strong> entre os domínios,
                        sugerindo uma sobreposição temática de{' '}
                        <strong>
                          {((palavrasCompartilhadas.length / Math.max(domain1Data.palavras.length, domain2Data.palavras.length)) * 100).toFixed(1)}%
                        </strong>.
                      </>
                    ) : (
                      <>Os domínios são <strong>completamente distintos</strong>, sem palavras compartilhadas.</>
                    )}
                  </p>
                  <p>
                    <strong>{domain1Data.dominio}</strong> possui{' '}
                    <strong>{palavrasExclusivas1.length} palavras exclusivas</strong>, enquanto{' '}
                    <strong>{domain2Data.dominio}</strong> possui{' '}
                    <strong>{palavrasExclusivas2.length}</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!domain1Data || !domain2Data ? (
          <div className="text-center py-12 text-muted-foreground">
            Selecione dois domínios para começar a comparação
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
