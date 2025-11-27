import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Sparkles, GitCompare, Download, Save, Settings2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { D3SemanticCloud } from './D3SemanticCloud';
import { D3CloudConsole } from './D3CloudConsole';
import { ComparisonView } from './ComparisonView';
import { DomainModal } from './DomainModal';
import { CloudFiltersPanel } from './CloudFiltersPanel';
import { KWICModal } from '@/components/KWICModal';
import { useKWICModal } from '@/hooks/useKWICModal';
import { useCorpusComparison } from '@/hooks/useCorpusComparison';
import { useWordCloudFilters } from '@/hooks/useWordCloudFilters';
import { getDomainColor } from '@/config/domainColors';
import { useCorpusData } from '@/hooks/useCorpusData';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface TabGalaxyProps {
  demo?: boolean;
  songId?: string;
}

type ViewMode = 'domains' | 'keywords';

export function TabGalaxy({ demo = false, songId }: TabGalaxyProps) {
  const { gauchoData, isLoading: isLoadingCorpus } = useCorpusData({ 
    loadGaucho: !songId, 
    loadNordestino: false,
    limit: demo ? 1000 : undefined 
  });

  const [viewMode, setViewMode] = useState<ViewMode>('domains');
  const demoData = gauchoData;
  const isLoading = isLoadingCorpus;
  const [padding, setPadding] = useState(6);
  const [spiral, setSpiral] = useState<'archimedean' | 'rectangular'>('archimedean');
  const [rotation, setRotation] = useState(0);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontWeight, setFontWeight] = useState<'normal' | 'semibold' | 'bold'>('semibold');
  const [showTooltips, setShowTooltips] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(600);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedDomainData, setSelectedDomainData] = useState<any>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const cloudContainerRef = useRef<HTMLDivElement>(null);
  
  const { isOpen: kwicOpen, closeModal: closeKwicModal, selectedWord, kwicData, isLoading: kwicLoading, openModal: openKwicModal } = useKWICModal('gaucho');
  const { isOpen: kwicOpenNordestino, closeModal: closeKwicModalNordestino, selectedWord: selectedWordNordestino, kwicData: kwicDataNordestino, isLoading: kwicLoadingNordestino, openModal: openKwicModalNordestino } = useKWICModal('nordestino');
  const { nordestinoData, isLoading: comparisonLoading } = useCorpusComparison();

  // Carregar preferências salvas do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cloudPreferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setPadding(prefs.padding ?? 6);
        setSpiral(prefs.spiral ?? 'archimedean');
        setRotation(prefs.rotation ?? 0);
        setFontFamily(prefs.fontFamily ?? 'Inter');
        setFontWeight(prefs.fontWeight ?? 'semibold');
        setAnimationSpeed(prefs.animationSpeed ?? 600);
      } catch {}
    }
  }, []);

  const handleSavePreferences = useCallback(() => {
    const prefs = { padding, spiral, rotation, fontFamily, fontWeight, animationSpeed };
    localStorage.setItem('cloudPreferences', JSON.stringify(prefs));
    toast.success('Preferências salvas com sucesso!');
  }, [padding, spiral, rotation, fontFamily, fontWeight, animationSpeed]);

  const cloudNodes = useMemo(() => {
    if (!demoData) return [];
    if (viewMode === 'domains') {
      return demoData.dominios.map((d: any) => ({ label: d.dominio, fontSize: 48 + Math.min(24, d.percentual * 2), color: getDomainColor(d.dominio, 'hsl'), type: 'domain' as const, frequency: d.ocorrencias, domain: d.dominio, tooltip: { nome: d.dominio, ocorrencias: d.ocorrencias, riquezaLexical: d.riquezaLexical, percentual: d.percentual, avgLL: d.avgLL } }));
    }
    return demoData.keywords.filter((k: any) => k.significancia !== 'Baixa').map((k: any) => ({ label: k.palavra, fontSize: 14 + Math.min(22, k.ll / 3), color: getDomainColor(k.dominio, 'hsl'), type: 'keyword' as const, frequency: k.frequencia, domain: k.dominio, tooltip: { palavra: k.palavra, dominio: k.dominio, frequencia: k.frequencia, ll: k.ll, mi: k.mi, significancia: k.significancia, prosody: k.prosody } }));
  }, [demoData, viewMode]);

  const handleWordClick = useCallback((word: string) => { openKwicModal(word); toast.info(`Buscando "${word}"`); }, [openKwicModal]);
  const handleComparisonWordClick = useCallback((word: string, corpus: 'gaucho' | 'nordestino') => { corpus === 'gaucho' ? openKwicModal(word) : openKwicModalNordestino(word); toast.info(`Buscando "${word}"`); }, [openKwicModal, openKwicModalNordestino]);
  
  const handleDomainClick = useCallback((domainName: string) => {
    if (!demoData) return;
    const domainInfo = demoData.dominios.find((d: any) => d.dominio === domainName);
    if (!domainInfo) return;
    const palavras = demoData.keywords
      .filter((k: any) => k.dominio === domainName)
      .map((k: any) => String(k.palavra));
    setSelectedDomainData({ 
      nome: domainInfo.dominio, 
      cor: getDomainColor(domainName, 'hsl'), 
      ocorrencias: domainInfo.ocorrencias, 
      percentual: domainInfo.percentual, 
      riquezaLexical: domainInfo.riquezaLexical, 
      avgLL: domainInfo.avgLL, 
      palavras 
    });
    setDomainModalOpen(true);
  }, [demoData]);

  const handleExportPNG = useCallback(async () => {
    if (!cloudContainerRef.current) { toast.error('Erro ao exportar'); return; }
    toast.info('Gerando PNG...');
    try {
      const canvas = await html2canvas(cloudContainerRef.current, { scale: 2, backgroundColor: '#ffffff' });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `nuvem-${viewMode}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Exportado!');
      });
    } catch { toast.error('Erro'); }
  }, [viewMode]);
  
  const handleApplyPreset = useCallback((preset: string) => {
    const p = { academic: [8,'archimedean',0,'Georgia','normal',600], creative: [4,'rectangular',-45,'Trebuchet MS','bold',300], compact: [2,'rectangular',0,'Inter','semibold',400], presentation: [12,'archimedean',0,'Arial','bold',800] } as any;
    const c = p[preset];
    if (c) { setPadding(c[0]); setSpiral(c[1]); setRotation(c[2]); setFontFamily(c[3]); setFontWeight(c[4]); setAnimationSpeed(c[5]); toast.success(`Preset ${preset}`); }
  }, []);
  
  const gauchoStats = useMemo(() => {
    if (!gauchoData || !gauchoData.estatisticas || !gauchoData.dominios) {
      return { totalWords: 0, uniqueWords: 0, avgWordLength: 0, topDomains: [] };
    }
    return {
      totalWords: gauchoData.estatisticas.totalPalavras,
      uniqueWords: gauchoData.estatisticas.palavrasUnicas,
      avgWordLength: 5,
      topDomains: gauchoData.dominios.sort((a,b) => b.percentual - a.percentual).slice(0, 3).map(d => ({ domain: d.dominio, percentage: d.percentual }))
    };
  }, [gauchoData]);
  
  const gauchoComparison = gauchoData;
  
  const nordestinoStats = useMemo(() => {
    if (!nordestinoData || !nordestinoData.estatisticas || !nordestinoData.dominios) {
      return { totalWords: 0, uniqueWords: 0, avgWordLength: 0, topDomains: [] };
    }
    return {
      totalWords: nordestinoData.estatisticas.totalPalavras,
      uniqueWords: nordestinoData.estatisticas.palavrasUnicas,
      avgWordLength: 5,
      topDomains: nordestinoData.dominios.sort((a,b) => b.percentual - a.percentual).slice(0, 3).map(d => ({ domain: d.dominio, percentage: d.percentual }))
    };
  }, [nordestinoData]);
  const nordestinoCloudNodes = useMemo(() => {
    if (!nordestinoData || !nordestinoData.keywords) return [];
    return nordestinoData.keywords.filter((k: any) => k.significancia !== 'Baixa').map((k: any) => ({ label: k.palavra, fontSize: 14 + Math.min(22, k.ll / 3), color: getDomainColor(k.dominio, 'hsl'), type: 'keyword' as const, frequency: k.frequencia, domain: k.dominio, tooltip: { palavra: k.palavra, dominio: k.dominio, frequencia: k.frequencia, ll: k.ll, mi: k.mi, significancia: k.significancia, prosody: k.prosody } }));
  }, [nordestinoData]);

  const availableDomains = useMemo(() => Array.from(new Set(cloudNodes.map(n => n.domain))).sort() as string[], [cloudNodes]);
  const { searchTerm, setSearchTerm, selectedDomain, setSelectedDomain, selectedProsody, setSelectedProsody, selectedSignificance, setSelectedSignificance, filteredNodes, clearAllFilters, hasActiveFilters } = useWordCloudFilters(cloudNodes);

  if (!demo) return <Card><CardHeader><CardTitle>Nuvem Semântica</CardTitle><CardDescription>Modo demo</CardDescription></CardHeader><CardContent><div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg"><p className="text-muted-foreground">Não disponível</p></div></CardContent></Card>;
  if (isLoading) return <Card><CardContent className="p-20"><Skeleton className="h-96 w-full" /></CardContent></Card>;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" />Nuvem Semântica</CardTitle><CardDescription className="mt-2">Zoom, pan e concordâncias interativas</CardDescription></div>
            <div className="flex gap-2">
              <Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" onClick={handleSavePreferences} className="gap-2"><Save className="w-4 h-4" />Salvar Config</Button></TooltipTrigger><TooltipContent><p>Salvar suas preferências personalizadas</p></TooltipContent></Tooltip>
              <Button variant="outline" size="sm" onClick={handleExportPNG} className="gap-2"><Download className="w-4 h-4" />Exportar PNG</Button>
              <Tooltip><TooltipTrigger asChild><span><Button variant="outline" disabled className="cursor-not-allowed opacity-60 gap-2"><GitCompare className="w-4 h-4" />Modo Comparação</Button></span></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><div className="space-y-1"><p className="font-semibold">🚧 Em Implementação</p><p className="text-xs">Comparação entre corpus Gaúcho e Nordestino em breve.</p></div></TooltipContent></Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!comparisonMode && <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit"><Button variant={viewMode === 'domains' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('domains')}>Domínios Semânticos</Button><Button variant={viewMode === 'keywords' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('keywords')}>Palavras-Chave</Button></div>}
          {!comparisonMode && viewMode === 'keywords' && <CloudFiltersPanel searchTerm={searchTerm} selectedDomain={selectedDomain} selectedProsody={selectedProsody} selectedSignificance={selectedSignificance} onSearchChange={setSearchTerm} onDomainChange={setSelectedDomain} onProsodyChange={setSelectedProsody} onSignificanceChange={setSelectedSignificance} onClearAll={clearAllFilters} hasActiveFilters={hasActiveFilters} availableDomains={availableDomains} totalNodes={cloudNodes.length} filteredNodes={filteredNodes.length} />}
          <D3CloudConsole padding={padding} spiral={spiral} rotation={rotation} fontFamily={fontFamily} fontWeight={fontWeight} showTooltips={showTooltips} animationSpeed={animationSpeed} onPaddingChange={setPadding} onSpiralChange={setSpiral} onRotationChange={setRotation} onFontFamilyChange={setFontFamily} onFontWeightChange={setFontWeight} onShowTooltipsChange={setShowTooltips} onAnimationSpeedChange={setAnimationSpeed} onApplyPreset={handleApplyPreset} />
          {comparisonMode ? <ComparisonView gauchoNodes={cloudNodes} nordestinoNodes={nordestinoCloudNodes} gauchoStats={gauchoStats} nordestinoStats={nordestinoStats} onWordClick={handleComparisonWordClick} padding={padding} spiral={spiral} rotation={rotation} fontFamily={fontFamily} fontWeight={fontWeight} showTooltips={showTooltips} animationSpeed={animationSpeed} /> : <div ref={cloudContainerRef} className="w-full flex justify-center bg-background rounded-lg p-4"><D3SemanticCloud nodes={viewMode === 'keywords' ? filteredNodes : cloudNodes} width={1200} height={700} padding={padding} spiral={spiral} rotation={rotation} fontFamily={fontFamily} fontWeight={fontWeight} showTooltips={showTooltips} animationSpeed={animationSpeed} onWordClick={handleWordClick} onDomainClick={handleDomainClick} /></div>}
        </CardContent>
      </Card>
      <KWICModal open={kwicOpen} onOpenChange={closeKwicModal} word={selectedWord} data={kwicData} />
      <KWICModal open={kwicOpenNordestino} onOpenChange={closeKwicModalNordestino} word={selectedWordNordestino} data={kwicDataNordestino} />
      <DomainModal open={domainModalOpen} onOpenChange={setDomainModalOpen} domainData={selectedDomainData} onWordClick={handleWordClick} />
    </TooltipProvider>
  );
}
