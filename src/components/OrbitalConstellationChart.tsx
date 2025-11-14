import { useEffect, useRef, useState, useCallback } from 'react';
import Sigma from 'sigma';
import Graph from 'graphology';
import { SpaceNavigationConsole } from './SpaceNavigationConsole';
import { SpaceHUDTooltip } from './SpaceHUDTooltip';
import { VerticalZoomControls } from './VerticalZoomControls';
import { OrbitalRings } from './OrbitalRings';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

type NavigationLevel = 'universe' | 'galaxy' | 'stellar';

interface WordData {
  id: string;
  label: string;
  size: number;
  color: string;
  freq: number;
  normalized: number;
  orbit?: number;
  logLikelihood?: number;
  miScore?: number;
  prosody?: string;
  sentiment?: string;
}

interface DomainData {
  id: string;
  label: string;
  size: number;
  color: string;
  emotion: string;
  words: string[];
}

interface OrbitalConstellationChartProps {
  onWordClick?: (word: string) => void;
}

export const OrbitalConstellationChart = ({ onWordClick }: OrbitalConstellationChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<any>(null);
  
  const [level, setLevel] = useState<NavigationLevel>('universe');
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  
  const [filters, setFilters] = useState({
    minFrequency: 1,
    prosody: 'all',
    categories: [] as string[],
    searchQuery: ''
  });

  // Dados do Universo Semântico
  const universeWords: WordData[] = [
    // Órbita interna (alta frequência)
    { id: 'verso', label: 'verso', size: 18, color: '#1B5E20', freq: 8, normalized: 12.3, orbit: 150, logLikelihood: 15.2, prosody: 'Neutra', sentiment: 'Contemplativo' },
    { id: 'campo', label: 'campo', size: 17, color: '#1B5E20', freq: 7, normalized: 10.8, orbit: 150, logLikelihood: 14.1, prosody: 'Positiva', sentiment: 'Serenidade' },
    { id: 'casa', label: 'casa', size: 16, color: '#F57F17', freq: 6, normalized: 9.2, orbit: 150, logLikelihood: 12.8, prosody: 'Positiva', sentiment: 'Acolhimento' },
    { id: 'galpão', label: 'galpão', size: 15, color: '#C62828', freq: 5, normalized: 7.7, orbit: 150, logLikelihood: 11.2, prosody: 'Neutra', sentiment: 'Tradição' },
    
    // Órbita média (média frequência)
    { id: 'saudade', label: 'saudade', size: 13, color: '#C62828', freq: 3, normalized: 4.6, orbit: 220, logLikelihood: 8.2, prosody: 'Negativa', sentiment: 'Nostalgia' },
    { id: 'mate', label: 'mate', size: 13, color: '#F57F17', freq: 3, normalized: 4.6, orbit: 220, logLikelihood: 7.9, prosody: 'Positiva', sentiment: 'Pertencimento' },
    { id: 'noite', label: 'noite', size: 12, color: '#00E5FF', freq: 3, normalized: 4.6, orbit: 220, logLikelihood: 7.5, prosody: 'Neutra', sentiment: 'Mistério' },
    
    // Órbita externa (baixa frequência)
    { id: 'tarumã', label: 'tarumã', size: 11, color: '#1B5E20', freq: 2, normalized: 3.1, orbit: 290, logLikelihood: 6.2, prosody: 'Neutra', sentiment: 'Natureza' },
    { id: 'coxilha', label: 'coxilha', size: 11, color: '#1B5E20', freq: 2, normalized: 3.1, orbit: 290, logLikelihood: 5.8, prosody: 'Neutra', sentiment: 'Paisagem' },
    { id: 'silêncio', label: 'silêncio', size: 10, color: '#00E5FF', freq: 2, normalized: 3.1, orbit: 290, logLikelihood: 5.4, prosody: 'Neutra', sentiment: 'Quietude' },
    { id: 'sonho', label: 'sonho', size: 10, color: '#C62828', freq: 2, normalized: 3.1, orbit: 290, logLikelihood: 5.1, prosody: 'Positiva', sentiment: 'Esperança' },
    { id: 'sombra', label: 'sombra', size: 10, color: '#00E5FF', freq: 2, normalized: 3.1, orbit: 290, logLikelihood: 4.9, prosody: 'Neutra', sentiment: 'Proteção' }
  ];

  // Dados da Galáxia de Domínios
  const galaxyDomains: DomainData[] = [
    {
      id: 'natureza-pampa',
      label: 'Natureza do Pampa',
      size: 35,
      color: '#1B5E20',
      emotion: 'Serenidade',
      words: ['tarumã', 'coxilha', 'campo', 'sombra', 'casa']
    },
    {
      id: 'cultura-gaúcha',
      label: 'Cultura Gaúcha',
      size: 32,
      color: '#F57F17',
      emotion: 'Tradição',
      words: ['mate', 'galpão']
    },
    {
      id: 'sentimentos',
      label: 'Sentimentos',
      size: 30,
      color: '#C62828',
      emotion: 'Nostalgia',
      words: ['saudade', 'sonho']
    },
    {
      id: 'temporalidade',
      label: 'Temporalidade',
      size: 28,
      color: '#00E5FF',
      emotion: 'Contemplação',
      words: ['noite', 'silêncio', 'verso']
    }
  ];

  // Construir visualização do Universo
  const buildUniverseView = useCallback((graph: any) => {
    graph.clear();
    
    // Nó central (canção)
    graph.addNode('song-center', {
      label: 'Quando o Verso Vem\nPras Casa',
      x: 0.5,
      y: 0.5,
      size: 45,
      color: '#F57F17'
    });

    // Órbitas proporcionais (raios normalizados 0-1)
    const orbits = [0.12, 0.20, 0.28]; // Raios pequenos e proporcionais
    
    // Distribuir palavras nas órbitas
    const filteredWords = universeWords
      .filter(word => word.freq >= filters.minFrequency)
      .filter(word => filters.prosody === 'all' || word.prosody?.toLowerCase() === filters.prosody);
    
    filteredWords.forEach((word, index) => {
      // Determinar órbita baseado na frequência
      const orbitIndex = word.freq >= 6 ? 0 : word.freq >= 3 ? 1 : 2;
      const radius = orbits[orbitIndex];
      
      // Distribuir palavras uniformemente na órbita
      const wordsInOrbit = filteredWords.filter(w => {
        const oi = w.freq >= 6 ? 0 : w.freq >= 3 ? 1 : 2;
        return oi === orbitIndex;
      }).length;
      
      const indexInOrbit = filteredWords.filter((w, i) => {
        const oi = w.freq >= 6 ? 0 : w.freq >= 3 ? 1 : 2;
        return i < index && oi === orbitIndex;
      }).length;
      
      const angle = (indexInOrbit / wordsInOrbit) * 2 * Math.PI;
      
      graph.addNode(word.id, {
        label: word.label,
        x: 0.5 + radius * Math.cos(angle),
        y: 0.5 + radius * Math.sin(angle),
        size: word.size * 2.5, // Aumentar tamanho significativamente
        color: word.color
      });
      
      graph.addEdge('song-center', word.id, {
        color: word.color + '40',
        size: 1
      });
    });
  }, [filters]);

  // Construir visualização da Galáxia
  const buildGalaxyView = useCallback((graph: any) => {
    graph.clear();
    
    // Adicionar domínios
    galaxyDomains.forEach((domain, index) => {
      const angle = (index / galaxyDomains.length) * 2 * Math.PI;
      const radius = 0.25; // Raio normalizado
      
      graph.addNode(domain.id, {
        label: domain.label,
        x: 0.5 + Math.cos(angle) * radius,
        y: 0.5 + Math.sin(angle) * radius,
        size: domain.size * 2,
        color: domain.color
      });
    });
  }, []);

  // Construir Sistema Estelar
  const buildStellarView = useCallback((graph: any, systemId: string) => {
    graph.clear();
    
    const domain = galaxyDomains.find(d => d.id === systemId);
    if (!domain) return;
    
    // Centro do sistema (Estrela do domínio)
    graph.addNode('system-center', {
      label: domain.label,
      x: 0.5,
      y: 0.5,
      size: 60,
      color: domain.color
    });
    
    // Planetas (palavras do domínio) orbitando em diferentes níveis
    const domainWords = universeWords.filter(w => domain.words.includes(w.id));
    
    // Órbitas proporcionais para o stellar view
    const orbits = [0.15, 0.25]; // Duas órbitas compactas
    
    domainWords.forEach((word, index) => {
      // Distribuir em 2 órbitas baseado na frequência
      const orbitIndex = word.freq >= 4 ? 0 : 1;
      const radius = orbits[orbitIndex];
      
      const wordsInOrbit = domainWords.filter(w => (w.freq >= 4 ? 0 : 1) === orbitIndex).length;
      const indexInOrbit = domainWords.filter((w, i) => i < index && (w.freq >= 4 ? 0 : 1) === orbitIndex).length;
      const angle = (indexInOrbit / wordsInOrbit) * 2 * Math.PI;
      
      graph.addNode(word.id, {
        label: word.label,
        x: 0.5 + Math.cos(angle) * radius,
        y: 0.5 + Math.sin(angle) * radius,
        size: (word.size + 5) * 2,
        color: word.color,
        freq: word.freq,
        normalized: word.normalized,
        logLikelihood: word.logLikelihood,
        prosody: word.prosody,
        sentiment: word.sentiment
      });
      
      // Conexões gravitacionais
      graph.addEdge('system-center', word.id, {
        color: word.color + '60',
        size: 2.5
      });
    });
  }, [universeWords, galaxyDomains]);

  // Navegação entre níveis
  const navigateToLevel = useCallback((newLevel: NavigationLevel, systemId?: string) => {
    setLevel(newLevel);
    setSelectedSystem(systemId || null);
    
    if (!graphRef.current) return;
    
    // Animação de fade out
    if (sigmaRef.current) {
      const container = sigmaRef.current.getContainer();
      container.style.transition = 'opacity 0.3s ease-out';
      container.style.opacity = '0';
    }
    
    // Após fade out, reconstruir o grafo
    setTimeout(() => {
      switch (newLevel) {
        case 'universe':
          buildUniverseView(graphRef.current);
          break;
        case 'galaxy':
          buildGalaxyView(graphRef.current);
          break;
        case 'stellar':
          if (systemId) buildStellarView(graphRef.current, systemId);
          break;
      }
      
      // Animação de fade in + zoom
      if (sigmaRef.current) {
        const container = sigmaRef.current.getContainer();
        container.style.opacity = '1';
        sigmaRef.current.getCamera().animate({ x: 0.5, y: 0.5, ratio: 0.8 }, { duration: 800 });
      }
    }, 300);
  }, [buildUniverseView, buildGalaxyView, buildStellarView]);

  // Inicializar Sigma.js
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Store container dimensions
    setContainerRect(containerRef.current.getBoundingClientRect());
    
    const graph = new Graph();
    graphRef.current = graph;
    buildUniverseView(graph);
    
    const sigma = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelRenderedSizeThreshold: 0,
      labelFont: 'Courier New, monospace',
      labelSize: 12,
      labelWeight: 'bold',
      labelColor: { color: '#00E5FF' },
      defaultNodeColor: '#F57F17',
      allowInvalidContainer: true,
      minCameraRatio: 0.3,
      maxCameraRatio: 2.5
    });
    
    sigmaRef.current = sigma;
    
    // Set initial camera position
    sigma.getCamera().setState({ x: 0.5, y: 0.5, ratio: 0.8 });
    
    // Event handlers
    sigma.on('enterNode', ({ node, event }) => {
      const wordData = universeWords.find(w => w.id === node);
      const displayPoint = { x: event.x, y: event.y };
      
      setHoveredNode(wordData || { id: node, label: node, freq: 0, normalized: 0 });
      setTooltipPos(displayPoint);
      setIsPaused(true);
    });
    
    sigma.on('leaveNode', () => {
      setHoveredNode(null);
      setTimeout(() => setIsPaused(false), 2000);
    });
    
    sigma.on('clickNode', ({ node }) => {
      if (level === 'universe' && node === 'song-center') {
        navigateToLevel('galaxy');
      } else if (level === 'galaxy') {
        navigateToLevel('stellar', node);
      } else if (level === 'stellar' && node !== 'system-center') {
        onWordClick?.(node);
      } else if (level === 'stellar' && node === 'system-center') {
        // Clicar na estrela central volta para galaxy
        navigateToLevel('galaxy');
      }
    });
    
    return () => {
      sigma.kill();
    };
  }, []);

  // Atualizar quando filtros mudarem
  useEffect(() => {
    if (!graphRef.current) return;
    
    if (level === 'universe') {
      buildUniverseView(graphRef.current);
    }
  }, [filters, level, buildUniverseView]);

  const getCurrentSystemName = () => {
    if (level === 'universe') return 'Universo Semântico';
    if (level === 'galaxy') return 'Galáxia de Auras';
    if (level === 'stellar' && selectedSystem) {
      const domain = galaxyDomains.find(d => d.id === selectedSystem);
      return `Sistema: ${domain?.label || 'Desconhecido'}`;
    }
    return 'Navegando...';
  };

  const handleZoomIn = () => {
    if (sigmaRef.current) {
      const camera = sigmaRef.current.getCamera();
      const currentRatio = camera.getState().ratio;
      const newRatio = Math.max(currentRatio * 0.7, 0.1);
      camera.animate({ ratio: newRatio }, { duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (sigmaRef.current) {
      const camera = sigmaRef.current.getCamera();
      const currentRatio = camera.getState().ratio;
      const newRatio = Math.min(currentRatio * 1.4, 4);
      camera.animate({ ratio: newRatio }, { duration: 300 });
    }
  };

  const handleZoomChange = (value: number) => {
    sigmaRef.current?.getCamera().animate({ ratio: 1 / value }, { duration: 300 });
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen().then(() => {
        setTimeout(() => {
          sigmaRef.current?.refresh();
          sigmaRef.current?.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1.2 });
        }, 100);
      });
    } else {
      document.exitFullscreen().then(() => {
        setTimeout(() => {
          sigmaRef.current?.refresh();
          sigmaRef.current?.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1.2 });
        }, 100);
      });
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden" 
         style={{ 
           background: 'radial-gradient(circle at center, #0A0E27 0%, #000000 100%)',
           minHeight: '800px'
         }}>
      
      {/* Background stars */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(2px 2px at 20% 30%, white, transparent), radial-gradient(2px 2px at 60% 70%, white, transparent), radial-gradient(1px 1px at 50% 50%, white, transparent), radial-gradient(1px 1px at 80% 10%, white, transparent), radial-gradient(2px 2px at 90% 60%, white, transparent)',
        backgroundSize: '200% 200%',
        animation: 'stars-twinkle 8s ease-in-out infinite'
      }} />
      
      {/* Console de Navegação */}
      <SpaceNavigationConsole
        level={level}
        currentSystem={getCurrentSystemName()}
        currentCoords={`LVL: ${level.toUpperCase()} | SYS: ${selectedSystem || 'NONE'}`}
        filters={filters}
        onNavigate={navigateToLevel}
        onFilterChange={setFilters}
        onReset={() => {
          setFilters({ minFrequency: 1, prosody: 'all', categories: [], searchQuery: '' });
          navigateToLevel('universe');
        }}
      />
      
      {/* Controles de Zoom */}
      <VerticalZoomControls
        zoomLevel={1}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomChange={handleZoomChange}
        onReset={() => {
          sigmaRef.current?.getCamera().animate({ x: 0.5, y: 0.5, ratio: 1.2 }, { duration: 500 });
        }}
        onFit={() => sigmaRef.current?.getCamera().animate({ ratio: 1 }, { duration: 800 })}
        onRefresh={() => navigateToLevel(level, selectedSystem || undefined)}
        onFullscreen={handleFullscreen}
      />
      
      {/* Botão de Pause ao lado esquerdo do console */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="absolute left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style={{
                top: '10px',
                background: isPaused ? 'linear-gradient(135deg, #00E5FF, #1B5E20)' : 'rgba(10, 14, 39, 0.9)',
                border: '2px solid #00E5FF',
                boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
                color: '#FFFFFF',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              {isPaused ? '▶' : '⏸'}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-card border-[#00E5FF] text-foreground">
            <p className="text-sm font-medium">{isPaused ? 'Retomar animações das órbitas' : 'Pausar animações das órbitas'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Órbitas animadas usando OrbitalRings component */}
      {containerRect && (
        <OrbitalRings 
          level={level}
          isPaused={isPaused}
          containerWidth={containerRect.width}
          containerHeight={containerRect.height}
        />
      )}
      
      {/* Container Sigma */}
      <div 
        ref={containerRef} 
        className="w-full h-full absolute inset-0"
        style={{ 
          filter: 'drop-shadow(0 0 30px rgba(245, 127, 23, 0.3))',
          zIndex: 10,
          minHeight: '800px'
        }}
      />
      
      {/* Tooltip HUD */}
      <SpaceHUDTooltip
        word={hoveredNode}
        position={tooltipPos}
        visible={!!hoveredNode}
        containerRect={containerRect || undefined}
      />
      
      <style>{`
        @keyframes rotate-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes stars-twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        .space-nav-btn {
          transition: all 0.3s ease;
        }
        
        .space-nav-btn:hover {
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.5);
          transform: scale(1.05);
        }
        
        .network-page-container:fullscreen {
          background: #0A0E27 !important;
        }
        
        .network-page-container:fullscreen .space-console,
        .network-page-container:fullscreen .zoom-controls {
          display: block !important;
          z-index: 2000 !important;
        }
      `}</style>
    </div>
  );
};
