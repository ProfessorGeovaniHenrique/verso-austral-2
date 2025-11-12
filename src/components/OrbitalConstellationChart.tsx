import { useState, useRef, useCallback, useEffect } from "react";

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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [customAngles, setCustomAngles] = useState<Record<string, number>>({});
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [draggedButton, setDraggedButton] = useState<string | null>(null);
  const [buttonOffsets, setButtonOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const svgRef = useRef<SVGSVGElement>(null);

  // Cores da análise de prosódia semântica
  const centerWordColors: Record<string, string> = {
    "verso": "hsl(var(--primary))",
    "saudade": "hsl(var(--destructive))",
    "sonhos": "#a855f7",
    "cansado": "#f59e0b",
    "silêncio": "#64748b",
    "arreios": "#3b82f6"
  };

  // Definição dos 6 sistemas orbitais
  const orbitalSystems: OrbitalSystem[] = [
    {
      centerWord: "verso",
      words: [
        { word: "campereada", strength: 92, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
        { word: "desencilhou", strength: 88, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
        { word: "sonhos", strength: 85, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
        { word: "campeira", strength: 82, category: "Protagonista Personificado", color: "hsl(var(--primary))" }
      ]
    },
    {
      centerWord: "saudade",
      words: [
        { word: "açoite", strength: 95, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
        { word: "redomona", strength: 93, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
        { word: "galpão", strength: 87, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
        { word: "olhos negros", strength: 81, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" }
      ]
    },
    {
      centerWord: "sonhos",
      words: [
        { word: "várzea", strength: 89, category: "Refúgio e Frustração", color: "#a855f7" },
        { word: "prenda", strength: 86, category: "Refúgio e Frustração", color: "#a855f7" },
        { word: "gateado", strength: 84, category: "Refúgio e Frustração", color: "#a855f7" },
        { word: "desgarrou", strength: 78, category: "Refúgio e Frustração", color: "#a855f7" }
      ]
    },
    {
      centerWord: "cansado",
      words: [
        { word: "caindo", strength: 91, category: "Fim de Ciclo", color: "#f59e0b" },
        { word: "lonjuras", strength: 88, category: "Fim de Ciclo", color: "#f59e0b" },
        { word: "tarde", strength: 85, category: "Fim de Ciclo", color: "#f59e0b" },
        { word: "ramada", strength: 78, category: "Fim de Ciclo", color: "#f59e0b" }
      ]
    },
    {
      centerWord: "silêncio",
      words: [
        { word: "desgarrou", strength: 94, category: "Solidão e Abandono", color: "#64748b" },
        { word: "esporas", strength: 90, category: "Solidão e Abandono", color: "#64748b" },
        { word: "encostada", strength: 86, category: "Solidão e Abandono", color: "#64748b" },
        { word: "recostada", strength: 82, category: "Solidão e Abandono", color: "#64748b" }
      ]
    },
    {
      centerWord: "arreios",
      words: [
        { word: "suados", strength: 93, category: "Extensão de Identidade", color: "#3b82f6" },
        { word: "gateada", strength: 88, category: "Extensão de Identidade", color: "#3b82f6" },
        { word: "respeito", strength: 85, category: "Extensão de Identidade", color: "#3b82f6" },
        { word: "querência", strength: 79, category: "Extensão de Identidade", color: "#3b82f6" }
      ]
    }
  ];

  // Calcula a órbita baseado na força
  const getOrbit = (strength: number) => {
    if (strength >= 90) return 1;
    if (strength >= 80) return 2;
    if (strength >= 70) return 3;
    return 4;
  };

  // Handlers de drag and drop
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGGElement>, wordKey: string, centerX: number, centerY: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedWord(wordKey);
    
    const target = e.currentTarget;
    target.dataset.centerX = centerX.toString();
    target.dataset.centerY = centerY.toString();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedWord || !svgRef.current) return;
    
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
    
    setCustomAngles(prev => ({
      ...prev,
      [draggedWord]: angle
    }));
  }, [draggedWord]);

  const handleMouseUp = useCallback(() => {
    setDraggedWord(null);
    
    // Retornar botão à posição inicial com animação
    if (draggedButton) {
      setDraggedButton(null);
      setButtonOffsets(prev => {
        const newOffsets = { ...prev };
        delete newOffsets[draggedButton];
        return newOffsets;
      });
    }
  }, [draggedButton]);

  // Handlers para botões flutuantes
  const handleButtonMouseDown = useCallback((e: React.MouseEvent<SVGGElement>, buttonId: string) => {
    e.stopPropagation();
    setDraggedButton(buttonId);
  }, []);

  const handleButtonMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedButton || !svgRef.current) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const buttonElement = svg.querySelector(`[data-button-id="${draggedButton}"]`);
    if (!buttonElement) return;
    
    const originalX = parseFloat(buttonElement.getAttribute('data-original-x') || '0');
    const originalY = parseFloat(buttonElement.getAttribute('data-original-y') || '0');

    setButtonOffsets(prev => ({
      ...prev,
      [draggedButton]: {
        x: svgP.x - originalX,
        y: svgP.y - originalY
      }
    }));
  }, [draggedButton]);

  // Efeito para gerenciar eventos de drag
  useEffect(() => {
    if (draggedWord || draggedButton) {
      window.addEventListener('mousemove', draggedWord ? handleMouseMove : handleButtonMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', draggedWord ? handleMouseMove : handleButtonMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedWord, draggedButton, handleMouseMove, handleButtonMouseMove, handleMouseUp]);

  // Renderiza um sistema orbital individual
  const renderOrbitalSystem = (system: OrbitalSystem, centerX: number, centerY: number, isZoomed: boolean = false) => {
    const scale = isZoomed ? 2.5 : 1;
    const orbitRadii = {
      1: 35 * scale,
      2: 55 * scale,
      3: 75 * scale,
      4: 95 * scale
    };

    // Organiza palavras por órbita
    const wordsByOrbit = system.words.reduce((acc, word) => {
      const orbit = getOrbit(word.strength);
      if (!acc[orbit]) acc[orbit] = [];
      acc[orbit].push(word);
      return acc;
    }, {} as Record<number, WordData[]>);

    // Calcula posição de cada palavra
    const getWordPosition = (word: WordData, index: number, totalInOrbit: number) => {
      const orbit = getOrbit(word.strength);
      const radius = orbitRadii[orbit as keyof typeof orbitRadii];
      const wordKey = `${system.centerWord}-${word.word}`;

      const angle = customAngles[wordKey] !== undefined 
        ? customAngles[wordKey] 
        : (index / totalInOrbit * 2 * Math.PI - Math.PI / 2);
      
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        radius,
        angle
      };
    };

    return (
      <g key={system.centerWord}>
        {/* Órbitas */}
        {[1, 2, 3, 4].map(orbit => (
          <circle
            key={`orbit-${orbit}`}
            cx={centerX}
            cy={centerY}
            r={orbitRadii[orbit as keyof typeof orbitRadii]}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={isZoomed ? "1" : "0.5"}
            strokeDasharray="2 2"
            opacity={0.2}
          />
        ))}

        {/* Linhas conectando ao centro */}
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

        {/* Palavra central - Botão flutuante interativo */}
        <g
          data-button-id={`center-${system.centerWord}`}
          data-original-x={centerX}
          data-original-y={centerY}
          style={{ 
            cursor: draggedButton === `center-${system.centerWord}` ? 'grabbing' : 'grab',
            transform: buttonOffsets[`center-${system.centerWord}`] 
              ? `translate(${buttonOffsets[`center-${system.centerWord}`].x}px, ${buttonOffsets[`center-${system.centerWord}`].y}px)` 
              : 'none',
            transition: draggedButton === `center-${system.centerWord}` ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onMouseDown={(e) => handleButtonMouseDown(e, `center-${system.centerWord}`)}
        >
          {/* Glow externo */}
          <circle
            cx={centerX}
            cy={centerY}
            r={28 * scale}
            fill={centerWordColors[system.centerWord]}
            opacity="0.2"
            className="animate-pulse"
          />
          
          {/* Sombra média */}
          <circle
            cx={centerX}
            cy={centerY}
            r={23 * scale}
            fill={centerWordColors[system.centerWord]}
            opacity="0.4"
          />
          
          {/* Botão principal */}
          <circle
            cx={centerX}
            cy={centerY}
            r={18 * scale}
            fill={centerWordColors[system.centerWord]}
            opacity="0.95"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))' }}
          />
          
          {/* Borda brilhante */}
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
            style={{ 
              fontSize: `${14 * scale}px`, 
              pointerEvents: 'none',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)'
            }}
          >
            {system.centerWord}
          </text>
        </g>

        {/* Palavras orbitando */}
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
                style={{ cursor: isZoomed ? (isBeingDragged ? 'grabbing' : 'grab') : 'default' }}
                onMouseDown={(e) => isZoomed && handleMouseDown(e, wordKey, centerX, centerY)}
              >
                {/* Glow effect */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={6 * scale}
                  fill={word.color}
                  opacity="0.2"
                  style={{ pointerEvents: 'none' }}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={4 * scale}
                  fill={word.color}
                  opacity="1"
                  stroke="hsl(var(--background))"
                  strokeWidth={0.5 * scale}
                  style={{ pointerEvents: 'none' }}
                />
                <text
                  x={pos.x}
                  y={pos.y - 9 * scale}
                  textAnchor="middle"
                  className="fill-foreground font-medium"
                  style={{ fontSize: `${8 * scale}px`, pointerEvents: 'none', userSelect: 'none' }}
                >
                  {word.word}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 13 * scale}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: `${7 * scale}px`, pointerEvents: 'none', userSelect: 'none' }}
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

  // Renderiza o gráfico mãe (nível principal com todas as palavras)
  const renderMotherOrbital = () => {
    const centerX = 600;
    const centerY = 400;
    
    // Agrupa todas as palavras com suas informações de sistema
    const allWords = orbitalSystems.flatMap(system =>
      system.words.map(word => ({
        ...word,
        system: system.centerWord,
        systemColor: centerWordColors[system.centerWord]
      }))
    );

    // Organiza palavras por órbita
    const wordsByOrbit = allWords.reduce((acc, word) => {
      const orbit = getOrbit(word.strength);
      if (!acc[orbit]) acc[orbit] = [];
      acc[orbit].push(word);
      return acc;
    }, {} as Record<number, typeof allWords>);

    const motherOrbitRadii = {
      1: 150,
      2: 220,
      3: 290,
      4: 360
    };

    return (
      <>
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <h3 className="text-lg font-semibold">Constelação Completa - Todas as Auras Semânticas</h3>
          <button
            onClick={() => setViewMode('systems')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver sistemas individuais →
          </button>
        </div>
        <svg width="1200" height="800" viewBox="0 0 1200 800" className="w-full h-auto animate-fade-in">
          {/* Órbitas principais */}
          {[1, 2, 3, 4].map(orbit => (
            <circle
              key={`mother-orbit-${orbit}`}
              cx={centerX}
              cy={centerY}
              r={motherOrbitRadii[orbit as keyof typeof motherOrbitRadii]}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity={0.3}
            />
          ))}

          {/* Centro - Título da obra */}
          <g>
            <circle cx={centerX} cy={centerY} r={50} fill="hsl(var(--primary))" opacity="0.9" />
            <text
              x={centerX}
              y={centerY - 5}
              textAnchor="middle"
              className="fill-primary-foreground font-bold text-sm"
            >
              {songName}
            </text>
            <text
              x={centerX}
              y={centerY + 10}
              textAnchor="middle"
              className="fill-primary-foreground text-xs"
            >
              {artistName}
            </text>
          </g>

          {/* Todas as palavras distribuídas */}
          {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) =>
            wordsInOrbit.map((word, index) => {
              const radius = motherOrbitRadii[parseInt(orbit) as keyof typeof motherOrbitRadii];
              const angle = (index / wordsInOrbit.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);

              return (
                <g key={`mother-word-${word.system}-${word.word}-${index}`}>
                  {/* Linha conectando ao centro */}
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={x}
                    y2={y}
                    stroke={word.systemColor}
                    strokeWidth="0.5"
                    opacity="0.1"
                  />
                  
                  {/* Ponto da palavra */}
                  <circle cx={x} cy={y} r={8} fill={word.systemColor} opacity="0.2" />
                  <circle cx={x} cy={y} r={5} fill={word.systemColor} opacity="1" stroke="hsl(var(--background))" strokeWidth="0.5" />
                  
                  {/* Texto da palavra */}
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    className="fill-foreground font-medium text-xs"
                  >
                    {word.word}
                  </text>
                  <text
                    x={x}
                    y={y + 18}
                    textAnchor="middle"
                    className="fill-muted-foreground text-xs"
                  >
                    {word.strength}%
                  </text>
                </g>
              );
            })
          )}

          {/* Legendas dos sistemas ao redor - Botões flutuantes interativos */}
          {orbitalSystems.map((system, index) => {
            const angle = (index / orbitalSystems.length) * 2 * Math.PI;
            const legendRadius = 420;
            const x = centerX + legendRadius * Math.cos(angle);
            const y = centerY + legendRadius * Math.sin(angle);
            const buttonId = `legend-${system.centerWord}`;

            return (
              <g
                key={buttonId}
                data-button-id={buttonId}
                data-original-x={x}
                data-original-y={y}
                style={{ 
                  cursor: draggedButton === buttonId ? 'grabbing' : 'grab',
                  transform: buttonOffsets[buttonId] 
                    ? `translate(${buttonOffsets[buttonId].x}px, ${buttonOffsets[buttonId].y}px)` 
                    : 'none',
                  transition: draggedButton === buttonId ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                onMouseDown={(e) => handleButtonMouseDown(e, buttonId)}
                onClick={(e) => {
                  if (!draggedButton) {
                    setSelectedSystem(system.centerWord);
                    setViewMode('systems');
                  }
                }}
              >
                {/* Sombra externa (glow) */}
                <circle cx={x} cy={y} r={35} fill={centerWordColors[system.centerWord]} opacity="0.15" className="animate-pulse" />
                
                {/* Sombra média */}
                <circle cx={x} cy={y} r={30} fill={centerWordColors[system.centerWord]} opacity="0.3" />
                
                {/* Botão principal */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={25} 
                  fill={centerWordColors[system.centerWord]} 
                  opacity="0.95"
                  className="transition-all"
                  style={{ 
                    filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
                  }}
                />
                
                {/* Borda brilhante */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={25} 
                  fill="none" 
                  stroke="hsl(var(--background))" 
                  strokeWidth="2"
                  opacity="0.4"
                />
                
                {/* Texto */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-primary-foreground font-bold text-xs pointer-events-none"
                  style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
                >
                  {system.centerWord}
                </text>
              </g>
            );
          })}
        </svg>
      </>
    );
  };

  // Renderiza grid de sistemas
  const renderSystemsGrid = () => {
    return (
      <>
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <h3 className="text-lg font-semibold">Sistemas Orbitais - Prosódia Semântica</h3>
          <button
            onClick={() => setViewMode('mother')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar ao gráfico completo
          </button>
        </div>
        <svg width="1200" height="700" viewBox="0 0 1200 700" className="w-full h-auto animate-fade-in">
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

  // Renderiza sistema com zoom
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
              Arraste as palavras para reposicioná-las na órbita
            </p>
          </div>
          <button
            onClick={() => setViewMode('systems')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar aos sistemas
          </button>
        </div>
        <svg
          ref={svgRef}
          width="800"
          height="600"
          viewBox="0 0 800 600"
          className="w-full h-auto animate-scale-in"
          style={{ userSelect: draggedWord ? 'none' : 'auto' }}
        >
          {renderOrbitalSystem(system, 400, 300, true)}
        </svg>
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-2">Palavras por Força de Associação</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {system.words
              .sort((a, b) => b.strength - a.strength)
              .map(word => (
                <div key={word.word} className="flex items-center justify-between">
                  <span className="font-medium">{word.word}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${word.strength}%`, backgroundColor: word.color }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {word.strength}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </>
    );
  };

  // Handlers de zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(0.5, Math.min(2, prev + delta)));
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(2, prev + 0.2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.5, prev - 0.2));
  const handleResetZoom = () => setZoomLevel(1);

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

        {/* Navegação entre modos */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 bg-background/80 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
          <button
            onClick={() => setViewMode('mother')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'mother'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Completa
          </button>
          <button
            onClick={() => setViewMode('systems')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'systems'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Sistemas
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
