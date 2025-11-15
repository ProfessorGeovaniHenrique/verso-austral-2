import { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { SpaceNavigationHub } from '@/components/SpaceNavigationHub';
import { FilterPanel } from '@/components/FilterPanel';
import { ControlPanel } from '@/components/ControlPanel/ControlPanel';
import { ControlToolbar } from '@/components/ControlPanel/ControlToolbar';
import { FogDomain } from '@/components/v3/FogDomain';
import { PlanetWord } from '@/components/v3/PlanetWord';
import { KWICModal } from '@/components/KWICModal';
import { useFogPlanetData } from '@/hooks/useFogPlanetData';
import { useNavigationLevel } from '@/hooks/useNavigationLevel';
import { toast } from 'sonner';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';

// Controlador de câmera animado
function CameraController({ 
  navigationLevel, 
  selectedDomain,
  selectedWord,
  domains,
  autoRotate
}: any) {
  const { camera } = useThree();

  useEffect(() => {
    if (navigationLevel === 'universe') {
      // Vista panorâmica de todos os domínios
      gsap.to(camera.position, {
        x: 0,
        y: 8,
        z: 35,
        duration: 1.5,
        ease: 'power2.inOut',
      });
    } else if (navigationLevel === 'galaxy' && selectedDomain) {
      // Zoom no domínio selecionado
      const domain = domains.find((d: any) => d.dominio === selectedDomain);
      if (domain) {
        const [x, y, z] = domain.position;
        gsap.to(camera.position, {
          x: x + 8,
          y: y + 5,
          z: z + 12,
          duration: 1.5,
          ease: 'power2.inOut',
        });
      }
    }
  }, [navigationLevel, selectedDomain, selectedWord, domains, camera]);

  return (
    <OrbitControls
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      minDistance={10}
      maxDistance={50}
    />
  );
}

export default function Dashboard7() {
  // Navegação
  const {
    level: navigationLevel,
    selectedDomain,
    selectedWord,
    navigateToUniverse,
    navigateToGalaxy,
    navigateToStellarSystem,
    handleNavigate,
  } = useNavigationLevel();

  // Dados FOG & Planets
  const { domains, connections, filters, setFilters, resetFilters } = useFogPlanetData();

  // Estados de UI
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWordForModal, setSelectedWordForModal] = useState<string>('');

  // Estados do ControlPanel
  const [codexState, setCodexState] = useState<'auto-open' | 'closed' | 'pinned'>('auto-open');
  const [openSections, setOpenSections] = useState({
    codex: true,
    legend: false,
    future: false,
  });

  // Filtros adicionais (prosódia, domínios, busca)
  const [additionalFilters, setAdditionalFilters] = useState({
    prosody: [] as string[],
    domains: [] as string[],
    searchQuery: '',
  });

  // Calcular contagem de filtros ativos
  const activeFilterCount = 
    (filters.minFrequency > 2 ? 1 : 0) +
    additionalFilters.prosody.length +
    additionalFilters.domains.length +
    (additionalFilters.searchQuery ? 1 : 0);

  // Handlers de navegação
  const handleDomainClick = useCallback((domainId: string) => {
    navigateToGalaxy(domainId);
    setAutoRotate(false);
    toast.info(`Galáxia "${domainId}" selecionada`);
  }, [navigateToGalaxy]);

  const handleWordClick = useCallback((wordId: string) => {
    navigateToStellarSystem(wordId);
    setSelectedWordForModal(wordId);
    setModalOpen(true);
  }, [navigateToStellarSystem]);

  const handleReset = useCallback(() => {
    navigateToUniverse();
    resetFilters();
    setAdditionalFilters({ prosody: [], domains: [], searchQuery: '' });
    setAutoRotate(true);
    toast.success('Visualização resetada');
  }, [navigateToUniverse, resetFilters]);

  // Handlers de filtros
  const handleFilterChange = useCallback((newFilters: any) => {
    setAdditionalFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Handlers do ControlPanel
  const handleCodexMouseEnter = useCallback(() => {
    if (codexState === 'closed') setCodexState('auto-open');
  }, [codexState]);

  const handleCodexMouseLeave = useCallback(() => {
    if (codexState === 'auto-open') setCodexState('closed');
  }, [codexState]);

  const handleMinimizeConsole = useCallback(() => {
    setIsConsoleMinimized(prev => !prev);
  }, []);

  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Handlers de zoom e controle
  const handleZoomIn = useCallback(() => {
    toast.info('Zoom In');
  }, []);

  const handleZoomOut = useCallback(() => {
    toast.info('Zoom Out');
  }, []);

  const handleResetCamera = useCallback(() => {
    navigateToUniverse();
    setAutoRotate(true);
  }, [navigateToUniverse]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
    setAutoRotate(prev => !prev);
  }, []);

  // Filtrar domínios e palavras baseado em seleção e filtros
  const visibleDomains = domains.filter(domain => {
    // Se estiver no nível galaxy, mostrar apenas o domínio selecionado
    if (navigationLevel === 'galaxy' && selectedDomain) {
      return domain.dominio === selectedDomain;
    }
    // Filtro de domínios selecionados
    if (additionalFilters.domains.length > 0 && !additionalFilters.domains.includes(domain.dominio)) {
      return false;
    }
    return true;
  });

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-950 to-emerald-950 overflow-hidden">
      {/* SpaceNavigationHub - Hub Central */}
      <SpaceNavigationHub
        level={navigationLevel}
        selectedDomain={selectedDomain}
        onNavigate={handleNavigate}
        onReset={handleReset}
        filters={{
          minFrequency: filters.minFrequency,
          prosody: additionalFilters.prosody,
          domains: additionalFilters.domains,
          searchQuery: additionalFilters.searchQuery,
        }}
        onFilterChange={handleFilterChange}
        activeFilterCount={activeFilterCount}
        availableDomains={domains.map(d => ({ 
          label: d.dominio, 
          color: d.cor, 
          corTexto: d.corTexto 
        }))}
        visualizationFilters={filters}
        onVisualizationFilterChange={setFilters}
      />

      {/* Canvas 3D - Área Central */}
      <Canvas 
        className="absolute inset-0 z-10"
        camera={{ position: [0, 8, 35], fov: 60 }}
      >
        <color attach="background" args={['#0a0e1a']} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Controlador de Câmera Animado */}
        <CameraController
          navigationLevel={navigationLevel}
          selectedDomain={selectedDomain}
          selectedWord={selectedWord}
          domains={visibleDomains}
          autoRotate={autoRotate && !isPaused}
        />

        {/* Renderizar FOG Domains */}
        {visibleDomains.map(domain => (
          <FogDomain
            key={domain.dominio}
            domain={domain}
            opacity={navigationLevel === 'galaxy' && selectedDomain !== domain.dominio ? 0.15 : 1.0}
            glowIntensity={filters.glowIntensity}
            onDomainClick={handleDomainClick}
          />
        ))}

        {/* Renderizar Planetas (Palavras) */}
        {visibleDomains.map(domain =>
          domain.palavras
            .filter(word => {
              // Filtro de frequência
              if (word.ocorrencias < filters.minFrequency) return false;
              // Filtro de prosódia
              if (additionalFilters.prosody.length > 0 && !additionalFilters.prosody.includes(word.prosody)) {
                return false;
              }
              // Filtro de busca
              if (additionalFilters.searchQuery && !word.palavra.toLowerCase().includes(additionalFilters.searchQuery.toLowerCase())) {
                return false;
              }
              return true;
            })
            .slice(0, filters.maxWords)
            .map((word, idx) => (
              <PlanetWord
                key={`${domain.dominio}-${word.palavra}-${idx}`}
                word={word}
                domainPosition={domain.position}
                domainColor={domain.cor}
                opacity={navigationLevel === 'galaxy' && selectedDomain === domain.dominio ? 1.0 : 0.6}
                isInSelectedDomain={navigationLevel === 'galaxy' && selectedDomain === domain.dominio}
              />
            ))
        )}
      </Canvas>

      {/* RightControlPanel - Lateral Direito */}
      <div className="absolute right-0 top-0 bottom-0 z-40 flex">
        {/* ControlPanel - Deslizante */}
        <div
          className="w-[420px] transition-transform duration-300"
          style={{
            transform: isConsoleMinimized ? 'translateX(420px)' : 'translateX(0)',
          }}
        >
          <ControlPanel
            mode="docked"
            hoveredNode={hoveredNode}
            level={navigationLevel}
            codexState={codexState}
          onMouseEnter={handleCodexMouseEnter}
          onMouseLeave={handleCodexMouseLeave}
          openSections={openSections}
          onMinimize={handleMinimizeConsole}
        />
        </div>

        {/* ControlToolbar - Sempre Visível */}
        <div className="w-[60px]">
          <ControlToolbar
            isMinimized={isConsoleMinimized}
            onToggleConsole={handleMinimizeConsole}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleResetCamera}
            isPaused={isPaused}
            onPauseToggle={togglePause}
            isCodexOpen={openSections.codex}
            isLegendOpen={openSections.legend}
            isFutureOpen={openSections.future}
            onToggleCodex={() => toggleSection('codex')}
            onToggleLegend={() => toggleSection('legend')}
            onToggleFuture={() => toggleSection('future')}
            showLegend={navigationLevel === 'galaxy'}
          />
        </div>
      </div>

      {/* KWIC Modal */}
      <KWICModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSelectedWordForModal('');
        }}
        word={selectedWordForModal}
        data={[]}
      />
    </div>
  );
}
