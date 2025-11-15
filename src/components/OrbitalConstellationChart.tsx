import { useEffect, useRef, useState, useCallback } from 'react';
import Sigma from 'sigma';
import Graph from 'graphology';
import { SpaceNavigationConsole } from './SpaceNavigationConsole';
import { RightControlPanel } from './RightControlPanel';
import { VerticalZoomControls } from './VerticalZoomControls';
import { OrbitalRings } from './OrbitalRings';
import { OrbitalSlider } from './OrbitalSlider';
import { FilterPanel } from './FilterPanel';
import { drawPlanetNode, drawPlanetNodeHover } from '@/lib/planetRenderer';

type NavigationLevel = 'universe' | 'galaxy';

interface OrbitalConstellationChartProps {
  onWordClick?: (word: string) => void;
  dominiosData: Array<{
    dominio: string;
    riquezaLexical: number;
    ocorrencias: number;
    percentual: number;
    frequenciaNormalizada: number;
    percentualTematico: number;
    comparacaoCorpus: 'super-representado' | 'equilibrado' | 'sub-representado';
    diferencaCorpus: number;
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
  
  // Estados para filtros (FASE C)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    minFrequency: 0,
    prosody: [] as string[],
    domains: [] as string[],
    searchQuery: ''
  });

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
    
    // NÓ CENTRAL VISÍVEL com nome da canção e autor
    graph.addNode('center', { 
      x: 0.5, 
      y: 0.5, 
      size: 40,
      label: 'Quando o verso\nvem pras casa\nLuiz Marenco',
      color: '#FFD700',
      hidden: false
    });
    
    // TODAS as palavras do corpus ordenadas por Frequência Normalizada (%)
    let allWords = [...palavrasChaveData].sort((a, b) => b.frequenciaNormalizada - a.frequenciaNormalizada);
    
    // APLICAR FILTROS (FASE C)
    if (activeFilters.minFrequency > 0) {
      allWords = allWords.filter(w => w.frequenciaNormalizada >= activeFilters.minFrequency);
    }
    if (activeFilters.searchQuery) {
      const query = activeFilters.searchQuery.toLowerCase();
      allWords = allWords.filter(w => w.palavra.toLowerCase().includes(query));
    }
    if (activeFilters.prosody.length > 0) {
      allWords = allWords.filter(w => {
        const wordData = getWordDomain(w.palavra);
        const prosody = wordData.cor === 'hsl(142, 71%, 45%)' ? 'positiva' : 
                       wordData.cor === 'hsl(0, 84%, 60%)' ? 'negativa' : 'neutra';
        return activeFilters.prosody.includes(prosody);
      });
    }
    if (activeFilters.domains.length > 0) {
      allWords = allWords.filter(w => {
        for (const dominio of dominiosData) {
          if (dominio.palavras.includes(w.palavra) && activeFilters.domains.includes(dominio.dominio)) {
            return true;
          }
        }
        return false;
      });
    }
    
    // Calcular min/max Frequência Normalizada para normalização
    const minFreq = Math.min(...allWords.map(w => w.frequenciaNormalizada));
    const maxFreq = Math.max(...allWords.map(w => w.frequenciaNormalizada));
    
    // Agrupar palavras por faixa de relevância (0-20%, 20-40%, 40-60%, 60-80%, 80-100%)
    const orbitGroups: { [key: number]: Array<typeof allWords[0]> } = {
      0: [], // 80-100% (mais interna)
      1: [], // 60-80%
      2: [], // 40-60%
      3: [], // 20-40%
      4: []  // 0-20% (mais externa)
    };
    
    allWords.forEach(wordData => {
      const relevancePercent = ((wordData.frequenciaNormalizada - minFreq) / (maxFreq - minFreq)) * 100;
      
      if (relevancePercent >= 80) orbitGroups[0].push(wordData);
      else if (relevancePercent >= 60) orbitGroups[1].push(wordData);
      else if (relevancePercent >= 40) orbitGroups[2].push(wordData);
      else if (relevancePercent >= 20) orbitGroups[3].push(wordData);
      else orbitGroups[4].push(wordData);
    });
    
    // DISTRIBUIÇÃO ESPIRAL "VIA LÁCTEA" (FASE A)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // 137.5° (Golden Angle)
    const spiralTightness = 0.15;
    
    Object.keys(orbitGroups).forEach((orbitKey: string) => {
      const orbitIdx = parseInt(orbitKey);
      const baseOrbitRadius = 0.15 + (orbitIdx * 0.08); // Raio base da órbita
      const words = orbitGroups[orbitIdx];
      
      if (words.length === 0) return;
      
      words.forEach((wordData, idx) => {
        // Distribuição espiral com golden angle + variação angular extra
        const angleVariation = (idx % 7) * 0.3; // Variação extra para criar dispersão
        const angle = goldenAngle * idx + (orbitIdx * Math.PI / 2.5) + angleVariation;
        
        // Variação radial para criar "braços" da galáxia (amplificada)
        const armVariation = Math.sin(angle * 3) * 0.05; // 3 braços galácticos pronunciados
        const secondaryArm = Math.cos(angle * 5) * 0.025; // Braços secundários
        const finalRadius = baseOrbitRadius + armVariation + secondaryArm;
        
        const x = 0.5 + Math.cos(angle) * finalRadius;
        const y = 0.5 + Math.sin(angle) * finalRadius;
        
        // Tamanho baseado em Frequência Normalizada (normalizado entre 8-25)
        const normalizedSize = 8 + ((wordData.frequenciaNormalizada - minFreq) / (maxFreq - minFreq)) * 17;
        
        // Calcular percentual de relevância
        const relevancePercent = ((wordData.frequenciaNormalizada - minFreq) / (maxFreq - minFreq)) * 100;
        
        // Busca cor do domínio
        const { cor } = getWordDomain(wordData.palavra);
        
        graph.addNode(wordData.palavra, {
          x,
          y,
          size: normalizedSize,
          label: wordData.palavra,
          color: cor,
          ll: wordData.ll,
          mi: wordData.mi,
          frequenciaBruta: wordData.frequenciaBruta,
          frequenciaNormalizada: wordData.frequenciaNormalizada,
          significancia: wordData.significancia,
          hasKWIC: kwicDataMap[wordData.palavra]?.length > 0,
          orbitRadius: finalRadius,
          orbitAngle: angle,
          relevancePercent,
          orbitGroup: orbitIdx,
          associationStrength: Math.round((wordData.mi / 10) * 100),
          // Metadata para animação orbital (FASE E)
          initialAngle: angle,
          orbitIndex: orbitIdx
        });
      });
    });
    
    console.log('✅ Graph created with', graph.order, 'nodes');
    return graph;
  }, [palavrasChaveData, getWordDomain, kwicDataMap, activeFilters, dominiosData]);

  // Constrói visualização de galáxia (domínios orbitando) - DADOS REAIS
  const buildGalaxyView = useCallback(() => {
    const graph: any = new Graph();
    
    // Nó central (Sol Gaúcho)
    graph.addNode('center', { 
      x: 0.5, 
      y: 0.5, 
      size: 45, 
      label: '☀️ UNIVERSO\nGAÚCHO', 
      color: '#FFD700'
    });
    
    // Filtrar domínios temáticos (excluir Palavras Funcionais)
    const tematicDomains = dominiosData.filter(d => d.dominio !== "Palavras Funcionais");
    
    // Ordenar por relevância temática (mais relevante = mais próximo do centro)
    const sortedByRelevance = [...tematicDomains].sort((a, b) => 
      b.percentualTematico - a.percentualTematico
    );
    
    sortedByRelevance.forEach((domain, idx) => {
      // Raio baseado em relevância (mais relevante = mais próximo)
      // Raio varia de 0.15 (centro) a 0.35 (periferia)
      const baseRadius = 0.15 + (idx / (tematicDomains.length - 1)) * 0.20;
      
      // Ângulo distribuído uniformemente
      const angle = (idx / tematicDomains.length) * 2 * Math.PI;
      
      const x = 0.5 + Math.cos(angle) * baseRadius;
      const y = 0.5 + Math.sin(angle) * baseRadius;
      
      // Tamanho = Riqueza Lexical (normalizado 20-50)
      const minRiqueza = Math.min(...tematicDomains.map(d => d.riquezaLexical));
      const maxRiqueza = Math.max(...tematicDomains.map(d => d.riquezaLexical));
      const normalizedSize = 20 + ((domain.riquezaLexical - minRiqueza) / (maxRiqueza - minRiqueza)) * 30;
      
      // Número de anéis = Peso Textual (0-3 anéis)
      const numRings = Math.ceil((domain.frequenciaNormalizada / Math.max(...tematicDomains.map(d => d.frequenciaNormalizada))) * 3);
      
      // Ícone de comparação
      let comparisonIcon = '';
      if (domain.comparacaoCorpus === 'super-representado') {
        comparisonIcon = '⬆️';
      } else if (domain.comparacaoCorpus === 'sub-representado') {
        comparisonIcon = '⬇️';
      } else {
        comparisonIcon = '➖';
      }
      
      graph.addNode(domain.dominio, {
        x,
        y,
        size: normalizedSize,
        label: `${comparisonIcon} ${domain.dominio}`,
        color: domain.cor,
        
        // Metadados para tooltip
        riquezaLexical: domain.riquezaLexical,
        pesoTextual: domain.frequenciaNormalizada,
        percentualTematico: domain.percentualTematico,
        comparacaoCorpus: domain.comparacaoCorpus,
        diferencaCorpus: domain.diferencaCorpus,
        numRings: numRings,
        words: domain.palavras
      });
    });
    
    return graph;
  }, [dominiosData]);


  // Navega entre níveis (universe, galaxy)
  const navigateToLevel = useCallback((targetLevel: NavigationLevel) => {
    if (!sigmaRef.current || !graphRef.current) return;
    
    console.log('Navigating to level:', targetLevel);
    
    // Atualiza refs (FASE 1: evita stale closure)
    levelRef.current = targetLevel;
    
    setLevel(targetLevel);
    
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
      } else {
        const newGraph = buildGalaxyView();
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
  }, [buildUniverseView, buildGalaxyView]);

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
      maxCameraRatio: 2.5,
      
      // ✨ NODE REDUCER para aplicar cores dos domínios
      nodeReducer: (node, attrs) => {
        // Copiar todos os atributos do nó
        const result = { ...attrs };
        
        // Garantir que a cor definida no atributo seja usada
        if (attrs.color) {
          result.color = attrs.color;
        }
        
        // Destaque especial para nó central
        if (node === 'center') {
          result.color = '#FFD700';
          result.size = 40;
        }
        
        return result;
      }
    });
    
    sigmaRef.current = sigma;
    
      // Set initial camera position
      sigma.getCamera().setState({ x: 0.5, y: 0.5, ratio: 0.8 });

      // Forçar refresh para aplicar cores
      sigma.refresh();

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
      
      // Cursor pointer para nós clicáveis
      if (node === 'center') {
        sigma.getContainer().style.cursor = 'pointer';
      } else {
        sigma.getContainer().style.cursor = 'pointer';
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
      
      // Clique em domínio no nível galaxy: abrir modal KWIC com primeira palavra do domínio
      if (currentLevel === 'galaxy' && node !== 'center') {
        const nodeData = graph.getNodeAttributes(node);
        const words = nodeData.words || [];
        if (words.length > 0 && onWordClick) {
          // Abre KWIC da primeira palavra do domínio
          onWordClick(words[0]);
        }
        return;
      }
      
      // Clique em palavra no nível universe: abrir modal KWIC
      if (currentLevel === 'universe' && node !== 'center') {
        const kwicData = kwicDataMap[node];
        if (kwicData && kwicData.length > 0) {
          onWordClick?.(node);
        } else {
          console.warn(`Nenhum dado KWIC encontrado para: ${node}`);
        }
        return;
      }
      
      // Clique no centro no nível galaxy: voltar para universe
      if (currentLevel === 'galaxy' && node === 'center') {
        navigateToLevel('universe');
        return;
      }
    };
    
    // Drag handlers removidos (não há mais nível stellar)
    const downNodeHandler = () => {};
    const handleMouseMove = () => {};
    const handleMouseUp = () => {};

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
  }, [navigateToLevel, onWordClick, kwicDataMap]);

  // ANIMAÇÃO ORBITAL CONTÍNUA (FASE E)
  useEffect(() => {
    if (!sigmaRef.current || !graphRef.current || isPaused || level !== 'universe') return;
    
    let animationId: number;
    let lastTime = Date.now();
    
    const animate = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      const graph = graphRef.current;
      if (!graph) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      
      // Atualizar posição de cada nó (exceto o centro)
      graph.forEachNode((node: string, attrs: any) => {
        if (node === 'center' || !attrs.initialAngle) return;
        
        // Velocidade inversamente proporcional ao índice da órbita (órbitas internas mais rápidas)
        const speed = 0.00003 * (6 - attrs.orbitIndex);
        attrs.initialAngle += speed * deltaTime;
        
        // Recalcular posição
        const x = 0.5 + Math.cos(attrs.initialAngle) * attrs.orbitRadius;
        const y = 0.5 + Math.sin(attrs.initialAngle) * attrs.orbitRadius;
        
        graph.setNodeAttribute(node, 'x', x);
        graph.setNodeAttribute(node, 'y', y);
      });
      
      sigmaRef.current?.refresh();
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPaused, level]);

  // ============= AUTO-REBUILD ON FILTER CHANGE (FASE 3) =============
  useEffect(() => {
    if (!sigmaRef.current || !graphRef.current) return;
    
    if (level === 'universe') {
      const newGraph = buildUniverseView();
      graphRef.current.clear();
      graphRef.current.import(newGraph.export());
      sigmaRef.current.refresh();
    } else if (level === 'galaxy') {
      const newGraph = buildGalaxyView();
      graphRef.current.clear();
      graphRef.current.import(newGraph.export());
      sigmaRef.current.refresh();
    }
  }, [activeFilters, level, selectedSystem, buildUniverseView, buildGalaxyView]);

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
    <div 
      className="relative bg-gradient-to-b from-black via-slate-900 to-black overflow-hidden"
      style={{ 
        height: '100vh',
        width: '100vw',
        paddingRight: '530px'
      }}
    >
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


      {/* Right Control Panel - Painel Lateral Fixo */}
      <RightControlPanel
        hoveredNode={hoveredNode}
        level={level}
        showGalaxyLegend={level === 'galaxy'}
      />

      {/* Filter Panel (FASE 1) */}
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

      {/* Navigation Console (FASE 2) */}
      <SpaceNavigationConsole
        level={level}
        onNavigate={navigateToLevel}
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

      {/* Vertical Zoom Controls */}
      <VerticalZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
        onFit={() => sigmaRef.current?.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1 })}
        onRefresh={() => {
          if (level === 'universe') buildUniverseView();
          else if (level === 'galaxy') buildGalaxyView();
        }}
        isPaused={isPaused}
        onPauseToggle={() => setIsPaused(!isPaused)}
      />
    </div>
  );
};
