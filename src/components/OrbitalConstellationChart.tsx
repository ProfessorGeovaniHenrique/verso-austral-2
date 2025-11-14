import { useState, useRef, useCallback, useEffect } from "react";
import { KWICModal } from "./KWICModal";
import { NavigationToolbar } from "@/components/NavigationToolbar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { rafThrottle, throttle } from "@/lib/performanceUtils";

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
  // View modes: overview -> universe -> galaxy -> constellation (individual)
  const [viewMode, setViewMode] = useState<'overview' | 'universe' | 'galaxy' | 'constellation'>('overview');
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
  const animationFrameRef = useRef<number | null>(null);
  const orbitAnimationRef = useRef<number | null>(null);

  // KWIC mock data
  const getMockKWICData = (word: string) => {
    const kwicData: Record<string, Array<{
      leftContext: string;
      keyword: string;
      rightContext: string;
      source: string;
    }>> = {
      "verso": [{
        leftContext: "Daí um",
        keyword: "verso",
        rightContext: "de campo se chegou da campereada",
        source: "Quando o verso vem pras casa - Luiz Marenco"
      }],
      "campereada": [{
        leftContext: "Daí um verso de campo se chegou da",
        keyword: "campereada",
        rightContext: "",
        source: "Quando o verso vem pras casa - Luiz Marenco"
      }],
      "saudade": [{
        leftContext: "A mansidão da campanha traz",
        keyword: "saudade",
        rightContext: "feito açoite",
        source: "Quando o verso vem pras casa - Luiz Marenco"
      }]
    };
    return kwicData[word.toLowerCase()] || [];
  };

  const orbitalSystems: OrbitalSystem[] = [
    {
      centerWord: "verso",
      category: "Identidade Gaucha",
      words: [
        { word: "campereada", strength: 0.92, category: "Tradição", color: "#8B4513" },
        { word: "desencilhou", strength: 0.88, category: "Tradição", color: "#A0522D" },
        { word: "sonhos", strength: 0.85, category: "Sentimento", color: "#9370DB" },
        { word: "bagual", strength: 0.82, category: "Natureza", color: "#228B22" },
        { word: "lonjuras", strength: 0.78, category: "Paisagem", color: "#4169E1" },
      ]
    },
    {
      centerWord: "querência",
      category: "Pertencimento",
      words: [
        { word: "galponeira", strength: 0.90, category: "Tradição", color: "#8B4513" },
        { word: "caseiro", strength: 0.87, category: "Sentimento", color: "#9370DB" },
        { word: "ramada", strength: 0.84, category: "Paisagem", color: "#4169E1" },
        { word: "fogão", strength: 0.81, category: "Tradição", color: "#A0522D" },
      ]
    },
    {
      centerWord: "saudade",
      category: "Sentimento",
      words: [
        { word: "mansidão", strength: 0.89, category: "Sentimento", color: "#9370DB" },
        { word: "açoite", strength: 0.86, category: "Paisagem", color: "#4169E1" },
        { word: "redomona", strength: 0.83, category: "Tradição", color: "#8B4513" },
        { word: "cantos", strength: 0.80, category: "Sentimento", color: "#9370DB" },
      ]
    },
    {
      centerWord: "campanha",
      category: "Paisagem",
      words: [
        { word: "várzea", strength: 0.91, category: "Paisagem", color: "#4169E1" },
        { word: "tarumã", strength: 0.88, category: "Natureza", color: "#228B22" },
        { word: "coxilha", strength: 0.85, category: "Paisagem", color: "#4169E1" },
        { word: "lombo", strength: 0.82, category: "Tradição", color: "#8B4513" },
      ]
    },
    {
      centerWord: "gateada",
      category: "Tradição",
      words: [
        { word: "frente", strength: 0.90, category: "Tradição", color: "#A0522D" },
        { word: "respeito", strength: 0.87, category: "Sentimento", color: "#9370DB" },
        { word: "ventito", strength: 0.84, category: "Natureza", color: "#228B22" },
      ]
    },
    {
      centerWord: "mate",
      category: "Tradição",
      words: [
        { word: "pura-folha", strength: 0.92, category: "Tradição", color: "#8B4513" },
        { word: "maçanilha", strength: 0.89, category: "Natureza", color: "#228B22" },
        { word: "cevou", strength: 0.86, category: "Tradição", color: "#A0522D" },
      ]
    }
  ];

  const getOrbit = (strength: number): number => {
    if (strength >= 0.9) return 1;
    if (strength >= 0.85) return 2;
    if (strength >= 0.80) return 3;
    return 4;
  };

  // Optimized orbital animation using requestAnimationFrame
  useEffect(() => {
    let lastTime = performance.now();
    
    const animateOrbits = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      
      // Update orbit progress only if enough time has passed (batch updates)
      if (deltaTime > 16) { // ~60fps
        setOrbitProgress(prev => {
          const newProgress = { ...prev };
          orbitalSystems.forEach(system => {
            system.words.forEach(word => {
              const wordKey = `${system.centerWord}-${word.word}`;
              const orbit = getOrbit(word.strength);
              const speed = orbit === 1 ? 0.15 : orbit === 2 ? 0.12 : orbit === 3 ? 0.09 : 0.06;
              newProgress[wordKey] = ((prev[wordKey] || 0) + speed) % 100;
            });
          });
          return newProgress;
        });
        lastTime = currentTime;
      }
      
      orbitAnimationRef.current = requestAnimationFrame(animateOrbits);
    };
    
    orbitAnimationRef.current = requestAnimationFrame(animateOrbits);
    
    return () => {
      if (orbitAnimationRef.current) {
        cancelAnimationFrame(orbitAnimationRef.current);
      }
    };
  }, []);

  // Word drag handlers
  const handleWordMouseDown = useCallback((e: React.MouseEvent, word: string, systemCenter: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection
    const wordKey = `${systemCenter}-${word}`;
    setDraggedWord(wordKey);
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedWord || !svgRef.current) return;
    
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
    
    setCustomAngles(prev => ({
      ...prev,
      [draggedWord]: angle
    }));
  }, [draggedWord]);

  const handleMouseUp = useCallback(() => {
    setDraggedWord(null);
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (draggedWord) {
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedWord, handleMouseMove, handleMouseUp]);

  // Optimized pan handlers with RAF throttling
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'svg' || target.classList.contains('pan-area')) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      });
    }
  }, [panOffset]);

  const handleCanvasPanMove = useCallback(
    rafThrottle((e: React.MouseEvent) => {
      if (!isPanning) return;
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }),
    [isPanning, panStart]
  );

  const handleCanvasPanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Optimized wheel handler with throttling and passive: false
  const handleWheel = useCallback(
    throttle((e: WheelEvent) => {
      if (!containerRef.current) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));
      
      const zoomRatio = newZoom / zoomLevel;
      const newPanX = mouseX - (mouseX - panOffset.x) * zoomRatio;
      const newPanY = mouseY - (mouseY - panOffset.y) * zoomRatio;
      
      setZoomLevel(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    }, 16),
    [zoomLevel, panOffset]
  );

  // Setup wheel listener with passive: false
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const wheelHandler = (e: WheelEvent) => handleWheel(e);
    container.addEventListener('wheel', wheelHandler, { passive: false });
    
    // Prevent dragstart and selectstart in graph area
    const preventDrag = (e: Event) => e.preventDefault();
    container.addEventListener('dragstart', preventDrag);
    container.addEventListener('selectstart', preventDrag);
    
    return () => {
      container.removeEventListener('wheel', wheelHandler);
      container.removeEventListener('dragstart', preventDrag);
      container.removeEventListener('selectstart', preventDrag);
    };
  }, [handleWheel]);

  const handleZoomIn = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newZoom = Math.min(3, zoomLevel + 0.2);
    const zoomRatio = newZoom / zoomLevel;
    
    const newPanX = centerX - (centerX - panOffset.x) * zoomRatio;
    const newPanY = centerY - (centerY - panOffset.y) * zoomRatio;
    
    setZoomLevel(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newZoom = Math.max(0.5, zoomLevel - 0.2);
    const zoomRatio = newZoom / zoomLevel;
    
    const newPanX = centerX - (centerX - panOffset.x) * zoomRatio;
    const newPanY = centerY - (centerY - panOffset.y) * zoomRatio;
    
    setZoomLevel(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  const handleFitToView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleWordClick = (word: string) => {
    if (isDragging) return;
    setSelectedWordForKwic(word);
    setKwicModalOpen(true);
  };

  const renderOverview = () => {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">Universo Semântico de "{songName}"</h2>
          <p className="text-muted-foreground">Explore as relações semânticas em três níveis hierárquicos</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setViewMode('universe')}
            className="p-6 bg-card border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all duration-200 group"
          >
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary">Nível 1: Universo</h3>
            <p className="text-sm text-muted-foreground">Visão geral de todos os sistemas semânticos</p>
          </button>
          
          <button
            onClick={() => setViewMode('galaxy')}
            className="p-6 bg-card border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all duration-200 group"
          >
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary">Nível 2: Galáxia</h3>
            <p className="text-sm text-muted-foreground">Sistemas organizados em constelações</p>
          </button>
          
          <button
            onClick={() => { setViewMode('constellation'); setSelectedSystem(orbitalSystems[0].centerWord); }}
            className="p-6 bg-card border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all duration-200 group"
          >
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary">Nível 3: Constelação</h3>
            <p className="text-sm text-muted-foreground">Exploração detalhada de um sistema</p>
          </button>
        </div>
      </div>
    );
  };

  const renderUniverseView = () => {
    const centerX = 575;
    const centerY = 400;
    const baseRadius = 180;

    return (
      <div className="relative">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-4 mb-4 flex items-center justify-between">
          <button 
            onClick={() => setViewMode('overview')} 
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium"
          >
            ← Voltar
          </button>
          <h3 className="text-xl font-bold text-foreground">Universo Semântico - Visão Orbital</h3>
          <div className="w-24"></div>
        </div>

        <div 
          ref={containerRef}
          className="relative overflow-hidden bg-background"
          style={{
            cursor: isPanning ? 'grabbing' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasPanMove}
          onMouseUp={handleCanvasPanEnd}
          onMouseLeave={handleCanvasPanEnd}
        >
          <NavigationToolbar
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleFitToView}
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
          />

          <svg
            ref={svgRef}
            width="1150"
            height="800"
            viewBox="0 0 1150 800"
            className="w-full h-auto pan-area"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: '0 0',
              transition: isDragging || isPanning ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            {/* Central universe core */}
            <g>
              <circle cx={centerX} cy={centerY} r="50" fill="hsl(var(--primary))" opacity="0.15" className="animate-pulse" />
              <circle cx={centerX} cy={centerY} r="35" fill="hsl(var(--primary))" opacity="0.3" />
              <text 
                x={centerX} 
                y={centerY} 
                textAnchor="middle" 
                dy="0.3em" 
                className="text-xs font-bold fill-primary-foreground"
                style={{ pointerEvents: 'none' }}
              >
                {songName.split(' ').slice(0, 3).join(' ')}
              </text>
            </g>

            {/* Orbital systems */}
            {orbitalSystems.map((system, index) => {
              const angle = (index / orbitalSystems.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + baseRadius * Math.cos(angle);
              const y = centerY + baseRadius * Math.sin(angle);
              
              return (
                <g key={system.centerWord}>
                  {/* Orbit path */}
                  <line 
                    x1={centerX} 
                    y1={centerY} 
                    x2={x} 
                    y2={y} 
                    stroke="hsl(var(--border))" 
                    strokeWidth="1" 
                    strokeDasharray="4,4" 
                    opacity="0.3" 
                  />
                  
                  {/* Planet with pulsing effect */}
                  <circle 
                    cx={x} 
                    cy={y} 
                    r="35" 
                    fill="hsl(var(--accent))" 
                    opacity="0.1" 
                    className="animate-pulse"
                    style={{ 
                      animationDuration: `${2 + index * 0.3}s`,
                      pointerEvents: 'none'
                    }}
                  />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r="25" 
                    fill={`hsl(${index * 60}, 70%, 60%)`}
                    opacity="0.8"
                    className="transition-all duration-200 hover:opacity-100 hover:scale-110"
                    style={{ 
                      cursor: 'pointer',
                      filter: hoveredSystem === system.centerWord ? 'drop-shadow(0 0 10px currentColor)' : 'none'
                    }}
                    onMouseEnter={() => setHoveredSystem(system.centerWord)}
                    onMouseLeave={() => setHoveredSystem(null)}
                    onClick={() => {
                      setSelectedSystem(system.centerWord);
                      setViewMode('constellation');
                    }}
                  />
                  
                  {/* Planet label */}
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dy="0.3em"
                    className="text-xs font-bold fill-primary-foreground"
                    style={{ 
                      pointerEvents: 'none',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                    }}
                  >
                    {system.centerWord}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const renderGalaxyView = () => {
    const renderMiniConstellation = (system: OrbitalSystem, centerX: number, centerY: number, scale: number) => {
      const orbitRadii = {
        1: 30 * scale,
        2: 50 * scale,
        3: 70 * scale,
        4: 90 * scale
      };

      return (
        <g key={system.centerWord}>
          {/* Center word */}
          <circle cx={centerX} cy={centerY} r={18 * scale} fill={`hsl(${orbitalSystems.indexOf(system) * 60}, 70%, 60%)`} opacity="0.8" />
          <text 
            x={centerX} 
            y={centerY} 
            textAnchor="middle" 
            dy="0.3em" 
            className="text-xs font-bold fill-primary-foreground"
            style={{ pointerEvents: 'none', fontSize: `${10 * scale}px` }}
          >
            {system.centerWord}
          </text>

          {/* Orbiting words */}
          {system.words.map((word, wordIndex) => {
            const orbit = getOrbit(word.strength);
            const radius = orbitRadii[orbit as keyof typeof orbitRadii];
            const wordKey = `${system.centerWord}-${word.word}`;
            const progress = orbitProgress[wordKey] || 0;
            const angle = (progress / 100) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            return (
              <g key={`word-${word.word}`}>
                <line x1={centerX} y1={centerY} x2={x} y2={y} stroke={word.color} strokeWidth="0.5" opacity="0.15" />
                <circle 
                  cx={x} 
                  cy={y} 
                  r={5 * scale} 
                  fill={word.color} 
                  opacity="0.08" 
                  className="animate-pulse"
                  style={{ 
                    animationDuration: `${1.5 + wordIndex * 0.2}s`,
                    pointerEvents: 'none'
                  }}
                />
                <circle 
                  cx={x} 
                  cy={y} 
                  r={3.5 * scale} 
                  fill={word.color} 
                  opacity="0.85" 
                  style={{
                    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))'
                  }} 
                />
                {/* Word label on planet */}
                <text
                  x={x}
                  y={y + 12 * scale}
                  textAnchor="middle"
                  className="font-bold"
                  style={{ 
                    fontSize: `${9 * scale}px`,
                    fill: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    pointerEvents: 'none'
                  }}
                >
                  {word.word}
                </text>
              </g>
            );
          })}
        </g>
      );
    };

    return (
      <div className="relative">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-4 mb-4 flex items-center justify-between">
          <button 
            onClick={() => setViewMode('universe')} 
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            ← Voltar ao Universo
          </button>
          <h3 className="text-xl font-bold text-foreground">Galáxia de Constelações Semânticas</h3>
          <div className="w-40"></div>
        </div>

        <div className="px-4">
          <svg width="1150" height="680" viewBox="0 0 1150 680" className="w-full h-auto animate-fade-in">
            {orbitalSystems.map((system, index) => {
              const col = index % 3;
              const row = Math.floor(index / 3);
              const x = 200 + col * 320;
              const y = 180 + row * 280;
              return renderMiniConstellation(system, x, y, 1.5);
            })}
          </svg>
        </div>
      </div>
    );
  };

  const renderConstellationView = () => {
    const centerX = 575;
    const centerY = 400;
    const scale = 2.2;
    const orbitRadii = {
      1: 45 * scale,
      2: 70 * scale,
      3: 95 * scale,
      4: 120 * scale
    };

    const currentSystemIndex = orbitalSystems.findIndex(s => s.centerWord === selectedSystem);
    const system = currentSystemIndex >= 0 ? orbitalSystems[currentSystemIndex] : orbitalSystems[0];
    
    if (!selectedSystem) {
      setSelectedSystem(orbitalSystems[0].centerWord);
    }

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
      <div className="relative">
        {/* Fixed header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-3 mb-4">
          <div className="flex items-center justify-between gap-4">
            <button 
              onClick={() => setViewMode('galaxy')} 
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors text-sm font-medium"
            >
              ← Voltar
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const currentIndex = orbitalSystems.findIndex(s => s.centerWord === selectedSystem);
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : orbitalSystems.length - 1;
                  setSelectedSystem(orbitalSystems[prevIndex].centerWord);
                }}
                className="px-3 py-1.5 bg-muted hover:bg-accent text-foreground rounded text-sm"
              >
                ← Anterior
              </button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="min-w-[180px]">
                    {system.centerWord} ▼
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="grid gap-1">
                    {orbitalSystems.map((sys) => (
                      <button
                        key={sys.centerWord}
                        onClick={() => {
                          setSelectedSystem(sys.centerWord);
                        }}
                        className={`px-3 py-2 text-left rounded transition-colors ${
                          sys.centerWord === selectedSystem
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="font-medium">{sys.centerWord}</div>
                        <div className="text-xs text-muted-foreground">{sys.category}</div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <button
                onClick={() => {
                  const currentIndex = orbitalSystems.findIndex(s => s.centerWord === selectedSystem);
                  const nextIndex = (currentIndex + 1) % orbitalSystems.length;
                  setSelectedSystem(orbitalSystems[nextIndex].centerWord);
                }}
                className="px-3 py-1.5 bg-muted hover:bg-accent text-foreground rounded text-sm"
              >
                Próxima →
              </button>
            </div>

            <div className="text-sm text-muted-foreground">
              Sistema {currentSystemIndex + 1} de {orbitalSystems.length}
            </div>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="relative overflow-hidden bg-background"
          style={{
            cursor: isPanning ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasPanMove}
          onMouseUp={handleCanvasPanEnd}
          onMouseLeave={handleCanvasPanEnd}
        >
          <NavigationToolbar
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleFitToView}
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
          />

          <svg
            ref={svgRef}
            width="1150"
            height="800"
            viewBox="0 0 1150 800"
            className="w-full h-auto pan-area"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: '0 0',
              transition: isDragging || isPanning ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            {/* Orbit circles */}
            {[1, 2, 3, 4].map(orbit => (
              <circle
                key={orbit}
                cx={centerX}
                cy={centerY}
                r={orbitRadii[orbit as keyof typeof orbitRadii]}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.3"
              />
            ))}

            {/* Center word */}
            <g>
              <circle cx={centerX} cy={centerY} r="50" fill="hsl(var(--primary))" opacity="0.15" className="animate-pulse" />
              <circle cx={centerX} cy={centerY} r="35" fill="hsl(var(--primary))" opacity="0.9" />
              <text 
                x={centerX} 
                y={centerY} 
                textAnchor="middle" 
                dy="0.3em" 
                className="text-base font-bold fill-primary-foreground"
                style={{ pointerEvents: 'none' }}
              >
                {system.centerWord}
              </text>
            </g>

            {/* Orbiting words */}
            {Object.entries(wordsByOrbit).map(([orbit, words]) =>
              words.map((word, index) => {
                const wordKey = `${system.centerWord}-${word.word}`;
                const pos = getWordPosition(word, index, words.length);
                const isHovered = hoveredWord === word.word;

                return (
                  <g key={wordKey}>
                    {/* Connection line */}
                    <line
                      x1={centerX}
                      y1={centerY}
                      x2={pos.x}
                      y2={pos.y}
                      stroke={word.color}
                      strokeWidth="1.5"
                      opacity="0.2"
                    />

                    {/* Pulsing outer glow */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="16"
                      fill={word.color}
                      opacity="0.1"
                      className="animate-pulse"
                      style={{ 
                        animationDuration: `${2 + index * 0.3}s`,
                        pointerEvents: 'none'
                      }}
                    />

                    {/* Word planet */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="12"
                      fill={word.color}
                      opacity={isHovered ? "1" : "0.85"}
                      style={{
                        cursor: 'pointer',
                        filter: isHovered ? 'drop-shadow(0 0 8px currentColor)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        transition: 'all 0.2s ease-out'
                      }}
                      data-word-key={wordKey}
                      data-center-x={centerX}
                      data-center-y={centerY}
                      onMouseDown={(e) => handleWordMouseDown(e, word.word, system.centerWord)}
                      onClick={() => handleWordClick(word.word)}
                      onMouseEnter={() => setHoveredWord(word.word)}
                      onMouseLeave={() => setHoveredWord(null)}
                    />

                    {/* Word label */}
                    <text
                      x={pos.x}
                      y={pos.y + 24}
                      textAnchor="middle"
                      className="text-xs font-bold fill-foreground"
                      style={{ 
                        pointerEvents: 'none',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                      }}
                    >
                      {word.word}
                    </text>

                    {/* Strength indicator */}
                    {isHovered && (
                      <text
                        x={pos.x}
                        y={pos.y - 20}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground"
                        style={{ pointerEvents: 'none' }}
                      >
                        {(word.strength * 100).toFixed(0)}%
                      </text>
                    )}
                  </g>
                );
              })
            )}
          </svg>
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

  return (
    <div className="w-full">
      {viewMode === 'overview' && renderOverview()}
      {viewMode === 'universe' && renderUniverseView()}
      {viewMode === 'galaxy' && renderGalaxyView()}
      {viewMode === 'constellation' && renderConstellationView()}
    </div>
  );
};
