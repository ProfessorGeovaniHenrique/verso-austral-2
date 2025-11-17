import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDemoAnalysisResults } from "@/services/demoCorpusService";
import { toast } from "sonner";
import { D3SemanticCloud } from "./D3SemanticCloud";
import { D3CloudControls } from "./D3CloudControls";
import { KWICModal } from "@/components/KWICModal";
import { getDomainColor } from "@/config/domainColors";
import { useKWICModal } from "@/hooks/useKWICModal";
import { Layers, Tag } from "lucide-react";

interface TabGalaxyProps { demo?: boolean; }

export function TabGalaxy({ demo = false }: TabGalaxyProps) {
  const [viewMode, setViewMode] = useState<'domains' | 'keywords'>('domains');
  const [isLoading, setIsLoading] = useState(false);
  const [demoData, setDemoData] = useState<any>(null);
  const [padding, setPadding] = useState(6);
  const [spiral, setSpiral] = useState<'archimedean' | 'rectangular'>('archimedean');
  const [rotation, setRotation] = useState(0);
  const { isOpen, closeModal, selectedWord, kwicData, openModal } = useKWICModal('gaucho');

  useEffect(() => {
    if (demo) {
      setIsLoading(true);
      getDemoAnalysisResults().then(result => { setDemoData(result); toast.success('Visualização carregada'); }).catch(() => toast.error('Erro ao carregar')).finally(() => setIsLoading(false));
    }
  }, [demo]);

  const cloudNodes = useMemo(() => {
    if (!demoData) return [];
    if (viewMode === 'domains') {
      return demoData.dominios.map((d: any) => ({ label: d.dominio, fontSize: 48 + Math.min(24, d.percentual * 2), color: getDomainColor(d.dominio, 'hsl'), type: 'domain', frequency: d.ocorrencias, domain: d.dominio, tooltip: { nome: d.dominio, ocorrencias: d.ocorrencias, riquezaLexical: d.riquezaLexical, percentual: d.percentual, avgLL: d.avgLL } }));
    }
    return demoData.keywords.filter((k: any) => k.significancia !== 'Baixa').map((k: any) => ({ label: k.palavra, fontSize: 14 + Math.min(22, k.ll / 3), color: getDomainColor(k.dominio, 'hsl'), type: 'keyword', frequency: k.frequencia, domain: k.dominio, tooltip: { palavra: k.palavra, dominio: k.dominio, frequencia: k.frequencia, ll: k.ll, mi: k.mi, significancia: k.significancia, prosody: k.prosody } }));
  }, [demoData, viewMode]);

  const handleWordClick = useCallback((word: string) => { toast.info(`Buscando "${word}"...`); openModal(word); }, [openModal]);

  if (!demo || isLoading) return <Card><CardContent className="p-20 text-center">Carregando...</CardContent></Card>;

  return (
    <>
      <Card className="w-full">
        <CardHeader><CardTitle>Nuvem Semântica</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button variant={viewMode === 'domains' ? 'default' : 'outline'} onClick={() => setViewMode('domains')}><Layers className="w-4 h-4 mr-2" />Domínios</Button>
            <Button variant={viewMode === 'keywords' ? 'default' : 'outline'} onClick={() => setViewMode('keywords')}><Tag className="w-4 h-4 mr-2" />Palavras</Button>
          </div>
          <D3CloudControls padding={padding} spiral={spiral} rotation={rotation} onPaddingChange={setPadding} onSpiralChange={setSpiral} onRotationChange={setRotation} />
          <D3SemanticCloud nodes={cloudNodes} width={1200} height={700} padding={padding} spiral={spiral} rotation={rotation} onWordClick={handleWordClick} />
        </CardContent>
      </Card>
      <KWICModal open={isOpen} onOpenChange={closeModal} word={selectedWord} data={kwicData} />
    </>
  );
}
