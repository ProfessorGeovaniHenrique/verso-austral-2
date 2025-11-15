import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { loadPlanetTextures, drawPlanetNode } from '@/lib/planetRenderer';
import { SpaceNavigationConsole } from './SpaceNavigationConsole';
import { ControlPanel } from './ControlPanel/ControlPanel';
import { ControlToolbar } from './ControlPanel/ControlToolbar';
import { FloatingControlPanel } from './ControlPanel/FloatingControlPanel';
import { FilterPanel } from './FilterPanel';
import { hslToRgba } from '@/lib/colorUtils';
import type { DominioSemantico, PalavraStatsMap } from '@/data/types/corpus.types';

interface OrbitalDomainConstellationProps {
  dominiosData: DominioSemantico[];
  onWordClick: (word: string) => void;
  palavraStats: PalavraStatsMap;
}

// Helper function to convert HSL to RGBA with opacity
// Now imported from centralized utility

interface WordPosition {
  x: number;
  y: number;
  palavra: string;
  dominio: string;
  cor: string;
  radius: number;
  angle: number;
  centerX: number;
  centerY: number;
  orbitRadius: number;
}

export function OrbitalDomainConstellation({ 
  dominiosData, 
  onWordClick,
  palavraStats 
}: OrbitalDomainConstellationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [hoveredWord, setHoveredWord] = useState<WordPosition | null>(null);
  const [texturesLoaded, setTexturesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [wordPositions, setWordPositions] = useState<WordPosition[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWord, setDraggedWord] = useState<WordPosition | null>(null);
  const [orbitAngles, setOrbitAngles] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  
  // Estados para o sistema de console (igual ao OrbitalConstellationChart)
  const [level, setLevel] = useState<'universe' | 'galaxy' | 'stellar-system'>('universe');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [codexState, setCodexState] = useState<'closed' | 'auto-open' | 'pinned'>('closed');
  const [consoleMode, setConsoleMode] = useState<'docked' | 'minimized' | 'floating'>('docked');
  const [floatingPosition, setFloatingPosition] = useState({ x: 100, y: 100 });
  const [floatingSize, setFloatingSize] = useState({ width: 420, height: 600 });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    minFrequency: 0,
    prosody: [] as string[],
    domains: [] as string[],
    searchQuery: ''
  });
  const [openSections, setOpenSections] = useState({
    codex: true,
    legend: false,
    future: false
  });

  // Posições fixas dos domínios (7 posições)
  const domainPositions = [
    { x: 650, y: 487 },  // Centro
    { x: 390, y: 195 },  // Top-left
    { x: 910, y: 195 },  // Top-right
    { x: 364, y: 754 },  // Bottom-left
    { x: 936, y: 754 },  // Bottom-right
    { x: 260, y: 487 },  // Mid-left
    { x: 1040, y: 487 }  // Mid-right
  ];

  // Pré-carregar texturas com progress
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    // Simular loading progress
    progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + 10, 90));
    }, 100);
    
    loadPlanetTextures()
      .then(() => {
        clearInterval(progressInterval);
        setLoadingProgress(100);
        setTimeout(() => setTexturesLoaded(true), 200);
      })
      .catch(err => {
        clearInterval(progressInterval);
        console.error('Failed to load textures:', err);
      });
      
    return () => clearInterval(progressInterval);
  }, []);

  // Calcular posições das palavras
  useEffect(() => {
    const positions: WordPosition[] = [];
    
    dominiosData.forEach((dominio, index) => {
      const position = domainPositions[index];
      const centerX = position.x;
      const centerY = position.y;
      const sizeScale = (0.6 + dominio.percentual / 28.2 * 0.8) * 1.3;
      const orbitRadii = [91 * sizeScale, 143 * sizeScale, 195 * sizeScale, 247 * sizeScale];
      const totalWords = dominio.palavras.length;
      const wordsPerOrbit = Math.ceil(totalWords / 4);

      dominio.palavras.forEach((palavra, wordIndex) => {
        const orbitLevel = Math.floor(wordIndex / wordsPerOrbit);
        const orbit = Math.min(orbitLevel, 3);
        const radius = orbitRadii[orbit];
        const wordsInThisOrbit = Math.min(wordsPerOrbit, totalWords - orbit * wordsPerOrbit);
        const indexInOrbit = wordIndex % wordsPerOrbit;
        const wordKey = `${dominio.dominio}-${palavra}`;
        
        // Use saved angle or calculate base angle
        const baseAngle = indexInOrbit / wordsInThisOrbit * 2 * Math.PI - Math.PI / 2;
        const angleOffset = Math.sin(wordIndex * 2.5) * 0.3;
        const angle = orbitAngles[wordKey] ?? (baseAngle + angleOffset);
        
        const radiusVariation = 1 + Math.cos(wordIndex * 3.7) * 0.12;
        const finalRadius = radius * radiusVariation;
        const x = centerX + Math.cos(angle) * finalRadius;
        const y = centerY + Math.sin(angle) * finalRadius;

        positions.push({
          x,
          y,
          palavra,
          dominio: dominio.dominio,
          cor: dominio.cor,
          radius: 8,
          angle,
          centerX,
          centerY,
          orbitRadius: finalRadius
        });
      });
    });

    setWordPositions(positions);
  }, [dominiosData, orbitAngles]);

  // ⚡ PERFORMANCE OPTIMIZED: Renderização Canvas com Dirty Flag Pattern
  useEffect(() => {
    if (!texturesLoaded || !isDirty) return; // Skip se não há mudanças
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calcular viewport para culling
    const viewport = {
      left: -panOffset.x / zoomLevel,
      top: -panOffset.y / zoomLevel,
      right: (canvas.width - panOffset.x) / zoomLevel,
      bottom: (canvas.height - panOffset.y) / zoomLevel
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      ctx.scale(zoomLevel, zoomLevel);
      
      // Renderizar órbitas e domínios
      dominiosData.forEach((dominio, index) => {
        const position = domainPositions[index];
        const centerX = position.x;
        const centerY = position.y;
        
        // 🎯 VIEWPORT CULLING: Skip se domínio está fora da tela
        const maxOrbitRadius = 247 * 1.5; // Max orbit radius
        if (centerX + maxOrbitRadius < viewport.left ||
            centerX - maxOrbitRadius > viewport.right ||
            centerY + maxOrbitRadius < viewport.top ||
            centerY - maxOrbitRadius > viewport.bottom) {
          return; // Skip invisível
        }
        
        const sizeScale = (0.6 + dominio.percentual / 28.2 * 0.8) * 1.3;
        const orbitRadii = [91 * sizeScale, 143 * sizeScale, 195 * sizeScale, 247 * sizeScale];
        
        // Renderizar anéis orbitais
        orbitRadii.forEach((radius, orbitIndex) => {
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = dominio.cor;
          ctx.lineWidth = 3.9 - orbitIndex * 0.65;
          ctx.globalAlpha = 0.25 - orbitIndex * 0.05;
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
        
        // Renderizar planeta central do domínio
        ctx.save();
        ctx.translate(centerX, centerY);
        
        const glowGradient = ctx.createRadialGradient(0, 0, 23.4 * sizeScale, 0, 0, 36.4 * sizeScale);
        glowGradient.addColorStop(0, hslToRgba(dominio.cor, 0.27));
        glowGradient.addColorStop(1, hslToRgba(dominio.cor, 0));
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 36.4 * sizeScale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = dominio.cor;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(0, 0, 29.9 * sizeScale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(0, 0, 23.4 * sizeScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${18.2 * sizeScale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dominio.dominio.split(' ')[0], 0, 0);
        
        ctx.restore();
      });
      
      // 🎯 VIEWPORT CULLING: Renderizar apenas palavras visíveis
      let renderedCount = 0;
      let culledCount = 0;
      
      wordPositions.forEach(word => {
        // Skip se fora do viewport (com margem de 100px)
        const margin = 100;
        if (word.x < viewport.left - margin ||
            word.x > viewport.right + margin ||
            word.y < viewport.top - margin ||
            word.y > viewport.bottom + margin) {
          culledCount++;
          return;
        }
        
        renderedCount++;
        const isHovered = hoveredWord?.palavra === word.palavra && hoveredWord?.dominio === word.dominio;
        const size = isHovered ? 10 : 8;
        
        ctx.save();
        ctx.translate(word.x, word.y);
        
        drawPlanetNode(ctx, {
          x: 0,
          y: 0,
          size,
          label: word.palavra,
          color: word.cor
        }, { zoomRatio: zoomLevel });
        
        ctx.restore();
      });
      
      ctx.restore();
      
      // Log culling stats (only in dev)
      if (process.env.NODE_ENV === 'development' && culledCount > 0) {
        console.log(`🎯 Culling: ${renderedCount} rendered, ${culledCount} culled (${Math.round(culledCount/(renderedCount+culledCount)*100)}% saved)`);
      }
      
      setIsDirty(false); // Marcar como limpo após render
    };
    
    render();
    
    // Não usar requestAnimationFrame loop - só renderizar quando dirty
  }, [texturesLoaded, isDirty, dominiosData, wordPositions, zoomLevel, panOffset, hoveredWord, domainPositions]);

  // Mouse handlers
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoomLevel,
      y: (e.clientY - rect.top - panOffset.y) / zoomLevel
    };
  }, [panOffset, zoomLevel]);

  // ⚡ THROTTLED: Mouse move com limite de 16ms (~60fps)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
    
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      setIsDirty(true); // 🎯 Marcar para re-render
      return;
    }
    
    if (isDragging && draggedWord) {
      const dx = coords.x - draggedWord.centerX;
      const dy = coords.y - draggedWord.centerY;
      const newAngle = Math.atan2(dy, dx);
      const wordKey = `${draggedWord.dominio}-${draggedWord.palavra}`;
      
      setOrbitAngles(prev => ({
        ...prev,
        [wordKey]: newAngle
      }));
      setIsDirty(true); // 🎯 Marcar para re-render
      return;
    }
    
    // Hover detection
    const hoveredWordPos = wordPositions.find(word => {
      const dx = coords.x - word.x;
      const dy = coords.y - word.y;
      return Math.sqrt(dx * dx + dy * dy) < 12;
    });
    
    if (hoveredWordPos !== hoveredWord) {
      setHoveredWord(hoveredWordPos || null);
      setIsDirty(true);
      
      // Gerenciar Codex baseado no hover
      if (hoveredWordPos && codexState === 'closed') {
        setCodexState('auto-open');
      } else if (!hoveredWordPos && codexState === 'auto-open') {
        setCodexState('closed');
      }
    }
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hoveredWordPos 
        ? 'pointer' 
        : (isPanning ? 'grabbing' : 'grab');
    }
  }, [isPanning, isDragging, draggedWord, panStart, wordPositions, hoveredWord, codexState, getCanvasCoords]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    
    // Check if clicking on a word
    const clickedWord = wordPositions.find(word => {
      const dx = coords.x - word.x;
      const dy = coords.y - word.y;
      return Math.sqrt(dx * dx + dy * dy) < 12;
    });
    
    if (clickedWord) {
      setIsDragging(true);
      setDraggedWord(clickedWord);
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [wordPositions, panOffset, getCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && draggedWord && !isPanning) {
      // Only trigger click if not dragged much
      onWordClick(draggedWord.palavra);
    }
    setIsPanning(false);
    setIsDragging(false);
    setDraggedWord(null);
  }, [isDragging, draggedWord, isPanning, onWordClick]);

  // ⚡ THROTTLED: Wheel com limite de 50ms (~20fps)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.max(0.3, Math.min(3, prev * delta)));
    setIsDirty(true); // 🎯 Marcar para re-render
  }, []);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 0.2));
    setIsDirty(true);
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.3, prev - 0.2));
    setIsDirty(true);
  };
  
  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDirty(true);
  };

  // Handlers para o Codex e Console
  const handlePanelMouseEnter = useCallback(() => {
    if (codexState === 'auto-open') {
      setCodexState('pinned');
    }
  }, [codexState]);

  const handlePanelMouseLeave = useCallback(() => {
    // Não fecha automaticamente quando está pinned
  }, []);

  const handleMinimizeConsole = useCallback(() => {
    setConsoleMode('minimized');
  }, []);

  const handleExpandConsole = useCallback(() => {
    setConsoleMode('docked');
  }, []);

  const handleFloatConsole = useCallback(() => {
    setConsoleMode('floating');
    setFloatingPosition({ x: 100, y: 100 });
  }, []);

  const handleDockConsole = useCallback(() => {
    setConsoleMode('docked');
  }, []);

  const handleToggleCodex = useCallback(() => {
    setOpenSections(prev => ({ ...prev, codex: !prev.codex }));
  }, []);

  const handleToggleLegend = useCallback(() => {
    setOpenSections(prev => ({ ...prev, legend: !prev.legend }));
  }, []);

  const handleToggleFuture = useCallback(() => {
    setOpenSections(prev => ({ ...prev, future: !prev.future }));
  }, []);

  const handleNavigateToLevel = useCallback((newLevel: 'universe' | 'galaxy' | 'stellar-system') => {
    setLevel(newLevel);
    setIsDirty(true);
  }, []);

  if (!texturesLoaded) {
    return (
      <div className="flex items-center justify-center h-[750px] bg-gradient-to-b from-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">{loadingProgress}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-primary font-mono text-sm font-semibold animate-pulse">
              🌌 Inicializando sistema orbital
            </p>
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mx-auto">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[750px] overflow-hidden">
      
      {/* ÁREA PRINCIPAL - Canvas + Overlays */}
      <div className="flex-1 relative">
        
        {!texturesLoaded ? (
          <div className="flex items-center justify-center h-full" style={{
            background: 'radial-gradient(circle at 50% 50%, hsl(var(--background)) 0%, hsl(222, 47%, 11%) 100%)'
          }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
              <div className="text-cyan-400 text-xl font-mono">
                🌌 Carregando Universo Semântico...
              </div>
              <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  style={{ width: `${loadingProgress}%` }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-cyan-300 text-sm font-mono">
                {loadingProgress}% carregado
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Canvas de Renderização */}
            <canvas
              ref={canvasRef}
              width={1300}
              height={975}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="w-full h-full"
              style={{ 
                background: 'radial-gradient(circle at 50% 50%, hsl(var(--background)) 0%, hsl(222, 47%, 11%) 100%)',
                cursor: isPanning ? 'grabbing' : isDragging ? 'move' : 'grab'
              }}
            />
            
            {/* Filter Panel - Sobreposto */}
            <FilterPanel
              isOpen={isFilterPanelOpen}
              onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              filters={activeFilters}
              onFilterChange={setActiveFilters}
              availableDomains={dominiosData.map(d => ({
                label: d.dominio,
                color: d.cor,
                corTexto: d.corTexto
              }))}
            />
            
            {/* Navigation Console - Fixo no topo */}
            <div className="absolute top-0 left-0 right-0 z-30">
              <SpaceNavigationConsole
                level={level}
                selectedDomain={selectedDomain}
                onNavigate={handleNavigateToLevel}
                onFilterChange={setActiveFilters}
                onReset={() => {
                  setActiveFilters({
                    minFrequency: 0,
                    prosody: [],
                    domains: [],
                    searchQuery: ''
                  });
                }}
                isFilterPanelOpen={isFilterPanelOpen}
                onToggleFilterPanel={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                activeFilterCount={
                  (activeFilters.minFrequency > 0 ? 1 : 0) +
                  activeFilters.prosody.length +
                  activeFilters.domains.length +
                  (activeFilters.searchQuery ? 1 : 0)
                }
              />
            </div>
          </>
        )}
      </div>
      
      {/* PAINEL DIREITO - Console + Toolbar */}
      {texturesLoaded && (
        <div className="flex items-stretch h-full">
          
          {/* Console - Condicional baseado no modo */}
          {consoleMode === 'docked' && (
            <ControlPanel
              mode="docked"
              hoveredNode={hoveredWord ? {
                id: hoveredWord.palavra,
                label: hoveredWord.palavra,
                freq: palavraStats[hoveredWord.palavra]?.frequencia,
                prosody: palavraStats[hoveredWord.palavra]?.prosodia,
                domain: hoveredWord.dominio
              } : null}
              level={level}
              codexState={codexState}
              onMouseEnter={handlePanelMouseEnter}
              onMouseLeave={handlePanelMouseLeave}
              openSections={openSections}
              onMinimize={handleMinimizeConsole}
              onFloat={handleFloatConsole}
            />
          )}
          
          {/* Toolbar - Sempre visível */}
          <ControlToolbar
            isMinimized={consoleMode === 'minimized'}
            onToggleConsole={handleExpandConsole}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
            isPaused={isPaused}
            onPauseToggle={() => setIsPaused(!isPaused)}
            isCodexOpen={openSections.codex}
            isLegendOpen={openSections.legend}
            isFutureOpen={openSections.future}
            onToggleCodex={handleToggleCodex}
            onToggleLegend={handleToggleLegend}
            onToggleFuture={handleToggleFuture}
            showLegend={level === 'galaxy'}
          />
          
        </div>
      )}
      
      {/* Console Flutuante - Portal */}
      {consoleMode === 'floating' && texturesLoaded && (
        <FloatingControlPanel
          position={floatingPosition}
          size={floatingSize}
          onDock={handleDockConsole}
          onPositionChange={setFloatingPosition}
        >
          <ControlPanel
            mode="floating"
            hoveredNode={hoveredWord ? {
              id: hoveredWord.palavra,
              label: hoveredWord.palavra,
              freq: palavraStats[hoveredWord.palavra]?.frequencia,
              prosody: palavraStats[hoveredWord.palavra]?.prosodia,
              domain: hoveredWord.dominio
            } : null}
            level={level}
            codexState={codexState}
            onMouseEnter={handlePanelMouseEnter}
            onMouseLeave={handlePanelMouseLeave}
            openSections={openSections}
          />
        </FloatingControlPanel>
      )}
      
    </div>
  );
}
