import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import cloud from 'd3-cloud';
import * as d3 from 'd3';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CloudNode {
  label: string;
  frequency: number;
  color: string;
  type: 'domain' | 'keyword';
  domain: string;
  tooltip: Record<string, any>;
}

interface D3CloudWord {
  text: string;
  size: number;
  color: string;
  type: 'domain' | 'keyword';
  data: {
    frequency: number;
    domain: string;
    tooltip: Record<string, any>;
  };
  x?: number;
  y?: number;
  rotate?: number;
}

interface D3SemanticCloudProps {
  nodes: CloudNode[];
  width?: number;
  height?: number;
  padding?: number;
  spiral?: 'archimedean' | 'rectangular';
  rotation?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'semibold' | 'bold';
  animationSpeed?: number;
  showTooltips?: boolean;
  onWordClick?: (word: string) => void;
  onDomainClick?: (domain: string) => void;
}

export function D3SemanticCloud({ 
  nodes, 
  width = 1200, 
  height = 700,
  padding = 6,
  spiral = 'archimedean',
  rotation = 0,
  fontFamily = 'Inter',
  fontWeight = 'semibold',
  animationSpeed = 600,
  showTooltips = true,
  onWordClick,
  onDomainClick
}: D3SemanticCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tippyInstances = useRef<TippyInstance[]>([]);
  const [layoutWords, setLayoutWords] = useState<D3CloudWord[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();

  const d3Words: D3CloudWord[] = useMemo(() => {
    return nodes.map(node => ({
      text: node.label,
      size: node.type === 'domain' ? 48 + Math.min(24, (node.tooltip.percentual || 0) * 2) : 14 + Math.min(22, (node.tooltip.ll || 0) / 3),
      color: node.color,
      type: node.type,
      data: { frequency: node.frequency, domain: node.domain, tooltip: node.tooltip }
    }));
  }, [nodes]);

  useEffect(() => {
    if (d3Words.length === 0) return;
    const layout = cloud().size([width, height]).words(d3Words as any).padding(padding).rotate(() => rotation).fontSize(d => d.size).spiral(spiral).on('end', (words) => setLayoutWords(words as D3CloudWord[]));
    layout.start();
  }, [d3Words, width, height, padding, spiral, rotation]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = svg.select('g.cloud-group');
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 4]).on('zoom', (event) => {
      g.attr('transform', `translate(${width / 2},${height / 2}) ${event.transform}`);
      setZoomLevel(event.transform.k);
    });
    svg.call(zoom);
    zoomBehavior.current = zoom;
    return () => { svg.on('.zoom', null); };
  }, [width, height]);

  useEffect(() => {
    if (!svgRef.current || layoutWords.length === 0) return;
    tippyInstances.current.forEach(instance => instance.destroy());
    tippyInstances.current = [];
    const svg = d3.select(svgRef.current);
    const g = svg.select('g.cloud-group');
    const texts = g.selectAll('text').data(layoutWords, (d: any) => d.text);
    const fontWeightNum = fontWeight === 'normal' ? '400' : fontWeight === 'semibold' ? '600' : '700';
    const enter = texts.enter().append('text').style('font-family', `${fontFamily}, system-ui, sans-serif`).style('font-weight', fontWeightNum).style('cursor', 'pointer').attr('text-anchor', 'middle').attr('fill', d => d.color).text(d => d.text);
    enter.attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`).style('font-size', 0).style('opacity', 0).transition().duration(animationSpeed).ease(d3.easeCubicOut).style('font-size', d => `${d.size}px`).style('opacity', 1);
    texts.transition().duration(400).attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`).style('font-size', d => `${d.size}px`);
    texts.exit().transition().duration(300).style('font-size', 0).style('opacity', 0).remove();
    if (showTooltips) {
      g.selectAll('text').each(function(d: D3CloudWord) {
        const element = this as Element;
        const tooltipContent = d.type === 'domain' ? `<div style="padding:12px">${d.data.tooltip.nome}</div>` : `<div style="padding:12px">${d.data.tooltip.palavra}</div>`;
        const instance = tippy(element, { content: tooltipContent, allowHTML: true, theme: 'light', animation: 'scale', placement: 'top', interactive: true, maxWidth: 350, delay: [100, 0] });
        tippyInstances.current.push(instance);
      });
    }
    g.selectAll('text').on('click', function(event, d: D3CloudWord) {
      if (d.type === 'domain' && onDomainClick) onDomainClick(d.text);
      else if (d.type === 'keyword' && onWordClick) onWordClick(d.text);
    });
    return () => { tippyInstances.current.forEach(instance => instance.destroy()); tippyInstances.current = []; };
  }, [layoutWords, onWordClick, onDomainClick, showTooltips, fontFamily, fontWeight, animationSpeed]);

  const handleZoomIn = () => { if (svgRef.current && zoomBehavior.current) d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 1.3); };
  const handleZoomOut = () => { if (svgRef.current && zoomBehavior.current) d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 0.7); };
  const handleResetZoom = () => { if (svgRef.current && zoomBehavior.current) d3.select(svgRef.current).transition().duration(500).call(zoomBehavior.current.transform, d3.zoomIdentity); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="relative w-full h-full">
      <svg ref={svgRef} width={width} height={height} className="w-full h-full">
        <g className="cloud-group" transform={`translate(${width / 2},${height / 2})`} />
      </svg>
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-card/90 backdrop-blur-sm rounded-lg p-2 shadow-lg z-10">
        <Button size="icon" variant="outline" onClick={handleZoomIn}><ZoomIn className="w-4 h-4" /></Button>
        <Button size="icon" variant="outline" onClick={handleZoomOut}><ZoomOut className="w-4 h-4" /></Button>
        <Button size="icon" variant="outline" onClick={handleResetZoom}><Maximize2 className="w-4 h-4" /></Button>
        <div className="text-xs text-center text-muted-foreground px-1">{(zoomLevel * 100).toFixed(0)}%</div>
      </div>
    </motion.div>
  );
}
