/**
 * LexicalDomainCloud - Nuvem de Domínios Semânticos
 * Sprint LF-5 Fase 3: Visualização de nuvem de palavras por domínio
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Cloud, Tag } from 'lucide-react';
import { DomainStats, LexicalCloudNode } from '@/hooks/useLexicalDomainsData';

interface LexicalDomainCloudProps {
  cloudData: LexicalCloudNode[];
  domains: DomainStats[];
  onDomainClick?: (domain: string) => void;
  onWordClick?: (word: string) => void;
}

// Paleta de cores para domínios
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(142, 76%, 36%)',
  'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)',
  'hsl(173, 80%, 40%)',
  'hsl(330, 81%, 60%)',
];

export function LexicalDomainCloud({ cloudData, domains, onDomainClick, onWordClick }: LexicalDomainCloudProps) {
  const [viewMode, setViewMode] = useState<'domains' | 'words'>('domains');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // Calcular tamanhos de fonte baseado em valores
  const maxValue = Math.max(...cloudData.map(n => n.value));
  const minValue = Math.min(...cloudData.map(n => n.value));
  
  const getFontSize = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    return Math.round(12 + normalized * 24); // 12px a 36px
  };

  // Palavras para nuvem de palavras (top 50 de todos os domínios)
  const wordCloudData = useMemo(() => {
    const allWords = domains
      .flatMap((d, idx) => d.keywords.slice(0, 10).map(kw => ({
        ...kw,
        color: COLORS[idx % COLORS.length],
        domainName: d.domain
      })))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50);
    return allWords;
  }, [domains]);

  const handleExportPNG = () => {
    // Implementar exportação via html2canvas
    const element = document.getElementById('lexical-cloud-container');
    if (element) {
      import('html2canvas').then(({ default: html2canvas }) => {
        html2canvas(element).then(canvas => {
          const link = document.createElement('a');
          link.download = `nuvem-dominios-${Date.now()}.png`;
          link.href = canvas.toDataURL();
          link.click();
        });
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Nuvem de Domínios Semânticos
            </CardTitle>
            <CardDescription>
              Visualização interativa dos domínios temáticos
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'domains' | 'words')}>
              <TabsList className="h-8">
                <TabsTrigger value="domains" className="text-xs px-3">Domínios</TabsTrigger>
                <TabsTrigger value="words" className="text-xs px-3">Palavras</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={handleExportPNG} className="gap-2">
              <Download className="w-4 h-4" />
              PNG
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          id="lexical-cloud-container"
          className="min-h-[400px] p-6 bg-muted/30 rounded-lg flex flex-wrap items-center justify-center gap-3"
        >
          <TooltipProvider delayDuration={100}>
            {viewMode === 'domains' ? (
              // Nuvem de Domínios
              cloudData.map((node, idx) => (
                <Tooltip key={node.id}>
                  <TooltipTrigger asChild>
                    <button
                      className="transition-all duration-200 hover:scale-110 hover:opacity-80"
                      style={{
                        fontSize: `${getFontSize(node.value)}px`,
                        color: node.color,
                        fontWeight: node.value > (maxValue + minValue) / 2 ? 600 : 400,
                      }}
                      onClick={() => {
                        setSelectedDomain(node.id);
                        onDomainClick?.(node.id);
                      }}
                    >
                      {node.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="text-xs space-y-1">
                      <div className="font-semibold">{node.label}</div>
                      <div>{node.value.toLocaleString()} ocorrências</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))
            ) : (
              // Nuvem de Palavras
              wordCloudData.map((word, idx) => {
                const fontSize = Math.round(10 + (word.frequency / wordCloudData[0].frequency) * 20);
                return (
                  <Tooltip key={`${word.word}-${idx}`}>
                    <TooltipTrigger asChild>
                      <button
                        className="transition-all duration-200 hover:scale-110 hover:opacity-80"
                        style={{
                          fontSize: `${fontSize}px`,
                          color: word.color,
                          fontWeight: word.frequency > wordCloudData[10]?.frequency ? 600 : 400,
                        }}
                        onClick={() => onWordClick?.(word.word)}
                      >
                        {word.word}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs space-y-1">
                        <div className="font-semibold">{word.word}</div>
                        <div>Domínio: {word.domainName}</div>
                        <div>Frequência: {word.frequency}</div>
                        {word.isHapax && <Badge variant="outline" className="text-[10px]">Hapax</Badge>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </TooltipProvider>
        </div>

        {/* Legenda de Domínios */}
        {viewMode === 'words' && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {domains.slice(0, 10).map((d, idx) => (
              <Badge
                key={d.domain}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-muted"
                style={{ borderColor: COLORS[idx % COLORS.length] }}
                onClick={() => onDomainClick?.(d.domain)}
              >
                <span 
                  className="w-2 h-2 rounded-full mr-1.5" 
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                {d.domain}
              </Badge>
            ))}
          </div>
        )}

        {/* Domínio Selecionado */}
        {selectedDomain && (
          <div className="mt-4 p-4 bg-background border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {selectedDomain}
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDomain(null)}>
                ✕
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {domains.find(d => d.domain === selectedDomain)?.keywords.slice(0, 20).map(kw => (
                <Badge
                  key={kw.word}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-primary/20"
                  onClick={() => onWordClick?.(kw.word)}
                >
                  {kw.word} ({kw.frequency})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
