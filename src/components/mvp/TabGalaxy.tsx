import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Layers, Tag } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { getDemoAnalysisResults } from "@/services/demoCorpusService";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { OptimizedSemanticCloud } from "./OptimizedSemanticCloud";

interface TabGalaxyProps {
  demo?: boolean;
}

type ViewMode = 'domains' | 'keywords';

export function TabGalaxy({ demo = false }: TabGalaxyProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('domains');
  const [isLoading, setIsLoading] = useState(false);
  const [demoData, setDemoData] = useState<any>(null);

  useEffect(() => {
    if (demo) {
      setIsLoading(true);
      getDemoAnalysisResults()
        .then(result => {
          setDemoData(result);
          toast.success('Visualização carregada com sucesso');
        })
        .catch(error => {
          console.error('Erro ao carregar dados demo:', error);
          toast.error('Erro ao carregar visualização');
        })
        .finally(() => setIsLoading(false));
    }
  }, [demo]);

  // Transformar dados para formato CloudNode
  const cloudNodes = useMemo(() => {
    if (!demoData) return [];

    if (viewMode === 'domains') {
      // Domínios Semânticos: fontes 48-72px
      return demoData.dominios.map((d: any) => ({
        id: `domain-${d.dominio}`,
        label: d.dominio,
        x: 0, // Será calculado pelo componente
        y: 0,
        z: 80,
        fontSize: 48 + Math.min(24, d.percentual * 2), // 48-72px
        color: d.cor,
        type: 'domain' as const,
        frequency: d.ocorrencias,
        domain: d.dominio,
        tooltip: {
          nome: d.dominio,
          ocorrencias: d.ocorrencias,
          riquezaLexical: d.riquezaLexical,
          percentual: d.percentual,
          avgLL: d.avgLL
        }
      }));
    } else {
      // Palavras-chave: fontes 14-36px baseadas em LL score
      const keywords = demoData.keywords.filter((k: any) => k.significancia !== 'Baixa');
      return keywords.map((k: any) => ({
        id: `keyword-${k.palavra}`,
        label: k.palavra,
        x: 0,
        y: 0,
        z: 20 + Math.random() * 30,
        fontSize: 14 + Math.min(22, k.ll / 3), // 14-36px
        color: k.cor,
        type: 'keyword' as const,
        frequency: k.frequencia,
        domain: k.dominio,
        tooltip: {
          palavra: k.palavra,
          dominio: k.dominio,
          frequencia: k.frequencia,
          ll: k.ll,
          mi: k.mi,
          significancia: k.significancia,
          prosody: k.prosody
        }
      }));
    }
  }, [demoData, viewMode]);

  if (!demo) {
    return (
      <Card className="card-academic">
        <CardHeader>
          <CardTitle className="section-header-academic flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Nuvem de Domínios Semânticos
          </CardTitle>
          <CardDescription className="section-description-academic">
            Visualização interativa - Disponível apenas em modo demo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg border">
            <p className="text-muted-foreground">Dados não disponíveis no modo padrão</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="card-academic">
        <CardHeader>
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-academic">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="section-header-academic flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Nuvem Semântica - "Quando o Verso Vem pras Casa"
              </CardTitle>
              <CardDescription className="section-description-academic mt-2">
                Visualização por {viewMode === 'domains' ? 'domínios semânticos' : 'palavras-chave'} com magnitude proporcional
              </CardDescription>
            </div>
            
            {/* Toggle de Visualização */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'domains' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('domains')}
                className="gap-2"
              >
                <Layers className="w-4 h-4" />
                Domínios
              </Button>
              <Button
                variant={viewMode === 'keywords' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('keywords')}
                className="gap-2"
              >
                <Tag className="w-4 h-4" />
                Palavras-chave
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <OptimizedSemanticCloud 
            nodes={cloudNodes}
            onWordClick={(word) => {
              console.log('Palavra clicada:', word);
            }}
            onDomainClick={(domain) => {
              console.log('Domínio clicado para filtro:', domain);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
