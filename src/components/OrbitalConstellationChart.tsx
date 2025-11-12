import { useState, useRef, useCallback, useEffect } from "react";
import { KWICModal } from "./KWICModal";
import { NavigationToolbar } from "@/components/NavigationToolbar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface WordData {
  word: string;
  strength: number;
  category: string;
  color: string;
}

interface OrbitalSystem {
  centerWord: string;
  category: string;
  words: WordData[];
}

interface OrbitalConstellationChartProps {
  songName?: string;
  artistName?: string;
}

export const OrbitalConstellationChart = ({
  songName = "Quando o verso vem pras casa",
  artistName = "Luiz Marenco"
}: OrbitalConstellationChartProps) => {
  // View modes: overview -> universe -> constellations -> zoomed
  const [viewMode, setViewMode] = useState<'overview' | 'universe' | 'constellations' | 'zoomed'>('overview');
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customAngles, setCustomAngles] = useState<Record<string, number>>({});
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [orbitProgress, setOrbitProgress] = useState<Record<string, number>>({});
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);
  const [kwicModalOpen, setKwicModalOpen] = useState(false);
  const [selectedWordForKwic, setSelectedWordForKwic] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // KWIC data baseado na letra da música
  const getMockKWICData = (word: string) => {
    const kwicData: Record<string, Array<{
      leftContext: string;
      keyword: string;
      rightContext: string;
      source: string;
    }>> = {
      "verso": [
        { leftContext: "Daí um", keyword: "verso", rightContext: "de campo se chegou da campereada", source: "Quando o verso vem pras casa - Luiz Marenco" },
        { leftContext: "Prá querência galponeira, onde o", keyword: "verso", rightContext: "é mais caseiro", source: "Quando o verso vem pras casa - Luiz Marenco" },
        { leftContext: "E o", keyword: "verso", rightContext: "que tinha sonhos prá rondar na madrugada", source: "Quando o verso vem pras casa - Luiz Marenco" },
        { leftContext: "E o", keyword: "verso", rightContext: "sonhou ser várzea com sombra de tarumã", source: "Quando o verso vem pras casa - Luiz Marenco" }
      ],
      "campereada": [{ leftContext: "Daí um verso de campo se chegou da", keyword: "campereada", rightContext: "", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "desencilhou": [{ leftContext: "", keyword: "Desencilhou", rightContext: "na ramada, já cansado das lonjuras", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "sonhos": [
        { leftContext: "E o verso que tinha", keyword: "sonhos", rightContext: "prá rondar na madrugada", source: "Quando o verso vem pras casa - Luiz Marenco" },
        { leftContext: "E o verso", keyword: "sonhou", rightContext: "ser várzea com sombra de tarumã", source: "Quando o verso vem pras casa - Luiz Marenco" },
        { leftContext: "", keyword: "Sonhou", rightContext: "com os olhos da prenda vestidos de primavera", source: "Quando o verso vem pras casa - Luiz Marenco" }
      ],
      "campeira": [{ leftContext: "Mas estampando a figura,", keyword: "campeira", rightContext: ", bem do seu jeito", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "açoite": [{ leftContext: "A mansidão da campanha traz saudades feito", keyword: "açoite", rightContext: "", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "redomona": [{ leftContext: "E uma saudade", keyword: "redomona", rightContext: "pelos cantos do galpão", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "galpão": [{ leftContext: "E uma saudade redomona pelos cantos do", keyword: "galpão", rightContext: "", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "olhos negros": [{ leftContext: "Com os", keyword: "olhos negros", rightContext: "de noite que ela mesmo aquerenciou", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "várzea": [
        { leftContext: "Pela", keyword: "várzea", rightContext: "espichada com o sol da tarde caindo", source: "Quando o verso vem pras casa - Luiz Marenco" },
        { leftContext: "E o verso sonhou ser", keyword: "várzea", rightContext: "com sombra de tarumã", source: "Quando o verso vem pras casa - Luiz Marenco" }
      ],
      "prenda": [{ leftContext: "Sonhou com os olhos da", keyword: "prenda", rightContext: "vestidos de primavera", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "gateado": [{ leftContext: "Ser um galo prás manhãs, ou um", keyword: "gateado", rightContext: "prá encilha", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "desgarrou": [{ leftContext: "Deixou a cancela encostada e a tropa se", keyword: "desgarrou", rightContext: "", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "caindo": [{ leftContext: "Pela várzea espichada com o sol da tarde", keyword: "caindo", rightContext: "", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "lonjuras": [{ leftContext: "Desencilhou na ramada, já cansado das", keyword: "lonjuras", rightContext: "", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "tarde": [
        { leftContext: "Pela várzea espichada com o sol da", keyword: "tarde", rightContext: "caindo", source: "Quando o verso vem pras casa - Luiz Marenco" },
        { leftContext: "Trazendo um novo reponte, prá um fim de", keyword: "tarde", rightContext: "bem lindo", source: "Quando o verso vem pras casa - Luiz Marenco" }
      ],
      "ramada": [{ leftContext: "Desencilhou na", keyword: "ramada", rightContext: ", já cansado das lonjuras", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "esporas": [{ leftContext: "Ficaram arreios suados e o silencio de", keyword: "esporas", rightContext: "", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "encostada": [{ leftContext: "Deixou a cancela", keyword: "encostada", rightContext: "e a tropa se desgarrou", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "recostada": [{ leftContext: "Uma cuia e uma bomba", keyword: "recostada", rightContext: "na cambona", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "arreios": [{ leftContext: "Ficaram", keyword: "arreios", rightContext: "suados e o silencio de esporas", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "suados": [{ leftContext: "Ficaram arreios", keyword: "suados", rightContext: "e o silencio de esporas", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "gateada": [{ leftContext: "No lombo de uma", keyword: "gateada", rightContext: "frente aberta de respeito", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "respeito": [{ leftContext: "No lombo de uma gateada frente aberta de", keyword: "respeito", rightContext: "", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "querência": [{ leftContext: "Prá", keyword: "querência", rightContext: "galponeira, onde o verso é mais caseiro", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "saudade": [{ leftContext: "E uma", keyword: "saudade", rightContext: "redomona pelos cantos do galpão", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "silêncio": [{ leftContext: "Ficaram arreios suados e o", keyword: "silencio", rightContext: "de esporas", source: "Quando o verso vem pras casa - Luiz Marenco" }],
      "cansado": [{ leftContext: "Desencilhou na ramada, já", keyword: "cansado", rightContext: "das lonjuras", source: "Quando o verso vem pras casa - Luiz Marenco" }]
    };
    return kwicData[word.toLowerCase()] || [];
  };

  // Estatísticas de palavras
  const palavraStats: Record<string, {
    frequenciaBruta: number;
    frequenciaNormalizada: number;
    prosodia: "positiva" | "negativa" | "neutra";
  }> = {
    "verso": { frequenciaBruta: 4, frequenciaNormalizada: 23.5, prosodia: "positiva" },
    "campereada": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "desencilhou": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "sonhos": { frequenciaBruta: 3, frequenciaNormalizada: 17.6, prosodia: "positiva" },
    "campeira": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
    "galpão": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "querência": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
    "saudade": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "negativa" },
    "açoite": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "negativa" },
    "redomona": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "caindo": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "desgarrou": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "negativa" },
    "esporas": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "suados": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "negativa" },
    "ramada": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "cansado": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "negativa" },
    "lonjuras": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "encostada": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "recostada": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "gateada": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "respeito": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
    "tarde": { frequenciaBruta: 2, frequenciaNormalizada: 11.8, prosodia: "neutra" },
    "olhos negros": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
    "várzea": { frequenciaBruta: 2, frequenciaNormalizada: 11.8, prosodia: "positiva" },
    "prenda": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "positiva" },
    "gateado": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" },
    "silêncio": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "negativa" },
    "arreios": { frequenciaBruta: 1, frequenciaNormalizada: 5.9, prosodia: "neutra" }
  };

  // Cores por sistema
  const systemColors: Record<string, string> = {
    "Protagonista Personificado": "hsl(var(--primary))",
    "Dor e Nostalgia": "hsl(var(--destructive))",
    "Refúgio e Frustração": "#a855f7",
    "Fim de Ciclo": "#f59e0b",
    "Solidão e Abandono": "#64748b",
    "Extensão de Identidade": "#3b82f6"
  };

  // Definição dos sistemas semânticos
  const orbitalSystems: OrbitalSystem[] = [
    {
      centerWord: "verso",
      category: "Protagonista Personificado",
      words: [
        { word: "campereada", strength: 92, category: "Protagonista Personificado", color: systemColors["Protagonista Personificado"] },
        { word: "desencilhou", strength: 88, category: "Protagonista Personificado", color: systemColors["Protagonista Personificado"] },
        { word: "sonhos", strength: 85, category: "Protagonista Personificado", color: systemColors["Protagonista Personificado"] },
        { word: "campeira", strength: 82, category: "Protagonista Personificado", color: systemColors["Protagonista Personificado"] }
      ]
    },
    {
      centerWord: "saudade",
      category: "Dor e Nostalgia",
      words: [
        { word: "açoite", strength: 95, category: "Dor e Nostalgia", color: systemColors["Dor e Nostalgia"] },
        { word: "redomona", strength: 93, category: "Dor e Nostalgia", color: systemColors["Dor e Nostalgia"] },
        { word: "galpão", strength: 87, category: "Dor e Nostalgia", color: systemColors["Dor e Nostalgia"] },
        { word: "olhos negros", strength: 81, category: "Dor e Nostalgia", color: systemColors["Dor e Nostalgia"] }
      ]
    },
    {
      centerWord: "sonhos",
      category: "Refúgio e Frustração",
      words: [
        { word: "várzea", strength: 89, category: "Refúgio e Frustração", color: systemColors["Refúgio e Frustração"] },
        { word: "prenda", strength: 86, category: "Refúgio e Frustração", color: systemColors["Refúgio e Frustração"] },
        { word: "gateado", strength: 84, category: "Refúgio e Frustração", color: systemColors["Refúgio e Frustração"] },
        { word: "desgarrou", strength: 78, category: "Refúgio e Frustração", color: systemColors["Refúgio e Frustração"] }
      ]
    },
    {
      centerWord: "cansado",
      category: "Fim de Ciclo",
      words: [
        { word: "caindo", strength: 91, category: "Fim de Ciclo", color: systemColors["Fim de Ciclo"] },
        { word: "lonjuras", strength: 88, category: "Fim de Ciclo", color: systemColors["Fim de Ciclo"] },
        { word: "tarde", strength: 85, category: "Fim de Ciclo", color: systemColors["Fim de Ciclo"] },
        { word: "ramada", strength: 78, category: "Fim de Ciclo", color: systemColors["Fim de Ciclo"] }
      ]
    },
    {
      centerWord: "silêncio",
      category: "Solidão e Abandono",
      words: [
        { word: "desgarrou", strength: 94, category: "Solidão e Abandono", color: systemColors["Solidão e Abandono"] },
        { word: "esporas", strength: 90, category: "Solidão e Abandono", color: systemColors["Solidão e Abandono"] },
        { word: "encostada", strength: 86, category: "Solidão e Abandono", color: systemColors["Solidão e Abandono"] },
        { word: "recostada", strength: 82, category: "Solidão e Abandono", color: systemColors["Solidão e Abandono"] }
      ]
    },
    {
      centerWord: "arreios",
      category: "Extensão de Identidade",
      words: [
        { word: "suados", strength: 93, category: "Extensão de Identidade", color: systemColors["Extensão de Identidade"] },
        { word: "gateada", strength: 88, category: "Extensão de Identidade", color: systemColors["Extensão de Identidade"] },
        { word: "respeito", strength: 85, category: "Extensão de Identidade", color: systemColors["Extensão de Identidade"] },
        { word: "querência", strength: 79, category: "Extensão de Identidade", color: systemColors["Extensão de Identidade"] }
      ]
    }
  ];

  // Calcula órbita baseado na força
  const getOrbit = (strength: number) => {
    if (strength >= 90) return 1;
    if (strength >= 80) return 2;
    if (strength >= 70) return 3;
    return 4;
  };

  // Handler para mudança de progresso na órbita
  const handleOrbitProgressChange = (wordKey: string, progress: number) => {
    setOrbitProgress(prev => ({ ...prev, [wordKey]: progress }));
  };

  // Handlers de drag para palavras
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGGElement>, wordKey: string, centerX: number, centerY: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedWord(wordKey);
    setIsDragging(false);
    const target = e.currentTarget;
    target.dataset.centerX = centerX.toString();
    target.dataset.centerY = centerY.toString();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedWord || !svgRef.current) return;
    setIsDragging(true);
    const svg = svgRef.current;
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
    setCustomAngles(prev => ({ ...prev, [draggedWord]: angle }));
  }, [draggedWord]);

  const handleMouseUp = useCallback(() => {
    setDraggedWord(null);
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

  // Handlers de Pan
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'svg' || target.classList.contains('pan-area')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [panOffset]);

  const handleCanvasPanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleCanvasPanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handlers de zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
  }, []);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(2, prev + 0.2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.5, prev - 0.2));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // NÍVEL 1: Overview - Sistemas orbitando o título da música
  const renderSystemsOverview = () => {
    const centerX = 575;
    const centerY = 400;
    const systemRadius = 280;

    return (
      <svg width="1150" height="800" viewBox="0 0 1150 800" className="w-full h-auto animate-fade-in">
        {/* Órbita dos sistemas */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r={systemRadius} 
          fill="none" 
          stroke="hsl(var(--border))" 
          strokeWidth="2" 
          strokeDasharray="12 8" 
          opacity={0.25}
        />
        
        {/* Órbita animada */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r={systemRadius} 
          fill="none" 
          stroke="hsl(var(--primary))" 
          strokeWidth="1.5" 
          strokeDasharray={`${2 * Math.PI * systemRadius * 0.2} ${2 * Math.PI * systemRadius * 0.8}`}
          opacity={0.4}
          style={{
            animation: 'orbit-slide 15s linear infinite',
            transformOrigin: `${centerX}px ${centerY}px`
          }}
        />

        {/* Botão central - Título da música */}
        <g 
          style={{ cursor: 'pointer' }}
          onClick={() => setViewMode('universe')}
        >
          <circle cx={centerX} cy={centerY} r={85} fill="hsl(var(--primary))" opacity="0.08" className="animate-pulse" />
          <circle cx={centerX} cy={centerY} r={72} fill="hsl(var(--primary))" opacity="0.15" />
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={60} 
            fill="hsl(var(--primary))" 
            opacity="0.92"
            style={{ filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.35))' }}
          />
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={60} 
            fill="none" 
            stroke="hsl(var(--background))" 
            strokeWidth="3" 
            opacity="0.5" 
          />
          <text 
            x={centerX} 
            y={centerY - 10} 
            textAnchor="middle" 
            className="fill-primary-foreground font-bold text-[15px] pointer-events-none"
          >
            {songName}
          </text>
          <text 
            x={centerX} 
            y={centerY + 8} 
            textAnchor="middle" 
            className="fill-primary-foreground text-[12px] pointer-events-none"
          >
            {artistName}
          </text>
          <text 
            x={centerX} 
            y={centerY + 25} 
            textAnchor="middle" 
            className="fill-primary-foreground/80 text-[9px] italic pointer-events-none"
          >
            Clique para explorar →
          </text>
        </g>

        {/* Sistemas semânticos orbitando */}
        {orbitalSystems.map((system, index) => {
          const angle = (index / orbitalSystems.length) * 2 * Math.PI - Math.PI / 2;
          const x = centerX + systemRadius * Math.cos(angle);
          const y = centerY + systemRadius * Math.sin(angle);
          const systemColor = systemColors[system.category];

          return (
            <Popover key={system.category}>
              <PopoverTrigger asChild>
                <g
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredSystem(system.category)}
                  onMouseLeave={() => setHoveredSystem(null)}
                >
                  {/* Linha conectando ao centro */}
                  <line 
                    x1={centerX} 
                    y1={centerY} 
                    x2={x} 
                    y2={y} 
                    stroke={systemColor} 
                    strokeWidth="1.5" 
                    opacity="0.2" 
                  />

                  {/* Glow effects */}
                  <circle cx={x} cy={y} r={55} fill={systemColor} opacity="0.06" className="animate-pulse" />
                  <circle cx={x} cy={y} r={46} fill={systemColor} opacity="0.12" />
                  
                  {/* Botão principal do sistema */}
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={38} 
                    fill={systemColor} 
                    opacity={hoveredSystem === system.category ? "0.95" : "0.88"}
                    className="transition-all"
                    style={{ filter: 'drop-shadow(0 6px 18px rgba(0, 0, 0, 0.35))' }}
                  />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={38} 
                    fill="none" 
                    stroke="hsl(var(--background))" 
                    strokeWidth="2.5" 
                    opacity="0.5" 
                  />

                  {/* Contador de palavras */}
                  <circle 
                    cx={x + 24} 
                    cy={y - 24} 
                    r={10} 
                    fill="hsl(var(--background))" 
                    stroke={systemColor} 
                    strokeWidth="2"
                  />
                  <text 
                    x={x + 24} 
                    y={y - 24} 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-foreground font-bold text-[11px] pointer-events-none"
                  >
                    {system.words.length}
                  </text>

                  {/* Nome da categoria */}
                  <text 
                    x={x} 
                    y={y - 2} 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-primary-foreground font-bold text-[13px] pointer-events-none"
                  >
                    {system.category}
                  </text>
                  <text 
                    x={x} 
                    y={y + 12} 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-primary-foreground/70 text-[9px] pointer-events-none italic"
                  >
                    {system.centerWord}
                  </text>
                </g>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" side="top">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm" style={{ color: systemColor }}>
                    {system.category}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Palavra central: <span className="font-medium">{system.centerWord}</span>
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Palavras desta aura semântica:</p>
                    <div className="flex flex-wrap gap-1">
                      {system.words.map((word) => (
                        <span 
                          key={word.word}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: `${systemColor}20`,
                            color: systemColor
                          }}
                        >
                          {word.word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </svg>
    );
  };

  // NÍVEL 2: Universe - Todas as palavras distribuídas
  const renderUniverseView = () => {
    const centerX = 575;
    const centerY = 400;
    const allWords = orbitalSystems.flatMap(system => 
      system.words.map(word => ({
        ...word,
        system: system.centerWord,
        systemColor: systemColors[system.category]
      }))
    );

    const wordsByOrbit = allWords.reduce((acc, word) => {
      const orbit = getOrbit(word.strength);
      if (!acc[orbit]) acc[orbit] = [];
      acc[orbit].push(word);
      return acc;
    }, {} as Record<number, typeof allWords>);

    const universeOrbitRadii = { 1: 160, 2: 235, 3: 310, 4: 385 };

    return (
      <div className="relative">
        {/* Botão flutuante no canto superior esquerdo */}
        <Button
          onClick={() => setViewMode('constellations')}
          className="absolute top-4 left-4 z-10 shadow-lg"
          variant="default"
        >
          Explorar Constelações Semânticas →
        </Button>

        <svg width="1150" height="800" viewBox="0 0 1150 800" className="w-full h-auto animate-fade-in">
          {/* Órbitas */}
          {[1, 2, 3, 4].map(orbit => {
            const radius = universeOrbitRadii[orbit as keyof typeof universeOrbitRadii];
            const circumference = 2 * Math.PI * radius;
            return (
              <g key={`universe-orbit-${orbit}`}>
                <circle 
                  cx={centerX} 
                  cy={centerY} 
                  r={radius} 
                  fill="none" 
                  stroke="hsl(var(--border))" 
                  strokeWidth="2" 
                  strokeDasharray="8 8" 
                  opacity={0.2} 
                />
                <circle 
                  cx={centerX} 
                  cy={centerY} 
                  r={radius} 
                  fill="none" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="1.5" 
                  strokeDasharray={`${circumference * 0.15} ${circumference * 0.85}`}
                  opacity={0.3}
                  style={{
                    animation: `orbit-slide ${12 + orbit * 2}s linear infinite`,
                    transformOrigin: `${centerX}px ${centerY}px`
                  }}
                />
              </g>
            );
          })}

          {/* Centro */}
          <g>
            <circle cx={centerX} cy={centerY} r={60} fill="hsl(var(--primary))" opacity="0.05" className="animate-pulse" />
            <circle cx={centerX} cy={centerY} r={52} fill="hsl(var(--primary))" opacity="0.1" />
            <circle 
              cx={centerX} 
              cy={centerY} 
              r={45} 
              fill="hsl(var(--primary))" 
              opacity="0.9"
              style={{ filter: 'drop-shadow(0 6px 20px rgba(0, 0, 0, 0.3))' }}
            />
            <circle 
              cx={centerX} 
              cy={centerY} 
              r={45} 
              fill="none" 
              stroke="hsl(var(--background))" 
              strokeWidth="2" 
              opacity="0.4" 
            />
            <text 
              x={centerX} 
              y={centerY - 4} 
              textAnchor="middle" 
              className="fill-primary-foreground font-bold text-[13px]"
            >
              {songName}
            </text>
            <text 
              x={centerX} 
              y={centerY + 9} 
              textAnchor="middle" 
              className="fill-primary-foreground text-[11px]"
            >
              {artistName}
            </text>
          </g>

          {/* Palavras */}
          {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) => 
            wordsInOrbit.map((word, index) => {
              const radius = universeOrbitRadii[parseInt(orbit) as keyof typeof universeOrbitRadii];
              const angle = (index / wordsInOrbit.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              const stats = palavraStats[word.word];
              
              return (
                <g 
                  key={`universe-word-${word.system}-${word.word}-${index}`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDragging) {
                      setSelectedWordForKwic(word.word);
                      setKwicModalOpen(true);
                    }
                  }}
                >
                  <line 
                    x1={centerX} 
                    y1={centerY} 
                    x2={x} 
                    y2={y} 
                    stroke={word.systemColor} 
                    strokeWidth="1" 
                    opacity="0.15" 
                  />
                  <circle cx={x} cy={y} r={26} fill={word.systemColor} opacity="0.05" className="animate-pulse" />
                  <circle cx={x} cy={y} r={22} fill={word.systemColor} opacity="0.1" />
                  <circle cx={x} cy={y} r={18} fill={word.systemColor} opacity="0.15" />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={14} 
                    fill={word.systemColor} 
                    opacity="0.85" 
                    stroke="hsl(var(--background))" 
                    strokeWidth="2"
                    style={{ 
                      filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
                      transition: 'all 0.2s ease'
                    }}
                    className="hover:opacity-100"
                  />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={30} 
                    fill="transparent"
                  >
                    {stats && (
                      <title>
                        {`${word.word}\nForça: ${word.strength}%\nFreq. Bruta: ${stats.frequenciaBruta}\nFreq. Normalizada: ${stats.frequenciaNormalizada}\nProsódia: ${stats.prosodia === 'positiva' ? 'Positiva ✓' : stats.prosodia === 'negativa' ? 'Negativa ✗' : 'Neutra −'}\nSistema: ${word.system}\n\nClique para ver concordância (KWIC)`}
                      </title>
                    )}
                  </circle>
                  <text 
                    x={x} 
                    y={y - 2} 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-primary-foreground font-bold text-[10px] pointer-events-none"
                  >
                    {word.word}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>
    );
  };

  // NÍVEL 3: Constellations - Grid de sistemas
  const renderConstellationsGrid = () => {
    const renderOrbitalSystem = (system: OrbitalSystem, centerX: number, centerY: number) => {
      const orbitRadii = { 1: 35, 2: 55, 3: 75, 4: 95 };
      const wordsByOrbit = system.words.reduce((acc, word) => {
        const orbit = getOrbit(word.strength);
        if (!acc[orbit]) acc[orbit] = [];
        acc[orbit].push(word);
        return acc;
      }, {} as Record<number, WordData[]>);

      return (
        <g>
          {/* Órbitas */}
          {[1, 2, 3, 4].map(orbit => {
            const radius = orbitRadii[orbit as keyof typeof orbitRadii];
            return (
              <circle 
                key={`orbit-${orbit}`}
                cx={centerX} 
                cy={centerY} 
                r={radius} 
                fill="none" 
                stroke="hsl(var(--border))" 
                strokeWidth="1" 
                opacity="0.15" 
              />
            );
          })}

          {/* Centro */}
          <circle cx={centerX} cy={centerY} r={28} fill={systemColors[system.category]} opacity="0.1" className="animate-pulse" />
          <circle cx={centerX} cy={centerY} r={23} fill={systemColors[system.category]} opacity="0.2" />
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={18} 
            fill={systemColors[system.category]} 
            opacity="0.85"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))' }}
          />
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={18} 
            fill="none" 
            stroke="hsl(var(--background))" 
            strokeWidth="1.5" 
            opacity="0.5" 
          />
          <text 
            x={centerX} 
            y={centerY} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            className="fill-primary-foreground font-bold text-[14px]"
          >
            {system.centerWord}
          </text>

          {/* Palavras */}
          {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) => 
            wordsInOrbit.map((word, index) => {
              const radius = orbitRadii[parseInt(orbit) as keyof typeof orbitRadii];
              const angle = (index / wordsInOrbit.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);

              return (
                <g key={`word-${word.word}`}>
                  <line 
                    x1={centerX} 
                    y1={centerY} 
                    x2={x} 
                    y2={y} 
                    stroke={word.color} 
                    strokeWidth="0.5" 
                    opacity="0.15" 
                  />
                  <circle cx={x} cy={y} r={8} fill={word.color} opacity="0.08" className="animate-pulse" />
                  <circle cx={x} cy={y} r={6} fill={word.color} opacity="0.15" />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={4} 
                    fill={word.color} 
                    opacity="0.85"
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))' }}
                  />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={4} 
                    fill="none" 
                    stroke="hsl(var(--background))" 
                    strokeWidth="0.5" 
                    opacity="0.5" 
                  />
                  <text 
                    x={x} 
                    y={y - 2} 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-foreground font-bold text-[7px] pointer-events-none"
                  >
                    {word.word}
                  </text>
                  <text 
                    x={x} 
                    y={y + 6} 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-muted-foreground font-semibold text-[6px] pointer-events-none"
                  >
                    {word.strength}%
                  </text>
                </g>
              );
            })
          )}
        </g>
      );
    };

    return (
      <>
        <div className="flex items-center justify-between px-4 pt-4 pb-2 animate-fade-in">
          <h3 className="text-base font-semibold">Constelações Semânticas - Prosódia</h3>
          <button 
            onClick={() => setViewMode('universe')} 
            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            ← Voltar ao universo
          </button>
        </div>
        <svg width="1150" height="680" viewBox="0 0 1150 680" className="w-full h-auto animate-fade-in">
          {orbitalSystems.map((system, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            const x = 200 + col * 400;
            const y = 180 + row * 350;
            return (
              <g 
                key={system.centerWord} 
                className="cursor-pointer transition-all duration-200 hover:opacity-80" 
                onClick={() => {
                  setSelectedSystem(system.centerWord);
                  setViewMode('zoomed');
                }}
              >
                {renderOrbitalSystem(system, x, y)}
              </g>
            );
          })}
        </svg>
      </>
    );
  };

  // NÍVEL 4: Zoomed - Sistema individual ampliado
  const renderZoomedSystem = () => {
    const system = orbitalSystems.find(s => s.centerWord === selectedSystem);
    if (!system) return null;

    const centerX = 450;
    const centerY = 300;
    const scale = 2.5;
    const orbitRadii = { 1: 35 * scale, 2: 55 * scale, 3: 75 * scale, 4: 95 * scale };

    const wordsByOrbit = system.words.reduce((acc, word) => {
      const orbit = getOrbit(word.strength);
      if (!acc[orbit]) acc[orbit] = [];
      acc[orbit].push(word);
      return acc;
    }, {} as Record<number, WordData[]>);

    const getWordPosition = (word: WordData, index: number, totalInOrbit: number) => {
      const orbit = getOrbit(word.strength);
      const radius = orbitRadii[orbit as keyof typeof orbitRadii];
      const wordKey = `${system.centerWord}-${word.word}`;
      
      let angle: number;
      if (orbitProgress[wordKey] !== undefined) {
        angle = (orbitProgress[wordKey] / 100) * 2 * Math.PI - Math.PI / 2;
      } else if (customAngles[wordKey] !== undefined) {
        angle = customAngles[wordKey];
      } else {
        angle = (index / totalInOrbit) * 2 * Math.PI - Math.PI / 2;
      }
      
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        radius,
        angle
      };
    };

    return (
      <>
        <div className="flex items-center justify-between mb-4 px-4 pt-4 animate-fade-in">
          <div className="flex-1"></div>
          <div className="flex items-center gap-3">
            <span 
              className="inline-block w-4 h-4 rounded-full" 
              style={{ backgroundColor: systemColors[system.category] }}
            />
            <h3 className="text-xl font-bold px-6 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
              Constelação: {system.centerWord}
            </h3>
          </div>
          <div className="flex-1 flex justify-end">
            <button 
              onClick={() => setViewMode('constellations')} 
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
            >
              ← Voltar
            </button>
          </div>
        </div>

        <div className="mb-3 px-4 animate-fade-in">
          <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
            {system.words.sort((a, b) => b.strength - a.strength).map((word, index) => {
              const wordKey = `${system.centerWord}-${word.word}`;
              const currentProgress = orbitProgress[wordKey] ?? (index / system.words.length) * 100;
              return (
                <div key={word.word} className="flex items-center gap-3 min-w-[220px]">
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{word.word}</span>
                      <span 
                        className="text-xs font-semibold px-2 py-0.5 rounded" 
                        style={{
                          backgroundColor: `${word.color}20`,
                          color: word.color
                        }}
                      >
                        {word.strength}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={currentProgress} 
                        onChange={e => handleOrbitProgressChange(wordKey, parseFloat(e.target.value))} 
                        className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${word.color} 0%, ${word.color} ${currentProgress}%, hsl(var(--muted)) ${currentProgress}%, hsl(var(--muted)) 100%)`
                        }}
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {Math.round(currentProgress)}°
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-start justify-between mt-2 px-1">
            <p className="text-xs text-muted-foreground flex-1">
              💡 Dica: Arraste as palavras no gráfico ou use os controles acima. Passe o mouse sobre uma palavra para ver sua concordância.
            </p>
            <NavigationToolbar
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetZoom}
              onFitToView={() => {
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              isFullscreen={isFullscreen}
              className="ml-4"
            />
          </div>
        </div>

        <div className="px-4">
          <svg 
            ref={svgRef} 
            width="900" 
            height="600" 
            viewBox="0 0 900 600" 
            className="w-full h-auto animate-scale-in"
            style={{ userSelect: isPanning ? 'none' : 'auto' }}
          >
            {/* Órbitas */}
            {[1, 2, 3, 4].map(orbit => {
              const radius = orbitRadii[orbit as keyof typeof orbitRadii];
              const circumference = 2 * Math.PI * radius;
              return (
                <g key={`orbit-${orbit}`}>
                  <circle 
                    cx={centerX} 
                    cy={centerY} 
                    r={radius} 
                    fill="none" 
                    stroke="hsl(var(--border))" 
                    strokeWidth="2" 
                    opacity={0.15} 
                  />
                  <circle 
                    cx={centerX} 
                    cy={centerY} 
                    r={radius} 
                    fill="none" 
                    stroke={systemColors[system.category]} 
                    strokeWidth="2" 
                    strokeDasharray={`${circumference * 0.1} ${circumference * 0.9}`}
                    opacity={0.4}
                    style={{
                      animation: 'orbit-slide 8s linear infinite',
                      transformOrigin: `${centerX}px ${centerY}px`
                    }}
                  />
                </g>
              );
            })}

            {/* Linhas conectando ao centro */}
            {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) => 
              wordsInOrbit.map((word, index) => {
                const pos = getWordPosition(word, index, wordsInOrbit.length);
                return (
                  <line 
                    key={`line-${system.centerWord}-${word.word}`}
                    x1={centerX} 
                    y1={centerY} 
                    x2={pos.x} 
                    y2={pos.y} 
                    stroke={word.color} 
                    strokeWidth="1" 
                    opacity="0.15" 
                  />
                );
              })
            )}

            {/* Centro */}
            <g>
              <circle cx={centerX} cy={centerY} r={28 * scale} fill={systemColors[system.category]} opacity="0.1" className="animate-pulse" />
              <circle cx={centerX} cy={centerY} r={23 * scale} fill={systemColors[system.category]} opacity="0.2" />
              <circle 
                cx={centerX} 
                cy={centerY} 
                r={18 * scale} 
                fill={systemColors[system.category]} 
                opacity="0.85"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))' }}
              />
              <circle 
                cx={centerX} 
                cy={centerY} 
                r={18 * scale} 
                fill="none" 
                stroke="hsl(var(--background))" 
                strokeWidth={1.5 * scale} 
                opacity="0.5" 
              />
              <text 
                x={centerX} 
                y={centerY} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="fill-primary-foreground font-bold"
                style={{ fontSize: `${14 * scale}px`, pointerEvents: 'none' }}
              >
                {system.centerWord}
              </text>
            </g>

            {/* Palavras */}
            {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) => 
              wordsInOrbit.map((word, index) => {
                const pos = getWordPosition(word, index, wordsInOrbit.length);
                const wordKey = `${system.centerWord}-${word.word}`;
                const isBeingDragged = draggedWord === wordKey;

                return (
                  <g 
                    key={`word-${wordKey}`}
                    data-word-key={wordKey}
                    data-center-x={centerX}
                    data-center-y={centerY}
                    style={{ cursor: isBeingDragged ? 'grabbing' : 'grab' }}
                    onMouseDown={(e) => handleMouseDown(e, wordKey, centerX, centerY)}
                  >
                    <circle cx={pos.x} cy={pos.y} r={8 * scale} fill={word.color} opacity="0.08" className="animate-pulse" style={{ pointerEvents: 'none' }} />
                    <circle cx={pos.x} cy={pos.y} r={6 * scale} fill={word.color} opacity="0.15" style={{ pointerEvents: 'none' }} />
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r={4 * scale} 
                      fill={word.color} 
                      opacity="0.85"
                      style={{
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))'
                      }}
                    />
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r={4 * scale} 
                      fill="none" 
                      stroke="hsl(var(--background))" 
                      strokeWidth={0.5 * scale} 
                      opacity="0.5"
                      style={{ pointerEvents: 'none' }}
                    />
                    <circle 
                      cx={pos.x} 
                      cy={pos.y} 
                      r={12 * scale} 
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredWord(word.word)}
                      onMouseLeave={() => setHoveredWord(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDragging) {
                          setSelectedWordForKwic(word.word);
                          setKwicModalOpen(true);
                        }
                      }}
                    >
                      {palavraStats[word.word] && (
                        <title>
                          {`${word.word}\nFreq. Bruta: ${palavraStats[word.word].frequenciaBruta}\nFreq. Normalizada: ${palavraStats[word.word].frequenciaNormalizada}\nProsódia: ${palavraStats[word.word].prosodia === 'positiva' ? 'Positiva ✓' : palavraStats[word.word].prosodia === 'negativa' ? 'Negativa ✗' : 'Neutra −'}`}
                        </title>
                      )}
                    </circle>
                    <text 
                      x={pos.x} 
                      y={pos.y - 2 * scale} 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      className="fill-foreground font-bold"
                      style={{ fontSize: `${7 * scale}px`, pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {word.word}
                    </text>
                    <text 
                      x={pos.x} 
                      y={pos.y + 6 * scale} 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      className="fill-muted-foreground font-semibold"
                      style={{ fontSize: `${6 * scale}px`, pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {word.strength}%
                    </text>

                    {/* Tooltip KWIC ao passar o mouse */}
                    {hoveredWord === word.word && (
                      <g>
                        <rect 
                          x={pos.x + 15} 
                          y={pos.y - 35} 
                          width="200" 
                          height="70" 
                          rx="6" 
                          fill="hsl(var(--popover))" 
                          stroke="hsl(var(--border))" 
                          strokeWidth="1" 
                          opacity="0.98"
                          style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))' }}
                        />
                        <text 
                          x={pos.x + 25} 
                          y={pos.y - 20} 
                          className="fill-foreground font-semibold"
                          style={{ fontSize: '10px' }}
                        >
                          {word.word}
                        </text>
                        <text 
                          x={pos.x + 25} 
                          y={pos.y - 5} 
                          className="fill-muted-foreground"
                          style={{ fontSize: '8px' }}
                        >
                          "quando o {word.word} vem..."
                        </text>
                        <text 
                          x={pos.x + 25} 
                          y={pos.y + 8} 
                          className="fill-muted-foreground"
                          style={{ fontSize: '8px' }}
                        >
                          "e o {word.word} se faz canção"
                        </text>
                        <text 
                          x={pos.x + 25} 
                          y={pos.y + 20} 
                          className="fill-primary"
                          style={{ fontSize: '7px', fontStyle: 'italic' }}
                        >
                          Clique para ver mais →
                        </text>
                      </g>
                    )}
                  </g>
                );
              })
            )}
          </svg>
        </div>
      </>
    );
  };

  return (
    <div className={`space-y-3 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}>
      {/* Cabeçalho com navegação - apenas para universe e constellations */}
      {(viewMode === 'universe' || viewMode === 'constellations') && (
        <div className="bg-background border rounded-lg p-2 shadow-sm">
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode('overview')} 
              className="px-4 py-2 text-sm rounded-lg transition-colors font-medium bg-muted hover:bg-muted/80"
            >
              ← Visão Geral
            </button>
            <button 
              onClick={() => setViewMode('universe')} 
              className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                viewMode === 'universe' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Universo Semântico
            </button>
            <button 
              onClick={() => setViewMode('constellations')} 
              className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                viewMode === 'constellations' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Constelações Semânticas
            </button>
          </div>
        </div>
      )}

      <div 
        ref={containerRef} 
        className={`relative w-full bg-gradient-to-br from-background to-muted/20 rounded-lg border overflow-hidden transition-all duration-500 p-4 ${
          isPanning ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{ 
          height: isFullscreen ? 'calc(100vh - 150px)' : 'auto',
          userSelect: isPanning ? 'none' : 'auto'
        }}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasPanMove}
        onMouseUp={handleCanvasPanEnd}
        onMouseLeave={handleCanvasPanEnd}
      >
        {/* Controles de Zoom - apenas para overview e universe */}
        {(viewMode === 'overview' || viewMode === 'universe') && (
          <NavigationToolbar
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleResetZoom}
            onFitToView={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            isFullscreen={isFullscreen}
            className="absolute top-4 right-4 z-10"
          />
        )}

        <div 
          className="pan-area" 
          style={{ pointerEvents: 'none' }}
        >
          <div 
            className={`transition-all duration-300 ${
              viewMode === 'overview' ? 'opacity-100' : 'opacity-0 hidden'
            }`}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'top left',
              pointerEvents: 'auto'
            }}
          >
            {viewMode === 'overview' && renderSystemsOverview()}
          </div>

          <div 
            className={`transition-all duration-300 ${
              viewMode === 'universe' ? 'opacity-100' : 'opacity-0 hidden'
            }`}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'top left',
              pointerEvents: 'auto'
            }}
          >
            {viewMode === 'universe' && renderUniverseView()}
          </div>

          <div 
            className={`transition-all duration-300 ${
              viewMode === 'constellations' ? 'opacity-100' : 'opacity-0 hidden'
            }`}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'top left',
              pointerEvents: 'auto'
            }}
          >
            {viewMode === 'constellations' && renderConstellationsGrid()}
          </div>

          {viewMode === 'zoomed' && (
            <div style={{ pointerEvents: 'auto' }}>
              {renderZoomedSystem()}
            </div>
          )}
        </div>
      </div>

      <KWICModal
        open={kwicModalOpen}
        onOpenChange={setKwicModalOpen}
        word={selectedWordForKwic}
        data={getMockKWICData(selectedWordForKwic)}
      />
    </div>
  );
};
