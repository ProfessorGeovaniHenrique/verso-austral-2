import { Text, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { ThreeEvent } from '@react-three/fiber';
import { ThreeCloudNode } from '@/hooks/useThreeSemanticData';
import { useRef } from 'react';
import * as THREE from 'three';

interface Text3DNodeProps {
  node: ThreeCloudNode;
  font: string;
  isHovered: boolean;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

export function Text3DNode({ node, font, isHovered, onPointerOver, onPointerOut, onClick }: Text3DNodeProps) {
  const isDomain = node.type === 'domain';
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Pulse animation para domínios SUPER-REPRESENTADOS (textualWeight > 20%)
  useFrame((state) => {
    if (isDomain && node.textualWeight && node.textualWeight > 20 && groupRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      groupRef.current.scale.setScalar(pulse);
    }
  });
  
  // Opacidade baseada em prosódia
  const opacity = isDomain ? 1.0 : node.baseOpacity;
  
  return (
    <group ref={groupRef}>
      <Billboard
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
        position={node.position}
      >
        <Text
          ref={meshRef}
          fontSize={node.scale}
          color={node.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={isDomain ? 0.05 : 0.02}
          outlineColor="#000000"
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onClick={onClick}
        >
          {node.label}
          
          {/* Material com emissão para efeito glow */}
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={isHovered ? node.glowIntensity * 1.5 : node.glowIntensity}
            toneMapped={false}
            transparent
            opacity={opacity}
          />
        </Text>
        
        {/* Halo extra para domínios */}
        {isDomain && (
          <mesh scale={node.scale * 1.5}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial
              color={node.color}
              transparent
              opacity={isHovered ? 0.15 : 0.08}
              depthWrite={false}
            />
          </mesh>
        )}
      </Billboard>
    </group>
  );
}
