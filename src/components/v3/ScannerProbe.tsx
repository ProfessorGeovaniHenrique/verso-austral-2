import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { ScannerProbe as ScannerProbeType } from '@/data/types/scannerVisualization.types';

interface ScannerProbeProps {
  probe: ScannerProbeType;
  onClick: (probe: ScannerProbeType) => void;
  isActive?: boolean;
}

export function ScannerProbe({ probe, onClick, isActive = false }: ScannerProbeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Animação de pulso se não escaneado
  useFrame((state) => {
    if (!probe.isScanned && meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 2;
    }
  });

  const probeColor = probe.isScanned ? '#00ff00' : '#ffaa00';
  const emissiveColor = probe.isScanned ? '#00ff00' : '#ffaa00';

  return (
    <group position={probe.surfacePosition}>
      {/* Probe principal (cilindro) */}
      <mesh
        ref={meshRef}
        onClick={() => onClick(probe)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
        <meshStandardMaterial
          color={probeColor}
          emissive={emissiveColor}
          emissiveIntensity={isActive ? 1.2 : 0.8}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Ring pulsante ao hover */}
      {(hovered || isActive) && (
        <mesh ref={ringRef}>
          <torusGeometry args={[0.3, 0.05, 8, 32]} />
          <meshBasicMaterial
            color={probeColor}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Label 3D ao hover */}
      {hovered && (
        <Text
          position={[0, 0.8, 0]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {probe.word}
        </Text>
      )}
    </group>
  );
}
