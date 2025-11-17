import { useMemo, useState, useRef, useEffect } from 'react';
import ReactWordcloud from 'react-wordcloud';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  RefreshCw,
  Filter,
  X,
  Layers,
  Tag,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useKWICModal } from '@/hooks/useKWICModal';
import { useWordCloudFilters } from '@/hooks/useWordCloudFilters';
import { KWICModal } from '@/components/KWICModal';
import { ComparisonStatsCard } from './ComparisonStatsCard';
import { dominiosNormalizados } from '@/data/mockup/dominios-normalized';

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
    mi?: number;
    significancia?: string;
    prosody?: number;
    avgLL?: number;
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
  onDomainClick,
}: OptimizedSemanticCloudProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('domains');
  const [filteredDomain, setFilteredDomain] = useState<string | null>(null);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 1400, height: 700 });
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [comparisonDomains, setComparisonDomains] = useState<[string, string] | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isOpen, closeModal, selectedWord, kwicData, isLoading, openModal } = useKWICModal();

  // Responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setDimensions({
          width: width > 0 ? width : 1400,
          height: 700,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Filter nodes by view mode and domain
  const displayedNodes = useMemo(() => {
    let filtered = nodes.filter(
      (node) => node.type === (viewMode.slice(0, -1) as 'domain' | 'keyword')
    );

    if (filteredDomain && viewMode === 'keywords') {
      filtered = filtered.filter((node) => node.domain === filteredDomain);
    }

    return filtered;
  }, [nodes, viewMode, filteredDomain]);

  // Use filter hook
  const {
    searchTerm,
    setSearchTerm,
    selectedDomain,
    setSelectedDomain,
    selectedProsody,
    setSelectedProsody,
    selectedSignificance,
    setSelectedSignificance,
    filteredNodes,
    clearAllFilters,
    hasActiveFilters,
  } = useWordCloudFilters(displayedNodes);

  // Calculate zoom based on filtered results
  useEffect(() => {
    if (filteredNodes.length === 0 || filteredNodes.length === displayedNodes.length) {
      setZoomLevel(1);
    } else {
      const zoomFactor = Math.max(1.2, Math.min(2, 15 / filteredNodes.length));
      setZoomLevel(zoomFactor);
    }
  }, [filteredNodes, displayedNodes]);

  // Transform to react-wordcloud format
  const words = useMemo(() => {
    return filteredNodes.map((node) => ({
      text: node.label,
      value: node.type === 'domain' ? node.frequency * 2 : node.frequency,
      domain: node.domain,
      color: node.color,
      tooltip: node.tooltip,
    }));
  }, [filteredNodes]);

  const options = useMemo(
    () => ({
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
      colors: words.map((w) => w.color),
    }),
    [words]
  );

  const callbacks = useMemo(
    () => ({
      onWordClick: (word: any) => {
        const node = filteredNodes.find((n) => n.label === word.text);
        if (!node) return;

        if (viewMode === 'domains') {
          setFilteredDomain(node.domain);
          setViewMode('keywords');
          toast.info(`Filtrando palavras do domínio "${node.domain}"`);
          onDomainClick?.(node.domain);
        } else {
          openModal(word.text);
          onWordClick?.(word.text);
        }
      },
      getWordTooltip: (word: any) => {
        const node = filteredNodes.find((n) => n.label === word.text);
        if (!node) return word.text;

        const prosodyEmoji = (node.tooltip.prosody ?? 0) > 0 ? '😊' : (node.tooltip.prosody ?? 0) < 0 ? '😔' : '😐';
        const prosodyLabel = (node.tooltip.prosody ?? 0) > 0 ? 'Positiva' : (node.tooltip.prosody ?? 0) < 0 ? 'Negativa' : 'Neutra';
        const prosodyBg = (node.tooltip.prosody ?? 0) > 0 ? '#dcfce7' : (node.tooltip.prosody ?? 0) < 0 ? '#fee2e2' : '#f3f4f6';

        if (viewMode === 'domains') {
          return `
            <div style="padding: 12px; max-width: 300px; font-family: Inter;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <strong style="font-size: 17px; color: ${node.color};">${node.tooltip.nome || node.label}</strong>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                <div>
                  <div style="color: #999; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Ocorrências</div>
                  <div style="font-weight: 700; color: #333; font-size: 15px;">${node.tooltip.ocorrencias || 0}</div>
                </div>
                <div>
                  <div style="color: #999; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Percentual</div>
                  <div style="font-weight: 700; color: #333; font-size: 15px;">${node.tooltip.percentual?.toFixed(1) || 0}%</div>
                </div>
                <div>
                  <div style="color: #999; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Riqueza Lexical</div>
                  <div style="font-weight: 700; color: #333; font-size: 15px;">${node.tooltip.riquezaLexical?.toFixed(2) || 0}</div>
                </div>
                <div>
                  <div style="color: #999; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">LL Médio</div>
                  <div style="font-weight: 700; color: #333; font-size: 15px;">${node.tooltip.avgLL?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>
              
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee; font-size: 11px; color: #666;">
                💡 Clique para filtrar palavras-chave deste domínio
              </div>
            </div>
          `;
        } else {
          return `
            <div style="padding: 12px; max-width: 300px; font-family: Inter;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <strong style="font-size: 17px;">${node.tooltip.palavra || node.label}</strong>
                <span style="font-size: 20px;">${prosodyEmoji}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${node.color};"></div>
                <span style="font-size: 13px; color: #666; font-weight: 500;">${node.tooltip.dominio || node.domain}</span>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                <div>
                  <div style="color: #999; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Frequência</div>
                  <div style="font-weight: 700; color: #333; font-size: 15px;">${node.tooltip.frequencia || 0}</div>
                </div>
                <div>
                  <div style="color: #999; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">LL Score</div>
                  <div style="font-weight: 700; color: #333; font-size: 15px;">${node.tooltip.ll?.toFixed(2) || 0}</div>
                </div>
                <div>
                  <div style="color: #999; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">MI Score</div>
                  <div style="font-weight: 700; color: #333; font-size: 15px;">${node.tooltip.mi?.toFixed(2) || 'N/A'}</div>
                </div>
                <div>
                  <div style="color: #999; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">Significância</div>
                  <div style="font-weight: 700; color: #333; font-size: 15px;">${node.tooltip.significancia || 'N/A'}</div>
                </div>
              </div>
              
              <div style="margin-top: 12px; padding: 8px; background: ${prosodyBg}; border-radius: 6px;">
                <span style="font-size: 12px; color: #555; font-weight: 500;">
                  ${prosodyEmoji} Prosódia <strong>${prosodyLabel}</strong>
                </span>
              </div>
              
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee; font-size: 11px; color: #666;">
                💬 Clique para ver concordâncias (KWIC)
              </div>
            </div>
          `;
        }
      },
    }),
    [filteredNodes, viewMode, openModal, onWordClick, onDomainClick]
  );

  const handleClearFilter = () => {
    setFilteredDomain(null);
    setViewMode('domains');
    toast.success('Filtro de domínio removido');
  };

  const handleExportPNG = () => {
    const svg = document.querySelector('.react-wordcloud svg');
    if (!svg) {
      toast.error('Nuvem não encontrada para exportação');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `nuvem-semantica-${viewMode}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Imagem exportada com sucesso');
      });
    };

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(svgBlob);
  };

  // Calculate comparison stats
  const getComparisonStats = (domain: string) => {
    const domainWords = words.filter((w) => w.domain === domain);
    const uniqueWords = domainWords.length;
    const totalOccurrences = domainWords.reduce((sum, w) => sum + w.value, 0);
    const avgLL = domainWords.reduce((sum, w) => sum + (w.tooltip.ll || 0), 0) / uniqueWords || 0;
    const domainData = dominiosNormalizados.find((d) => d.dominio === domain);
    const lexicalRichness = domainData?.riquezaLexical || 0;

    return { uniqueWords, totalOccurrences, avgLL, lexicalRichness };
  };

  return (
    <div className="space-y-4">
      {/* Comparison Mode Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={isComparisonMode}
          onCheckedChange={(checked) => {
            setIsComparisonMode(checked);
            if (!checked) setComparisonDomains(null);
          }}
          id="comparison-mode"
        />
        <Label htmlFor="comparison-mode" className="cursor-pointer font-medium">
          Modo Comparação (lado a lado)
        </Label>
      </div>

      {/* Comparison Domain Selectors */}
      {isComparisonMode && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Domínio A</Label>
            <Select
              value={comparisonDomains?.[0] || ''}
              onValueChange={(value) => setComparisonDomains([value, comparisonDomains?.[1] || ''])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar domínio A" />
              </SelectTrigger>
              <SelectContent>
                {dominiosNormalizados.map((d) => (
                  <SelectItem key={d.dominio} value={d.dominio}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.cor }} />
                      {d.dominio}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Domínio B</Label>
            <Select
              value={comparisonDomains?.[1] || ''}
              onValueChange={(value) => setComparisonDomains([comparisonDomains?.[0] || '', value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar domínio B" />
              </SelectTrigger>
              <SelectContent>
                {dominiosNormalizados
                  .filter((d) => d.dominio !== comparisonDomains?.[0])
                  .map((d) => (
                    <SelectItem key={d.dominio} value={d.dominio}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.cor }} />
                        {d.dominio}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {!isComparisonMode && (
        <>
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar palavra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Domain Filter */}
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os domínios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os domínios</SelectItem>
                {dominiosNormalizados.map((d) => (
                  <SelectItem key={d.dominio} value={d.dominio}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.cor }} />
                      {d.dominio}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Prosody Filter */}
            <Select value={selectedProsody} onValueChange={setSelectedProsody}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as prosódias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prosódias</SelectItem>
                <SelectItem value="positive">😊 Positiva</SelectItem>
                <SelectItem value="negative">😔 Negativa</SelectItem>
                <SelectItem value="neutral">😐 Neutra</SelectItem>
              </SelectContent>
            </Select>

            {/* Significance Filter */}
            <Select value={selectedSignificance} onValueChange={setSelectedSignificance}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as significâncias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as significâncias</SelectItem>
                <SelectItem value="Alta">⭐ Alta</SelectItem>
                <SelectItem value="Média">⭐ Média</SelectItem>
                <SelectItem value="Baixa">⭐ Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>

              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  🔍 "{searchTerm}"
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setSearchTerm('')}
                  />
                </Badge>
              )}

              {selectedDomain !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  📁 {selectedDomain}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setSelectedDomain('all')}
                  />
                </Badge>
              )}

              {selectedProsody !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {selectedProsody === 'positive' ? '😊' : selectedProsody === 'negative' ? '😔' : '😐'}{' '}
                  Prosódia
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setSelectedProsody('all')}
                  />
                </Badge>
              )}

              {selectedSignificance !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  ⭐ {selectedSignificance}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setSelectedSignificance('all')}
                  />
                </Badge>
              )}

              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Limpar todos
              </Button>
            </div>
          )}

          {/* View Mode Controls */}
          <div className="flex flex-wrap items-center gap-3">
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

            <Button variant="outline" onClick={handleExportPNG} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar PNG
            </Button>

            <Button
              variant="outline"
              onClick={() => setRegenerateKey((prev) => prev + 1)}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reorganizar
            </Button>
          </div>

          {/* Domain Filter Badge */}
          {filteredDomain && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                Filtrando: <span className="text-primary">{filteredDomain}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={handleClearFilter} className="ml-auto">
                <X className="w-4 h-4 mr-1" />
                Limpar Filtro
              </Button>
            </div>
          )}
        </>
      )}

      {/* Word Cloud Display */}
      <div ref={containerRef} className="w-full">
        {isComparisonMode && comparisonDomains?.[0] && comparisonDomains?.[1] ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              {/* Domain A */}
              <Card className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: dominiosNormalizados.find((d) => d.dominio === comparisonDomains[0])?.cor,
                    }}
                  />
                  {comparisonDomains[0]}
                </h3>
                <div className="h-[500px] flex items-center justify-center">
                  <ReactWordcloud
                    words={words.filter((w) => w.domain === comparisonDomains[0])}
                    options={options}
                    callbacks={callbacks}
                    size={[Math.floor(dimensions.width / 2) - 50, 500]}
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  {words.filter((w) => w.domain === comparisonDomains[0]).length} palavras
                </div>
              </Card>

              {/* Domain B */}
              <Card className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: dominiosNormalizados.find((d) => d.dominio === comparisonDomains[1])?.cor,
                    }}
                  />
                  {comparisonDomains[1]}
                </h3>
                <div className="h-[500px] flex items-center justify-center">
                  <ReactWordcloud
                    words={words.filter((w) => w.domain === comparisonDomains[1])}
                    options={options}
                    callbacks={callbacks}
                    size={[Math.floor(dimensions.width / 2) - 50, 500]}
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  {words.filter((w) => w.domain === comparisonDomains[1]).length} palavras
                </div>
              </Card>
            </div>

            {/* Comparison Stats */}
            <ComparisonStatsCard
              domainA={comparisonDomains[0]}
              domainB={comparisonDomains[1]}
              statsA={getComparisonStats(comparisonDomains[0])}
              statsB={getComparisonStats(comparisonDomains[1])}
            />
          </>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewMode}-${filteredDomain}-${searchTerm}-${regenerateKey}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: zoomLevel }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: 'center center' }}
            >
              {words.length === 0 ? (
                <div className="h-[700px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhuma palavra encontrada</p>
                    <p className="text-sm">Ajuste os filtros para ver resultados</p>
                  </div>
                </div>
              ) : (
                <ReactWordcloud
                  words={words}
                  options={options}
                  callbacks={callbacks}
                  size={[dimensions.width, dimensions.height]}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* KWIC Modal */}
      <KWICModal
        open={isOpen}
        onOpenChange={(open) => !open && closeModal()}
        palavra={selectedWord}
        data={kwicData}
        isLoading={isLoading}
      />
    </div>
  );
}
