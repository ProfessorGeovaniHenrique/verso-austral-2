import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { LatLongGrid } from './LatLongGrid';
import { ScannerProbe } from './ScannerProbe';
import type { ScannerPlanet as ScannerPlanetType, ScannerProbe as ScannerProbeType } from '@/data/types/scannerVisualization.types';

interface ScannerPlanetProps {
  planet: ScannerPlanetType;
  isOrbitalView?: boolean;
  onProbeClick?: (probe: ScannerProbeType) => void;
  selectedProbeId?: string | null;
  onClick?: () => void;
  onHover?: (isHovering: boolean) => void;
}

export function ScannerPlanet({ 
  planet, 
  isOrbitalView = false, 
  onProbeClick,
  selectedProbeId,
  onClick,
  onHover
}: ScannerPlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Carregar textura 2K do planeta
  const texture = useTexture(planet.textureUrl);

  // Configurar textura para cobertura 360° sem costuras
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // Rotação lenta do planeta
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += planet.rotationSpeed * 0.01;
    }
  });

  return (
    <group position={planet.position}>
      {/* Esfera principal com textura 2K */}
      <mesh 
        ref={meshRef}
        onClick={onClick}
        onPointerEnter={() => onHover?.(true)}
        onPointerLeave={() => onHover?.(false)}
      >
        <sphereGeometry args={[planet.radius, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Grid de coordenadas (apenas em orbital view) */}
      {isOrbitalView && (
        <LatLongGrid radius={planet.radius + 0.05} opacity={0.3} />
      )}

      {/* Probes (apenas em orbital view) */}
      {isOrbitalView && onProbeClick && planet.probes.map((probe) => (
        <ScannerProbe
          key={probe.id}
          probe={probe}
          onClick={onProbeClick}
          isActive={probe.id === selectedProbeId}
        />
      ))}

      {/* Glow sutil */}
      <mesh>
        <sphereGeometry args={[planet.radius + 0.3, 32, 32]} />
        <meshBasicMaterial
          color={planet.color}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
