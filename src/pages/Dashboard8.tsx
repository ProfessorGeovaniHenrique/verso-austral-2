import { useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import gsap from 'gsap';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScannerPlanet } from '@/components/v3/ScannerPlanet';
import { Starfield8K } from '@/components/v3/Starfield8K';
import { useScannerData } from '@/hooks/useScannerData';
import { useNavigationLevel } from '@/hooks/useNavigationLevel';
import type { ScannerPlanet as ScannerPlanetType, ScannerProbe } from '@/data/types/scannerVisualization.types';

function CameraController({ 
  navigationLevel, 
  selectedPlanet 
}: { 
  navigationLevel: string; 
  selectedPlanet: ScannerPlanetType | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (navigationLevel === 'universe') {
      // Vista galáctica panorâmica
      gsap.to(camera.position, {
        x: 0,
        y: 20,
        z: 50,
        duration: 2,
        ease: 'power2.inOut',
      });

      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: 2,
          ease: 'power2.inOut',
        });
      }
    } else if (navigationLevel === 'galaxy' && selectedPlanet) {
      // Vista orbital - planeta deslocado para esquerda
      const planetPos = selectedPlanet.position;
      gsap.to(camera.position, {
        x: planetPos[0] - 18,
        y: planetPos[1] + 8,
        z: planetPos[2] + 12,
        duration: 2,
        ease: 'power2.inOut',
      });

      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: planetPos[0],
          y: planetPos[1],
          z: planetPos[2],
          duration: 2,
          ease: 'power2.inOut',
        });
      }
    }
  }, [navigationLevel, selectedPlanet, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={100}
    />
  );
}

function Scene() {
  const { planets } = useScannerData();
  const { level, selectedDomain, navigateToGalaxy } = useNavigationLevel();
  const [selectedProbeId, setSelectedProbeId] = useState<string | null>(null);

  const selectedPlanet = selectedDomain
    ? planets.find(p => p.id === selectedDomain) || null
    : null;

  const handlePlanetClick = (planet: ScannerPlanetType) => {
    if (level === 'universe') {
      navigateToGalaxy(planet.id);
    }
  };

  const handleProbeClick = (probe: ScannerProbe) => {
    console.log('Probe clicado:', probe.word);
    setSelectedProbeId(probe.id);
    // TODO: Trigger scan animation
    // TODO: Mostrar dados no HUD
  };

  return (
    <>
      <CameraController 
        navigationLevel={level} 
        selectedPlanet={selectedPlanet}
      />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#4444ff" />

      {/* Renderizar planetas */}
      {level === 'universe' && planets.map((planet) => (
        <group
          key={planet.id}
          onClick={() => handlePlanetClick(planet)}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = 'default'}
        >
          <ScannerPlanet planet={planet} />
        </group>
      ))}

      {/* Renderizar planeta selecionado em orbital view */}
      {level === 'galaxy' && selectedPlanet && (
        <ScannerPlanet
          planet={selectedPlanet}
          isOrbitalView={true}
          onProbeClick={handleProbeClick}
          selectedProbeId={selectedProbeId}
        />
      )}

      {/* Starfield 8K cinematográfico */}
      <Starfield8K variant="milkyWay" radius={500} />
    </>
  );
}

export default function Dashboard8() {
  const { level, navigateToUniverse } = useNavigationLevel();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 relative">
          {/* Canvas 3D */}
          <Canvas
            shadows
            className="w-full h-full"
            gl={{ 
              antialias: true, 
              alpha: false,
              powerPreference: 'high-performance'
            }}
          >
            <PerspectiveCamera makeDefault position={[0, 20, 50]} fov={60} />
            <Scene />
          </Canvas>

          {/* Controles temporários de navegação */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-10">
            <button
              onClick={navigateToUniverse}
              className="px-6 py-3 bg-primary/20 border-2 border-primary text-primary font-mono hover:bg-primary/30 transition-colors"
              disabled={level === 'universe'}
            >
              ← Voltar para Universo
            </button>
          </div>

          {/* Info do nível atual */}
          <div className="absolute top-4 left-4 bg-black/70 border border-primary/30 px-4 py-2 font-mono text-primary text-sm">
            Nível: {level === 'universe' ? 'UNIVERSO' : 'ÓRBITA'}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
