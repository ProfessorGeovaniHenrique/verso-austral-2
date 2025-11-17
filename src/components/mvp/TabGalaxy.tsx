import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Layers, Tag, GitCompare } from "lucide-react";
import { getDemoAnalysisResults } from "@/services/demoCorpusService";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { D3SemanticCloud } from "./D3SemanticCloud";
import { D3CloudConsole } from "./D3CloudConsole";
import { ComparisonView } from "./ComparisonView";
import { KWICModal } from "@/components/KWICModal";
import { getDomainColor } from "@/config/domainColors";
import { useKWICModal } from "@/hooks/useKWICModal";
import { useCorpusComparison } from "@/hooks/useCorpusComparison";

interface TabGalaxyProps {
  demo?: boolean;
}

type ViewMode = 'domains' | 'keywords';

export function TabGalaxy({ demo = false }: TabGalaxyProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('domains');
  const [isLoading, setIsLoading] = useState(false);
  const [demoData, setDemoData] = useState<any>(null);
  const [padding, setPadding] = useState(6);
  const [spiral, setSpiral] = useState<'archimedean' | 'rectangular'>('archimedean');
  const [rotation, setRotation] = useState(0);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontWeight, setFontWeight] = useState<'normal' | 'semibold' | 'bold'>('semibold');
  const [showTooltips, setShowTooltips] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(600);
  const [comparisonMode, setComparisonMode] = useState(false);
  const { isOpen, closeModal, selectedWord, kwicData, openModal } = useKWICModal('gaucho');
  const { isOpen: isOpenN, closeModal: closeModalN, selectedWord: selectedWordN, kwicData: kwicDataN, openModal: openModalN } = useKWICModal('nordestino');
  const { gauchoData, nordestinoData, isLoading: comparisonLoading } = useCorpusComparison();

  useEffect(() => {
    if (demo) {
      setIsLoading(true);
      getDemoAnalysisResults().then(r => { setDemoData(r); toast.success('Carregado'); }).catch(() => toast.error('Erro')).finally(() => setIsLoading(false));
    }
  }, [demo]);

  const cloudNodes = useMemo(() => {
    if (!demoData) return [];
    if (viewMode === 'domains') {
      return demoData.dominios.map((d: any) => ({ label: d.dominio, fontSize: 48 + Math.min(24, d.percentual * 2), color: getDomainColor(d.dominio, 'hsl'), type: 'domain' as const, frequency: d.ocorrencias, domain: d.dominio, tooltip: { nome: d.dominio, ocorrencias: d.ocorrencias, riquezaLexical: d.riquezaLexical, percentual: d.percentual, avgLL: d.avgLL } }));
    }
    return demoData.keywords.filter((k: any) => k.significancia !== 'Baixa').map((k: any) => ({ label: k.palavra, fontSize: 14 + Math.min(22, k.ll / 3), color: getDomainColor(k.dominio, 'hsl'), type: 'keyword' as const, frequency: k.frequencia, domain: k.dominio, tooltip: { palavra: k.palavra, dominio: k.dominio, frequencia: k.frequencia, ll: k.ll, mi: k.mi, significancia: k.significancia, prosody: k.prosody } }));
  }, [demoData, viewMode]);

  const handleWordClick = useCallback((word: string) => { toast.info(`"${word}"...`); openModal(word); }, [openModal]);
  const handleComparisonWordClick = useCallback((word: string, corpus: 'gaucho' | 'nordestino') => { toast.info(`"${word}" ${corpus}...`); corpus === 'gaucho' ? openModal(word) : openModalN(word); }, [openModal, openModalN]);
  
  const handleApplyPreset = useCallback((preset: string) => {
    const p = { academic: [8,'archimedean',0,'Georgia','normal',600], creative: [4,'rectangular',-45,'Trebuchet MS','bold',300], compact: [2,'rectangular',0,'Inter','semibold',400], presentation: [12,'archimedean',0,'Arial','bold',800] } as any;
    const c = p[preset];
    if (c) { setPadding(c[0]); setSpiral(c[1]); setRotation(c[2]); setFontFamily(c[3]); setFontWeight(c[4]); setAnimationSpeed(c[5]); toast.success(`Preset ${preset}`); }
  }, []);
  
  const gauchoStats = useMemo(() => !gauchoData ? { totalWords: 0, uniqueWords: 0, avgWordLength: 0, topDomains: [] } : { totalWords: gauchoData.estatisticas.totalPalavras, uniqueWords: gauchoData.estatisticas.palavrasUnicas, avgWordLength: 5, topDomains: gauchoData.dominios.sort((a,b) => b.percentual - a.percentual).slice(0, 3).map(d => ({ domain: d.dominio, percentage: d.percentual })) }, [gauchoData]);
  const nordestinoStats = useMemo(() => !nordestinoData ? { totalWords: 0, uniqueWords: 0, avgWordLength: 0, topDomains: [] } : { totalWords: nordestinoData.estatisticas.totalPalavras, uniqueWords: nordestinoData.estatisticas.palavrasUnicas, avgWordLength: 5, topDomains: nordestinoData.dominios.sort((a,b) => b.percentual - a.percentual).slice(0, 3).map(d => ({ domain: d.dominio, percentage: d.percentual })) }, [nordestinoData]);
  const nordestinoCloudNodes = useMemo(() => !nordestinoData ? [] : nordestinoData.keywords.filter((k: any) => k.significancia !== 'Baixa').map((k: any) => ({ label: k.palavra, fontSize: 14 + Math.min(22, k.ll / 3), color: getDomainColor(k.dominio, 'hsl'), type: 'keyword' as const, frequency: k.frequencia, domain: k.dominio, tooltip: { palavra: k.palavra, dominio: k.dominio, frequencia: k.frequencia, ll: k.ll, mi: k.mi, significancia: k.significancia, prosody: k.prosody } })), [nordestinoData]);

  if (!demo) return <Card><CardHeader><CardTitle>Nuvem Semântica</CardTitle><CardDescription>Modo demo</CardDescription></CardHeader><CardContent><div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg"><p className="text-muted-foreground">Não disponível</p></div></CardContent></Card>;
  if (isLoading) return <Card><CardContent className="p-20"><Skeleton className="h-96 w-full" /></CardContent></Card>;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" />Nuvem Semântica</CardTitle><CardDescription className="mt-2">Zoom, pan e concordâncias</CardDescription></div>
            <Button variant={comparisonMode ? 'default' : 'outline'} onClick={() => setComparisonMode(!comparisonMode)} disabled={comparisonLoading}><GitCompare className="w-4 h-4 mr-2" />{comparisonMode ? 'Único' : 'Comparar'}</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!comparisonMode && (<div className="flex gap-2 p-1 bg-muted rounded-lg w-fit"><Button variant={viewMode === 'domains' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('domains')}><Layers className="w-4 h-4 mr-2" />Domínios</Button><Button variant={viewMode === 'keywords' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('keywords')}><Tag className="w-4 h-4 mr-2" />Palavras</Button></div>)}
          <D3CloudConsole padding={padding} spiral={spiral} rotation={rotation} onPaddingChange={setPadding} onSpiralChange={setSpiral} onRotationChange={setRotation} fontFamily={fontFamily} fontWeight={fontWeight} onFontFamilyChange={setFontFamily} onFontWeightChange={setFontWeight} showTooltips={showTooltips} animationSpeed={animationSpeed} onShowTooltipsChange={setShowTooltips} onAnimationSpeedChange={setAnimationSpeed} onApplyPreset={handleApplyPreset} />
          {comparisonMode && gauchoData && nordestinoData ? <ComparisonView gauchoNodes={cloudNodes} nordestinoNodes={nordestinoCloudNodes} gauchoStats={gauchoStats} nordestinoStats={nordestinoStats} onWordClick={handleComparisonWordClick} padding={padding} spiral={spiral} rotation={rotation} fontFamily={fontFamily} fontWeight={fontWeight} animationSpeed={animationSpeed} showTooltips={showTooltips} /> : <div className="w-full flex justify-center"><D3SemanticCloud nodes={cloudNodes} width={1200} height={700} padding={padding} spiral={spiral} rotation={rotation} fontFamily={fontFamily} fontWeight={fontWeight} animationSpeed={animationSpeed} showTooltips={showTooltips} onWordClick={handleWordClick} /></div>}
        </CardContent>
      </Card>
      <KWICModal open={isOpen} onOpenChange={closeModal} word={selectedWord} data={kwicData} />
      <KWICModal open={isOpenN} onOpenChange={closeModalN} word={selectedWordN} data={kwicDataN} />
    </>
  );
}
