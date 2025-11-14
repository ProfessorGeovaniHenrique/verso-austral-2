import React, { useEffect, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Home, ZoomIn, ZoomOut } from 'lucide-react';
import { KWICModal } from './KWICModal';

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
      { word: 'tarumã', frequency: 15, strength: 0.95 },
      { word: 'sombra', frequency: 13, strength: 0.92 },
      { word: 'várzea', frequency: 12, strength: 0.90 },
      { word: 'horizonte', frequency: 10, strength: 0.85 },
      { word: 'campo', frequency: 14, strength: 0.93 },
      { word: 'coxilha', frequency: 11, strength: 0.87 },
      { word: 'campanha', frequency: 9, strength: 0.82 },
      { word: 'sol', frequency: 10, strength: 0.84 },
      { word: 'primavera', frequency: 8, strength: 0.78 }
    ]
  },
  {
    id: 'culture',
    name: 'Cultura Gaúcha',
    color: '#8B4513',
    words: [
      { word: 'campereada', frequency: 11, strength: 0.88 },
      { word: 'gateada', frequency: 10, strength: 0.86 },
      { word: 'ramada', frequency: 9, strength: 0.82 },
      { word: 'querência', frequency: 12, strength: 0.90 },
      { word: 'galpão', frequency: 11, strength: 0.87 },
      { word: 'mate', frequency: 10, strength: 0.85 },
      { word: 'arreios', frequency: 8, strength: 0.80 },
      { word: 'esporas', frequency: 8, strength: 0.79 },
      { word: 'cuia', frequency: 9, strength: 0.83 },
      { word: 'bomba', frequency: 8, strength: 0.78 },
      { word: 'tropa', frequency: 9, strength: 0.81 }
    ]
  },
  {
    id: 'temporal',
    name: 'Tempo',
    color: '#4682B4',
    words: [
      { word: 'madrugada', frequency: 10, strength: 0.86 },
      { word: 'manhãs', frequency: 9, strength: 0.83 },
      { word: 'noite', frequency: 10, strength: 0.85 },
      { word: 'tarde', frequency: 11, strength: 0.88 },
      { word: 'aurora', frequency: 8, strength: 0.80 }
    ]
  },
  {
    id: 'emotion',
    name: 'Emoção',
    color: '#CD853F',
    words: [
      { word: 'saudades', frequency: 12, strength: 0.91 },
      { word: 'silêncio', frequency: 9, strength: 0.84 },
      { word: 'sonhos', frequency: 11, strength: 0.88 },
      { word: 'prenda', frequency: 10, strength: 0.86 },
      { word: 'verso', frequency: 13, strength: 0.92 }
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

  const [viewLevel, setViewLevel] = useState<ViewLevel>('universe');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { level: 'universe', label: 'Universo' }
  ]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [kwicModalOpen, setKwicModalOpen] = useState(false);

  // Build Universe view
  const buildUniverseView = (graph: any) => {
    console.log('🌌 Construindo visualização Universo...');
    graph.clear();

    // Central song node (dourado)
    graph.addNode('song', {
      label: SONG_DATA.title,
      x: 0,
      y: 0,
      size: 25,
      color: '#DAA520',
    });

    // Add all words from all domains in orbit (SEM EDGES)
    let wordIndex = 0;
    const totalWords = SEMANTIC_DOMAINS.reduce((acc, d) => acc + d.words.length, 0);
    
    SEMANTIC_DOMAINS.forEach((domain) => {
      domain.words.forEach((wordData) => {
        const angle = (wordIndex / totalWords) * Math.PI * 2;
        const radius = 180 + (Math.random() * 60 - 30);
        
        graph.addNode(wordData.word, {
          label: wordData.word,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: 8 + wordData.frequency / 2,
          color: domain.color,
          domain: domain.id,
          frequency: wordData.frequency,
        });

        wordIndex++;
      });
    });

    console.log(`✅ Universo construído com ${graph.order} nós`);
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
      size: 35,
      color: domain.color,
    });

    domain.words.forEach((wordData, index) => {
      const angle = (index / domain.words.length) * Math.PI * 2;
      const radius = 80 + wordData.strength * 100;

      graph.addNode(wordData.word, {
        label: wordData.word,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 12 + wordData.frequency / 5,
        color: domain.color,
        frequency: wordData.frequency,
        strength: wordData.strength,
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

  const handleZoomIn = () => {
    const camera = sigmaRef.current?.getCamera();
    if (camera) {
      camera.animatedZoom({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    const camera = sigmaRef.current?.getCamera();
    if (camera) {
      camera.animatedUnzoom({ duration: 300 });
    }
  };

  const handleResetView = () => {
    const camera = sigmaRef.current?.getCamera();
    if (camera) {
      camera.animatedReset({ duration: 500 });
    }
  };

  return (
    <div className="relative w-full h-[800px] rounded-xl overflow-hidden border border-border" style={{ background: '#0F0F23', minHeight: '800px' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4">
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

      {/* Sigma Container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Zoom Controls */}
      <div className="absolute bottom-5 right-5 z-10 flex flex-col gap-2 bg-background/90 backdrop-blur-md border border-border rounded-xl p-2 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetView}
          className="h-8 w-8"
          title="Resetar visualização"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          className="h-8 w-8"
          title="Aumentar zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          className="h-8 w-8"
          title="Diminuir zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* KWIC Modal */}
      {selectedWord && (
        <KWICModal
          word={selectedWord}
          open={kwicModalOpen}
          onOpenChange={setKwicModalOpen}
          data={getMockKWICData(selectedWord)}
        />
      )}
    </div>
  );
};