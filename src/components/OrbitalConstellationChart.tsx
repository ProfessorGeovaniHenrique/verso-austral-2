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
  const [orbitProgress, setOrbitProgress] = useState<Record<string, number>>({});
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

  // Handler para mudança de progresso na órbita
  const handleOrbitProgressChange = (wordKey: string, progress: number) => {
    setOrbitProgress(prev => ({
      ...prev,
      [wordKey]: progress
    }));
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

      // Usa o progresso da órbita se existir, senão usa ângulo customizado ou padrão
      let angle: number;
      if (orbitProgress[wordKey] !== undefined) {
        angle = (orbitProgress[wordKey] / 100) * 2 * Math.PI - Math.PI / 2;
      } else if (customAngles[wordKey] !== undefined) {
        angle = customAngles[wordKey];
      } else {
        angle = (index / totalInOrbit * 2 * Math.PI - Math.PI / 2);
      }
      
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        radius,
        angle
      };
    };

    return (
      <g key={system.centerWord}>
        {/* Órbitas com animação de linha deslizante */}
        {[1, 2, 3, 4].map(orbit => {
          const radius = orbitRadii[orbit as keyof typeof orbitRadii];
          const circumference = 2 * Math.PI * radius;
          
          return (
            <g key={`orbit-${orbit}`}>
              {/* Linha base da órbita */}
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={isZoomed ? "2" : "1"}
                opacity={0.15}
              />
              
              {/* Linha deslizante animada */}
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={centerWordColors[system.centerWord] || "hsl(var(--primary))"}
                strokeWidth={isZoomed ? "2" : "1"}
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

        {/* Palavras orbitando - Botões flutuantes interativos */}
        {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) =>
          wordsInOrbit.map((word, index) => {
            const pos = getWordPosition(word, index, wordsInOrbit.length);
            const wordKey = `${system.centerWord}-${word.word}`;
            const isBeingDraggedWord = draggedWord === wordKey;
            const buttonId = `word-button-${wordKey}`;
            const isBeingDraggedButton = draggedButton === buttonId;

            return (
              <g
                key={`word-${wordKey}`}
                data-word-key={wordKey}
                data-button-id={buttonId}
                data-center-x={centerX}
                data-center-y={centerY}
                data-original-x={pos.x}
                data-original-y={pos.y}
                style={{ 
                  cursor: isZoomed ? (isBeingDraggedWord ? 'grabbing' : 'grab') : (isBeingDraggedButton ? 'grabbing' : 'grab'),
                  transform: buttonOffsets[buttonId] 
                    ? `translate(${buttonOffsets[buttonId].x}px, ${buttonOffsets[buttonId].y}px)` 
                    : 'none',
                  transition: isBeingDraggedButton ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                onMouseDown={(e) => {
                  if (isZoomed) {
                    handleMouseDown(e, wordKey, centerX, centerY);
                  } else {
                    handleButtonMouseDown(e, buttonId);
                  }
                }}
              >
                {/* Glow externo animado */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={8 * scale}
                  fill={word.color}
                  opacity="0.15"
                  className="animate-pulse"
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* Glow médio */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={6 * scale}
                  fill={word.color}
                  opacity="0.3"
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* Botão principal */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={4 * scale}
                  fill={word.color}
                  opacity="0.95"
                  style={{ 
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))'
                  }}
                />
                
                {/* Borda brilhante */}
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
                
                <text
                  x={pos.x}
                  y={pos.y - 2 * scale}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground font-medium"
                  style={{ 
                    fontSize: `${7 * scale}px`, 
                    pointerEvents: 'none', 
                    userSelect: 'none',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  {word.word}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 6 * scale}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground font-semibold"
                  style={{ 
                    fontSize: `${6 * scale}px`, 
                    pointerEvents: 'none', 
                    userSelect: 'none',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)'
                  }}
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
    const centerX = 575;
    const centerY = 380;
    
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
      1: 135,
      2: 200,
      3: 265,
      4: 330
    };

    return (
      <>
        <div className="flex items-center justify-between px-4 pt-4 pb-2 animate-fade-in">
          <h3 className="text-base font-semibold">Universo Semântico - Todas as Auras</h3>
          <button
            onClick={() => setViewMode('systems')}
            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Ver constelações →
          </button>
        </div>
        <svg width="1150" height="760" viewBox="0 0 1150 760" className="w-full h-auto animate-fade-in">
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
            <circle cx={centerX} cy={centerY} r={45} fill="hsl(var(--primary))" opacity="0.9" />
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
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground font-medium text-xs"
                  >
                    {word.word}
                  </text>
                </g>
              );
            })
          )}

          {/* Legendas dos sistemas ao redor - Botões flutuantes interativos */}
          {orbitalSystems.map((system, index) => {
            const angle = (index / orbitalSystems.length) * 2 * Math.PI;
            const legendRadius = 385;
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
                <circle cx={x} cy={y} r={32} fill={centerWordColors[system.centerWord]} opacity="0.15" className="animate-pulse" />
                
                {/* Sombra média */}
                <circle cx={x} cy={y} r={27} fill={centerWordColors[system.centerWord]} opacity="0.3" />
                
                {/* Botão principal */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={22} 
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
                  r={22} 
                  fill="none" 
                  stroke="hsl(var(--background))" 
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                
                {/* Texto */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-primary-foreground font-bold text-[11px] pointer-events-none"
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
        <div className="flex items-center justify-between px-4 pt-4 pb-2 animate-fade-in">
          <h3 className="text-base font-semibold">Constelações Semânticas - Prosódia</h3>
          <button
            onClick={() => setViewMode('mother')}
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

  // Renderiza sistema com zoom
  const renderZoomedSystem = () => {
    const system = orbitalSystems.find(s => s.centerWord === selectedSystem);
    if (!system) return null;

    return (
      <>
        {/* Controles de posição orbital - acima e à esquerda */}
        <div className="mb-3 p-3 bg-muted/30 rounded-lg w-64 animate-fade-in">
          <h4 className="font-semibold mb-2.5 text-sm">Controles Orbitais</h4>
          <div className="space-y-2.5">
            {system.words
              .sort((a, b) => b.strength - a.strength)
              .map((word, index) => {
                const wordKey = `${system.centerWord}-${word.word}`;
                const currentProgress = orbitProgress[wordKey] ?? (index / system.words.length * 100);
                
                return (
                  <div key={word.word} className="space-y-1 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{word.word}</span>
                      <span 
                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
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
                        onChange={(e) => handleOrbitProgressChange(wordKey, parseFloat(e.target.value))}
                        className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer slider-orbit"
                        style={{
                          background: `linear-gradient(to right, ${word.color} 0%, ${word.color} ${currentProgress}%, hsl(var(--muted)) ${currentProgress}%, hsl(var(--muted)) 100%)`
                        }}
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {Math.round(currentProgress)}°
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 animate-fade-in">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <span
                className="inline-block w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: centerWordColors[system.centerWord] }}
              />
              Constelação: {system.centerWord}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Arraste as palavras para reposicioná-las
            </p>
          </div>
          <button
            onClick={() => setViewMode('systems')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm text-sm"
          >
            ← Voltar
          </button>
        </div>
        <svg
          ref={svgRef}
          width="900"
          height="650"
          viewBox="0 0 900 650"
          className="w-full h-auto animate-scale-in"
          style={{ userSelect: draggedWord ? 'none' : 'auto' }}
        >
          {renderOrbitalSystem(system, 450, 325, true)}
        </svg>
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
    <div className="space-y-3">
      {/* Cabeçalho com navegação */}
      <div className="bg-background border rounded-lg p-2 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('mother')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
              viewMode === 'mother'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Universo Semântico
          </button>
          <button
            onClick={() => setViewMode('systems')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
              viewMode === 'systems'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Constelações Semânticas
          </button>
        </div>
      </div>

      <div
        className="relative w-full bg-gradient-to-br from-background to-muted/20 rounded-lg border overflow-hidden transition-all duration-500"
        onWheel={handleWheel}
      >
        {/* Controles de Zoom - Dentro do gráfico */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-background/90 backdrop-blur-sm border rounded-lg p-1.5 shadow-lg">
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded transition-colors"
            title="Zoom In (Ctrl + Scroll Up)"
          >
            <span className="text-base font-bold">+</span>
          </button>
          <button
            onClick={handleResetZoom}
            className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded transition-colors text-[10px] font-medium"
            title="Reset Zoom"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded transition-colors"
            title="Zoom Out (Ctrl + Scroll Down)"
          >
            <span className="text-base font-bold">−</span>
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
