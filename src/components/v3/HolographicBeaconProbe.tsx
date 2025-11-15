import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group, Vector3 } from 'three';
import { Text } from '@react-three/drei';

interface HolographicBeaconProbeProps {
  probe: {
    id: string;
    word: string;
    surfacePosition: [number, number, number];
    frequency: number;
    prosody: 'Positiva' | 'Negativa' | 'Neutra';
    isScanned: boolean;
  };
  onClick: () => void;
  isActive?: boolean;
}

const PROBE_COLORS = {
  Positiva: '#00ff88',
  Negativa: '#ff0055',
  Neutra: '#00d9ff',
};

export function HolographicBeaconProbe({ probe, onClick, isActive = false }: HolographicBeaconProbeProps) {
  const groupRef = useRef<Group>(null);
  const sphereRef = useRef<Mesh>(null);
  const ring1Ref = useRef<Mesh>(null);
  const ring2Ref = useRef<Mesh>(null);
  const ring3Ref = useRef<Mesh>(null);
  const beamRef = useRef<Mesh>(null);
  
  const [isHovered, setIsHovered] = useState(false);
  
  const color = PROBE_COLORS[probe.prosody];
  const baseScale = probe.isScanned ? 1.0 : 0.8;

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    // Rotação dos anéis em eixos diferentes
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 0.5;
      ring1Ref.current.rotation.y = time * 0.3;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = time * 0.4;
      ring2Ref.current.rotation.z = time * 0.2;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = time * 0.3;
      ring3Ref.current.rotation.z = time * 0.5;
    }
    
    // Pulso da esfera central
    if (sphereRef.current && !probe.isScanned) {
      const pulse = 1.0 + Math.sin(time * 2) * 0.15;
      sphereRef.current.scale.setScalar(pulse * baseScale);
    }
    
    // Beam vertical animado quando hover ou active
    if (beamRef.current) {
      const targetOpacity = (isHovered || isActive) ? 0.6 : 0.0;
      const currentOpacity = (beamRef.current.material as any).opacity;
      (beamRef.current.material as any).opacity += (targetOpacity - currentOpacity) * 0.1;
    }
  });

  return (
    <group
      ref={groupRef}
      position={probe.surfacePosition}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setIsHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Esfera central translúcida */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={probe.isScanned ? 0.8 : 0.4}
          transparent
          opacity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Anel orbital 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.4, 0.025, 16, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Anel orbital 2 */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[0.5, 0.02, 16, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Anel orbital 3 */}
      <mesh ref={ring3Ref}>
        <torusGeometry args={[0.35, 0.03, 16, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Beam vertical */}
      <mesh ref={beamRef} position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.1, 3, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Label holográfico */}
      {(isHovered || isActive) && (
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.3}
          color={color}
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
