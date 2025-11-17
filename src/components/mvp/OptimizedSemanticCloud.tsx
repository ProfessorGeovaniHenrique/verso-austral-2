import { useMemo, useState, useRef, useEffect } from 'react';
import ReactWordcloud from 'react-wordcloud';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Filter, X, Layers, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useKWICModal } from '@/hooks/useKWICModal';
import { KWICModal } from '@/components/KWICModal';

interface CloudNode {
  label: string;
  frequency: number;
  color: string;
  type: 'domain' | 'keyword';
  domain: string;
  tooltip: {
    nome?: string;
    palavra?: string;
    dominio?: string;
    ocorrencias?: number;
    percentual?: number;
    riquezaLexical?: number;
    frequencia?: number;
    ll?: number;
    significancia?: string;
  };
}

interface OptimizedSemanticCloudProps {
  nodes: CloudNode[];
  onWordClick?: (word: string) => void;
  onDomainClick?: (domain: string) => void;
}

type ViewMode = 'domains' | 'keywords';

export function OptimizedSemanticCloud({ 
  nodes, 
  onWordClick,
  onDomainClick 
}: OptimizedSemanticCloudProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('domains');
  const [filteredDomain, setFilteredDomain] = useState<string | null>(null);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 1400, height: 700 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { isOpen, closeModal, selectedWord, kwicData, isLoading, openModal } = useKWICModal();
  
  // Responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setDimensions({
          width: width > 0 ? width : 1400,
          height: 700
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Filter nodes by view mode and domain
  const displayedNodes = useMemo(() => {
    let filtered = nodes.filter(node => node.type === viewMode.slice(0, -1) as 'domain' | 'keyword');
    
    if (filteredDomain && viewMode === 'keywords') {
      filtered = filtered.filter(node => node.domain === filteredDomain);
    }
    
    return filtered;
  }, [nodes, viewMode, filteredDomain]);
  
  // Transform to react-wordcloud format
  const words = useMemo(() => {
    return displayedNodes.map(node => ({
      text: node.label,
      value: node.type === 'domain' ? node.frequency * 2 : node.frequency,
      // Store metadata for callbacks
      domain: node.domain,
      color: node.color,
      tooltip: node.tooltip
    }));
  }, [displayedNodes]);
  
  const options = useMemo(() => ({
    rotations: 0,
    rotationAngles: [0, 0] as [number, number],
    fontSizes: [14, 72] as [number, number],
    fontFamily: 'var(--font-sans), Inter, sans-serif',
    fontWeight: 'bold' as const,
    padding: 4,
    scale: 'sqrt' as const,
    spiral: 'archimedean' as const,
    deterministic: false,
    enableTooltip: true,
    tooltipOptions: {
      theme: 'light' as const,
      animation: 'scale' as const,
      arrow: true,
      placement: 'top' as const,
    },
    colors: words.map(w => w.color),
  }), [words]);
  
  const callbacks = useMemo(() => ({
    onWordClick: (word: any) => {
      const node = displayedNodes.find(n => n.label === word.text);
      if (!node) return;
      
      if (viewMode === 'domains') {
        // Filter by domain
        setFilteredDomain(node.domain);
        setViewMode('keywords');
        toast.info(`Filtrando palavras do domínio "${node.domain}"`);
        onDomainClick?.(node.domain);
      } else {
        // Open KWIC modal for keywords
        openModal(word.text);
        onWordClick?.(word.text);
      }
    },
    getWordTooltip: (word: any) => {
      const node = displayedNodes.find(n => n.label === word.text);
      if (!node) return word.text;
      
      if (viewMode === 'domains') {
        return `
          <div style="padding: 8px; max-width: 250px;">
            <strong style="font-size: 14px;">${node.tooltip.nome || node.label}</strong><br/>
            <span style="font-size: 12px; color: #666;">
              Ocorrências: ${node.tooltip.ocorrencias || 0}<br/>
              Percentual: ${node.tooltip.percentual?.toFixed(1) || 0}%<br/>
              Riqueza Lexical: ${node.tooltip.riquezaLexical?.toFixed(2) || 0}
            </span>
          </div>
        `;
      } else {
        return `
          <div style="padding: 8px; max-width: 250px;">
            <strong style="font-size: 14px;">${node.tooltip.palavra || node.label}</strong><br/>
            <span style="font-size: 12px; color: #666;">
              Domínio: ${node.tooltip.dominio || node.domain}<br/>
              Frequência: ${node.tooltip.frequencia || 0}<br/>
              LL Score: ${node.tooltip.ll?.toFixed(2) || 0}<br/>
              Significância: ${node.tooltip.significancia || 'N/A'}
            </span>
          </div>
        `;
      }
    }
  }), [displayedNodes, viewMode, openModal, onWordClick, onDomainClick]);
  
  const handleClearFilter = () => {
    setFilteredDomain(null);
    toast.success('Filtro removido');
  };
  
  const handleExportPNG = () => {
    const svg = containerRef.current?.querySelector('.react-wordcloud svg');
    if (!svg) {
      toast.error('Erro ao exportar: SVG não encontrado');
      return;
    }
    
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        
        // White background
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
        
        canvas.toBlob(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `nuvem-semantica-${viewMode}-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('Imagem exportada com sucesso');
          }
        });
      };
      
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      img.src = URL.createObjectURL(svgBlob);
    } catch (error) {
      console.error('Erro ao exportar PNG:', error);
      toast.error('Erro ao exportar imagem');
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'domains' ? 'default' : 'outline'}
            onClick={() => {
              setViewMode('domains');
              setFilteredDomain(null);
            }}
            size="sm"
          >
            <Layers className="w-4 h-4 mr-2" />
            Domínios Semânticos
          </Button>
          <Button
            variant={viewMode === 'keywords' ? 'default' : 'outline'}
            onClick={() => setViewMode('keywords')}
            disabled={!!filteredDomain}
            size="sm"
          >
            <Tag className="w-4 h-4 mr-2" />
            Palavras-chave
          </Button>
        </div>
        
        {/* Export */}
        <Button variant="outline" onClick={handleExportPNG} size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar PNG
        </Button>
        
        {/* Reorganize */}
        <Button 
          variant="outline" 
          onClick={() => setRegenerateKey(prev => prev + 1)}
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reorganizar
        </Button>
      </div>
      
      {/* Active Filter Badge */}
      <AnimatePresence>
        {filteredDomain && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20"
          >
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              Filtrando: <span className="text-primary">{filteredDomain}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilter}
              className="ml-auto h-7 px-2"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar Filtro
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Word Cloud */}
      <div 
        ref={containerRef}
        className="relative bg-background rounded-lg border border-border p-4 min-h-[700px] overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewMode}-${filteredDomain}-${regenerateKey}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {words.length > 0 ? (
              <ReactWordcloud
                words={words}
                options={options}
                callbacks={callbacks}
                size={[dimensions.width - 32, dimensions.height]}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  {filteredDomain 
                    ? `Nenhuma palavra encontrada para o domínio "${filteredDomain}"`
                    : 'Nenhum dado disponível'}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Summary */}
      <div className="text-center text-sm text-muted-foreground">
        {filteredDomain 
          ? `Exibindo ${words.length} palavras do domínio "${filteredDomain}"`
          : `Exibindo ${words.length} ${viewMode === 'domains' ? 'domínios semânticos' : 'palavras-chave'}`
        }
      </div>
      
      {/* KWIC Modal */}
      <KWICModal
        open={isOpen}
        onOpenChange={closeModal}
        word={selectedWord}
        data={kwicData}
      />
    </div>
  );
}
