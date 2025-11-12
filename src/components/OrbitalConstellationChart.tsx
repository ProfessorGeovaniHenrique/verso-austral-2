import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WordData {
  word: string;
  strength: number;
  category: string;
  color: string;
}

interface OrbitalSystem {
  centerWord: string;
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
  const [viewMode, setViewMode] = useState<'mother' | 'systems' | 'zoomed'>('mother');
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [customPositions, setCustomPositions] = useState<Record<string, { angle: number }>>({});
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const svgRef = useState<SVGSVGElement | null>(null)[0];
  // Cores da análise de prosódia semântica e mapeamento de cores por palavra central
  const centerWordColors: Record<string, string> = {
    "verso": "hsl(var(--primary))", // Protagonista Personificado
    "saudade": "hsl(var(--destructive))", // Dor e Nostalgia
    "sonhos": "#a855f7", // Refúgio e Frustração (purple)
    "cansado": "#f59e0b", // Fim de Ciclo (amber)
    "silêncio": "#64748b", // Solidão e Abandono (slate)
    "arreios": "#3b82f6", // Extensão de Identidade (blue)
  };

  // Definição dos 6 sistemas orbitais
  const orbitalSystems: OrbitalSystem[] = [
    {
      centerWord: "verso",
      words: [
        { word: "campereada", strength: 92, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
        { word: "desencilhou", strength: 88, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
        { word: "sonhos", strength: 85, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
        { word: "campeira", strength: 82, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
      ]
    },
    {
      centerWord: "saudade",
      words: [
        { word: "açoite", strength: 95, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
        { word: "redomona", strength: 93, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
        { word: "galpão", strength: 87, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
        { word: "olhos negros", strength: 81, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
      ]
    },
    {
      centerWord: "sonhos",
      words: [
        { word: "várzea", strength: 89, category: "Refúgio e Frustração", color: "#a855f7" },
        { word: "prenda", strength: 86, category: "Refúgio e Frustração", color: "#a855f7" },
        { word: "gateado", strength: 84, category: "Refúgio e Frustração", color: "#a855f7" },
        { word: "desgarrou", strength: 78, category: "Refúgio e Frustração", color: "#a855f7" },
      ]
    },
    {
      centerWord: "cansado",
      words: [
        { word: "caindo", strength: 91, category: "Fim de Ciclo", color: "#f59e0b" },
        { word: "lonjuras", strength: 88, category: "Fim de Ciclo", color: "#f59e0b" },
        { word: "tarde", strength: 85, category: "Fim de Ciclo", color: "#f59e0b" },
        { word: "ramada", strength: 78, category: "Fim de Ciclo", color: "#f59e0b" },
      ]
    },
    {
      centerWord: "silêncio",
      words: [
        { word: "desgarrou", strength: 94, category: "Solidão e Abandono", color: "#64748b" },
        { word: "esporas", strength: 90, category: "Solidão e Abandono", color: "#64748b" },
        { word: "encostada", strength: 86, category: "Solidão e Abandono", color: "#64748b" },
        { word: "recostada", strength: 82, category: "Solidão e Abandono", color: "#64748b" },
      ]
    },
    {
      centerWord: "arreios",
      words: [
        { word: "suados", strength: 93, category: "Extensão de Identidade", color: "#3b82f6" },
        { word: "gateada", strength: 88, category: "Extensão de Identidade", color: "#3b82f6" },
        { word: "respeito", strength: 85, category: "Extensão de Identidade", color: "#3b82f6" },
        { word: "querência", strength: 79, category: "Extensão de Identidade", color: "#3b82f6" },
      ]
    },
  ];

  // Calcula a órbita baseado na força (90-100% = órbita 1, 80-89% = órbita 2, etc)
  const getOrbit = (strength: number) => {
    if (strength >= 90) return 1;
    if (strength >= 80) return 2;
    if (strength >= 70) return 3;
    return 4;
  };

  const orbitRadii = {
    1: 35,
    2: 55,
    3: 75,
    4: 95,
  };

  // Renderiza um sistema orbital individual (com suporte a zoom e drag)
  const renderOrbitalSystem = (system: OrbitalSystem, centerX: number, centerY: number, isZoomed: boolean = false) => {
    const scale = isZoomed ? 2.5 : 1;
    const orbitRadiiScaled = {
      1: 35 * scale,
      2: 55 * scale,
      3: 75 * scale,
      4: 95 * scale,
    };

    // Organiza palavras por órbita
    const wordsByOrbit = system.words.reduce((acc, word) => {
      const orbit = getOrbit(word.strength);
      if (!acc[orbit]) acc[orbit] = [];
      acc[orbit].push(word);
      return acc;
    }, {} as Record<number, WordData[]>);

    // Calcula posição de cada palavra em sua órbita (considerando posições customizadas)
    const getWordPosition = (word: WordData, index: number, totalInOrbit: number) => {
      const orbit = getOrbit(word.strength);
      const radius = orbitRadiiScaled[orbit as keyof typeof orbitRadiiScaled];
      const wordKey = `${system.centerWord}-${word.word}`;
      
      // Usa ângulo customizado se existir, senão usa distribuição uniforme
      const angle = customPositions[wordKey]?.angle ?? ((index / totalInOrbit) * 2 * Math.PI - Math.PI / 2);
      
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        angle,
        radius,
      };
    };

    // Handler para drag de palavras
    const handleWordDrag = (word: WordData, event: React.MouseEvent<SVGGElement>) => {
      if (!isZoomed) return; // Só permite drag no modo zoom
      
      event.preventDefault();
      event.stopPropagation();
      
      const wordKey = `${system.centerWord}-${word.word}`;
      setDraggedWord(wordKey);
      
      // Captura a referência do SVG antes de criar os listeners
      const svg = event.currentTarget.closest('svg');
      if (!svg) return;
      
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Converte coordenadas do mouse para viewBox
        const viewBox = svg.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        const x = mouseX * scaleX;
        const y = mouseY * scaleY;
        
        // Calcula o ângulo relativo ao centro do sistema
        const dx = x - centerX;
        const dy = y - centerY;
        const newAngle = Math.atan2(dy, dx);
        
        // Atualiza a posição customizada
        setCustomPositions(prev => ({
          ...prev,
          [wordKey]: { angle: newAngle }
        }));
      };
      
      const handleMouseUp = () => {
        setDraggedWord(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    return (
      <g key={system.centerWord}>
        {/* Órbitas (círculos concêntricos) */}
        {[1, 2, 3].map((orbit) => (
          <circle
            key={`${system.centerWord}-orbit-${orbit}`}
            cx={centerX}
            cy={centerY}
            r={orbitRadiiScaled[orbit as keyof typeof orbitRadiiScaled]}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={isZoomed ? "1" : "0.5"}
            strokeDasharray="2 2"
            opacity={0.2}
          />
        ))}

        {/* Linhas conectando palavras ao centro */}
        {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) =>
          wordsInOrbit.map((word, index) => {
            const pos = getWordPosition(word, index, wordsInOrbit.length);
            return (
              <line
                key={`line-${system.centerWord}-${word.word}-${index}`}
                x1={centerX}
                y1={centerY}
                x2={pos.x}
                y2={pos.y}
                stroke={word.color}
                strokeWidth={isZoomed ? "1" : "0.5"}
                opacity="0.15"
              />
            );
          })
        )}

        {/* Palavra central */}
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={18 * scale}
            fill={centerWordColors[system.centerWord]}
            opacity="0.9"
          />
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-primary-foreground font-bold"
            style={{ fontSize: `${14 * scale}px` }}
          >
            {system.centerWord}
          </text>
        </g>

        {/* Palavras orbitando */}
        {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) =>
          wordsInOrbit.map((word, index) => {
            const pos = getWordPosition(word, index, wordsInOrbit.length);
            const wordKey = `${system.centerWord}-${word.word}`;
            const isDragging = draggedWord === wordKey;
            
            return (
              <g 
                key={`word-${system.centerWord}-${word.word}-${index}`}
                className={isZoomed ? "cursor-grab active:cursor-grabbing" : ""}
                onMouseDown={(e) => {
                  if (isZoomed) {
                    handleWordDrag(word, e);
                  }
                }}
                style={{ 
                  opacity: isDragging ? 0.6 : 1,
                  transition: isDragging ? 'none' : 'all 0.2s'
                }}
              >
                {/* Glow effect */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={6 * scale}
                  fill={word.color}
                  opacity="0.2"
                  className="pointer-events-none"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={4 * scale}
                  fill={word.color}
                  opacity="1"
                  stroke="hsl(var(--background))"
                  strokeWidth={0.5 * scale}
                  className="pointer-events-none"
                />
                <text
                  x={pos.x}
                  y={pos.y - (9 * scale)}
                  textAnchor="middle"
                  className="fill-foreground font-medium pointer-events-none"
                  style={{ fontSize: `${8 * scale}px` }}
                >
                  {word.word}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + (13 * scale)}
                  textAnchor="middle"
                  className="fill-muted-foreground pointer-events-none"
                  style={{ fontSize: `${7 * scale}px` }}
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

  // Renderiza o gráfico orbital "Mãe" com todas as palavras distribuídas em órbitas
  const renderMotherOrbital = () => {
    const centerX = 600;
    const centerY = 400;
    
    // Coleta todas as palavras de todos os sistemas
    const allWords = orbitalSystems.flatMap(system => 
      system.words.map(word => ({ ...word, system: system.centerWord }))
    );
    
    // Organiza palavras por órbita baseado na força de associação
    const wordsByOrbit = allWords.reduce((acc, word) => {
      const orbit = getOrbit(word.strength);
      if (!acc[orbit]) acc[orbit] = [];
      acc[orbit].push(word);
      return acc;
    }, {} as Record<number, typeof allWords>);
    
    // Define raios das órbitas para o gráfico mãe
    const motherOrbitRadii = {
      1: 150,
      2: 220,
      3: 290,
      4: 360,
    };
    
    return (
      <svg width="1200" height="800" viewBox="0 0 1200 800" className="w-full h-auto">
        {/* Desenha as órbitas */}
        {[1, 2, 3, 4].map((orbit) => (
          <circle
            key={`orbit-${orbit}`}
            cx={centerX}
            cy={centerY}
            r={motherOrbitRadii[orbit as keyof typeof motherOrbitRadii]}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            strokeDasharray="3 3"
            opacity={0.15}
          />
        ))}

        {/* Linhas conectando palavras ao centro */}
        {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) =>
          wordsInOrbit.map((word, index) => {
            const radius = motherOrbitRadii[Number(orbit) as keyof typeof motherOrbitRadii];
            const angle = (index / wordsInOrbit.length) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            return (
              <line
                key={`line-${word.word}-${index}`}
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke={word.color}
                strokeWidth="0.5"
                opacity="0.1"
              />
            );
          })
        )}

        {/* Centro "Prosódia Semântica" (clicável) */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <g 
                className="cursor-pointer transition-all duration-300 hover:opacity-80"
                onClick={() => setViewMode('systems')}
              >
                <circle
                  cx={centerX}
                  cy={centerY}
                  r="60"
                  fill="hsl(var(--primary))"
                  opacity="0.9"
                />
                <text
                  x={centerX}
                  y={centerY - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-primary-foreground font-bold text-base"
                >
                  Prosódia
                </text>
                <text
                  x={centerX}
                  y={centerY + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-primary-foreground font-bold text-base"
                >
                  Semântica
                </text>
              </g>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-semibold">{songName}</p>
                <p className="text-xs text-muted-foreground">{artistName}</p>
                <p className="text-xs text-muted-foreground mt-1">Clique para ver os sistemas</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Todas as palavras distribuídas em órbitas */}
        {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) =>
          wordsInOrbit.map((word, index) => {
            const radius = motherOrbitRadii[Number(orbit) as keyof typeof motherOrbitRadii];
            const angle = (index / wordsInOrbit.length) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            // Tamanho do ponto baseado na força de associação
            const dotSize = 3 + (word.strength / 100) * 4;
            
            return (
              <g 
                key={`word-${word.word}-${index}`}
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                style={{ opacity: 0.85 }}
              >
                {/* Glow effect */}
                <circle
                  cx={x}
                  cy={y}
                  r={dotSize * 1.5}
                  fill={word.color}
                  opacity="0.2"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={dotSize}
                  fill={word.color}
                  opacity="1"
                  stroke="hsl(var(--background))"
                  strokeWidth="0.5"
                />
                <text
                  x={x}
                  y={y - (dotSize + 6)}
                  textAnchor="middle"
                  className="fill-foreground font-medium pointer-events-none"
                  style={{ fontSize: '9px' }}
                >
                  {word.word}
                </text>
                <text
                  x={x}
                  y={y + (dotSize + 12)}
                  textAnchor="middle"
                  className="fill-muted-foreground pointer-events-none"
                  style={{ fontSize: '8px' }}
                >
                  {word.strength}%
                </text>
              </g>
            );
          })
        )}
      </svg>
    );
  };

  // Renderiza o grid de sistemas individuais
  const renderSystemsGrid = () => {
    return (
      <>
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <h3 className="text-lg font-semibold">Sistemas Orbitais - Prosódia Semântica</h3>
          <button
            onClick={() => setViewMode('mother')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar ao gráfico geral
          </button>
        </div>
        <svg width="1200" height="700" viewBox="0 0 1200 700" className="w-full h-auto animate-fade-in">
          {/* Grid de sistemas orbitais: 3 colunas x 2 linhas */}
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

  // Renderiza o zoom de um sistema específico
  const renderZoomedSystem = () => {
    const system = orbitalSystems.find(s => s.centerWord === selectedSystem);
    if (!system) return null;

    return (
      <>
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span 
                className="inline-block w-4 h-4 rounded-full" 
                style={{ backgroundColor: centerWordColors[system.centerWord] }}
              />
              Sistema Orbital: {system.centerWord}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Análise detalhada das associações semânticas • Arraste as palavras para reorganizar
            </p>
          </div>
          <button
            onClick={() => setViewMode('systems')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar aos sistemas
          </button>
        </div>
        <svg width="800" height="600" viewBox="0 0 800 600" className="w-full h-auto animate-scale-in">
          {renderOrbitalSystem(system, 400, 300, true)}
        </svg>
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-2">Palavras por Força de Associação</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {system.words
              .sort((a, b) => b.strength - a.strength)
              .map((word) => (
                <div key={word.word} className="flex items-center justify-between">
                  <span className="font-medium">{word.word}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full" 
                        style={{ 
                          width: `${word.strength}%`,
                          backgroundColor: word.color 
                        }} 
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{word.strength}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </>
    );
  };

  // Handler para zoom com Ctrl + scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(2, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, prev - 0.2));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div className="space-y-4">
      <div 
        className="relative w-full bg-gradient-to-br from-background to-muted/20 rounded-lg border p-4 overflow-hidden transition-all duration-500"
        onWheel={handleWheel}
      >
        {/* Controles de Zoom */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-background/80 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded transition-colors"
            title="Zoom In (Ctrl + Scroll Up)"
          >
            <span className="text-lg font-bold">+</span>
          </button>
          <button
            onClick={handleResetZoom}
            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded transition-colors text-xs"
            title="Reset Zoom"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded transition-colors"
            title="Zoom Out (Ctrl + Scroll Down)"
          >
            <span className="text-lg font-bold">−</span>
          </button>
        </div>

        <div 
          className={`transition-all duration-300 ${viewMode === 'mother' ? 'opacity-100' : 'opacity-0 hidden'}`}
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
        >
          {viewMode === 'mother' && renderMotherOrbital()}
        </div>
        <div 
          className={`transition-all duration-300 ${viewMode === 'systems' ? 'opacity-100' : 'opacity-0 hidden'}`}
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
        >
          {viewMode === 'systems' && renderSystemsGrid()}
        </div>
        <div 
          className={`transition-all duration-300 ${viewMode === 'zoomed' ? 'opacity-100' : 'opacity-0 hidden'}`}
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
        >
          {viewMode === 'zoomed' && renderZoomedSystem()}
        </div>
      </div>

      {/* Legenda */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
          <span>Protagonista Personificado</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--destructive))" }} />
          <span>Dor e Nostalgia</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#a855f7" }} />
          <span>Refúgio e Frustração</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
          <span>Fim de Ciclo</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#64748b" }} />
          <span>Solidão e Abandono</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
          <span>Extensão de Identidade</span>
        </div>
      </div>

      {/* Explicação das órbitas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded bg-muted/30">
          <div className="font-semibold mb-1">Órbita Interna</div>
          <div className="text-muted-foreground">90-100%</div>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <div className="font-semibold mb-1">Órbita Intermediária</div>
          <div className="text-muted-foreground">80-89%</div>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <div className="font-semibold mb-1">Órbita Externa</div>
          <div className="text-muted-foreground">70-79%</div>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <div className="font-semibold mb-1">Órbita Periférica</div>
          <div className="text-muted-foreground">&lt;70%</div>
        </div>
      </div>
    </div>
  );
};
