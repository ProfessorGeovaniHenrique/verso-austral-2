import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KWICModal } from "@/components/KWICModal";
import { InteractiveSemanticNetwork } from "@/components/InteractiveSemanticNetwork";
import { OrbitalConstellationChart } from "@/components/OrbitalConstellationChart";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Network, Sparkles, BarChart3, FileBarChart, Cloud, HelpCircle, TrendingUp, TrendingDown, ZoomIn, ZoomOut, Minimize2 } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Mock data KWIC completo baseado na letra da música
const kwicDataMap: Record<string, Array<{
  leftContext: string;
  keyword: string;
  rightContext: string;
  source: string;
}>> = {
  "verso": [{
    leftContext: "Daí um",
    keyword: "verso",
    rightContext: "de campo se chegou da campereada",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }, {
    leftContext: "Prá querência galponeira, onde o",
    keyword: "verso",
    rightContext: "é mais caseiro",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }, {
    leftContext: "E o",
    keyword: "verso",
    rightContext: "que tinha sonhos prá rondar na madrugada",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }, {
    leftContext: "E o",
    keyword: "verso",
    rightContext: "sonhou ser várzea com sombra de tarumã",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "tarumã": [{
    leftContext: "A calma do",
    keyword: "tarumã",
    rightContext: ", ganhou sombra mais copada",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }, {
    leftContext: "E o verso sonhou ser várzea com sombra de",
    keyword: "tarumã",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "saudade": [{
    leftContext: "A mansidão da campanha traz",
    keyword: "saudade",
    rightContext: "feito açoite",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }, {
    leftContext: "E uma",
    keyword: "saudade",
    rightContext: "redomona pelos cantos do galpão",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "galpão": [{
    leftContext: "E uma saudade redomona pelos cantos do",
    keyword: "galpão",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "várzea": [{
    leftContext: "Pela",
    keyword: "várzea",
    rightContext: "espichada com o sol da tarde caindo",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }, {
    leftContext: "E o verso sonhou ser",
    keyword: "várzea",
    rightContext: "com sombra de tarumã",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "sonhos": [{
    leftContext: "E o verso que tinha",
    keyword: "sonhos",
    rightContext: "prá rondar na madrugada",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "gateada": [{
    leftContext: "No lombo de uma",
    keyword: "gateada",
    rightContext: "frente aberta de respeito",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "mate": [{
    leftContext: "Cevou um",
    keyword: "mate",
    rightContext: "pura-folha, jujado de maçanilha",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "coxilha": [{
    leftContext: "E um ventito da",
    keyword: "coxilha",
    rightContext: "trouxe coplas entre as asas",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }, {
    leftContext: "Adormecidos na espera do sol pontear na",
    keyword: "coxilha",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "sombra": [{
    leftContext: "A calma do tarumã, ganhou",
    keyword: "sombra",
    rightContext: "mais copada",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }, {
    leftContext: "E o verso sonhou ser várzea com",
    keyword: "sombra",
    rightContext: "de tarumã",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "arreios": [{
    leftContext: "Ficaram",
    keyword: "arreios",
    rightContext: "suados e o silencio de esporas",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "esporas": [{
    leftContext: "Ficaram arreios suados e o silencio de",
    keyword: "esporas",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "prenda": [{
    leftContext: "Sonhou com os olhos da",
    keyword: "prenda",
    rightContext: "vestidos de primavera",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "ramada": [{
    leftContext: "Desencilhou na",
    keyword: "ramada",
    rightContext: ", já cansado das lonjuras",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "candeeiro": [{
    leftContext: "Templado a luz de",
    keyword: "candeeiro",
    rightContext: "e um \"quarto gordo nas brasa\"",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "querência": [{
    leftContext: "Prá",
    keyword: "querência",
    rightContext: "galponeira, onde o verso é mais caseiro",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "cuia": [{
    leftContext: "Uma",
    keyword: "cuia",
    rightContext: "e uma bomba recostada na cambona",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "maragato": [{
    leftContext: "Um pañuelo",
    keyword: "maragato",
    rightContext: "se abriu no horizonte",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "campereada": [{
    leftContext: "Daí um verso de campo se chegou da",
    keyword: "campereada",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "calma": [{
    leftContext: "A",
    keyword: "calma",
    rightContext: "do tarumã, ganhou sombra mais copada",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "encilha": [{
    leftContext: "Ser um galo prás manhãs, ou um gateado prá",
    keyword: "encilha",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "campo": [{
    leftContext: "Daí um verso de",
    keyword: "campo",
    rightContext: "se chegou da campereada",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "campanha": [{
    leftContext: "A mansidão da",
    keyword: "campanha",
    rightContext: "traz saudades feito açoite",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "horizonte": [{
    leftContext: "Um pañuelo maragato se abriu no",
    keyword: "horizonte",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "sol": [{
    leftContext: "Pela várzea espichada com o",
    keyword: "sol",
    rightContext: "da tarde caindo",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }, {
    leftContext: "Adormecidos na espera do",
    keyword: "sol",
    rightContext: "pontear na coxilha",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "tropa": [{
    leftContext: "Deixou a cancela encostada e a",
    keyword: "tropa",
    rightContext: "se desgarrou",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "lombo": [{
    leftContext: "No",
    keyword: "lombo",
    rightContext: "de uma gateada frente aberta de respeito",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "cambona": [{
    leftContext: "Uma cuia e uma bomba recostada na",
    keyword: "cambona",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "fogo": [{
    leftContext: "Um cerne com cor de aurora queimando em",
    keyword: "fogo",
    rightContext: "de chão",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "chão": [{
    leftContext: "Um cerne com cor de aurora queimando em fogo de",
    keyword: "chão",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "bomba": [{
    leftContext: "Uma cuia e uma",
    keyword: "bomba",
    rightContext: "recostada na cambona",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "coplas": [{
    leftContext: "E um ventito da coxilha trouxe",
    keyword: "coplas",
    rightContext: "entre as asas",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "mansidão": [{
    leftContext: "A",
    keyword: "mansidão",
    rightContext: "da campanha traz saudades feito açoite",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "silêncio": [{
    leftContext: "Ficaram arreios suados e o",
    keyword: "silêncio",
    rightContext: "de esporas",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "pañuelo": [{
    leftContext: "Um",
    keyword: "pañuelo",
    rightContext: "maragato se abriu no horizonte",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }],
  "maçanilha": [{
    leftContext: "Cevou um mate pura-folha, jujado de",
    keyword: "maçanilha",
    rightContext: "",
    source: "Luiz Marenco - Quando o verso vem pras casa"
  }]
};
const dominiosData = [{
  dominio: "Natureza e Paisagem Campeira",
  ocorrencias: 48,
  percentual: 28.2,
  palavras: ["tarumã", "várzea", "coxilha", "campo", "campanha", "horizonte", "sombra", "sol"],
  cor: "hsl(142, 35%, 25%)",
  corTexto: "hsl(142, 80%, 75%)"
}, {
  dominio: "Cavalo e Aperos",
  ocorrencias: 38,
  percentual: 22.4,
  palavras: ["gateada", "encilha", "arreios", "esporas", "tropa", "lombo", "ramada", "cambona"],
  cor: "hsl(221, 40%, 25%)",
  corTexto: "hsl(221, 85%, 75%)"
}, {
  dominio: "Vida no Galpão",
  ocorrencias: 32,
  percentual: 18.8,
  palavras: ["galpão", "ramada", "candeeiro", "mate", "querência", "fogo", "chão", "cuia", "bomba"],
  cor: "hsl(45, 40%, 25%)",
  corTexto: "hsl(45, 95%, 75%)"
}, {
  dominio: "Sentimentos e Poesia",
  ocorrencias: 28,
  percentual: 16.5,
  palavras: ["verso", "saudade", "sonhos", "coplas", "mansidão", "calma", "silêncio"],
  cor: "hsl(291, 35%, 25%)",
  corTexto: "hsl(291, 75%, 75%)"
}, {
  dominio: "Tradição Gaúcha",
  ocorrencias: 24,
  percentual: 14.1,
  palavras: ["maragato", "pañuelo", "mate", "maçanilha", "prenda", "campereada"],
  cor: "hsl(0, 35%, 25%)",
  corTexto: "hsl(0, 80%, 75%)"
}];
const lematizacaoData = [{
  original: "sonhos",
  lema: "sonho",
  classe: "NOUN"
}, {
  original: "adormecidos",
  lema: "adormecer",
  classe: "VERB"
}, {
  original: "coplas",
  lema: "copla",
  classe: "NOUN"
}, {
  original: "suados",
  lema: "suado",
  classe: "ADJ"
}, {
  original: "vestidos",
  lema: "vestir",
  classe: "VERB"
}, {
  original: "arreios",
  lema: "arreio",
  classe: "NOUN"
}];
const logLikelihoodData = [{
  palavra: "verso",
  valor: 52.8,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "tarumã",
  valor: 48.3,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "galpão",
  valor: 45.2,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "saudade",
  valor: 38.7,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "várzea",
  valor: 32.4,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "coxilha",
  valor: 28.9,
  cor: "hsl(0, 72%, 51%)"
}, {
  palavra: "gateada",
  valor: 24.1,
  cor: "hsl(0, 72%, 51%)"
}, {
  palavra: "campanha",
  valor: 18.5,
  cor: "hsl(0, 72%, 51%)"
}, {
  palavra: "horizonte",
  valor: 8.3,
  cor: "hsl(45, 93%, 47%)"
}];
const miScoreData = [{
  palavra: "verso",
  valor: 9.2,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "tarumã",
  valor: 8.8,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "saudade",
  valor: 8.5,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "galpão",
  valor: 7.9,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "várzea",
  valor: 7.2,
  cor: "hsl(142, 71%, 45%)"
}, {
  palavra: "sonhos",
  valor: 5.8,
  cor: "hsl(0, 72%, 51%)"
}, {
  palavra: "mate",
  valor: 4.9,
  cor: "hsl(0, 72%, 51%)"
}, {
  palavra: "horizonte",
  valor: 3.2,
  cor: "hsl(45, 93%, 47%)"
}];
const palavrasChaveData = [{
  palavra: "verso",
  ll: 52.8,
  mi: 9.2,
  frequenciaBruta: 4,
  frequenciaNormalizada: 23.5,
  significancia: "Alta",
  efeito: "Sobre-uso",
  efeitoIcon: TrendingUp
}, {
  palavra: "tarumã",
  ll: 48.3,
  mi: 8.8,
  frequenciaBruta: 2,
  frequenciaNormalizada: 11.8,
  significancia: "Alta",
  efeito: "Sobre-uso",
  efeitoIcon: TrendingUp
}, {
  palavra: "saudade",
  ll: 38.7,
  mi: 8.5,
  frequenciaBruta: 2,
  frequenciaNormalizada: 11.8,
  significancia: "Alta",
  efeito: "Sobre-uso",
  efeitoIcon: TrendingUp
}, {
  palavra: "galpão",
  ll: 45.2,
  mi: 7.9,
  frequenciaBruta: 1,
  frequenciaNormalizada: 5.9,
  significancia: "Alta",
  efeito: "Sobre-uso",
  efeitoIcon: TrendingUp
}, {
  palavra: "várzea",
  ll: 32.4,
  mi: 7.2,
  frequenciaBruta: 2,
  frequenciaNormalizada: 11.8,
  significancia: "Alta",
  efeito: "Sobre-uso",
  efeitoIcon: TrendingUp
}, {
  palavra: "coxilha",
  ll: 28.9,
  mi: 5.8,
  frequenciaBruta: 2,
  frequenciaNormalizada: 11.8,
  significancia: "Média",
  efeito: "Sobre-uso",
  efeitoIcon: TrendingUp
}, {
  palavra: "gateada",
  ll: 24.1,
  mi: 4.9,
  frequenciaBruta: 1,
  frequenciaNormalizada: 5.9,
  significancia: "Média",
  efeito: "Sobre-uso",
  efeitoIcon: TrendingUp
}, {
  palavra: "sonhos",
  ll: 18.5,
  mi: 3.8,
  frequenciaBruta: 2,
  frequenciaNormalizada: 11.8,
  significancia: "Média",
  efeito: "Sobre-uso",
  efeitoIcon: TrendingUp
}, {
  palavra: "campanha",
  ll: 15.2,
  mi: 3.2,
  frequenciaBruta: 1,
  frequenciaNormalizada: 5.9,
  significancia: "Baixa",
  efeito: "Normal",
  efeitoIcon: TrendingUp
}];

// Mock data para estatísticas de palavras (para tooltips)
const palavraStats: Record<string, {
  frequenciaBruta: number;
  frequenciaNormalizada: number;
  prosodia: "positiva" | "negativa" | "neutra";
}> = {
  "verso": { frequenciaBruta: 4, frequenciaNormalizada: 23.5, prosodia: "positiva" },
  "tarumã": { frequenciaBruta: 2, frequenciaNormalizada: 11.8, prosodia: "positiva" },
  "saudade": { frequenciaBruta: 2, frequenciaNormalizada: 11.8, prosodia: "negativa" },
  "galpão": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "várzea": { frequenciaBruta: 2, frequenciaNormalizada: 11.8, prosodia: "positiva" },
  "sonhos": { frequenciaBruta: 2, frequenciaNormalizada: 11.8, prosodia: "positiva" },
  "gateada": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "mate": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
  "coxilha": { frequenciaBruta: 2, frequenciaNormalizada: 11.8, prosodia: "neutra" },
  "sombra": { frequenciaBruta: 2, frequenciaNormalizada: 11.8, prosodia: "positiva" },
  "arreios": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "esporas": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "prenda": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
  "ramada": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "candeeiro": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
  "querência": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
  "cuia": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "maragato": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "campereada": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "calma": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
  "encilha": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "campo": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "campanha": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "horizonte": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
  "sol": { frequenciaBruta: 2, frequenciaNormalizada: 11.8, prosodia: "positiva" },
  "tropa": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "lombo": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "cambona": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "fogo": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
  "chão": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "bomba": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "coplas": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
  "mansidão": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
  "silêncio": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "negativa" },
  "pañuelo": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
  "maçanilha": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" }
};
export default function Analise() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<typeof dominiosData[0] | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
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
    const domain = dominiosData.find(d => d.dominio === domainName);
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
    const progress = (normalizedAngle / (2 * Math.PI)) * 100;
    
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
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
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
    setPanOffset({ x: newPanX, y: newPanY });
  }, [zoomLevel, panOffset]);

  const handleZoomIn = () => {
    const newZoom = Math.min(3, zoomLevel + 0.2);
    setZoomLevel(newZoom);
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(0.5, zoomLevel - 0.2);
    setZoomLevel(newZoom);
  };
  
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  return <div className="pt-[150px] px-8 pb-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Resultados da Análise: 'Quando o verso vem pras casa'
          </h1>
          <p className="text-muted-foreground">
            Análise semântica completa do corpus
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Dados
        </Button>
      </div>

      <Tabs defaultValue="corpus" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="corpus" className="gap-2">
            <FileText className="h-4 w-4" />
            Corpus
          </TabsTrigger>
          <TabsTrigger value="dominios" className="gap-2">
            <FileText className="h-4 w-4" />
            Domínios
          </TabsTrigger>
          <TabsTrigger value="rede" className="gap-2">
            <Network className="h-4 w-4" />
            Rede
          </TabsTrigger>
          <TabsTrigger value="frequencia" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Frequência
          </TabsTrigger>
          <TabsTrigger value="estatistica" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            Estatística
          </TabsTrigger>
          <TabsTrigger value="nuvem" className="gap-2">
            <Cloud className="h-4 w-4" />
            Nuvem
          </TabsTrigger>
        </TabsList>

        {/* Tab: Corpus */}
        <TabsContent value="corpus" className="space-y-6">
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
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src="https://www.youtube.com/embed/uaRc4k-Rxpo" 
                      title="Quando o verso vem pras casa - Luiz Marenco"
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Domínios */}
        <TabsContent value="dominios" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-success/10">
                      <FileText className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <CardTitle>Domínios Semânticos Identificados</CardTitle>
                      <CardDescription>
                        Análise baseada em IA - 5 domínios detectados em 170 palavras
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dominiosData.map((item, index) => <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{
                        backgroundColor: item.cor
                      }} />
                          <h3 className="font-semibold">{item.dominio}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span># {item.ocorrencias} ocorrências</span>
                          <span className="text-foreground font-semibold">{item.percentual}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted/30 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{
                      width: `${item.percentual}%`,
                      backgroundColor: item.cor
                    }} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.palavras.map((palavra, idx) => <Badge key={idx} className="cursor-pointer hover:scale-105 transition-all border-0" style={{
                      backgroundColor: item.cor,
                      color: item.corTexto
                    }} onClick={() => handleWordClick(palavra)}>
                            {palavra}
                          </Badge>)}
                      </div>
                    </div>)}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Frequências</CardTitle>
                  <CardDescription>Visualização comparativa dos domínios</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dominiosData.map((item, index) => <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate max-w-[140px]">{item.dominio}</span>
                          <span className="font-semibold">{item.ocorrencias}</span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-8">
                          <div className="h-8 rounded-full transition-all" style={{
                        width: `${item.ocorrencias / 170 * 100}%`,
                        backgroundColor: item.cor
                      }} />
                        </div>
                      </div>)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Rede */}
        <TabsContent value="rede" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Rede Semântica Interativa</CardTitle>
                    <CardDescription>
                      Visualização da força de associação entre palavras-chave no corpus. Quanto mais próxima do centro, maior a coocorrência.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Network className="h-3 w-3" />
                  6 conexões mapeadas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Sistema Orbital Hierárquico - Prosódia Semântica
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Visualização hierárquica em 3 níveis: <strong>(1)</strong> Clique em "Canção Analisada" para ver os sistemas orbitais, 
                      <strong>(2)</strong> clique em um sistema (verso, saudade, sonhos, etc.) para ver em detalhe suas palavras e força de associação semântica.
                    </p>
                  </div>
                  <OrbitalConstellationChart 
                    songName="Quando o verso vem pras casa"
                    artistName="Luiz Marenco"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Análise de Prosódia Semântica</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      A "aura" emocional que uma palavra adquire pelo contexto em que ela consistentemente aparece no corpus
                    </p>
                    <div className="space-y-3">
                      {/* Verso - Protagonista */}
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="font-bold text-2xl">verso</span>
                          <Badge className="bg-primary/10 text-primary">Protagonista Personificado</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Personificado como o gaúcho, representa a alma do homem do campo. Associa-se à jornada, ao descanso, à tradição e aos sonhos.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">campereada</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{
                                width: '92%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">92%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">desencilhou</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{
                                width: '88%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">88%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">sonhos</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{
                                width: '85%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">85%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">campeira</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{
                                width: '82%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">82%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Saudade - Dor e Nostalgia */}
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="font-bold text-2xl">saudade</span>
                          <Badge className="bg-destructive/10 text-destructive">Dor e Nostalgia</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Sentimento central elevado a força da natureza. "Feito açoite" (dor física, castigo) e "redomona" (indomável, selvagem).
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">açoite</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-destructive" style={{
                                width: '95%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">95%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">redomona</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-destructive" style={{
                                width: '93%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">93%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">galpão</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-destructive" style={{
                                width: '87%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">87%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">olhos negros</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-destructive" style={{
                                width: '81%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">81%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sonhos - Refúgio e Frustração */}
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="font-bold text-2xl">sonhos</span>
                          <Badge className="bg-purple-500/10 text-purple-500">Refúgio e Frustração</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Desejo de pertencimento e integração com a paisagem campeira. Evasão da realidade, mas também perda ("tropa se desgarrou").
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">várzea</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{
                                width: '89%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">89%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">prenda</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{
                                width: '86%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">86%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">gateado</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{
                                width: '84%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">84%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">desgarrou</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{
                                width: '78%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">78%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fim de Ciclo e Cansaço */}
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="font-bold text-2xl">cansado</span>
                          <Badge className="bg-amber-500/10 text-amber-500">Fim de Ciclo</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Prosódia de declínio e exaustão. "Sol caindo", "cansado", "lonjuras" carregam peso do fim de jornada árdua.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">caindo</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500" style={{
                                width: '91%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">91%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">lonjuras</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500" style={{
                                width: '88%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">88%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">tarde</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500" style={{
                                width: '85%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">85%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Solidão e Abandono */}
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="font-bold text-2xl">silêncio</span>
                          <Badge className="bg-slate-500/10 text-slate-500">Solidão e Abandono</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Prosódia de perda e imobilidade. "Desgarrar" (separação), "silêncio de esporas" (ausência de ação), "cancela encostada" (abandono).
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">desgarrou</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-slate-500" style={{
                                width: '94%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">94%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">esporas</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-slate-500" style={{
                                width: '90%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">90%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">encostada</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-slate-500" style={{
                                width: '86%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">86%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">recostada</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-slate-500" style={{
                                width: '82%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">82%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Elementos Campeiros - Identidade */}
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="font-bold text-2xl">arreios</span>
                          <Badge className="bg-blue-500/10 text-blue-500">Extensão de Identidade</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Não são mero cenário, mas símbolos do trabalho árduo e da solidão subsequente. Extensões da identidade do gaúcho.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">suados</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{
                                width: '93%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">93%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">gateada</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{
                                width: '88%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">88%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">respeito</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{
                                width: '85%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">85%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">querência</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{
                                width: '79%'
                              }} />
                              </div>
                              <span className="text-xs text-muted-foreground">79%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Frequência */}
        <TabsContent value="frequencia" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <FileBarChart className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Análise Log-Likelihood (LL)</CardTitle>
                    <button className="p-1 hover:bg-muted rounded-full transition-colors group relative">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg max-w-xs text-sm">
                          <p className="font-semibold mb-1">O que é Log-Likelihood?</p>
                          <p>É um teste estatístico que mostra se uma palavra aparece muito mais (ou muito menos) no seu corpus de estudo do que esperado.</p>
                          <p className="mt-2 text-xs">Valores altos = a palavra é super característica das músicas gaúchas!</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                <CardDescription>
                  Palavras-chave em comparação com o corpus de referência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={logLikelihoodData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="palavra" angle={-45} textAnchor="end" height={80} stroke="hsl(var(--muted-foreground))" />
                    <YAxis label={{
                    value: 'Log-Likelihood',
                    angle: -90,
                    position: 'insideLeft'
                  }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {logLikelihoodData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{
                    backgroundColor: "hsl(142, 71%, 45%)"
                  }} />
                    <span>LL {'>'} 15.13 = p {'<'} 0.0001 (extremamente significativo)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{
                    backgroundColor: "hsl(0, 72%, 51%)"
                  }} />
                    <span>LL {'>'} 6.63 = p {'<'} 0.01 (significativo)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{
                    backgroundColor: "hsl(45, 93%, 47%)"
                  }} />
                    <span>LL {'>'} 3.84 = p {'<'} 0.05 (pouco significativo)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Mutual Information Score (MI)</CardTitle>
                    <button className="p-1 hover:bg-muted rounded-full transition-colors group relative">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg max-w-xs text-sm">
                          <p className="font-semibold mb-1">O que é MI Score?</p>
                          <p>Mede o quanto uma palavra está "ligada" ao seu corpus. É como medir a força da associação entre a palavra e o tipo de música.</p>
                          <p className="mt-2 text-xs">MI alto = essa palavra é típica das músicas gaúchas!</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                <CardDescription>
                  Força da associação entre palavra e corpus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={miScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="palavra" angle={-45} textAnchor="end" height={80} stroke="hsl(var(--muted-foreground))" />
                    <YAxis label={{
                    value: 'MI Score',
                    angle: -90,
                    position: 'insideLeft'
                  }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {miScoreData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{
                    backgroundColor: "hsl(142, 71%, 45%)"
                  }} />
                    <span>MI {'>'} 6 = Associação forte</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{
                    backgroundColor: "hsl(0, 72%, 51%)"
                  }} />
                    <span>MI 4-6 = Associação moderada</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{
                    backgroundColor: "hsl(45, 93%, 47%)"
                  }} />
                    <span>MI {'<'} 4 = Associação fraca</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Estatística */}
        <TabsContent value="estatistica" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tabela de Palavras-Chave Estatísticas</CardTitle>
              <CardDescription>
                Análise combinada de Log-Likelihood e MI Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Palavra</TableHead>
                    <TableHead className="text-right">Freq. Bruta</TableHead>
                    <TableHead className="text-right">Freq. Normalizada</TableHead>
                    <TableHead className="text-right">Log-Likelihood</TableHead>
                    <TableHead className="text-right">MI Score</TableHead>
                    <TableHead>Significância</TableHead>
                    <TableHead>Efeito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {palavrasChaveData.map((item, index) => {
                  const EfeitoIcon = item.efeitoIcon;
                  return <TableRow key={index} className="cursor-pointer hover:bg-muted/50" onClick={() => handleWordClick(item.palavra)}>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Nuvem */}
        <TabsContent value="nuvem" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nuvem de Domínios Semânticos - Constelação Orbital</CardTitle>
              <CardDescription>
                Clique e arraste para mover o gráfico. Use a roda do mouse para zoom. Arraste as palavras para movê-las na órbita. Clique nas palavras para ver concordância (KWIC).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <TooltipProvider>
                <div 
                  ref={containerRef}
                  className={`relative h-[750px] bg-gradient-to-br from-background via-muted/10 to-background rounded-lg border overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasPanMove}
                  onMouseUp={handleCanvasPanEnd}
                  onMouseLeave={handleCanvasPanEnd}
                  onWheel={handleWheel}
                >
                  {/* Controles de Zoom - Interno */}
                  <div className="absolute top-4 right-4 z-30 flex flex-col gap-1 bg-background/95 backdrop-blur-sm border rounded-lg p-1 shadow-lg">
                    <button
                      onClick={handleZoomIn}
                      className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded transition-colors"
                      title="Aumentar zoom"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded transition-colors"
                      title="Resetar zoom e centralizar"
                    >
                      <Minimize2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded transition-colors"
                      title="Reduzir zoom"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                  </div>

                  <div 
                    className="pan-area absolute inset-0"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                      transformOrigin: 'top left',
                      pointerEvents: 'none'
                    }}
                  >
                    <svg
                      ref={svgRef}
                      width={1300}
                      height={975}
                      viewBox="0 0 1300 975"
                      className="w-auto h-auto"
                      style={{ 
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'auto'
                      }}
                    >
                    {dominiosData.map((dominio, index) => {
                      const positions = [
                        { x: 650, y: 487 },
                        { x: 390, y: 195 },
                        { x: 910, y: 195 },
                        { x: 364, y: 754 },
                        { x: 936, y: 754 }
                      ];
                      
                      const position = positions[index];
                      const centerX = position.x;
                      const centerY = position.y;
                      
                      const sizeScale = (0.6 + (dominio.percentual / 28.2) * 0.8) * 1.3;
                      
                      const orbitRadii = [
                        91 * sizeScale,
                        143 * sizeScale,
                        195 * sizeScale,
                        247 * sizeScale
                      ];
                      
                      const totalWords = dominio.palavras.length;
                      const wordsPerOrbit = Math.ceil(totalWords / 4);
                      
                      return (
                        <g key={dominio.dominio}>
                          {orbitRadii.map((radius, orbitIndex) => {
                            const circumference = 2 * Math.PI * radius;
                            return (
                              <g key={`orbit-${orbitIndex}`}>
                                <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke={dominio.cor} strokeWidth={3.9 - orbitIndex * 0.65} opacity={0.25 - orbitIndex * 0.05} />
                                <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke={dominio.cor} strokeWidth={3.9 - orbitIndex * 0.65} strokeDasharray={`${circumference * 0.1} ${circumference * 0.9}`} opacity={0.4}
                                  style={{ animation: 'spin 60s linear infinite', transformOrigin: `${centerX}px ${centerY}px` }} />
                              </g>
                            );
                          })}

                          <g style={{ cursor: 'pointer' }} onClick={() => handleDomainClick(dominio.dominio)}>
                            <circle cx={centerX} cy={centerY} r={36.4 * sizeScale} fill={dominio.cor} opacity="0.1" className="animate-pulse" />
                            <circle cx={centerX} cy={centerY} r={29.9 * sizeScale} fill={dominio.cor} opacity="0.2" />
                            <circle cx={centerX} cy={centerY} r={23.4 * sizeScale} fill={dominio.cor} opacity="0.85" style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))' }} />
                            <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" className="fill-primary-foreground font-bold pointer-events-none"
                              style={{ fontSize: `${18.2 * sizeScale}px` }}>{dominio.dominio.split(' ')[0]}</text>
                          </g>

                          {dominio.palavras.map((palavra, wordIndex) => {
                            const orbitLevel = Math.floor(wordIndex / wordsPerOrbit);
                            const orbit = Math.min(orbitLevel, 3);
                            const radius = orbitRadii[orbit];
                            const wordsInThisOrbit = Math.min(wordsPerOrbit, totalWords - orbit * wordsPerOrbit);
                            const indexInOrbit = wordIndex % wordsPerOrbit;
                            const wordKey = `${dominio.dominio}-${palavra}`;
                            
                            let angle: number;
                            if (orbitProgress[wordKey] !== undefined) {
                              angle = (orbitProgress[wordKey] / 100) * 2 * Math.PI - Math.PI / 2;
                            } else {
                              const baseAngle = (indexInOrbit / wordsInThisOrbit) * 2 * Math.PI - Math.PI / 2;
                              const angleOffset = (Math.sin(wordIndex * 2.5) * 0.3);
                              angle = baseAngle + angleOffset;
                            }
                            
                            const radiusVariation = 1 + (Math.cos(wordIndex * 3.7) * 0.12);
                            const finalRadius = radius * radiusVariation;
                            const x = centerX + Math.cos(angle) * finalRadius;
                            const y = centerY + Math.sin(angle) * finalRadius;
                            const wordScale = (1 - (orbit * 0.12)) * 1.3;
                            const stats = palavraStats[palavra];
                            
                            return (
                              <g key={wordKey} data-word-key={wordKey} data-center-x={centerX} data-center-y={centerY} style={{ cursor: 'grab' }}
                                onMouseDown={(e) => handleMouseDown(e, wordKey, centerX, centerY)}>
                                <circle cx={x} cy={y} r={10.4 * wordScale} fill={dominio.cor} opacity="0.08" className="animate-pulse" />
                                <circle cx={x} cy={y} r={7.8 * wordScale} fill={dominio.cor} opacity="0.15" />
                                <circle cx={x} cy={y} r={5.2 * wordScale} fill={dominio.cor} opacity="0.85" style={{ filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))' }} />
                                <circle cx={x} cy={y} r={15.6 * wordScale} fill="transparent" style={{ cursor: 'pointer' }}
                                  onClick={(e) => { e.stopPropagation(); if (!isDraggingWord) handleWordClick(palavra); }}>
                                  {stats && <title>{`${palavra}\nFreq. Bruta: ${stats.frequenciaBruta}\nFreq. Normalizada: ${stats.frequenciaNormalizada}\nProsódia: ${stats.prosodia === 'positiva' ? 'Positiva ✓' : stats.prosodia === 'negativa' ? 'Negativa ✗' : 'Neutra −'}`}</title>}
                                </circle>
                                <text x={x} y={y - 2.6 * wordScale} textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold pointer-events-none"
                                  style={{ fontSize: `${9.1 * wordScale}px` }}>{palavra}</text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </TooltipProvider>
              
              <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/40 border"><div className="font-semibold mb-1 text-sm">Órbita 1</div><div className="text-muted-foreground">20-30% de freq.</div></div>
                <div className="p-2.5 rounded-lg bg-muted/40 border"><div className="font-semibold mb-1 text-sm">Órbita 2</div><div className="text-muted-foreground">15-20% de freq.</div></div>
                <div className="p-2.5 rounded-lg bg-muted/40 border"><div className="font-semibold mb-1 text-sm">Órbita 3</div><div className="text-muted-foreground">10-15% de freq.</div></div>
                <div className="p-2.5 rounded-lg bg-muted/40 border"><div className="font-semibold mb-1 text-sm">Órbita 4</div><div className="text-muted-foreground">{'<'}10% de freq.</div></div>
              </div>
            </CardContent>
          </Card>
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
                  {selectedDomain.palavras.map((palavra, idx) => <Badge key={idx} className="cursor-pointer hover:scale-105 transition-all text-base px-4 py-2 border-0" style={{
                backgroundColor: selectedDomain.cor,
                color: selectedDomain.corTexto
              }} onClick={() => {
                setDomainModalOpen(false);
                handleWordClick(palavra);
              }}>
                      {palavra}
                    </Badge>)}
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