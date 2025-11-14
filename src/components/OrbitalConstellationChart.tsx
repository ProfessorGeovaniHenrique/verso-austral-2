import { useEffect, useRef, useState, useCallback } from 'react';
import Sigma from 'sigma';
import Graph from 'graphology';
import { SpaceNavigationConsole } from './SpaceNavigationConsole';
import { SpaceHUDTooltip } from './SpaceHUDTooltip';
import { VerticalZoomControls } from './VerticalZoomControls';
import { OrbitalRings } from './OrbitalRings';
import { OrbitalSlider } from './OrbitalSlider';

type NavigationLevel = 'universe' | 'galaxy' | 'stellar';

interface OrbitalConstellationChartProps {
  onWordClick?: (word: string) => void;
  dominiosData: Array<{
    dominio: string;
    ocorrencias: number;
    percentual: number;
    palavras: string[];
    cor: string;
    corTexto: string;
  }>;
  palavrasChaveData: Array<{
    palavra: string;
    ll: number;
    mi: number;
    frequenciaBruta: number;
    frequenciaNormalizada: number;
    significancia: string;
  }>;
  kwicDataMap: Record<string, Array<{
    leftContext: string;
    keyword: string;
    rightContext: string;
    source: string;
  }>>;
}

export const OrbitalConstellationChart = ({ onWordClick, dominiosData, palavrasChaveData, kwicDataMap }: OrbitalConstellationChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<any>(null);
  
  // Refs para evitar stale closure nos event handlers (FASE 1)
  const levelRef = useRef<NavigationLevel>('universe');
  const selectedSystemRef = useRef<string | null>(null);
  
  const [level, setLevel] = useState<NavigationLevel>('universe');
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  
  // Estados para drag circular (FASE 2)
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // Função auxiliar para mapear domínio de uma palavra
  const getWordDomain = useCallback((palavra: string): { cor: string; corTexto: string } => {
    for (const dominio of dominiosData) {
      if (dominio.palavras.includes(palavra)) {
        return { cor: dominio.cor, corTexto: dominio.corTexto };
      }
    }
    // Cor padrão se não encontrar domínio
    return { cor: 'hsl(200, 50%, 50%)', corTexto: 'hsl(200, 90%, 80%)' };
  }, [dominiosData]);

  // Constrói visualização do universo (palavras orbitando o centro) - DADOS REAIS
  const buildUniverseView = useCallback(() => {
    console.log('🚀 Building Universe View');
    console.log('📊 palavrasChaveData:', palavrasChaveData.length, 'palavras');
    
    const graph: any = new Graph();
    graph.addNode('center', { x: 0.5, y: 0.5, size: 0, label: '', color: '#000', hidden: true });
    
    // Seleciona top 12 palavras por Log-Likelihood
    const topWords = [...palavrasChaveData]
      .sort((a, b) => b.ll - a.ll)
      .slice(0, 12);
    
    // Define 3 órbitas com raios normalizados (0-1)
    const orbits = [0.12, 0.20, 0.28];
    
    topWords.forEach((wordData, idx) => {
      const orbitIdx = Math.floor(idx / 4); // 4 palavras por órbita
      const orbit = orbits[orbitIdx] || 0.28;
      const angle = (idx % 4) * (Math.PI / 2) + (Math.PI / 4); // Distribui 4 palavras por órbita
      
      const x = 0.5 + Math.cos(angle) * orbit;
      const y = 0.5 + Math.sin(angle) * orbit;
      
      // Tamanho baseado em LL (normalizado entre 15-30)
      const minLL = Math.min(...topWords.map(w => w.ll));
      const maxLL = Math.max(...topWords.map(w => w.ll));
      const normalizedSize = 15 + ((wordData.ll - minLL) / (maxLL - minLL)) * 15;
      
      // Busca cor do domínio
      const { cor } = getWordDomain(wordData.palavra);
      
      graph.addNode(wordData.palavra, {
        x,
        y,
        size: normalizedSize,
        label: wordData.palavra,
        color: cor,
        freq: wordData.frequenciaBruta,
        normalized: wordData.frequenciaNormalizada,
        logLikelihood: wordData.ll,
        miScore: wordData.mi,
        orbit,
        associationStrength: Math.round((wordData.mi / 10) * 100), // MI normalizado para %
      });
    });
    
    return graph;
  }, [palavrasChaveData, getWordDomain]);

  // Constrói visualização de galáxia (domínios orbitando) - DADOS REAIS
  const buildGalaxyView = useCallback(() => {
    const graph: any = new Graph();
    graph.addNode('center', { x: 0.5, y: 0.5, size: 0, label: '', color: '#000', hidden: true });
    
    const radius = 0.25;
    dominiosData.forEach((domain, idx) => {
      const angle = (idx / dominiosData.length) * 2 * Math.PI;
      const x = 0.5 + Math.cos(angle) * radius;
      const y = 0.5 + Math.sin(angle) * radius;
      
      // Tamanho proporcional às ocorrências (normalizado entre 25-45)
      const minOcorrencias = Math.min(...dominiosData.map(d => d.ocorrencias));
      const maxOcorrencias = Math.max(...dominiosData.map(d => d.ocorrencias));
      const normalizedSize = 25 + ((domain.ocorrencias - minOcorrencias) / (maxOcorrencias - minOcorrencias)) * 20;
      
      graph.addNode(domain.dominio, {
        x,
        y,
        size: normalizedSize,
        label: domain.dominio.toUpperCase(),
        color: domain.cor,
        emotion: `${domain.ocorrencias} ocorrências`,
        words: domain.palavras
      });
    });
    
    return graph;
  }, [dominiosData]);

  // Constrói visualização de sistema estelar (palavras do domínio selecionado) - DADOS REAIS
  const buildStellarView = useCallback((systemId: string) => {
    const graph: any = new Graph();
    const system = dominiosData.find(d => d.dominio === systemId);
    if (!system) return graph;
    
    // Nó central (o domínio)
    graph.addNode('center', {
      x: 0.5,
      y: 0.5,
      size: 40,
      label: system.dominio.toUpperCase(),
      color: system.cor,
      type: 'domain'
    });
    
    // Filtrar palavras deste domínio que estão em palavrasChaveData
    const domainWords = palavrasChaveData.filter(word => 
      system.palavras.includes(word.palavra)
    );
    
    // Distribuir palavras em 3 órbitas baseado no MI Score
    const sortedWords = [...domainWords].sort((a, b) => b.mi - a.mi);
    const orbits = [0.10, 0.17, 0.24];
    
    sortedWords.forEach((wordData, idx) => {
      const orbitIdx = Math.floor(idx / Math.ceil(sortedWords.length / 3));
      const orbit = orbits[Math.min(orbitIdx, 2)];
      const wordsInOrbit = sortedWords.filter((_, i) => Math.floor(i / Math.ceil(sortedWords.length / 3)) === orbitIdx);
      const angleStep = (2 * Math.PI) / wordsInOrbit.length;
      const localIdx = wordsInOrbit.indexOf(wordData);
      const angle = localIdx * angleStep;
      
      const x = 0.5 + Math.cos(angle) * orbit;
      const y = 0.5 + Math.sin(angle) * orbit;
      
      // Tamanho baseado em frequência bruta (normalizado entre 18-28)
      const minFreq = Math.min(...sortedWords.map(w => w.frequenciaBruta));
      const maxFreq = Math.max(...sortedWords.map(w => w.frequenciaBruta));
      const normalizedSize = 18 + ((wordData.frequenciaBruta - minFreq) / (maxFreq - minFreq || 1)) * 10;
      
      // Association strength baseado em MI Score (normalizado para %)
      const minMI = Math.min(...sortedWords.map(w => w.mi));
      const maxMI = Math.max(...sortedWords.map(w => w.mi));
      const associationStrength = Math.round(50 + ((wordData.mi - minMI) / (maxMI - minMI || 1)) * 50);
      
      graph.addNode(wordData.palavra, {
        x,
        y,
        size: normalizedSize,
        label: wordData.palavra,
        color: system.corTexto,
        freq: wordData.frequenciaBruta,
        normalized: wordData.frequenciaNormalizada,
        logLikelihood: wordData.ll,
        miScore: wordData.mi,
        orbit,
        angle,
        associationStrength,
        type: 'word'
      });
    });
    
    console.log('✅ Graph created with', graph.order, 'nodes');
    return graph;
  }, [dominiosData, palavrasChaveData]);

  // Navega entre níveis (universe, galaxy, stellar)
  const navigateToLevel = useCallback((targetLevel: NavigationLevel, systemId?: string) => {
    if (!sigmaRef.current || !graphRef.current) return;
    
    console.log('Navigating to level:', targetLevel, 'System:', systemId);
    
    // Atualiza refs (FASE 1: evita stale closure)
    levelRef.current = targetLevel;
    if (systemId) {
      selectedSystemRef.current = systemId;
    }
    
    setLevel(targetLevel);
    if (systemId) {
      setSelectedSystem(systemId);
    }
    
    // Animação de fade out
    const container = sigmaRef.current.getContainer();
    container.style.transition = 'opacity 0.3s';
    container.style.opacity = '0';
    
    setTimeout(() => {
      if (!graphRef.current) return;
      
      const graph = graphRef.current;
      
      // Reconstrói o grafo baseado no novo nível
      if (targetLevel === 'universe') {
        const newGraph = buildUniverseView();
        graph.clear();
        graph.import(newGraph.export());
      } else if (targetLevel === 'galaxy') {
        const newGraph = buildGalaxyView();
        graph.clear();
        graph.import(newGraph.export());
      } else if (targetLevel === 'stellar' && systemId) {
        const newGraph = buildStellarView(systemId);
        graph.clear();
        graph.import(newGraph.export());
      }
      
      // Animação de fade in + zoom
      if (sigmaRef.current) {
        const container = sigmaRef.current.getContainer();
        container.style.opacity = '1';
        sigmaRef.current.getCamera().animate({ x: 0.5, y: 0.5, ratio: 0.8 }, { duration: 800 });
      }
    }, 300);
  }, [buildUniverseView, buildGalaxyView, buildStellarView]);

  // Inicializar Sigma.js (executa UMA VEZ)
  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log('🎯 Initializing Sigma.js...');
    
    // Store container dimensions
    setContainerRect(containerRef.current.getBoundingClientRect());
    
    const graph = buildUniverseView();
    graphRef.current = graph;
    
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
    
    console.log('✅ Sigma.js initialized successfully');
    
    return () => {
      console.log('🧹 Cleaning up Sigma.js');
      sigma.kill();
    };
  }, []); // SEM DEPENDÊNCIAS - executa apenas uma vez

  // Event handlers (atualiza quando dependências mudam)
  useEffect(() => {
    if (!sigmaRef.current || !graphRef.current) return;
    
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    
    console.log('🔗 Setting up event handlers');
    
    // Event handlers (FASE 1: usar refs para evitar stale closure)
    const enterNodeHandler = ({ node, event }: any) => {
      const currentLevel = levelRef.current;
      const nodeAttrs = graph.getNodeAttributes(node);
      const displayPoint = { x: event.x, y: event.y };
      
      setHoveredNode({ ...nodeAttrs, id: node, level: currentLevel });
      setTooltipPos(displayPoint);
      setIsPaused(true);
      
      // FASE 2: Cursor interativo
      if (currentLevel === 'stellar' && node !== 'center') {
        sigma.getContainer().style.cursor = 'grab';
      }
    };
    
    const leaveNodeHandler = () => {
      setHoveredNode(null);
      setTimeout(() => setIsPaused(false), 2000);
      if (!isDragging) {
        sigma.getContainer().style.cursor = 'default';
      }
    };
    
    const clickNodeHandler = ({ node }: any) => {
      const currentLevel = levelRef.current;
      
      console.log('Node clicked:', node, 'Current level:', currentLevel);
      
      // Clique no centro no nível universe: ir para galaxy
      if (currentLevel === 'universe' && node === 'center') {
        navigateToLevel('galaxy');
        return;
      }
      
      // Clique em domínio no nível galaxy: ir para stellar
      if (currentLevel === 'galaxy' && node !== 'center') {
        navigateToLevel('stellar', node);
        return;
      }
      
      // Clique em palavra no nível stellar: abrir modal KWIC com dados reais
      if (currentLevel === 'stellar' && node !== 'center') {
        // Busca dados KWIC reais da palavra
        const kwicData = kwicDataMap[node];
        if (kwicData && kwicData.length > 0) {
          onWordClick?.(node);
        } else {
          console.warn(`Nenhum dado KWIC encontrado para: ${node}`);
        }
        return;
      }
      
      // Clique no centro no nível stellar: voltar para galaxy
      if (currentLevel === 'stellar' && node === 'center') {
        navigateToLevel('galaxy');
        return;
      }
    };
    
    // FASE 2: Implementar drag circular
    const downNodeHandler = ({ node, event }: any) => {
      const currentLevel = levelRef.current;
      if (currentLevel !== 'stellar') return;
      if (node === 'center') return;
      
      setIsDragging(true);
      setDraggedNode(node);
      sigma.getContainer().style.cursor = 'grabbing';
      event.preventSigmaDefault();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !draggedNode || !sigmaRef.current || !graphRef.current) return;
      
      const sigma = sigmaRef.current;
      const graph = graphRef.current;
      
      const nodeX = graph.getNodeAttribute(draggedNode, 'x');
      const nodeY = graph.getNodeAttribute(draggedNode, 'y');
      const centerX = 0.5;
      const centerY = 0.5;
      
      // Calcular distância (raio da órbita)
      const radius = Math.sqrt(
        Math.pow(nodeX - centerX, 2) + 
        Math.pow(nodeY - centerY, 2)
      );
      
      // Converter posição do mouse para coordenadas do grafo
      const containerRect = sigma.getContainer().getBoundingClientRect();
      const graphMousePos = sigma.viewportToGraph({
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top
      });
      
      // Calcular novo ângulo
      const dx = graphMousePos.x - centerX;
      const dy = graphMousePos.y - centerY;
      const angle = Math.atan2(dy, dx);
      
      // Nova posição mantendo o raio
      const newX = centerX + Math.cos(angle) * radius;
      const newY = centerY + Math.sin(angle) * radius;
      
      graph.setNodeAttribute(draggedNode, 'x', newX);
      graph.setNodeAttribute(draggedNode, 'y', newY);
      graph.setNodeAttribute(draggedNode, 'angle', angle);
    };

    const handleMouseUp = () => {
      if (isDragging && sigmaRef.current) {
        setIsDragging(false);
        setDraggedNode(null);
        sigmaRef.current.getContainer().style.cursor = 'default';
      }
    };

    sigma.on('enterNode', enterNodeHandler);
    sigma.on('leaveNode', leaveNodeHandler);
    sigma.on('clickNode', clickNodeHandler);
    sigma.on('downNode', downNodeHandler);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      sigma.off('enterNode', enterNodeHandler);
      sigma.off('leaveNode', leaveNodeHandler);
      sigma.off('clickNode', clickNodeHandler);
      sigma.off('downNode', downNodeHandler);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [navigateToLevel, isDragging, draggedNode, onWordClick, kwicDataMap]);

  const handleZoomIn = () => {
    if (sigmaRef.current) {
      const camera = sigmaRef.current.getCamera();
      camera.animatedZoom({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (sigmaRef.current) {
      const camera = sigmaRef.current.getCamera();
      camera.animatedUnzoom({ duration: 300 });
    }
  };

  const handleResetView = () => {
    if (sigmaRef.current) {
      sigmaRef.current.getCamera().animate({ x: 0.5, y: 0.5, ratio: 0.8 }, { duration: 500 });
    }
  };
  
  return (
    <div className="relative w-full h-[800px] bg-gradient-to-b from-black via-slate-900 to-black overflow-hidden">
      {/* Starry background effect */}
      <div className="absolute inset-0 opacity-30">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Sigma container */}
      <div ref={containerRef} className="w-full h-full relative z-10" />

      {/* Orbital Rings (visual effect) */}
      {level !== 'universe' && containerRect && (
        <OrbitalRings
          level={level}
          isPaused={isPaused}
          containerWidth={containerRect.width}
          containerHeight={containerRect.height}
        />
      )}

      {/* Orbital Sliders (stellar level only) */}
      {level === 'stellar' && containerRect && graphRef.current && (
        <>
          {graphRef.current.nodes().map((nodeId: string) => {
            if (nodeId === 'center') return null;
            
            const node = graphRef.current.getNodeAttributes(nodeId);
            const centerX = containerRect.width / 2;
            const centerY = containerRect.height / 2;
            
            // Calculate radius and angle from center
            const nodeX = node.x * containerRect.width;
            const nodeY = node.y * containerRect.height;
            const radius = Math.sqrt(Math.pow(nodeX - centerX, 2) + Math.pow(nodeY - centerY, 2));
            const angle = Math.atan2(nodeY - centerY, nodeX - centerX);
            
            return (
              <OrbitalSlider
                key={nodeId}
                radius={radius}
                angle={angle}
                percentage={Math.round((node.associationStrength || 50))}
                color={node.color}
                containerWidth={containerRect.width}
                containerHeight={containerRect.height}
              />
            );
          })}
        </>
      )}

      {/* HUD Tooltip (complete version) */}
      {hoveredNode && containerRect && (
        <SpaceHUDTooltip
          word={hoveredNode}
          position={tooltipPos}
          visible={true}
          containerRect={containerRect}
          level={level}
        />
      )}

      {/* Navigation Console */}
      <SpaceNavigationConsole
        level={level}
        currentSystem={selectedSystem || 'UNIVERSO'}
        currentCoords={selectedSystem ? `Sistema: ${selectedSystem}` : 'Coord: 0.0.0'}
        filters={{
          minFrequency: 0,
          prosody: 'all',
          categories: [],
          searchQuery: ''
        }}
        onNavigate={navigateToLevel}
        onFilterChange={() => {}}
        onReset={() => {}}
      />

      {/* Vertical Zoom Controls */}
      <VerticalZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
        onFit={() => sigmaRef.current?.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1 })}
        onRefresh={() => {
          if (level === 'universe') buildUniverseView();
          else if (level === 'galaxy') buildGalaxyView();
          else if (level === 'stellar' && selectedSystem) buildStellarView(selectedSystem);
        }}
        isPaused={isPaused}
        onPauseToggle={() => setIsPaused(!isPaused)}
      />
    </div>
  );
};
