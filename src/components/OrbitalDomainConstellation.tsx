import { useRef, useState, useEffect, useCallback } from 'react';
import { NavigationToolbar } from './NavigationToolbar';
import { SpaceHUDTooltip } from './SpaceHUDTooltip';
import { loadPlanetTextures, drawPlanetNode } from '@/lib/planetRenderer';
import type { DominioSemantico, PalavraStatsMap } from '@/data/types/corpus.types';

interface OrbitalDomainConstellationProps {
  dominiosData: DominioSemantico[];
  onWordClick: (word: string) => void;
  palavraStats: PalavraStatsMap;
}

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
  const [wordPositions, setWordPositions] = useState<WordPosition[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWord, setDraggedWord] = useState<WordPosition | null>(null);
  const [orbitAngles, setOrbitAngles] = useState<Record<string, number>>({});
  const mousePositionRef = useRef({ x: 0, y: 0 });

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

  // Pré-carregar texturas
  useEffect(() => {
    loadPlanetTextures()
      .then(() => setTexturesLoaded(true))
      .catch(err => console.error('Failed to load textures:', err));
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

  // Renderização Canvas
  useEffect(() => {
    if (!texturesLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
        
        // Renderizar planeta central do domínio (maior)
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Glow effect
        const glowGradient = ctx.createRadialGradient(0, 0, 23.4 * sizeScale, 0, 0, 36.4 * sizeScale);
        glowGradient.addColorStop(0, `${dominio.cor}44`);
        glowGradient.addColorStop(1, `${dominio.cor}00`);
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 36.4 * sizeScale, 0, Math.PI * 2);
        ctx.fill();
        
        // Core circles
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
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${18.2 * sizeScale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dominio.dominio.split(' ')[0], 0, 0);
        
        ctx.restore();
      });
      
      // Renderizar palavras como planetas
      wordPositions.forEach(word => {
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
        }, {});
        
        ctx.restore();
      });
      
      ctx.restore();
      
      animationFrameRef.current = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [texturesLoaded, dominiosData, wordPositions, zoomLevel, panOffset, hoveredWord, domainPositions]);

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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
    
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }
    
    if (isDragging && draggedWord) {
      // Calculate new angle based on mouse position
      const dx = coords.x - draggedWord.centerX;
      const dy = coords.y - draggedWord.centerY;
      const newAngle = Math.atan2(dy, dx);
      const wordKey = `${draggedWord.dominio}-${draggedWord.palavra}`;
      
      setOrbitAngles(prev => ({
        ...prev,
        [wordKey]: newAngle
      }));
      return;
    }
    
    // Hover detection
    const hoveredWordPos = wordPositions.find(word => {
      const dx = coords.x - word.x;
      const dy = coords.y - word.y;
      return Math.sqrt(dx * dx + dy * dy) < 12;
    });
    
    setHoveredWord(hoveredWordPos || null);
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hoveredWordPos 
        ? 'pointer' 
        : (isPanning ? 'grabbing' : 'grab');
    }
  }, [isPanning, isDragging, draggedWord, panStart, wordPositions, getCanvasCoords]);

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.max(0.3, Math.min(3, prev * delta)));
  }, []);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(3, prev + 0.2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.3, prev - 0.2));
  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  if (!texturesLoaded) {
    return (
      <div className="flex items-center justify-center h-[750px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground font-mono text-sm animate-pulse">
            🌌 Carregando texturas espaciais...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[750px] overflow-hidden">
      <NavigationToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onFitToView={handleReset}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
      />
      
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
          background: 'radial-gradient(circle, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)',
          cursor: isPanning ? 'grabbing' : 'grab'
        }}
      />
      
      {hoveredWord && palavraStats[hoveredWord.palavra] && (
        <SpaceHUDTooltip
          word={{
            id: hoveredWord.palavra,
            label: hoveredWord.palavra,
            freq: palavraStats[hoveredWord.palavra]?.frequencia,
            prosody: palavraStats[hoveredWord.palavra]?.prosodia,
            level: 'orbital'
          }}
          visible={true}
          level="orbital"
        />
      )}
    </div>
  );
}
