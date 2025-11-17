import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import cloud from 'd3-cloud';
import * as d3 from 'd3';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

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
  onWordClick,
  onDomainClick
}: D3SemanticCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tippyInstances = useRef<TippyInstance[]>([]);
  const [layoutWords, setLayoutWords] = useState<D3CloudWord[]>([]);

  // Converter CloudNode → D3CloudWord
  const d3Words: D3CloudWord[] = useMemo(() => {
    return nodes.map(node => ({
      text: node.label,
      size: node.type === 'domain' 
        ? 48 + Math.min(24, (node.tooltip.percentual || 0) * 2)
        : 14 + Math.min(22, (node.tooltip.ll || 0) / 3),
      color: node.color,
      type: node.type,
      data: {
        frequency: node.frequency,
        domain: node.domain,
        tooltip: node.tooltip
      }
    }));
  }, [nodes]);

  // Gerar layout com D3-Cloud
  useEffect(() => {
    if (d3Words.length === 0) return;

    const layout = cloud()
      .size([width, height])
      .words(d3Words as any)
      .padding(padding)
      .rotate(() => rotation)
      .fontSize(d => d.size)
      .spiral(spiral)
      .on('end', (words) => {
        setLayoutWords(words as D3CloudWord[]);
      });

    layout.start();
  }, [d3Words, width, height, padding, spiral, rotation]);

  // Renderizar com D3 + Tippy
  useEffect(() => {
    if (!svgRef.current || layoutWords.length === 0) return;

    // Limpar tooltips anteriores
    tippyInstances.current.forEach(instance => instance.destroy());
    tippyInstances.current = [];

    const svg = d3.select(svgRef.current);
    const g = svg.select('g.cloud-group');

    // Bind data
    const texts = g
      .selectAll('text')
      .data(layoutWords, (d: any) => d.text);

    // Enter + Update
    const enter = texts
      .enter()
      .append('text')
      .style('font-family', 'var(--font-sans, Inter, system-ui, sans-serif)')
      .style('font-weight', (d) => d.type === 'domain' ? '700' : '600')
      .style('cursor', 'pointer')
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.color)
      .text(d => d.text);

    // Animação de entrada
    enter
      .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
      .style('font-size', 0)
      .style('opacity', 0)
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .style('font-size', d => `${d.size}px`)
      .style('opacity', 1);

    // Atualizar posições
    texts
      .transition()
      .duration(400)
      .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
      .style('font-size', d => `${d.size}px`);

    // Exit
    texts.exit()
      .transition()
      .duration(300)
      .style('font-size', 0)
      .style('opacity', 0)
      .remove();

    // Adicionar tooltips com Tippy.js
    g.selectAll('text').each(function(d: any) {
      const element = this as Element;
      const word = d as D3CloudWord;
      
      const tooltipContent = word.type === 'domain' 
        ? createDomainTooltip(word.data.tooltip)
        : createKeywordTooltip(word.data.tooltip);

      const instance = tippy(element, {
        content: tooltipContent,
        allowHTML: true,
        theme: 'light',
        animation: 'scale',
        placement: 'top',
        interactive: true,
        maxWidth: 350,
        delay: [100, 0]
      });

      tippyInstances.current.push(instance);
    });

    // Click handlers
    g.selectAll('text').on('click', function(event, d: any) {
      const word = d as D3CloudWord;
      if (word.type === 'domain' && onDomainClick) {
        onDomainClick(word.text);
      } else if (word.type === 'keyword' && onWordClick) {
        onWordClick(word.text);
      }
    });

    // Cleanup
    return () => {
      tippyInstances.current.forEach(instance => instance.destroy());
      tippyInstances.current = [];
    };
  }, [layoutWords, onWordClick, onDomainClick]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-full"
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
      >
        <g className="cloud-group" transform={`translate(${width / 2},${height / 2})`} />
      </svg>
    </motion.div>
  );
}

// Helper: Tooltip para Domínios
function createDomainTooltip(tooltip: any): string {
  return `
    <div style="padding: 12px; font-family: var(--font-sans, Inter, sans-serif);">
      <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: hsl(var(--foreground));">
        ${tooltip.nome || tooltip.dominio || 'Domínio'}
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: hsl(var(--muted-foreground));">
        <div><strong>Ocorrências:</strong> ${tooltip.ocorrencias?.toLocaleString() || 0}</div>
        <div><strong>Riqueza Lexical:</strong> ${tooltip.riquezaLexical || 0} palavras</div>
        <div><strong>Percentual:</strong> ${tooltip.percentual?.toFixed(2) || 0}%</div>
        ${tooltip.avgLL ? `<div><strong>Avg LL:</strong> ${tooltip.avgLL.toFixed(2)}</div>` : ''}
        ${tooltip.avgMI ? `<div><strong>Avg MI:</strong> ${tooltip.avgMI.toFixed(2)}</div>` : ''}
        ${tooltip.descricao ? `<div style="margin-top: 8px; font-style: italic;">${tooltip.descricao}</div>` : ''}
      </div>
    </div>
  `;
}

// Helper: Tooltip para Keywords
function createKeywordTooltip(tooltip: any): string {
  const prosodyInfo = getProsodyInfo(tooltip.prosody);
  
  return `
    <div style="padding: 12px; font-family: var(--font-sans, Inter, sans-serif);">
      <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: hsl(var(--foreground));">
        ${tooltip.palavra || tooltip.label || 'Palavra'}
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: hsl(var(--muted-foreground));">
        <div><strong>Domínio:</strong> ${tooltip.dominio || tooltip.domain || '-'}</div>
        <div><strong>Frequência:</strong> ${tooltip.frequencia || tooltip.frequency || 0}</div>
        ${tooltip.ll ? `<div><strong>LL Score:</strong> ${tooltip.ll.toFixed(2)}</div>` : ''}
        ${tooltip.mi ? `<div><strong>MI Score:</strong> ${tooltip.mi.toFixed(2)}</div>` : ''}
        ${tooltip.significancia ? `<div><strong>Significância:</strong> ${tooltip.significancia}</div>` : ''}
      </div>
      <div style="margin-top: 12px; padding: 8px; background: ${prosodyInfo.bg}; border-radius: 6px;">
        <span style="font-size: 12px; color: #555; font-weight: 500;">
          ${prosodyInfo.emoji} Prosódia <strong>${prosodyInfo.label}</strong>
        </span>
      </div>
    </div>
  `;
}

function getProsodyInfo(prosody: number | string | undefined) {
  if (typeof prosody === 'string') {
    const emoji = prosody === 'Positiva' ? '😊' : prosody === 'Negativa' ? '😔' : '😐';
    const bg = prosody === 'Positiva' ? '#dcfce7' : prosody === 'Negativa' ? '#fee2e2' : '#fef9c3';
    return { emoji, label: prosody, bg };
  }
  const value = prosody ?? 0;
  const emoji = value > 0 ? '😊' : value < 0 ? '😔' : '😐';
  const label = value > 0 ? 'Positiva' : value < 0 ? 'Negativa' : 'Neutra';
  const bg = value > 0 ? '#dcfce7' : value < 0 ? '#fee2e2' : '#fef9c3';
  return { emoji, label, bg };
}
