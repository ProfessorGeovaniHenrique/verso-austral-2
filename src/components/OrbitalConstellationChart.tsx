import { useEffect, useRef, useState, useCallback } from 'react';
import Sigma from 'sigma';
import Graph from 'graphology';
import { SpaceNavigationConsole } from './SpaceNavigationConsole';
import { ControlPanel } from './ControlPanel/ControlPanel';
import { ControlToolbar } from './ControlPanel/ControlToolbar';
import { FloatingControlPanel } from './ControlPanel/FloatingControlPanel';
import { OrbitalRings } from './OrbitalRings';
import { FilterPanel } from './FilterPanel';
import { drawPlanetNode, drawPlanetNodeHover } from '@/lib/planetRenderer';

type NavigationLevel = 'universe' | 'galaxy' | 'stellar-system';
type ConsoleMode = 'docked' | 'minimized' | 'floating';

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
    percentualCorpusNE: number;
    palavras: string[];
    palavrasComFrequencia: Array<{ palavra: string; ocorrencias: number }>;
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
  frequenciaNormalizadaData?: Array<{
    palavra: string;
    frequenciaBruta: number;
    frequenciaNormalizada: number;
    lema: string;
  }>;
}

export const OrbitalConstellationChart = ({ onWordClick, dominiosData, palavrasChaveData, kwicDataMap, frequenciaNormalizadaData }: OrbitalConstellationChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<any>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickedNodeRef = useRef<string | null>(null);
  
  // Refs para evitar stale closure nos event handlers
  const levelRef = useRef<NavigationLevel>('universe');
  const selectedDomainRef = useRef<string | null>(null);
  
  const [level, setLevel] = useState<NavigationLevel>('universe');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  
  // Sistema de estados do Codex
  const [codexState, setCodexState] = useState<'closed' | 'auto-open' | 'pinned'>('closed');
  
  // Estados para drag circular
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  
  // Estados para filtros
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    minFrequency: 0,
    prosody: [] as string[],
    domains: [] as string[],
    searchQuery: ''
  });
  
  // Estados para controle das seções do painel
  const [openSections, setOpenSections] = useState({
    codex: true,
    legend: false,
    future: false
  });
  
  // Estados para modo de janela do console
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>('docked');
  const [floatingPosition, setFloatingPosition] = useState({ x: 100, y: 100 });
  const [floatingSize, setFloatingSize] = useState({ width: 420, height: 600 });

  // Listener para evento da sidebar
  useEffect(() => {
    const handleToggleConsole = () => {
      setConsoleMode(prev => prev === 'minimized' ? 'docked' : 'minimized');
    };
    
    window.addEventListener('toggle-control-console', handleToggleConsole);
    return () => window.removeEventListener('toggle-control-console', handleToggleConsole);
  }, []);

  // Função auxiliar para mapear domínio de uma palavra
  const getWordDomain = useCallback((palavra: string): { cor: string; corTexto: string } => {
    for (const dominio of dominiosData) {
      if (dominio.palavras.some(p => p === palavra)) {
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
          if (dominio.palavras.some(p => p === w.palavra) && activeFilters.domains.includes(dominio.dominio)) {
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
        dominio: domain.dominio,
        
        // Metadados para tooltip e Codex
        riquezaLexical: domain.riquezaLexical,
        ocorrenciasNE: domain.ocorrencias,
        percentual: domain.percentual,
        percentualTematico: domain.percentualTematico,
        comparacaoCorpus: domain.comparacaoCorpus,
        diferencaCorpus: domain.diferencaCorpus,
        percentualCorpusNE: domain.percentualCorpusNE,
        palavrasFrequentes: [...domain.palavrasComFrequencia]
          .sort((a, b) => b.ocorrencias - a.ocorrencias),
        cor: domain.cor,
        numRings: numRings
      });
    });
    
    return graph;
  }, [dominiosData]);

  // Constrói visualização de sistema estelar (palavras de um domínio orbitando)
  const buildStellarSystemView = useCallback((domainName: string) => {
    const graph: any = new Graph();
    
    // Encontrar domínio selecionado
    const domain = dominiosData.find(d => d.dominio === domainName);
    if (!domain) return graph;
    
    // Nó central = Domínio Semântico (Sistema Estelar)
    graph.addNode('stellar-core', {
      x: 0.5,
      y: 0.5,
      size: 50,
      label: `⭐ ${domain.dominio}`,
      color: domain.cor,
      isStellarCore: true,
      dominio: domain.dominio,
      riquezaLexical: domain.riquezaLexical,
      ocorrencias: domain.ocorrencias,
      percentualTematico: domain.percentualTematico,
      comparacaoCorpus: domain.comparacaoCorpus,
      diferencaCorpus: domain.diferencaCorpus
    });
    
    // Palavras do domínio como planetas orbitantes
    const palavrasComFreq = domain.palavrasComFrequencia;
    
    // Calcular frequência normalizada para cada palavra (% sobre total do domínio)
    const totalOcorrencias = palavrasComFreq.reduce((sum, p) => sum + p.ocorrencias, 0);
    
    palavrasComFreq.forEach((palavra, idx) => {
      // Frequência normalizada: % da palavra dentro do domínio
      const freqNormalizadaDominio = (palavra.ocorrencias / totalOcorrencias) * 100;
      
      // Distribuir em órbitas de 10 em 10%
      // 0-10% = órbita 1 (0.08)
      // 10-20% = órbita 2 (0.14)
      // 20-30% = órbita 3 (0.20)
      const orbitIndex = Math.floor(freqNormalizadaDominio / 10);
      const orbitRadius = 0.08 + (orbitIndex * 0.06);
      
      // Palavras na mesma órbita
      const palavrasNaOrbita = palavrasComFreq.filter(p => {
        const pFreq = (p.ocorrencias / totalOcorrencias) * 100;
        return Math.floor(pFreq / 10) === orbitIndex;
      });
      const indexNaOrbita = palavrasNaOrbita.findIndex(p => p.palavra === palavra.palavra);
      const angle = (indexNaOrbita / palavrasNaOrbita.length) * 2 * Math.PI;
      
      const x = 0.5 + Math.cos(angle) * orbitRadius;
      const y = 0.5 + Math.sin(angle) * orbitRadius;
      
      // Tamanho proporcional à frequência (5-18)
      const maxFreq = Math.max(...palavrasComFreq.map(p => p.ocorrencias));
      const normalizedSize = 5 + (palavra.ocorrencias / maxFreq) * 13;
      
      graph.addNode(palavra.palavra, {
        x,
        y,
        size: normalizedSize,
        label: palavra.palavra,
        color: domain.cor,
        palavra: palavra.palavra,
        ocorrencias: palavra.ocorrencias,
        frequenciaNormalizadaDominio: freqNormalizadaDominio,
        orbitRadius,
        orbitAngle: angle,
        orbitIndex,
        initialAngle: angle,
        dominio: domain.dominio,
        hasKWIC: kwicDataMap[palavra.palavra]?.length > 0
      });
    });
    
    console.log(`✅ Stellar System "${domainName}" created with ${graph.order} nodes`);
    return graph;
  }, [dominiosData, kwicDataMap]);

  // Navega entre níveis (universe, galaxy, stellar-system)
  const navigateToLevel = useCallback((targetLevel: NavigationLevel) => {
    if (!sigmaRef.current || !graphRef.current) return;
    
    console.log('🚀 Navigating to level:', targetLevel, 'selectedDomain:', selectedDomainRef.current);
    
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
      let newGraph;
      
      // Reconstrói o grafo baseado no novo nível
      if (targetLevel === 'universe') {
        newGraph = buildUniverseView();
      } else if (targetLevel === 'galaxy') {
        newGraph = buildGalaxyView();
      } else if (targetLevel === 'stellar-system' && selectedDomainRef.current) {
        newGraph = buildStellarSystemView(selectedDomainRef.current);
      } else {
        console.error('❌ Invalid navigation state!');
        container.style.opacity = '1';
        return;
      }
      
      graph.clear();
      graph.import(newGraph.export());
      
      // Animação de fade in + zoom
      if (sigmaRef.current) {
        const container = sigmaRef.current.getContainer();
        container.style.opacity = '1';
        sigmaRef.current.getCamera().animate({ x: 0.5, y: 0.5, ratio: 0.8 }, { duration: 800 });
      }
    }, 300);
  }, [buildUniverseView, buildGalaxyView, buildStellarSystemView]);

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
        const result = { ...attrs };
        
        if (attrs.color) {
          result.color = attrs.color;
        }
        
        // Nó central: tamanho maior para detectar no renderer
        if (node === 'center') {
          result.color = '#FFD700';
          result.size = 40;
          result.label = 'Universo Gaúcho'; // Label especial para detectar
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
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      if (hoverDelayTimeoutRef.current) clearTimeout(hoverDelayTimeoutRef.current);
      sigma.kill();
    };
  }, []); // SEM DEPENDÊNCIAS - executa apenas uma vez

  // Event handlers (atualiza quando dependências mudam)
  useEffect(() => {
    if (!sigmaRef.current || !graphRef.current) return;
    
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    
    console.log('🔗 Setting up event handlers');
    
    // Função auxiliar para abrir Codex
    const openCodexForNode = (node: string, nodeAttrs: any, displayPoint: any, currentLevel: NavigationLevel) => {
      // Cancela timer de fechamento anterior
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }
      
      setHoveredNode({ ...nodeAttrs, id: node, level: currentLevel });
      setTooltipPos(displayPoint);
      setIsPaused(true);
      setCodexState('auto-open');
      
      // Timer de 5 segundos para fechar automaticamente
      const timeoutId = setTimeout(() => {
        if (codexState === 'auto-open') {
          setCodexState('closed');
          setHoveredNode(null);
          setTimeout(() => setIsPaused(false), 2000);
        }
      }, 5000);
      
      leaveTimeoutRef.current = timeoutId;
      sigma.getContainer().style.cursor = 'pointer';
    };
    
    // Sistema de hover com proteção anti-acidental (300ms delay)
    const enterNodeHandler = ({ node, event }: any) => {
      const currentLevel = levelRef.current;
      const nodeAttrs = graph.getNodeAttributes(node);
      const displayPoint = { x: event.x, y: event.y };
      
      // 🌌 CASO ESPECIAL: Hover no núcleo galáctico (centro no nível galaxy)
      if (node === 'center' && currentLevel === 'galaxy') {
        // Cancela delay anterior
        if (hoverDelayTimeoutRef.current) {
          clearTimeout(hoverDelayTimeoutRef.current);
          hoverDelayTimeoutRef.current = null;
        }
        
        // Calcular estatísticas gerais
        const totalDominios = dominiosData.filter(d => d.dominio !== "Palavras Funcionais").length;
        const totalPalavras = dominiosData.reduce((sum, d) => sum + d.riquezaLexical, 0);
        const totalOcorrencias = dominiosData.reduce((sum, d) => sum + d.ocorrencias, 0);
        const dominioMaisRico = dominiosData.reduce((max, d) => 
          d.riquezaLexical > max.riquezaLexical ? d : max
        );
        const dominioMaisFrequente = dominiosData.reduce((max, d) => 
          d.ocorrencias > max.ocorrencias ? d : max
        );
        
        // Top 3 domínios por Peso Temático
        const top3Dominios = [...dominiosData]
          .filter(d => d.dominio !== "Palavras Funcionais")
          .sort((a, b) => b.percentualTematico - a.percentualTematico)
          .slice(0, 3);
        
        setHoveredNode({
          id: 'center',
          label: 'Universo Gaúcho',
          level: 'galaxy',
          isGalacticCore: true,
          totalDominios,
          totalPalavras,
          totalOcorrencias,
          dominioMaisRico: dominioMaisRico.dominio,
          dominioMaisFrequente: dominioMaisFrequente.dominio,
          top3Dominios: top3Dominios.map(d => ({
            nome: d.dominio,
            percentual: d.percentualTematico,
            cor: d.cor
          }))
        });
        
        setTooltipPos(displayPoint);
        setIsPaused(true);
        setCodexState('auto-open');
        
        // Timer de fechamento
        const timeoutId = setTimeout(() => {
          if (codexState === 'auto-open') {
            setCodexState('closed');
            setHoveredNode(null);
            setTimeout(() => setIsPaused(false), 2000);
          }
        }, 5000);
        
        leaveTimeoutRef.current = timeoutId;
        sigma.getContainer().style.cursor = 'pointer';
        return;
      }
      
      // Proteção anti-hover acidental: se Codex já está aberto, exigir 300ms de hover
      if (codexState === 'auto-open' || codexState === 'pinned') {
        // Cancela delay anterior
        if (hoverDelayTimeoutRef.current) {
          clearTimeout(hoverDelayTimeoutRef.current);
          hoverDelayTimeoutRef.current = null;
        }
        
        // Agenda abertura apenas se usuário permanecer 300ms no nó
        const delayTimeout = setTimeout(() => {
          openCodexForNode(node, nodeAttrs, displayPoint, currentLevel);
        }, 300);
        
        hoverDelayTimeoutRef.current = delayTimeout;
        sigma.getContainer().style.cursor = 'pointer';
        return;
      }
      
      // Se Codex está fechado, abrir imediatamente
      openCodexForNode(node, nodeAttrs, displayPoint, currentLevel);
    };
    
    const leaveNodeHandler = () => {
      // Cancela delay de hover se sair do nó antes de 300ms
      if (hoverDelayTimeoutRef.current) {
        clearTimeout(hoverDelayTimeoutRef.current);
        hoverDelayTimeoutRef.current = null;
      }
      
      if (!isDragging) {
        sigma.getContainer().style.cursor = 'default';
      }
    };
    
    const clickNodeHandler = ({ node }: any) => {
      const currentLevel = levelRef.current;
      const nodeAttrs = graph.getNodeAttributes(node);
      
      console.log('🖱️ Node clicked:', node, 'Current level:', currentLevel);
      
      // Clique no centro no nível universe: ir para galaxy
      if (currentLevel === 'universe' && node === 'center') {
        navigateToLevel('galaxy');
        return;
      }
      
      // Detectar double-click para pin/unpin
      if (lastClickedNodeRef.current === node && clickTimeoutRef.current) {
        // É double-click!
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        lastClickedNodeRef.current = null;
        
        console.log('🖱️🖱️ Double click detected!');
        
        // Toggle pin no nó atual
        if (hoveredNode && hoveredNode.id === node) {
          if (codexState === 'pinned') {
            setCodexState('closed');
            setHoveredNode(null);
            setIsPaused(false);
            console.log('🔓 Codex unpinned');
          } else {
            setCodexState('pinned');
            if (leaveTimeoutRef.current) {
              clearTimeout(leaveTimeoutRef.current);
              leaveTimeoutRef.current = null;
            }
            console.log('📌 Codex pinned');
          }
          return;
        }
        
        // Pin no novo nó
        setHoveredNode({ ...nodeAttrs, id: node, level: currentLevel });
        setTooltipPos({ x: 0, y: 0 });
        setIsPaused(true);
        setCodexState('pinned');
        
        if (leaveTimeoutRef.current) {
          clearTimeout(leaveTimeoutRef.current);
          leaveTimeoutRef.current = null;
        }
        
        console.log('📌 Codex pinned to:', node);
        return;
      }
      
      // Primeiro click: aguardar 300ms para double-click
      lastClickedNodeRef.current = node;
      clickTimeoutRef.current = setTimeout(() => {
        lastClickedNodeRef.current = null;
        clickTimeoutRef.current = null;
        
      // Single click normal
        if (currentLevel === 'galaxy' && node !== 'center') {
          // Clique em domínio = navegar para stellar-system
          const nodeData = graph.getNodeAttributes(node);
          const domainName = nodeData.dominio;
          if (domainName) {
            console.log(`🚀 Navigating to Stellar System: ${domainName}`);
            setSelectedDomain(domainName);
            selectedDomainRef.current = domainName;
            setTimeout(() => navigateToLevel('stellar-system'), 100);
          }
        } else if (currentLevel === 'stellar-system' && node === 'stellar-core') {
          // Clique no núcleo = voltar para galaxy
          navigateToLevel('galaxy');
        } else if (currentLevel === 'stellar-system' && node !== 'stellar-core') {
          // Clique em palavra = abrir KWIC
          const kwicData = kwicDataMap[node];
          if (kwicData && kwicData.length > 0) {
            onWordClick?.(node);
          }
        } else if (currentLevel === 'universe' && node !== 'center') {
          const kwicData = kwicDataMap[node];
          if (kwicData && kwicData.length > 0) {
            onWordClick?.(node);
          }
        } else if (currentLevel === 'galaxy' && node === 'center') {
          navigateToLevel('universe');
        }
      }, 300);
    };
    
    const clickStageHandler = () => {
      // Click no vazio: fechar Codex se estiver pinado
      if (codexState === 'pinned') {
        setCodexState('closed');
        setHoveredNode(null);
        setIsPaused(false);
        console.log('🔓 Codex closed by clicking stage');
      }
    };
    
    // Drag handlers removidos (não há mais nível stellar)
    const downNodeHandler = () => {};
    const handleMouseMove = () => {};
    const handleMouseUp = () => {};

    sigma.on('enterNode', enterNodeHandler);
    sigma.on('leaveNode', leaveNodeHandler);
    sigma.on('clickNode', clickNodeHandler);
    sigma.on('clickStage', clickStageHandler);
    sigma.on('downNode', downNodeHandler);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      sigma.off('enterNode', enterNodeHandler);
      sigma.off('leaveNode', leaveNodeHandler);
      sigma.off('clickNode', clickNodeHandler);
      sigma.off('clickStage', clickStageHandler);
      sigma.off('downNode', downNodeHandler);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (hoverDelayTimeoutRef.current) clearTimeout(hoverDelayTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
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
    } else if (level === 'stellar-system' && selectedDomain) {
      const newGraph = buildStellarSystemView(selectedDomain);
      graphRef.current.clear();
      graphRef.current.import(newGraph.export());
      sigmaRef.current.refresh();
    }
  }, [activeFilters, level, selectedDomain, buildUniverseView, buildGalaxyView, buildStellarSystemView]);

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
  
  // Handlers para manter Codex aberto quando mouse entra no painel
  const handlePanelMouseEnter = () => {
    // Mouse entrou no painel - cancela timer e fixa Codex
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (codexState === 'auto-open') {
      setCodexState('pinned');
    }
  };
  
  const handlePanelMouseLeave = () => {
    // Mouse saiu do painel - fecha Codex
    setCodexState('closed');
    setHoveredNode(null);
    setTimeout(() => setIsPaused(false), 500);
  };
  
  // Toggle handlers para a toolbar
  const handleToggleCodex = () => {
    setOpenSections(prev => ({ ...prev, codex: !prev.codex }));
  };
  
  const handleToggleLegend = () => {
    setOpenSections(prev => ({ ...prev, legend: !prev.legend }));
  };
  
  const handleToggleFuture = () => {
    setOpenSections(prev => ({ ...prev, future: !prev.future }));
  };
  
  // Handlers de modo do console
  const handleMinimizeConsole = () => setConsoleMode('minimized');
  const handleFloatConsole = () => setConsoleMode('floating');
  const handleDockConsole = () => setConsoleMode('docked');
  const handleExpandConsole = () => setConsoleMode('docked');
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-b from-black via-slate-900 to-black">
      
      {/* ÁREA PRINCIPAL - Grafo (flex-1 = ocupa espaço restante) */}
      <div className="flex-1 relative">
        
        {/* Starry Background */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
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
        
        {/* Sigma Container */}
        <div ref={containerRef} className="absolute inset-0 z-10" />
        
        {/* Orbital Rings - Overlay sobre o Sigma */}
        {level !== 'universe' && containerRect && (
          <div className="absolute inset-0 pointer-events-none z-20">
            <OrbitalRings
              level={level}
              isPaused={isPaused}
              containerWidth={containerRect.width}
              containerHeight={containerRect.height}
            />
          </div>
        )}
        
        {/* Filter Panel */}
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
        
        {/* Navigation Console - Fixed no topo */}
        <div className="absolute top-0 left-0 right-0 z-30">
          <SpaceNavigationConsole
            level={level}
            selectedDomain={selectedDomain}
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
        </div>
        
      </div>
      
      {/* PAINEL DIREITO - Console + Toolbar agrupados */}
      <div className="flex items-stretch h-full">
        
        {/* Console - Condicional baseado no modo */}
        {consoleMode === 'docked' && (
          <ControlPanel
            mode="docked"
            hoveredNode={hoveredNode}
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
          onReset={handleResetView}
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
      
      {/* Console Flutuante - Portal */}
      {consoleMode === 'floating' && (
        <FloatingControlPanel
          position={floatingPosition}
          size={floatingSize}
          onDock={handleDockConsole}
          onPositionChange={setFloatingPosition}
        >
          <ControlPanel
            mode="floating"
            hoveredNode={hoveredNode}
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
};
