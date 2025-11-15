import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { VisualDomainNode } from '@/data/types/threeVisualization.types';
import { HIERARCHY_CONFIG } from '@/config/hierarchyConfig';
import { COSMIC_STYLE } from '@/config/visualStyle';
import { shouldPulseDomain } from '@/lib/visualNormalization';
import { useInteractivityStore, selectHover, selectSelectedDomainId } from '@/store/interactivityStore';
import * as THREE from 'three';
import { DomainShaderMaterial } from '@/shaders/DomainShaderMaterial';

interface InteractiveDomainProps {
  node: VisualDomainNode;
  opacity: number;
  useCustomShader?: boolean;
}

export function InteractiveDomain({ node, opacity, useCustomShader = false }: InteractiveDomainProps) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<DomainShaderMaterial>(null);
  
  const hover = useInteractivityStore(selectHover);
  const selectedDomainId = useInteractivityStore(selectSelectedDomainId);
  
  const isHovered = hover.hoveredNodeId === node.id;
  const isSelected = selectedDomainId === node.id;
  
  // Animação de pulso para domínios super-representados
  const shouldPulse = shouldPulseDomain(
    node.rawData.textualWeight,
    HIERARCHY_CONFIG.domainPulse.threshold
  );
  
  useFrame((state) => {
    // Pulse animation
    if (shouldPulse && sphereRef.current && !isSelected) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * node.pulseSpeed) * 
                    HIERARCHY_CONFIG.domainPulse.amplitude;
      sphereRef.current.scale.setScalar(pulse);
    } else if (sphereRef.current && !isSelected) {
      sphereRef.current.scale.setScalar(1);
    }
    
    // Update shader uniforms
    if (useCustomShader && materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uHoverIntensity.value = isHovered ? 1.0 : 0.0;
    }
  });
  
  // Animação de hover
  const springProps = useSpring({
    emissiveIntensity: isHovered || isSelected
      ? COSMIC_STYLE.hover.emissiveIntensity 
      : node.glowIntensity,
    scale: isSelected ? node.scale * 1.2 : node.scale,
    config: { tension: 300, friction: 20 },
  });
  
  // Calcular opacidade final
  const finalOpacity = useMemo(() => {
    if (isSelected) return 1.0;
    if (selectedDomainId && selectedDomainId !== node.id) return 0.1;
    return opacity;
  }, [isSelected, selectedDomainId, node.id, opacity]);
  
  // Adicionar userData para raycasting
  if (groupRef.current) {
    groupRef.current.userData.nodeId = node.id;
    groupRef.current.userData.nodeType = 'domain';
  }
  
  if (sphereRef.current) {
    sphereRef.current.userData.nodeId = node.id;
    sphereRef.current.userData.nodeType = 'domain';
  }
  
  return (
    <group ref={groupRef} position={node.position}>
      {/* Esfera do domínio */}
      <animated.mesh ref={sphereRef} scale={springProps.scale}>
        <sphereGeometry args={[node.scale, 64, 64]} />
        {useCustomShader ? (
          <domainShaderMaterial
            ref={materialRef}
            uColor={new THREE.Color(node.color)}
            uEmissiveIntensity={springProps.emissiveIntensity}
            uOpacity={finalOpacity}
            uFresnelPower={3.0}
            uWaveAmplitude={0.05}
            uWaveFrequency={3.0}
          />
        ) : (
          <animated.meshStandardMaterial
            color={node.color}
            transparent
            opacity={finalOpacity}
            emissive={node.color}
            emissiveIntensity={springProps.emissiveIntensity}
            roughness={0.3}
            metalness={0.8}
          />
        )}
      </animated.mesh>
      
      {/* Halo externo (efeito de glow no hover) */}
      {isHovered && (
        <Sphere args={[node.scale * 1.3, 32, 32]}>
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={0.15}
          />
        </Sphere>
      )}
      
      {/* Anel de seleção */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[node.scale * 1.1, node.scale * 1.15, 64]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Texto do domínio */}
      <Text
        ref={textRef}
        position={[0, node.scale + 0.5, 0]}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {node.label}
        <meshStandardMaterial
          transparent
          opacity={finalOpacity}
        />
      </Text>
    </group>
  );
}
