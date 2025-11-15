import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LatLongGrid } from './LatLongGrid';
import { ScannerProbe } from './ScannerProbe';
import type { ScannerPlanet as ScannerPlanetType, ScannerProbe as ScannerProbeType } from '@/data/types/scannerVisualization.types';

interface ScannerPlanetProps {
  planet: ScannerPlanetType;
  isOrbitalView?: boolean;
  onProbeClick?: (probe: ScannerProbeType) => void;
  selectedProbeId?: string | null;
}

export function ScannerPlanet({ 
  planet, 
  isOrbitalView = false, 
  onProbeClick,
  selectedProbeId 
}: ScannerPlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Rotação lenta do planeta
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += planet.rotationSpeed * 0.01;
    }
  });

  // Criar textura procedural baseada na cor do domínio
  const planetTexture = useRef<THREE.Texture | null>(null);
  if (!planetTexture.current) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Gradiente radial
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, planet.color);
      gradient.addColorStop(0.5, planet.color);
      gradient.addColorStop(1, '#000000');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      
      // Adicionar noise
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const brightness = Math.random() * 100 + 155;
        ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${Math.random() * 0.3})`;
        ctx.fillRect(x, y, 2, 2);
      }
      
      planetTexture.current = new THREE.CanvasTexture(canvas);
    }
  }

  return (
    <group position={planet.position}>
      {/* Esfera principal */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[planet.radius, 64, 64]} />
        <meshStandardMaterial
          map={planetTexture.current}
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
