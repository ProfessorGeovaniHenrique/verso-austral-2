import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KWICModal } from "@/components/KWICModal";
import { InteractiveSemanticNetwork } from "@/components/InteractiveSemanticNetwork";
import { OrbitalConstellationChart } from "@/components/OrbitalConstellationChart";
import { OrbitalDomainConstellation } from "@/components/OrbitalDomainConstellation";
import { NavigationToolbar } from "@/components/NavigationToolbar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Network, Sparkles, BarChart3, FileBarChart, Cloud, HelpCircle, TrendingUp, TrendingDown, Maximize2 } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { hslToRgba } from "@/lib/colorUtils";
import { 
  kwicDataMap, 
  logLikelihoodData, 
  miScoreData,
  palavrasChaveData,
  lematizacaoData,
  frequenciaNormalizadaData
} from '@/data/mockup';
import { dominiosNormalizados } from '@/data/mockup/dominios-normalized';
import { prosodiasMap, getProsodiaSemantica } from '@/data/mockup/prosodias-map';
import type { PalavraStatsMap } from '@/data/types/corpus.types';

// Gerar palavraStats a partir dos dados normalizados
const generatePalavraStats = (): PalavraStatsMap => {
  const stats: PalavraStatsMap = {};
  
  dominiosNormalizados.forEach(dominio => {
    dominio.palavrasComFrequencia.forEach(({ palavra, ocorrencias }) => {
      stats[palavra] = {
        frequencia: ocorrencias,
        prosodia: getProsodiaSemantica(palavra)
      };
    });
  });
  
  return stats;
};

const palavraStats = generatePalavraStats();
export default function Dashboard2() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<typeof dominiosNormalizados[0] | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({
    x: 0,
    y: 0
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({
    x: 0,
    y: 0
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [orbitProgress, setOrbitProgress] = useState<Record<string, number>>({});
  const [isDraggingWord, setIsDraggingWord] = useState(false);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleWordClick = (word: string) => {
    if (isDraggingWord || isPanning) return;
    setSelectedWord(word);
    setModalOpen(true);
  };
  const handleDomainClick = (domainName: string) => {
    const domain = dominiosNormalizados.find(d => d.dominio === domainName);
    if (domain) {
      setSelectedDomain(domain);
      setDomainModalOpen(true);
    }
  };

  // Handler para mudança de progresso na órbita
  const handleOrbitProgressChange = (wordKey: string, progress: number) => {
    setOrbitProgress(prev => ({
      ...prev,
      [wordKey]: progress
    }));
  };

  // Handler para arrastar palavra na órbita
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGGElement>, wordKey: string, centerX: number, centerY: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedWord(wordKey);
    setIsDraggingWord(false);
    const target = e.currentTarget;
    target.dataset.centerX = centerX.toString();
    target.dataset.centerY = centerY.toString();
  }, []);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedWord || !svgRef.current) return;
    setIsDraggingWord(true);
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const draggedElement = svg.querySelector(`[data-word-key="${draggedWord}"]`);
    if (!draggedElement) return;
    const centerX = parseFloat(draggedElement.getAttribute('data-center-x') || '0');
    const centerY = parseFloat(draggedElement.getAttribute('data-center-y') || '0');
    const dx = svgP.x - centerX;
    const dy = svgP.y - centerY;
    const angle = Math.atan2(dy, dx);

    // Converte o ângulo para progresso (0-100)
    const normalizedAngle = ((angle + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const progress = normalizedAngle / (2 * Math.PI) * 100;
    setOrbitProgress(prev => ({
      ...prev,
      [draggedWord]: progress
    }));
  }, [draggedWord]);
  const handleMouseUp = useCallback(() => {
    setDraggedWord(null);
    setTimeout(() => setIsDraggingWord(false), 50);
  }, []);

  // Efeito para gerenciar eventos de drag
  useEffect(() => {
    if (draggedWord) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedWord, handleMouseMove, handleMouseUp]);

  // Handlers de Pan (arrastar canvas)
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Verifica se clicou em área vazia (não em um elemento do gráfico)
    const target = e.target as HTMLElement;
    if (target.tagName === 'svg' || target.classList.contains('pan-area')) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      });
    }
  }, [panOffset]);
  const handleCanvasPanMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  }, [isPanning, panStart]);
  const handleCanvasPanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handlers de zoom com foco no cursor
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current || !svgRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Posição do cursor relativa ao container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calcula novo zoom
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));

    // Ajusta pan para manter o foco no cursor
    const zoomRatio = newZoom / zoomLevel;
    const newPanX = mouseX - (mouseX - panOffset.x) * zoomRatio;
    const newPanY = mouseY - (mouseY - panOffset.y) * zoomRatio;
    setZoomLevel(newZoom);
    setPanOffset({
      x: newPanX,
      y: newPanY
    });
  }, [zoomLevel, panOffset]);
  const handleZoomIn = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Centro da viewport
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newZoom = Math.min(3, zoomLevel + 0.2);
    const zoomRatio = newZoom / zoomLevel;
    
    // Ajusta pan para manter o centro fixo
    const newPanX = centerX - (centerX - panOffset.x) * zoomRatio;
    const newPanY = centerY - (centerY - panOffset.y) * zoomRatio;
    
    setZoomLevel(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };
  
  const handleZoomOut = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Centro da viewport
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newZoom = Math.max(0.5, zoomLevel - 0.2);
    const zoomRatio = newZoom / zoomLevel;
    
    // Ajusta pan para manter o centro fixo
    const newPanX = centerX - (centerX - panOffset.x) * zoomRatio;
    const newPanY = centerY - (centerY - panOffset.y) * zoomRatio;
    
    setZoomLevel(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };
  
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  
  const handleFitToView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  const handleExportPDF = async () => {
    try {
      toast.info("Gerando PDF...", {
        description: "Por favor, aguarde enquanto capturamos todos os dados."
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Página 1: Capa
      pdf.setFontSize(24);
      pdf.setFont(undefined, 'bold');
      pdf.text("Análise de Estilística de Corpus", pageWidth / 2, 40, {
        align: 'center'
      });
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'normal');
      pdf.text("'Quando o verso vem pras casa'", pageWidth / 2, 55, {
        align: 'center'
      });
      pdf.text("Luiz Marenco", pageWidth / 2, 65, {
        align: 'center'
      });
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 80, {
        align: 'center'
      });

      // Página 2: Domínios Semânticos
      pdf.addPage();
      yPosition = margin;
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text("Domínios Semânticos", margin, yPosition);
      yPosition += 10;
      dominiosNormalizados.forEach(dominio => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${dominio.dominio} (${dominio.percentual}%)`, margin, yPosition);
        yPosition += 6;
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        const palavras = `Palavras: ${dominio.palavras.join(', ')}`;
        const splitPalavras = pdf.splitTextToSize(palavras, pageWidth - 2 * margin);
        pdf.text(splitPalavras, margin + 5, yPosition);
        yPosition += splitPalavras.length * 5 + 5;
      });

      // Página 3: Palavras-Chave
      pdf.addPage();
      yPosition = margin;
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text("Palavras-Chave por Frequência", margin, yPosition);
      yPosition += 12;
      palavrasChaveData.slice(0, 15).forEach((palavra, index) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(`${index + 1}. ${palavra.palavra} - ${palavra.frequenciaBruta} ocorrências (${palavra.frequenciaNormalizada.toFixed(1)} norm.)`, margin, yPosition);
        yPosition += 7;
      });

      // Página 4: Prosódia Semântica
      pdf.addPage();
      yPosition = margin;
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text("Prosódia Semântica", margin, yPosition);
      yPosition += 12;
      const prosodiaGroups = {
        positiva: Object.entries(palavraStats).filter(([, data]) => data.prosodia === "Positiva"),
        negativa: Object.entries(palavraStats).filter(([, data]) => data.prosodia === "Negativa"),
        neutra: Object.entries(palavraStats).filter(([, data]) => data.prosodia === "Neutra")
      };
      Object.entries(prosodiaGroups).forEach(([tipo, palavras]) => {
        if (palavras.length > 0) {
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.setFontSize(12);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} (${palavras.length})`, margin, yPosition);
          yPosition += 7;
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'normal');
          const listaPalavras = palavras.map(([palavra]) => palavra).join(", ");
          const splitLista = pdf.splitTextToSize(listaPalavras, pageWidth - 2 * margin);
          pdf.text(splitLista, margin + 5, yPosition);
          yPosition += splitLista.length * 4 + 8;
        }
      });

      // Capturar gráficos se possível
      const chartElements = document.querySelectorAll('[data-chart-export]');
      for (let i = 0; i < Math.min(chartElements.length, 2); i++) {
        try {
          const canvas = await html2canvas(chartElements[i] as HTMLElement, {
            scale: 2,
            backgroundColor: '#1a1a1a'
          });
          pdf.addPage();
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 2 * margin;
          const imgHeight = canvas.height * imgWidth / canvas.width;
          pdf.setFontSize(14);
          pdf.setFont(undefined, 'bold');
          pdf.text(`Gráfico ${i + 1}`, margin, margin);
          pdf.addImage(imgData, 'PNG', margin, margin + 10, imgWidth, Math.min(imgHeight, pageHeight - 30));
        } catch (error) {
          console.warn('Erro ao capturar gráfico:', error);
        }
      }

      // Salvar PDF
      pdf.save(`Analise_Estilistica_Corpus_${new Date().getTime()}.pdf`);
      toast.success("PDF gerado com sucesso!", {
        description: "O arquivo foi baixado para seu computador."
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error("Erro ao gerar PDF", {
        description: "Tente novamente ou contate o suporte."
      });
    }
  };
  return <div className={`pt-[150px] px-8 pb-12 space-y-10 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4 pt-20' : ''}`}>
      {/* Badge verde com título */}
      <div className="mb-8">
        <div className="inline-block bg-green-500/20 border-2 border-green-500/40 rounded-full px-6 py-3">
          <h1 className="text-2xl font-bold text-green-400 tracking-tight">
            Análise de Estilística de Corpus
          </h1>
        </div>
      </div>

      {/* Header Section com mais espaçamento e hierarquia */}
      <div className="space-y-6 pb-6 border-b-2 border-border/30">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground/90">
              'Quando o verso vem pras casa'
            </h2>
            <p className="text-base text-muted-foreground/80 max-w-2xl">
              Análise semântica completa do corpus | Versão otimizada com navegação aprimorada
            </p>
          </div>
          <Button variant="outline" className="gap-2 h-11 px-6" onClick={handleExportPDF}>
            <Download className="h-5 w-5" />
            Exportar Dados
          </Button>
        </div>
        
        {/* Dica de navegação */}
        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Dicas de Navegação</p>
            <p className="text-xs text-muted-foreground/90 leading-relaxed">
              Use as abas abaixo para explorar diferentes análises. Passe o mouse sobre elementos para ver detalhes. 
              Clique em palavras para ver concordância (KWIC). Gráficos podem ser ampliados para tela cheia.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="corpus" className="space-y-8">
        <TabsList className="grid w-full grid-cols-6 h-14 p-1.5 bg-muted/40">
          <TabsTrigger value="corpus" className="gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Corpus</span>
          </TabsTrigger>
          <TabsTrigger value="dominios" className="gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Domínios</span>
          </TabsTrigger>
          <TabsTrigger value="rede" className="gap-2 text-sm font-medium">
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Rede</span>
          </TabsTrigger>
          <TabsTrigger value="frequencia" className="gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Frequência</span>
          </TabsTrigger>
          <TabsTrigger value="estatistica" className="gap-2 text-sm font-medium">
            <FileBarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Estatística</span>
          </TabsTrigger>
          <TabsTrigger value="nuvem" className="gap-2 text-sm font-medium">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">Nuvem</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Corpus */}
        <TabsContent value="corpus" className="space-y-8 mt-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Quando o verso vem pras casa</CardTitle>
                      <CardDescription>Luiz Marenco - Letra completa da música</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-line text-foreground leading-relaxed">
                    {`A calma do tarumã, ganhou sombra mais copada
Pela várzea espichada com o sol da tarde caindo
Um pañuelo maragato se abriu no horizonte
Trazendo um novo reponte, prá um fim de tarde bem lindo
Daí um verso de campo se chegou da campereada
No lombo de uma gateada frente aberta de respeito
Desencilhou na ramada, já cansado das lonjuras
Mas estampando a figura, campeira, bem do seu jeito
Cevou um mate pura-folha, jujado de maçanilha
E um ventito da coxilha trouxe coplas entre as asas
Prá querência galponeira, onde o verso é mais caseiro
Templado a luz de candeeiro e um "quarto gordo nas brasa"
A mansidão da campanha traz saudades feito açoite
Com os olhos negros de noite que ela mesmo aquerenciou
E o verso que tinha sonhos prá rondar na madrugada
Deixou a cancela encostada e a tropa se desgarrou
E o verso sonhou ser várzea com sombra de tarumã
Ser um galo prás manhãs, ou um gateado prá encilha
Sonhou com os olhos da prenda vestidos de primavera
Adormecidos na espera do sol pontear na coxilha
Ficaram arreios suados e o silencio de esporas
Um cerne com cor de aurora queimando em fogo de chão
Uma cuia e uma bomba recostada na cambona
E uma saudade redomona pelos cantos do galpão`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ouça a canção</CardTitle>
                  <CardDescription>Player integrado do YouTube</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-lg overflow-hidden border shadow-sm">
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/uaRc4k-Rxpo" title="Quando o verso vem pras casa - Luiz Marenco" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="w-full h-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Domínios - Seção Completa */}
        <TabsContent value="dominios" className="space-y-8 mt-8">
          {/* Dica contextual */}
          <div className="flex items-start gap-3 p-4 bg-success/5 border border-success/20 rounded-lg">
            <Sparkles className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">💡 Explore os Domínios</p>
              <p className="text-xs text-muted-foreground/90">
                Clique nas palavras para ver concordância (KWIC). Passe o mouse sobre os badges para ver estatísticas detalhadas.
              </p>
            </div>
          </div>
          
          <TooltipProvider delayDuration={100}>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-8">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-success/10">
                        <FileText className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <CardTitle>Domínios Semânticos Identificados</CardTitle>
                        
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-8 p-6">
                    {dominiosNormalizados.filter(d => d.dominio !== "Palavras Funcionais").map((item, index) => <div key={index} className="space-y-4 p-6 rounded-lg border-2 border-border/40 bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-5 h-5 rounded-full shadow-md" style={{
                          backgroundColor: item.cor
                        }} />
                            <div>
                              <h3 className="font-bold text-xl text-foreground">{item.dominio}</h3>
                              <p className="text-sm text-muted-foreground/80 mt-1.5">
                                {index === 0 && "Elementos naturais da paisagem pampeana que formam o cenário poético"}
                                {index === 1 && "Vocabulário técnico relacionado ao cavalo e seu equipamento"}
                                {index === 2 && "Espaço de convivência, tradição e pertencimento gaúcho"}
                                {index === 3 && "Campo emocional e criativo que permeia toda a narrativa"}
                                {index === 4 && "Símbolos e práticas culturais distintivas do Rio Grande do Sul"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-help">
                                  <HelpCircle className="h-5 w-5 text-muted-foreground/70" />
                                  <span className="text-3xl font-bold" style={{
                                color: item.cor
                              }}>
                                    {item.percentual}%
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div className="space-y-2">
                                  <p className="font-semibold text-foreground">{item.dominio}</p>
                                  <p className="text-xs text-foreground">
                                    Este domínio representa <strong>{item.percentual}%</strong> do total de palavras analisadas, 
                                    com <strong>{item.ocorrencias} ocorrências</strong> distribuídas em {item.palavras.length} palavras-chave.
                                  </p>
                                  <div className="pt-2 border-t border-border">
                                    <p className="text-xs font-medium text-foreground">Densidade lexical:</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(item.ocorrencias / item.palavras.length).toFixed(1)} ocorrências por palavra
                                    </p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </UITooltip>
                            <span className="text-xs text-muted-foreground">
                              {item.ocorrencias} ocorrências
                            </span>
                          </div>
                        </div>
                        
                        {/* Barra de progresso animada com mais espaço */}
                        <div className="relative w-full bg-muted/30 rounded-full h-4 overflow-hidden mt-2">
                          <div className="h-4 rounded-full transition-all duration-500 relative" style={{
                        width: `${item.percentual}%`,
                        backgroundColor: item.cor,
                        boxShadow: `0 0 10px ${hslToRgba(item.cor, 0.25)}`
                      }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                          </div>
                        </div>

                        {/* Palavras com tooltips individuais e mais espaço */}
                        <div className="flex flex-wrap gap-2.5 mt-1">
                          {item.palavras.map((palavra, idx) => {
                        const palavraChave = palavrasChaveData.find(p => p.palavra === palavra);
                        const kwicEntries = kwicDataMap[palavra];
                        return <UITooltip key={idx}>
                                <TooltipTrigger asChild>
                                  <Badge className="cursor-pointer hover:scale-110 transition-all border-0 shadow-sm text-sm px-3 py-1.5" style={{
                              backgroundColor: item.cor,
                              color: item.corTexto
                            }} onClick={() => handleWordClick(palavra)}>
                                    {palavra}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md p-4 z-50">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                      <p className="font-bold text-lg text-foreground">{palavra}</p>
                                      {palavraChave && <Badge variant={palavraChave.significancia === "Alta" ? "default" : "secondary"} className="text-xs">
                                          {palavraChave.significancia}
                                        </Badge>}
                                    </div>
                                    
                                    {/* Estatísticas detalhadas */}
                                    <div className="grid grid-cols-2 gap-3 py-2 border-y border-border">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Frequência no Corpus</p>
                                        <p className="text-sm font-semibold text-foreground">
                                          {palavraChave?.frequenciaBruta || kwicEntries?.length || 1}x
                                        </p>
                                      </div>
                                      {palavraChave && <>
                                          <div>
                                            <p className="text-xs text-muted-foreground">Significância</p>
                                            <div className="flex items-center gap-1">
                                              <p className="text-sm font-semibold text-foreground">{palavraChave.significancia}</p>
                                              {palavraChave.significancia === "Alta" && <TrendingUp className="h-3 w-3 text-success" />}
                                            </div>
                                          </div>
                                          <div>
                                            <p className="text-xs text-muted-foreground">Log-Likelihood</p>
                                            <p className="text-sm font-semibold text-foreground">{palavraChave.ll.toFixed(1)}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-muted-foreground">Efeito</p>
                                            <div className="flex items-center gap-1">
                                              <p className="text-sm font-semibold text-foreground">{palavraChave.efeito}</p>
                                              {palavraChave.efeito === "Sobre-uso" && <TrendingUp className="h-3 w-3 text-success" />}
                                            </div>
                                          </div>
                                        </>}
                                    </div>
                                    
                                    {/* Contexto KWIC */}
                                    <div className="text-xs space-y-1">
                                      <p className="text-muted-foreground font-medium">Contexto na música:</p>
                                      {kwicEntries && kwicEntries.length > 0 ? <div className="bg-muted/50 p-2 rounded">
                                          <p className="italic text-foreground">
                                            "{kwicEntries[0].leftContext}{" "}
                                            <strong className="text-primary">{kwicEntries[0].keyword}</strong>
                                            {" "}{kwicEntries[0].rightContext}"
                                          </p>
                                        </div> : <p className="text-muted-foreground italic">Clique para ver concordância completa</p>}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </UITooltip>;
                      })}
                        </div>
                      </div>)}
                  </CardContent>
                </Card>

                {/* Gráfico de Comparação com mais destaque */}
                <Card className="border-border/60 shadow-sm" data-chart-export>
                  <CardHeader className="pb-6">
                    <CardTitle className="text-2xl font-bold text-foreground">Distribuição dos Domínios Semânticos</CardTitle>
                    <CardDescription className="text-base text-muted-foreground/80">Comparativo de ocorrências entre domínios</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dominiosNormalizados.filter(d => d.dominio !== "Palavras Funcionais")}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="dominio" angle={-20} textAnchor="end" height={120} stroke="hsl(var(--muted-foreground))" tick={{
                        fontSize: 12
                      }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        color: 'hsl(var(--foreground))'
                      }} formatter={(value: any) => [`${value} ocorrências`, 'Total']} labelFormatter={label => `${label}`} />
                        <Bar dataKey="ocorrencias" radius={[6, 6, 0, 0]}>
                          {dominiosNormalizados.filter(d => d.dominio !== "Palavras Funcionais").map((entry, index) => <Cell key={`cell-${index}`} fill={entry.cor} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-8">
                {/* Card de insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Insights da Análise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-success mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">Domínio Dominante</p>
                          <p className="text-xs text-muted-foreground/80 leading-relaxed mt-1">
                            "Cultura e Lida Gaúcha" lidera com {dominiosNormalizados[0].percentualTematico.toFixed(2)}%, evidenciando 
                            a centralidade do ambiente pampeano na construção poética
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">Equilíbrio Temático</p>
                          <p className="text-xs text-muted-foreground/80 leading-relaxed mt-1">
                            Os 6 domínios temáticos cobrem {dominiosNormalizados.filter(d => d.dominio !== "Palavras Funcionais").reduce((acc, d) => acc + d.percentualTematico, 0).toFixed(1)}% 
                            do corpus, demonstrando forte coesão semântica
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">Densidade Lexical</p>
                          <p className="text-xs text-muted-foreground/80 leading-relaxed mt-1">
                            Média de {(dominiosNormalizados.reduce((acc, d) => acc + d.ocorrencias, 0) / dominiosNormalizados.reduce((acc, d) => acc + d.palavras.length, 0)).toFixed(1)} 
                            ocorrências por palavra-chave no corpus
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card de ações com mais destaque */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Exportar Dados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5">
                    <Button variant="outline" className="w-full justify-start h-11" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar como CSV
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-11" size="sm">
                      <FileBarChart className="h-4 w-4 mr-2" />
                      Gerar Relatório
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TooltipProvider>
        </TabsContent>

        {/* Tab: Rede */}
        <TabsContent value="rede" className="space-y-8 mt-8">
          {/* Dica contextual */}
          <div className="flex items-start gap-3 p-4 border-2 rounded-lg"
               style={{
                 background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.6), rgba(0, 229, 255, 0.1))',
                 borderColor: '#00E5FF',
                 boxShadow: '0 0 20px rgba(0, 229, 255, 0.2)'
               }}>
            <Maximize2 className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#00E5FF' }} />
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#00E5FF' }}>🚀 Exploração Espacial Semântica</p>
              <p className="text-xs" style={{ color: 'rgba(0, 229, 255, 0.7)' }}>
                Navegue pelos três níveis hierárquicos: <strong>Universo</strong> (palavras orbitando a canção) → <strong>Galáxia</strong> (domínios semânticos) → <strong>Sistema Estelar</strong> (palavras de cada domínio). Clique nos nós para navegar e passe o mouse para ver estatísticas detalhadas no HUD.
              </p>
            </div>
          </div>
          
          <Card className="border-2" style={{ borderColor: 'rgba(0, 229, 255, 0.125)', background: 'radial-gradient(circle at top, #0A0E27 0%, #000000 100%)' }}>
            <CardHeader className="pb-6" style={{ borderBottom: '1px solid rgba(0, 229, 255, 0.2)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Network className="h-6 w-6" style={{ color: '#00E5FF' }} />
                  <div>
                    <CardTitle className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Sistema de Navegação Orbital</CardTitle>
                    <CardDescription className="text-base mt-1" style={{ color: 'rgba(0, 229, 255, 0.6)' }}>
                      Experiência espacial interativa inspirada em Mass Effect com HUD, órbitas animadas e três níveis de exploração.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1" style={{ background: 'rgba(0, 229, 255, 0.2)', color: '#00E5FF', borderColor: '#00E5FF' }}>
                  <Network className="h-3 w-3" />
                  12 palavras mapeadas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0" style={{ minHeight: '800px' }}>
              <OrbitalConstellationChart 
                onWordClick={handleWordClick}
                dominiosData={dominiosNormalizados.filter(d => d.dominio !== "Palavras Funcionais")}
                palavrasChaveData={palavrasChaveData}
                kwicDataMap={kwicDataMap}
                frequenciaNormalizadaData={frequenciaNormalizadaData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Frequência */}
        <TabsContent value="frequencia" className="space-y-8 mt-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-border/60 shadow-sm" data-chart-export>
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold text-foreground">Log-Likelihood (LL)</CardTitle>
                <CardDescription className="text-base text-muted-foreground/80">Medida estatística de significância das palavras-chave</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={logLikelihoodData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="palavra" angle={-45} textAnchor="end" height={80} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))'
                  }} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {logLikelihoodData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm" data-chart-export>
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold text-foreground">Mutual Information (MI)</CardTitle>
                <CardDescription className="text-base text-muted-foreground/80">Força da associação entre palavra e corpus</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={miScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="palavra" angle={-45} textAnchor="end" height={80} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))'
                  }} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {miScoreData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Estatística */}
        <TabsContent value="estatistica" className="space-y-8 mt-8">
          {/* Dica contextual */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">📊 Tabela Interativa</p>
              <p className="text-xs text-muted-foreground/90">
                Clique em qualquer linha para ver a concordância (KWIC) da palavra selecionada.
              </p>
            </div>
          </div>
          
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-foreground">Tabela de Palavras-Chave Estatísticas</CardTitle>
              <CardDescription className="text-base text-muted-foreground/80">
                Análise combinada de Log-Likelihood e MI Score
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="rounded-lg border-2 border-border/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2 border-border/60">
                    <TableHead className="font-bold text-foreground">Palavra</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Freq. Bruta</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Freq. Normalizada</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Log-Likelihood</TableHead>
                    <TableHead className="text-right font-bold text-foreground">MI Score</TableHead>
                    <TableHead className="font-bold text-foreground">Significância</TableHead>
                    <TableHead className="font-bold text-foreground">Efeito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {palavrasChaveData.map((item, index) => {
                    const EfeitoIcon = item.efeitoIcon;
                    return <TableRow key={index} className="cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/30" onClick={() => handleWordClick(item.palavra)}>
                        <TableCell className="font-mono font-semibold">{item.palavra}</TableCell>
                        <TableCell className="text-right">{item.frequenciaBruta}</TableCell>
                        <TableCell className="text-right">{item.frequenciaNormalizada.toFixed(1)}</TableCell>
                        <TableCell className={`text-right font-semibold ${item.ll > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {item.ll.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{item.mi.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={item.significancia === "Alta" ? "bg-success/10 text-success" : item.significancia === "Média" ? "bg-destructive/10 text-destructive" : "bg-[hsl(45,93%,47%)]/10 text-[hsl(45,93%,47%)]"}>
                            {item.significancia}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <EfeitoIcon className={`h-4 w-4 ${item.efeito === 'Sobre-uso' ? 'text-destructive' : item.efeito === 'Sub-uso' ? 'text-primary' : 'text-success'}`} />
                            <span className="text-sm">{item.efeito}</span>
                          </div>
                        </TableCell>
                      </TableRow>;
                  })}
                 </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Nuvem */}
        <TabsContent value="nuvem" className="space-y-8 mt-8">
          {/* Dica contextual */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <Cloud className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">🌌 Navegação na Constelação</p>
              <p className="text-xs text-muted-foreground/90">
                <strong>Scroll do mouse:</strong> Zoom | <strong>Arraste:</strong> Mover canvas | <strong>Arraste palavras:</strong> Reposicionar na órbita | <strong>Clique palavras:</strong> Ver KWIC
              </p>
            </div>
          </div>
          
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-foreground">Nuvem de Domínios Semânticos - Constelação Orbital</CardTitle>
              <CardDescription className="text-base text-muted-foreground/80">
                Visualização orbital interativa com texturas de planetas. Clique e arraste para mover, use scroll para zoom. Passe o mouse sobre as palavras para ver preview holográfico.
              </CardDescription>
            </CardHeader>
              <CardContent className="p-0">
                <OrbitalDomainConstellation
                  dominiosData={dominiosNormalizados.filter(d => d.dominio !== "Palavras Funcionais")}
                  onWordClick={handleWordClick}
                  palavraStats={palavraStats}
                />
              </CardContent>
          </Card>

          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-muted/50 border-2 border-border/40 hover:border-primary/30 transition-colors">
              <div className="font-semibold mb-1.5 text-sm text-foreground">Órbita 1</div>
              <div className="text-muted-foreground/80">20-30% de freq.</div>
            </div>
            <div className="p-3.5 rounded-lg bg-muted/50 border-2 border-border/40 hover:border-primary/30 transition-colors">
              <div className="font-semibold mb-1.5 text-sm text-foreground">Órbita 2</div>
              <div className="text-muted-foreground/80">15-20% de freq.</div>
            </div>
            <div className="p-3.5 rounded-lg bg-muted/50 border-2 border-border/40 hover:border-primary/30 transition-colors">
              <div className="font-semibold mb-1.5 text-sm text-foreground">Órbita 3</div>
              <div className="text-muted-foreground/80">10-15% de freq.</div>
            </div>
            <div className="p-3.5 rounded-lg bg-muted/50 border-2 border-border/40 hover:border-primary/30 transition-colors">
              <div className="font-semibold mb-1.5 text-sm text-foreground">Órbita 4</div>
              <div className="text-muted-foreground/80">5-10% de freq.</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal KWIC */}
      <KWICModal open={modalOpen} onOpenChange={setModalOpen} word={selectedWord} data={kwicDataMap[selectedWord] || []} />

      {/* Modal de Domínio Semântico */}
      <Dialog open={domainModalOpen} onOpenChange={setDomainModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedDomain && <>
                  <div className="w-4 h-4 rounded-full" style={{
                backgroundColor: selectedDomain.cor
              }} />
                  {selectedDomain.dominio}
                </>}
            </DialogTitle>
            <DialogDescription>
              Dados estatísticos do domínio semântico
            </DialogDescription>
          </DialogHeader>
          {selectedDomain && <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedDomain.ocorrencias}</div>
                    <p className="text-sm text-muted-foreground">Ocorrências</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedDomain.percentual}%</div>
                    <p className="text-sm text-muted-foreground">do corpus</p>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Palavras-chave do domínio</h4>
                <div className="flex flex-wrap gap-2">
                            {selectedDomain.palavras.map((palavra, idx) => {
                    return <Badge key={idx} className="cursor-pointer hover:scale-105 transition-all text-base px-4 py-2 border-0" style={{
                backgroundColor: selectedDomain.cor,
                color: selectedDomain.corTexto
              }} onClick={() => {
                setDomainModalOpen(false);
                handleWordClick(palavra);
              }}>
                      {palavra}
                    </Badge>;
                  })}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Distribuição no corpus</span>
                </div>
                <div className="w-full bg-background rounded-full h-4">
                  <div className="h-4 rounded-full transition-all" style={{
                width: `${selectedDomain.percentual}%`,
                backgroundColor: selectedDomain.cor
              }} />
                </div>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}