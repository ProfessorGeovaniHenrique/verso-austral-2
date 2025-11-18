import { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SpaceNavigationHub } from '@/components/SpaceNavigationHub';
import { ControlPanel } from '@/components/ControlPanel/ControlPanel';
import { ControlToolbar } from '@/components/ControlPanel/ControlToolbar';
import { KWICModal } from '@/components/KWICModal';
import { useKWICModal } from '@/hooks/useKWICModal';
import { Starfield8K } from '@/components/v3/Starfield8K';
import { ScannerPlanet } from '@/components/v3/ScannerPlanet';
import { OrbitalRings } from '@/components/v3/OrbitalRings';
import { CoordinateGrid } from '@/components/v3/CoordinateGrid';
import { ScanWaveEffect } from '@/components/v3/ScanWaveEffect';
import { PlanetLabel } from '@/components/v3/PlanetLabel';
import { ScannerHUD } from '@/components/hud/ScannerHUD';
import { SystemStatusPanel } from '@/components/hud/SystemStatusPanel';
import { TimelineFooter } from '@/components/hud/TimelineFooter';
import { SideIconsPanel } from '@/components/hud/SideIconsPanel';
import { useScannerData } from '@/hooks/useScannerData';
import { useNavigationLevel } from '@/hooks/useNavigationLevel';
import { toast } from 'sonner';
import gsap from 'gsap';
import type { ScannerPlanet as ScannerPlanetType, ScannerProbe } from '@/data/types/scannerVisualization.types';
import type { NavigationLevel } from '@/hooks/useNavigationLevel';

// Controlador de câmera com animações GSAP
function CameraController({ 
  navigationLevel, 
  selectedPlanetId,
  planets,
  autoRotate
}: {
  navigationLevel: NavigationLevel;
  selectedPlanetId: string | null;
  planets: ScannerPlanetType[];
  autoRotate: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (navigationLevel === 'universe') {
      gsap.to(camera.position, {
        x: 0, y: 20, z: 50,
        duration: 1.5,
        ease: 'power2.inOut',
      });
      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: 0, y: 0, z: 0,
          duration: 1.5,
          ease: 'power2.inOut',
        });
      }
    } else if (navigationLevel === 'galaxy' && selectedPlanetId) {
      const planet = planets.find(p => p.id === selectedPlanetId);
      if (planet) {
        const [x, y, z] = planet.position;
        gsap.to(camera.position, {
          x: x - 18, y: y + 8, z: z + 12,
          duration: 1.5,
          ease: 'power2.inOut',
        });
        if (controlsRef.current) {
          gsap.to(controlsRef.current.target, {
            x, y, z,
            duration: 1.5,
            ease: 'power2.inOut',
          });
        }
      }
    }
  }, [navigationLevel, selectedPlanetId, planets, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      minDistance={5}
      maxDistance={100}
      enableDamping
      dampingFactor={0.05}
    />
  );
}

function Scene({
  navigationLevel,
  selectedDomain,
  planets,
  autoRotate,
  onPlanetClick,
  onProbeClick,
  onNodeHover,
  selectedProbeId,
  showGrid,
  showOrbitalRings,
  hoveredNode,
  scanWaves,
  setScanWaves,
}: {
  navigationLevel: NavigationLevel;
  selectedDomain: string | null;
  planets: ScannerPlanetType[];
  autoRotate: boolean;
  onPlanetClick: (planet: ScannerPlanetType) => void;
  onProbeClick: (probe: ScannerProbe) => void;
  onNodeHover: (node: any) => void;
  selectedProbeId: string | null;
  showGrid: boolean;
  showOrbitalRings: boolean;
  hoveredNode: any;
  scanWaves: Array<{ id: string; position: [number, number, number]; color: string }>;
  setScanWaves: React.Dispatch<React.SetStateAction<Array<{ id: string; position: [number, number, number]; color: string }>>>;
}) {
  const selectedPlanet = selectedDomain
    ? planets.find(p => p.id === selectedDomain) || null
    : null;

  return (
    <>
      <CameraController 
        navigationLevel={navigationLevel}
        selectedPlanetId={selectedDomain}
        planets={planets}
        autoRotate={autoRotate}
      />

      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#4444ff" />

      <Starfield8K variant="milkyWay" radius={500} />

      {/* Grid 3D */}
      {navigationLevel === 'universe' && showGrid && <CoordinateGrid />}

      {/* Órbitas planetárias */}
      {navigationLevel === 'universe' && showOrbitalRings && (
        <OrbitalRings planets={planets} />
      )}

      {/* Vista Universe: Todos os planetas */}
      {navigationLevel === 'universe' && planets.map((planet) => (
        <group key={planet.id}>
          <group
            onClick={(e) => {
              e.stopPropagation();
              onPlanetClick(planet);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              onNodeHover({ ...planet, type: 'domain' });
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'default';
              onNodeHover(null);
            }}
          >
            <ScannerPlanet planet={planet} />
          </group>
          
          {/* Label flutuante */}
          <PlanetLabel 
            planet={planet}
            visible={!hoveredNode || hoveredNode.id !== planet.id}
          />
        </group>
      ))}

      {/* Scan waves effects */}
      {scanWaves.map(wave => (
        <ScanWaveEffect
          key={wave.id}
          position={wave.position}
          color={wave.color}
          onComplete={() => {
            setScanWaves(prev => prev.filter(w => w.id !== wave.id));
          }}
        />
      ))}

      {navigationLevel === 'galaxy' && selectedPlanet && (
        <ScannerPlanet
          planet={selectedPlanet}
          isOrbitalView={true}
          onProbeClick={onProbeClick}
          selectedProbeId={selectedProbeId}
        />
      )}
    </>
  );
}

export default function Dashboard8() {
  const {
    level: navigationLevel,
    selectedDomain,
    selectedWord,
    navigateToUniverse,
    navigateToGalaxy,
    navigateToStellarSystem,
    handleNavigate,
  } = useNavigationLevel();

  const { planets, allPlanets, filters, setFilters, resetFilters } = useScannerData();

  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedProbeId, setSelectedProbeId] = useState<string | null>(null);
  
  const { 
    isOpen: kwicModalOpen, 
    closeModal: closeKwicModal, 
    selectedWord: kwicSelectedWord, 
    kwicData, 
    isLoading: kwicLoading, 
    openModal: openKwicModal 
  } = useKWICModal('gaucho');

  const [codexState, setCodexState] = useState<'auto-open' | 'closed' | 'pinned'>('auto-open');
  const [openSections, setOpenSections] = useState({
    codex: true,
    legend: false,
    future: false,
  });

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [visualizationFilters, setVisualizationFilters] = useState({
    showConnections: true,
    showLabels: true,
    showGrid: false,
    showProbes: true,
    fogIntensity: 0.5,
    maxWords: 50,
  });
  
  // Estados adicionais para visual effects
  const [scanWaves, setScanWaves] = useState<Array<{
    id: string;
    position: [number, number, number];
    color: string;
  }>>([]);
  const [showOrbitalRings, setShowOrbitalRings] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const activeFilterCount = 
    (filters.minFrequency > 0 ? 1 : 0) +
    filters.prosody.length +
    filters.domains.length +
    (filters.searchQuery ? 1 : 0);

  // Cálculos para HUD
  const calculateScanPercentage = useCallback(() => {
    if (navigationLevel === 'universe') return 0;
    const selectedPlanet = planets.find(p => p.id === selectedDomain);
    if (!selectedPlanet) return 0;
    
    const scanned = selectedPlanet.probes.filter(p => p.isScanned).length;
    const total = selectedPlanet.probes.length;
    return total > 0 ? (scanned / total) * 100 : 0;
  }, [navigationLevel, selectedDomain, planets]);

  const getTotalWords = useCallback(() => {
    return planets.reduce((sum, planet) => sum + planet.stats.totalWords, 0);
  }, [planets]);

  const navigateToPrevDomain = useCallback(() => {
    if (navigationLevel !== 'universe') return;
    const currentIndex = planets.findIndex(p => p.id === selectedDomain);
    if (currentIndex > 0) {
      navigateToGalaxy(planets[currentIndex - 1].id);
    }
  }, [navigationLevel, planets, selectedDomain, navigateToGalaxy]);

  const navigateToNextDomain = useCallback(() => {
    if (navigationLevel !== 'universe') return;
    const currentIndex = planets.findIndex(p => p.id === selectedDomain);
    if (currentIndex < planets.length - 1) {
      navigateToGalaxy(planets[currentIndex + 1].id);
    }
  }, [navigationLevel, planets, selectedDomain, navigateToGalaxy]);

  const availableDomains = allPlanets.map(planet => ({
    label: planet.name,
    color: planet.color,
    corTexto: planet.textColor || '#FFFFFF',
  }));

  const handlePlanetClick = useCallback((planet: ScannerPlanetType) => {
    if (navigationLevel === 'universe') {
      navigateToGalaxy(planet.id);
      setAutoRotate(false);
      toast.info(`Explorando: ${planet.name}`);
    }
  }, [navigationLevel, navigateToGalaxy]);

  const handleProbeClick = useCallback((probe: ScannerProbe) => {
    // Disparar scan wave effect
    const probeColors = {
      Positiva: '#00ff88',
      Negativa: '#ff0055',
      Neutra: '#00d9ff',
    };
    
    const waveId = `wave-${Date.now()}`;
    setScanWaves(prev => [...prev, {
      id: waveId,
      position: probe.surfacePosition,
      color: probeColors[probe.prosody],
    }]);
    
    // Remover wave após 1.5s
    setTimeout(() => {
      setScanWaves(prev => prev.filter(w => w.id !== waveId));
    }, 1500);
    
    setSelectedProbeId(probe.id);
    openKwicModal(probe.word);
    toast.info(`Analisando: ${probe.word}`);
  }, [openKwicModal]);

  const handleReset = useCallback(() => {
    navigateToUniverse();
    resetFilters();
    setAutoRotate(true);
    setIsPaused(false);
    setSelectedProbeId(null);
    toast.success('Sistema resetado');
  }, [navigateToUniverse, resetFilters]);

  const handleCodexMouseEnter = useCallback(() => {
    if (codexState === 'closed' && hoveredNode) {
      setCodexState('auto-open');
    }
  }, [codexState, hoveredNode]);

  const handleCodexMouseLeave = useCallback(() => {
    if (codexState === 'auto-open') {
      setCodexState('closed');
    }
  }, [codexState]);

  const handleMinimizeConsole = useCallback(() => {
    setIsConsoleMinimized(prev => !prev);
  }, []);

  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

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

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigateToUniverse();
      if (e.key === ' ') {
        e.preventDefault();
        togglePause();
      }
      if (e.key === 'c') setIsConsoleMinimized(prev => !prev);
      if (e.key === 'r') handleReset();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigateToUniverse, togglePause, handleReset]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-950 to-emerald-950 overflow-hidden">
      <SpaceNavigationHub
        level={navigationLevel}
        selectedDomain={selectedDomain}
        onNavigate={handleNavigate}
        onReset={handleReset}
        filters={filters}
        onFilterChange={setFilters}
        activeFilterCount={activeFilterCount}
        availableDomains={availableDomains}
        visualizationFilters={{
          minFrequency: filters.minFrequency,
          maxWords: 100,
          showLabels: true,
          fogIntensity: 0.5,
          glowIntensity: 0.5,
        }}
        onVisualizationFilterChange={(newFilters) => {
          if ('minFrequency' in newFilters) {
            setFilters(prev => ({ ...prev, minFrequency: newFilters.minFrequency || 0 }));
          }
        }}
      />

      <Canvas 
        className="absolute inset-0 z-10"
        camera={{ position: [0, 20, 50], fov: 60 }}
      >
        <color attach="background" args={['#0a0e1a']} />
        
        <Scene
          navigationLevel={navigationLevel}
          selectedDomain={selectedDomain}
          planets={planets}
          autoRotate={autoRotate && !isPaused}
          onPlanetClick={handlePlanetClick}
          onProbeClick={handleProbeClick}
          onNodeHover={setHoveredNode}
          selectedProbeId={selectedProbeId}
          showGrid={showGrid}
          showOrbitalRings={showOrbitalRings}
          hoveredNode={hoveredNode}
          scanWaves={scanWaves}
          setScanWaves={setScanWaves}
        />
      </Canvas>

      {/* HUD Elements */}
      <ScannerHUD
        scanPercentage={calculateScanPercentage()}
        totalProbes={planets.find(p => p.id === selectedDomain)?.probes.length || 0}
        scannedProbes={planets.find(p => p.id === selectedDomain)?.probes.filter(p => p.isScanned).length || 0}
      />

      <SystemStatusPanel
        level={navigationLevel}
        planetsVisible={planets.length}
        totalWords={getTotalWords()}
      />

      <TimelineFooter
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        onPrevDomain={navigateToPrevDomain}
        onNextDomain={navigateToNextDomain}
        currentProgress={calculateScanPercentage()}
      />

      <SideIconsPanel
        showOrbitalRings={showOrbitalRings}
        onToggleOrbits={() => setShowOrbitalRings(!showOrbitalRings)}
        onOpenSettings={() => setIsFilterPanelOpen(true)}
        onOpenSearch={() => {
          setIsFilterPanelOpen(true);
        }}
      />

      <div className="absolute right-0 top-0 h-full flex z-40">
        {!isConsoleMinimized && (
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
        )}

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

      <KWICModal
        open={kwicModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeKwicModal();
            setSelectedProbeId(null);
          }
        }}
        word={kwicSelectedWord}
        data={kwicData}
      />
      
      {kwicLoading && (
        <div className="absolute top-4 right-4 bg-cyan-500/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-cyan-500/30 z-50">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
            <span className="text-cyan-300 text-sm font-mono">Escaneando concordâncias...</span>
          </div>
        </div>
      )}
    </div>
  );
}
