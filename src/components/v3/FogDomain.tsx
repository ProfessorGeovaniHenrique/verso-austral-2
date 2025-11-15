import { useRef, useMemo, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { FogDomain as FogDomainType } from '@/data/types/fogPlanetVisualization.types';
import { useInteractivityStore, selectHover, selectSelectedDomainId } from '@/store/interactivityStore';
import * as THREE from 'three';

interface FogDomainProps {
  domain: FogDomainType;
  opacity: number;
  glowIntensity?: number;
  onDomainClick?: (domainId: string) => void;
}

export function FogDomain({ domain, opacity, glowIntensity = 1.0, onDomainClick }: FogDomainProps) {
  // Refs
  const sphereRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Three.js
  const { gl } = useThree();
  
  // Store
  const hover = useInteractivityStore(selectHover);
  const selectedDomainId = useInteractivityStore(selectSelectedDomainId);
  
  // States
  const isHovered = hover.hoveredNodeId === domain.dominio;
  const isSelected = selectedDomainId === domain.dominio;
  
  // Opacidade contextual
  const finalOpacity = useMemo(() => {
    if (isSelected) return 1.0;
    if (selectedDomainId && selectedDomainId !== domain.dominio) {
      return 0.15; // FOG já é semi-transparente, então reduzimos menos
    }
    return opacity;
  }, [isSelected, selectedDomainId, domain.dominio, opacity]);
  
  // Animação do selection ring
  const springProps = useSpring({
    ringScale: isSelected ? 1.0 : 0.8,
    ringOpacity: isSelected ? 0.6 : 0.0,
    config: { tension: 300, friction: 20 },
  });
  
  // userData para raycasting
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.nodeId = domain.dominio;
      groupRef.current.userData.nodeType = 'domain';
    }
    if (sphereRef.current) {
      sphereRef.current.userData.nodeId = domain.dominio;
      sphereRef.current.userData.nodeType = 'domain';
    }
  }, [domain.dominio]);
  
  return (
    <group ref={groupRef} position={domain.position}>
      {/* NÚCLEO ESTELAR - Sempre visível com glow máximo */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[domain.fogRadius * 0.35, 32, 32]} />
        <meshBasicMaterial
          color={domain.cor}
          transparent
          opacity={1.0}
        />
      </mesh>
      
      {/* Halo do Núcleo - Glow interno */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[domain.fogRadius * 0.45, 24, 24]} />
        <meshBasicMaterial
          color={domain.cor}
          transparent
          opacity={0.8}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* FOG Core - Núcleo mais denso */}
      <mesh 
        ref={sphereRef}
        renderOrder={2}
        onClick={(e) => {
          e.stopPropagation();
          if (onDomainClick) {
            onDomainClick(domain.dominio);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          gl.domElement.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          gl.domElement.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[domain.fogRadius * 0.7, 32, 32]} />
        <meshStandardMaterial
          color={domain.cor}
          emissive={domain.cor}
          emissiveIntensity={domain.emissiveIntensity * (isHovered ? 1.8 : 1.2) * glowIntensity}
          transparent
          opacity={finalOpacity * domain.baseOpacity * 0.6}
          depthWrite={false}
          side={THREE.DoubleSide}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>
      
      {/* FOG Mid-layer - Camada intermediária */}
      <mesh renderOrder={3}>
        <sphereGeometry args={[domain.fogRadius, 24, 24]} />
        <meshStandardMaterial
          color={domain.cor}
          emissive={domain.cor}
          emissiveIntensity={domain.emissiveIntensity * 0.7 * glowIntensity}
          transparent
          opacity={(finalOpacity * domain.baseOpacity) * 0.35}
          depthWrite={false}
          side={THREE.DoubleSide}
          roughness={1.0}
          metalness={0.0}
        />
      </mesh>
      
      {/* FOG Atmosphere - Halo externo */}
      <mesh renderOrder={4}>
        <sphereGeometry args={[domain.fogRadius * 1.4, 16, 16]} />
        <meshStandardMaterial
          color={domain.cor}
          emissive={domain.cor}
          emissiveIntensity={domain.emissiveIntensity * 0.3 * glowIntensity}
          transparent
          opacity={(finalOpacity * domain.baseOpacity) * 0.15}
          depthWrite={false}
          side={THREE.DoubleSide}
          roughness={1.0}
          metalness={0.0}
        />
      </mesh>
      
      {/* FOG Outer Shell - Camada externa ultra-difusa */}
      <mesh renderOrder={5}>
        <sphereGeometry args={[domain.fogRadius * 1.8, 12, 12]} />
        <meshStandardMaterial
          color={domain.cor}
          emissive={domain.cor}
          emissiveIntensity={domain.emissiveIntensity * 0.15 * glowIntensity}
          transparent
          opacity={(finalOpacity * domain.baseOpacity) * 0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
          roughness={1.0}
          metalness={0.0}
        />
      </mesh>
      
      {/* Selection Ring */}
      {isSelected && (
        <animated.mesh rotation={[Math.PI / 2, 0, 0]} scale={springProps.ringScale}>
          <ringGeometry args={[domain.fogRadius * 1.15, domain.fogRadius * 1.25, 64]} />
          <animated.meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={springProps.ringOpacity}
            side={THREE.DoubleSide}
          />
        </animated.mesh>
      )}
      
      {/* Label 3D */}
      <Text
        position={[0, domain.fogRadius + 0.5, 0]}
        fontSize={0.3}
        color={domain.corTexto}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {domain.dominio}
        <animated.meshBasicMaterial
          transparent
          opacity={finalOpacity}
        />
      </Text>
    </group>
  );
}
