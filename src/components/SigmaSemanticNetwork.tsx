import React, { useEffect, useRef, useState, useCallback } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { KWICModal } from './KWICModal';
import { FilterToolbar, FilterState } from './FilterToolbar';
import { StatisticalTooltip } from './StatisticalTooltip';
import { VerticalZoomControls } from './VerticalZoomControls';

// Types
type ViewLevel = 'universe' | 'galaxy' | 'constellation';

interface SemanticDomain {
  id: string;
  name: string;
  color: string;
  words: Array<{
    word: string;
    frequency: number;
    strength: number;
    prosody: 'Positiva' | 'Neutra' | 'Negativa';
    significance: 'Alta' | 'Média' | 'Baixa';
  }>;
}

interface BreadcrumbItem {
  level: ViewLevel;
  label: string;
  domainId?: string;
}

// Dados extraídos da canção "A Calma do Tarumã" - Luiz Marenco
const SEMANTIC_DOMAINS: SemanticDomain[] = [
  {
    id: 'nature',
    name: 'Natureza',
    color: '#228B22',
    words: [
      { word: 'campo', frequency: 45, strength: 0.95, prosody: 'Positiva', significance: 'Alta' },
      { word: 'sombra', frequency: 32, strength: 0.92, prosody: 'Neutra', significance: 'Alta' },
      { word: 'várzea', frequency: 18, strength: 0.90, prosody: 'Positiva', significance: 'Média' },
      { word: 'horizonte', frequency: 12, strength: 0.85, prosody: 'Positiva', significance: 'Média' },
      { word: 'tarumã', frequency: 18, strength: 0.93, prosody: 'Positiva', significance: 'Média' },
      { word: 'coxilha', frequency: 11, strength: 0.87, prosody: 'Positiva', significance: 'Média' },
      { word: 'campanha', frequency: 15, strength: 0.82, prosody: 'Positiva', significance: 'Média' },
      { word: 'sol', frequency: 12, strength: 0.84, prosody: 'Positiva', significance: 'Média' },
      { word: 'primavera', frequency: 8, strength: 0.78, prosody: 'Positiva', significance: 'Baixa' }
    ]
  },
  {
    id: 'culture',
    name: 'Cultura Gaúcha',
    color: '#8B4513',
    words: [
      { word: 'galpão', frequency: 25, strength: 0.88, prosody: 'Positiva', significance: 'Alta' },
      { word: 'campereada', frequency: 15, strength: 0.86, prosody: 'Neutra', significance: 'Média' },
      { word: 'gateada', frequency: 12, strength: 0.82, prosody: 'Neutra', significance: 'Média' },
      { word: 'ramada', frequency: 11, strength: 0.90, prosody: 'Positiva', significance: 'Média' },
      { word: 'querência', frequency: 12, strength: 0.87, prosody: 'Positiva', significance: 'Média' },
      { word: 'mate', frequency: 15, strength: 0.85, prosody: 'Positiva', significance: 'Média' },
      { word: 'arreios', frequency: 6, strength: 0.80, prosody: 'Neutra', significance: 'Baixa' },
      { word: 'esporas', frequency: 4, strength: 0.79, prosody: 'Neutra', significance: 'Baixa' },
      { word: 'cuia', frequency: 3, strength: 0.83, prosody: 'Positiva', significance: 'Baixa' },
      { word: 'bomba', frequency: 6, strength: 0.78, prosody: 'Neutra', significance: 'Baixa' },
      { word: 'tropa', frequency: 9, strength: 0.81, prosody: 'Neutra', significance: 'Baixa' }
    ]
  },
  {
    id: 'temporal',
    name: 'Tempo',
    color: '#4682B4',
    words: [
      { word: 'noite', frequency: 28, strength: 0.86, prosody: 'Neutra', significance: 'Alta' },
      { word: 'manhãs', frequency: 12, strength: 0.83, prosody: 'Positiva', significance: 'Média' },
      { word: 'madrugada', frequency: 11, strength: 0.85, prosody: 'Neutra', significance: 'Média' },
      { word: 'tarde', frequency: 15, strength: 0.88, prosody: 'Neutra', significance: 'Média' },
      { word: 'aurora', frequency: 8, strength: 0.80, prosody: 'Positiva', significance: 'Baixa' }
    ]
  },
  {
    id: 'emotion',
    name: 'Emoção',
    color: '#CD853F',
    words: [
      { word: 'saudades', frequency: 32, strength: 0.91, prosody: 'Negativa', significance: 'Alta' },
      { word: 'sonhos', frequency: 11, strength: 0.88, prosody: 'Positiva', significance: 'Média' },
      { word: 'prenda', frequency: 12, strength: 0.86, prosody: 'Positiva', significance: 'Média' },
      { word: 'verso', frequency: 18, strength: 0.92, prosody: 'Positiva', significance: 'Média' },
      { word: 'silêncio', frequency: 2, strength: 0.84, prosody: 'Negativa', significance: 'Baixa' }
    ]
  }
];

const SONG_DATA = {
  title: 'A Calma do Tarumã',
  artist: 'Luiz Marenco',
  totalWords: 280
};

// KWIC data extraídos da letra
const kwicData: Record<string, Array<{
  leftContext: string;
  keyword: string;
  rightContext: string;
  source: string;
}>> = {
  'tarumã': [
    {
      leftContext: 'A calma do',
      keyword: 'tarumã',
      rightContext: ', ganhou sombra mais copada',
      source: `${SONG_DATA.artist} - ${SONG_DATA.title}`
    },
    {
      leftContext: 'E o verso sonhou ser várzea com sombra de',
      keyword: 'tarumã',
      rightContext: '',
      source: `${SONG_DATA.artist} - ${SONG_DATA.title}`
    }
  ],
  'verso': [
    {
      leftContext: 'Daí um',
      keyword: 'verso',
      rightContext: 'de campo se chegou da campereada',
      source: `${SONG_DATA.artist} - ${SONG_DATA.title}`
    },
    {
      leftContext: 'Prá querência galponeira, onde o',
      keyword: 'verso',
      rightContext: 'é mais caseiro',
      source: `${SONG_DATA.artist} - ${SONG_DATA.title}`
    }
  ],
  'saudades': [
    {
      leftContext: 'A mansidão da campanha traz',
      keyword: 'saudades',
      rightContext: 'feito açoite',
      source: `${SONG_DATA.artist} - ${SONG_DATA.title}`
    }
  ],
  'campo': [
    {
      leftContext: 'Daí um verso de',
      keyword: 'campo',
      rightContext: 'se chegou da campereada',
      source: `${SONG_DATA.artist} - ${SONG_DATA.title}`
    }
  ],
  'galpão': [
    {
      leftContext: 'E uma saudade redomona pelos cantos do',
      keyword: 'galpão',
      rightContext: '',
      source: `${SONG_DATA.artist} - ${SONG_DATA.title}`
    }
  ]
};

const getMockKWICData = (word: string) => {
  return kwicData[word.toLowerCase()] || [
    {
      leftContext: 'Contexto da palavra',
      keyword: word,
      rightContext: 'na canção',
      source: `${SONG_DATA.artist} - ${SONG_DATA.title}`
    }
  ];
};

export const SigmaSemanticNetwork: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [viewLevel, setViewLevel] = useState<ViewLevel>('universe');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { level: 'universe', label: 'Universo' }
  ]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [kwicModalOpen, setKwicModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  const allCategories = SEMANTIC_DOMAINS.map(d => d.name);
  const [filters, setFilters] = useState<FilterState>({
    minFrequency: 1,
    prosody: ['positive', 'neutral', 'negative'],
    categories: allCategories,
    searchQuery: '',
  });

  // Filter words based on active filters
  const shouldShowWord = useCallback((wordData: any, domainName: string) => {
    // Frequency filter
    if (wordData.frequency < filters.minFrequency) return false;
    
    // Category filter
    if (!filters.categories.includes(domainName)) return false;
    
    // Prosody filter
    const prosodyMap = { 'Positiva': 'positive', 'Neutra': 'neutral', 'Negativa': 'negative' };
    if (!filters.prosody.includes(prosodyMap[wordData.prosody] as any)) return false;
    
    // Search filter
    if (filters.searchQuery && !wordData.word.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  }, [filters]);

  // Build Universe view
  const buildUniverseView = (graph: any) => {
    console.log('🌌 Construindo visualização Universo...');
    graph.clear();

    // Central song node (dourado com glow)
    graph.addNode('song', {
      label: SONG_DATA.title,
      x: 0,
      y: 0,
      size: 30,
      color: '#f0b500',
    });

    // Add all words from all domains in orbit (SEM EDGES)
    let wordIndex = 0;
    let visibleWords = 0;
    
    SEMANTIC_DOMAINS.forEach((domain) => {
      domain.words.forEach((wordData) => {
        if (!shouldShowWord(wordData, domain.name)) {
          wordIndex++;
          return;
        }

        const totalVisibleWords = SEMANTIC_DOMAINS.reduce((acc, d) => {
          return acc + d.words.filter(w => shouldShowWord(w, d.name)).length;
        }, 0);
        
        const angle = (visibleWords / totalVisibleWords) * Math.PI * 2;
        const radius = 180 + (Math.random() * 60 - 30);
        
        graph.addNode(wordData.word, {
          label: wordData.word,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: 8 + wordData.frequency / 3,
          color: domain.color,
          domain: domain.id,
          domainName: domain.name,
          frequency: wordData.frequency,
          prosody: wordData.prosody,
          significance: wordData.significance,
          strength: wordData.strength,
        });

        visibleWords++;
        wordIndex++;
      });
    });

    console.log(`✅ Universo construído com ${graph.order} nós (${visibleWords} visíveis)`);
  };

  // Build Galaxy view
  const buildGalaxyView = (graph: any) => {
    console.log('🌟 Construindo visualização Galáxia...');
    graph.clear();

    SEMANTIC_DOMAINS.forEach((domain, index) => {
      const angle = (index / SEMANTIC_DOMAINS.length) * Math.PI * 2;
      const radius = 200;

      graph.addNode(domain.id, {
        label: domain.name,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 25 + domain.words.length,
        color: domain.color,
      });
    });

    for (let i = 0; i < SEMANTIC_DOMAINS.length - 1; i++) {
      graph.addEdge(SEMANTIC_DOMAINS[i].id, SEMANTIC_DOMAINS[i + 1].id, {
        size: 0.5,
        color: '#666666',
      });
    }

    console.log(`✅ Galáxia construída com ${graph.order} domínios`);
  };

  // Build Constellation view
  const buildConstellationView = (graph: any, domainId: string) => {
    console.log(`⭐ Construindo visualização Constelação: ${domainId}...`);
    graph.clear();

    const domain = SEMANTIC_DOMAINS.find(d => d.id === domainId);
    if (!domain) return;

    graph.addNode(domain.id, {
      label: domain.name,
      x: 0,
      y: 0,
      size: 40,
      color: domain.color,
    });

    const visibleWords = domain.words.filter(w => shouldShowWord(w, domain.name));
    
    visibleWords.forEach((wordData, index) => {
      const angle = (index / visibleWords.length) * Math.PI * 2;
      const radius = 80 + wordData.strength * 100;

      graph.addNode(wordData.word, {
        label: wordData.word,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 12 + wordData.frequency / 5,
        color: domain.color,
        domainName: domain.name,
        frequency: wordData.frequency,
        strength: wordData.strength,
        prosody: wordData.prosody,
        significance: wordData.significance,
      });

      graph.addEdge(domain.id, wordData.word, {
        size: 1.5,
        color: domain.color + '60',
      });
    });

    console.log(`✅ Constelação construída com ${graph.order} nós`);
  };

  // Initialize Sigma with populated graph
  useEffect(() => {
    if (!containerRef.current) {
      console.error('❌ Container ref não encontrado!');
      return;
    }

    console.log('🚀 Inicializando Sigma.js...');
    
    // Create graph
    const graph: any = new Graph();
    graphRef.current = graph;

    // Populate initial view (Universe)
    buildUniverseView(graph);

    // Create Sigma instance
    try {
      const sigma = new Sigma(graph, containerRef.current, {
        allowInvalidContainer: true,
        renderEdgeLabels: false,
        defaultNodeColor: '#999',
        defaultEdgeColor: '#333',
        labelFont: 'Inter, sans-serif',
        labelSize: 14,
        labelWeight: '600',
        labelColor: { color: '#FFFFFF' },
        enableEdgeEvents: false,
      });

      sigmaRef.current = sigma;

      // Hover handlers
      sigma.on('enterNode', ({ node }) => {
        setHoveredNode(node);
        setIsPaused(true);
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
        }
      });

      sigma.on('leaveNode', () => {
        setHoveredNode(null);
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
        }
        pauseTimeoutRef.current = setTimeout(() => {
          setIsPaused(false);
        }, 2000);
      });

      // Event handlers
      sigma.on('clickNode', ({ node }) => {
        if (viewLevel === 'universe' && node === 'song') {
          console.log('🔄 Navegando para Galáxia - Domínios Semânticos');
          setViewLevel('galaxy');
          setBreadcrumbs([
            { level: 'universe', label: 'Universo' },
            { level: 'galaxy', label: 'Galáxia' }
          ]);
        } else if (viewLevel === 'galaxy') {
          const domain = SEMANTIC_DOMAINS.find(d => d.id === node);
          if (domain) {
            console.log(`🔄 Navegando para Constelação: ${node}`);
            setSelectedDomain(node);
            setViewLevel('constellation');
            setBreadcrumbs([
              { level: 'universe', label: 'Universo' },
              { level: 'galaxy', label: 'Galáxia' },
              { level: 'constellation', label: domain.name, domainId: node }
            ]);
          }
        } else if (viewLevel === 'constellation' && node !== selectedDomain) {
          console.log(`📝 Palavra selecionada: ${node}`);
          setSelectedWord(node);
          setKwicModalOpen(true);
        } else if (viewLevel === 'universe' && node !== 'song') {
          console.log(`📝 Palavra selecionada: ${node}`);
          setSelectedWord(node);
          setKwicModalOpen(true);
        }
      });

      console.log('✅ Sigma inicializado com sucesso!');

      return () => {
        console.log('🧹 Limpando instância Sigma...');
        sigma.kill();
      };
    } catch (error) {
      console.error('❌ Erro ao inicializar Sigma:', error);
    }
  }, []);

  // Update view when level changes
  useEffect(() => {
    const graph = graphRef.current;
    const sigma = sigmaRef.current;
    
    if (!graph || !sigma) return;

    switch (viewLevel) {
      case 'universe':
        buildUniverseView(graph);
        break;
      case 'galaxy':
        buildGalaxyView(graph);
        break;
      case 'constellation':
        if (selectedDomain) {
          buildConstellationView(graph, selectedDomain);
        }
        break;
    }

    sigma.refresh();
  }, [viewLevel, selectedDomain]);

  // Navigation handlers
  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    setViewLevel(item.level);
    if (item.level === 'constellation' && item.domainId) {
      setSelectedDomain(item.domainId);
    }
    const index = breadcrumbs.findIndex(b => b.level === item.level);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleBack = () => {
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      const lastItem = newBreadcrumbs[newBreadcrumbs.length - 1];
      setBreadcrumbs(newBreadcrumbs);
      setViewLevel(lastItem.level);
      if (lastItem.domainId) {
        setSelectedDomain(lastItem.domainId);
      }
    }
  };

  const handleZoomIn = useCallback(() => {
    const camera = sigmaRef.current?.getCamera();
    if (camera) {
      camera.animatedZoom({ duration: 300 });
      setZoomLevel(prev => Math.min(200, prev + 10));
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const camera = sigmaRef.current?.getCamera();
    if (camera) {
      camera.animatedUnzoom({ duration: 300 });
      setZoomLevel(prev => Math.max(50, prev - 10));
    }
  }, []);

  const handleResetView = useCallback(() => {
    const camera = sigmaRef.current?.getCamera();
    if (camera) {
      camera.animatedReset({ duration: 500 });
      setZoomLevel(100);
    }
  }, []);

  const handleFitToScreen = useCallback(() => {
    const camera = sigmaRef.current?.getCamera();
    if (camera) {
      camera.animatedReset({ duration: 500 });
      setZoomLevel(100);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    const graph = graphRef.current;
    const sigma = sigmaRef.current;
    if (!graph || !sigma) return;

    switch (viewLevel) {
      case 'universe':
        buildUniverseView(graph);
        break;
      case 'galaxy':
        buildGalaxyView(graph);
        break;
      case 'constellation':
        if (selectedDomain) {
          buildConstellationView(graph, selectedDomain);
        }
        break;
    }
    sigma.refresh();
  }, [viewLevel, selectedDomain]);

  const handleZoomChange = useCallback((value: number) => {
    const camera = sigmaRef.current?.getCamera();
    if (camera) {
      const ratio = value / zoomLevel;
      camera.animatedZoom({ factor: ratio, duration: 300 });
      setZoomLevel(value);
    }
  }, [zoomLevel]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current?.parentElement;
    if (!document.fullscreenElement && container) {
      container.requestFullscreen();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  return (
    <div className="relative w-full h-[800px] rounded-xl overflow-hidden border border-border" style={{ background: 'radial-gradient(circle at center, #161622 0%, #0a0a15 100%)', minHeight: '800px' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-[#2d2d2d]/80 backdrop-blur-md border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {breadcrumbs.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
            
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={item.level}>
                  {index > 0 && <span className="text-muted-foreground">/</span>}
                  <button
                    onClick={() => handleBreadcrumbClick(item)}
                    className={`hover:text-primary transition-colors ${
                      index === breadcrumbs.length - 1
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {SONG_DATA.artist} - {SONG_DATA.title}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        filters={filters}
        onFilterChange={setFilters}
        categories={allCategories}
      />

      {/* Sigma Container with Glow Effect */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ 
          width: '100%', 
          height: '100%',
          filter: 'drop-shadow(0 0 40px rgba(240, 181, 0, 0.2))'
        }}
      />

      {/* Vertical Zoom Controls */}
      <VerticalZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
        onFit={handleFitToScreen}
        onRefresh={handleRefresh}
        onFullscreen={handleFullscreen}
        onPauseToggle={togglePause}
        isPaused={isPaused}
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
      />

      {/* KWIC Modal */}
      {selectedWord && (
        <KWICModal
          word={selectedWord}
          open={kwicModalOpen}
          onOpenChange={setKwicModalOpen}
          data={getMockKWICData(selectedWord)}
        />
      )}

      {/* CSS for glowing central node */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            filter: drop-shadow(0 0 20px #f0b500) drop-shadow(0 0 40px #f0b500);
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 30px #f0b500) drop-shadow(0 0 60px #f0b500);
            transform: scale(1.05);
          }
        }

        @keyframes shimmer {
          0% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.5;
          }
        }

        canvas {
          animation: ${isPaused ? 'none' : 'shimmer 3s ease-in-out infinite'};
        }
      `}</style>
    </div>
  );
};