import { useRef, useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { VisualWordNode } from '@/data/types/threeVisualization.types';
import { COSMIC_STYLE } from '@/config/visualStyle';
import { useInteractivityStore, selectHover } from '@/store/interactivityStore';
import * as THREE from 'three';

interface InteractiveWordProps {
  node: VisualWordNode;
  opacity: number;
  font?: string;
}

export function InteractiveWord({ node, opacity, font = 'Inter' }: InteractiveWordProps) {
  const textRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const hover = useInteractivityStore(selectHover);
  const isHovered = hover.hoveredNodeId === node.id;
  
  // Calcular opacidade final baseado no hover cascade
  const finalOpacity = useMemo(() => {
    if (isHovered) return 1.0;
    if (hover.hoveredNodeId && hover.hoveredType === 'word') {
      return 0.3; // Reduz opacidade de outras palavras quando uma está em hover
    }
    return opacity;
  }, [isHovered, hover, opacity]);
  
  // Animação de hover com react-spring
  const springProps = useSpring({
    scale: isHovered ? node.scale * 1.3 : node.scale,
    emissiveIntensity: isHovered 
      ? COSMIC_STYLE.hover.emissiveIntensity 
      : node.glowIntensity,
    config: { tension: 300, friction: 20 },
  });
  
  // Adicionar userData para raycasting
  if (groupRef.current) {
    groupRef.current.userData.nodeId = node.id;
    groupRef.current.userData.nodeType = 'word';
  }
  
  return (
    <Billboard position={node.position}>
      <group ref={groupRef}>
        <Text
          ref={textRef}
          fontSize={node.scale * (isHovered ? 1.3 : 1)}
          color={node.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {node.label}
          <animated.meshStandardMaterial
            color={node.color}
            transparent
            opacity={finalOpacity}
            emissive={node.color}
            emissiveIntensity={springProps.emissiveIntensity}
          />
        </Text>
      </group>
    </Billboard>
  );
}
