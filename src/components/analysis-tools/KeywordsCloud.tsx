/**
 * ☁️ KEYWORDS CLOUD
 * 
 * Visualização interativa de palavras-chave usando D3
 * - Tamanho proporcional ao Log-Likelihood
 * - Cores por efeito (super/sub-representado)
 * - Hover com tooltip
 * - Click navega para KWIC
 * - Filtros e exportação PNG
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  RefreshCw, 
  Filter,
  Cloud,
  Loader2
} from 'lucide-react';
import { useTools } from '@/contexts/ToolsContext';
import { KeywordEntry } from '@/data/types/corpus-tools.types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CloudWord {
  text: string;
  size: number;
  ll: number;
  mi: number;
  freqEstudo: number;
  freqRef: number;
  effect: 'positive' | 'negative';
  x?: number;
  y?: number;
  rotate?: number;
}

interface KeywordsCloudProps {
  className?: string;
}

export function KeywordsCloud({ className }: KeywordsCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { keywordsState, navigateToKWIC, activeTab } = useTools();
  
  // Filtros
  const [minLL, setMinLL] = useState(3.84); // p < 0.05
  const [maxWords, setMaxWords] = useState(100);
  const [effectFilter, setEffectFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Dimensões responsivas
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  
  // Atualizar dimensões
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(400, width - 32),
          height: Math.max(300, Math.min(500, width * 0.6))
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Processar dados para a nuvem
  const cloudWords = useMemo<CloudWord[]>(() => {
    const keywords = keywordsState.keywords || [];
    
    if (keywords.length === 0) return [];
    
    // Filtrar por LL e efeito
    let filtered = keywords.filter(k => {
      const ll = k.ll ?? 0;
      if (Math.abs(ll) < minLL) return false;
      
      const effect = ll > 0 ? 'positive' : 'negative';
      if (effectFilter !== 'all' && effect !== effectFilter) return false;
      
      return true;
    });
    
    // Ordenar por LL absoluto e limitar
    filtered = filtered
      .sort((a, b) => Math.abs(b.ll ?? 0) - Math.abs(a.ll ?? 0))
      .slice(0, maxWords);
    
    // Escala de tamanho
    const llValues = filtered.map(k => Math.abs(k.ll ?? 0));
    const llMax = Math.max(...llValues, 1);
    const llMin = Math.min(...llValues, 0);
    
    const sizeScale = d3.scaleLinear()
      .domain([llMin, llMax])
      .range([12, 48]);
    
    return filtered.map(k => {
      const ll = k.ll ?? 0;
      return {
        text: k.palavra ?? '',
        size: sizeScale(Math.abs(ll)),
        ll,
        mi: k.mi ?? 0,
        freqEstudo: k.freqEstudo ?? 0,
        freqRef: k.freqReferencia ?? 0,
        effect: ll > 0 ? 'positive' : 'negative'
      } as CloudWord;
    });
  }, [keywordsState.keywords, minLL, maxWords, effectFilter]);
  
  // Gerar layout da nuvem
  const generateCloud = useCallback(() => {
    if (!svgRef.current || cloudWords.length === 0) return;
    
    setIsGenerating(true);
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const layout = cloud<CloudWord>()
      .size([dimensions.width, dimensions.height])
      .words(cloudWords.map(d => ({ ...d })))
      .padding(3)
      .rotate(() => (Math.random() > 0.5 ? 0 : 90 * (Math.random() > 0.5 ? 1 : -1)))
      .font('Inter, sans-serif')
      .fontSize(d => d.size || 12)
      .on('end', (words) => {
        const g = svg
          .append('g')
          .attr('transform', `translate(${dimensions.width / 2},${dimensions.height / 2})`);
        
        // Tooltip
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'keywords-cloud-tooltip')
          .style('position', 'absolute')
          .style('visibility', 'hidden')
          .style('background', 'hsl(var(--popover))')
          .style('color', 'hsl(var(--popover-foreground))')
          .style('padding', '8px 12px')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
          .style('pointer-events', 'none')
          .style('z-index', '9999');
        
        g.selectAll('text')
          .data(words)
          .enter()
          .append('text')
          .style('font-size', d => `${d.size}px`)
          .style('font-family', 'Inter, sans-serif')
          .style('font-weight', '600')
          .style('fill', d => d.effect === 'positive' 
            ? 'hsl(var(--chart-2))' // Verde para super-representado
            : 'hsl(var(--chart-1))' // Vermelho para sub-representado
          )
          .style('cursor', 'pointer')
          .style('transition', 'opacity 0.2s')
          .attr('text-anchor', 'middle')
          .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
          .text(d => d.text)
          .on('mouseover', function(event, d) {
            d3.select(this).style('opacity', 0.7);
            tooltip
              .style('visibility', 'visible')
              .html(`
                <div style="font-weight: bold; margin-bottom: 4px;">${d.text}</div>
                <div>LL: ${d.ll.toFixed(2)}</div>
                <div>MI: ${d.mi.toFixed(2)}</div>
                <div>Freq. Estudo: ${d.freqEstudo}</div>
                <div>Freq. Ref: ${d.freqRef}</div>
                <div style="margin-top: 4px; font-size: 10px; opacity: 0.7;">
                  ${d.effect === 'positive' ? '↑ Super-representado' : '↓ Sub-representado'}
                </div>
              `);
          })
          .on('mousemove', function(event) {
            tooltip
              .style('top', `${event.pageY - 10}px`)
              .style('left', `${event.pageX + 10}px`);
          })
          .on('mouseout', function() {
            d3.select(this).style('opacity', 1);
            tooltip.style('visibility', 'hidden');
          })
          .on('click', function(event, d) {
            navigateToKWIC(d.text, activeTab || 'cloud');
            tooltip.remove();
          });
        
        setIsGenerating(false);
        
        // Cleanup tooltip on unmount
        return () => tooltip.remove();
      });
    
    layout.start();
  }, [cloudWords, dimensions, navigateToKWIC, activeTab]);
  
  // Regenerar quando dados mudam
  useEffect(() => {
    if (cloudWords.length > 0) {
      generateCloud();
    }
  }, [cloudWords, generateCloud]);
  
  // Exportar PNG
  const handleExportPNG = useCallback(() => {
    if (!svgRef.current) return;
    
    const toastId = toast.loading('Exportando imagem...');
    
    try {
      const svgElement = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = dimensions.width * 2;
      canvas.height = dimensions.height * 2;
      
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `keywords-cloud-${new Date().toISOString().split('T')[0]}.png`;
          link.href = pngUrl;
          link.click();
          
          toast.success('Imagem exportada!', { id: toastId });
        };
        
        img.src = url;
      }
    } catch (error) {
      toast.error('Erro ao exportar', { id: toastId });
    }
  }, [dimensions]);
  
  const hasData = keywordsState.keywords && keywordsState.keywords.length > 0;
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-5 w-5" />
            Nuvem de Keywords
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateCloud}
              disabled={!hasData || isGenerating}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isGenerating && "animate-spin")} />
              Regenerar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportPNG}
              disabled={!hasData}
            >
              <Download className="h-4 w-4 mr-1" />
              PNG
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Filter className="h-3 w-3" />
              LL Mínimo: {minLL.toFixed(2)}
            </Label>
            <Slider
              value={[minLL]}
              onValueChange={([v]) => setMinLL(v)}
              min={0}
              max={15}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span>
              <span>3.84 (p&lt;0.05)</span>
              <span>15</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Máximo de Palavras: {maxWords}</Label>
            <Slider
              value={[maxWords]}
              onValueChange={([v]) => setMaxWords(v)}
              min={20}
              max={200}
              step={10}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Efeito</Label>
            <Select value={effectFilter} onValueChange={(v: any) => setEffectFilter(v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="positive">↑ Super-representado</SelectItem>
                <SelectItem value="negative">↓ Sub-representado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Área da nuvem */}
        <div 
          ref={containerRef}
          className="relative border rounded-lg bg-background overflow-hidden"
          style={{ minHeight: dimensions.height }}
        >
          {!hasData ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Cloud className="h-12 w-12 mb-2 opacity-30" />
              <p className="text-sm">Gere Keywords primeiro para visualizar a nuvem</p>
              <p className="text-xs mt-1">Use a aba "Keywords" para processar</p>
            </div>
          ) : isGenerating ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <svg
              ref={svgRef}
              width={dimensions.width}
              height={dimensions.height}
              className="mx-auto"
            />
          )}
        </div>
        
        {/* Legenda */}
        {hasData && (
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-2))]" />
              <span>Super-representado (LL &gt; 0)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-1))]" />
              <span>Sub-representado (LL &lt; 0)</span>
            </div>
            <span className="opacity-70">• Clique para ver KWIC</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
