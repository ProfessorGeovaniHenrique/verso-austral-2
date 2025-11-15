import { useRef, useMemo, useEffect } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { FogDomain as FogDomainType } from '@/data/types/fogPlanetVisualization.types';
import { useInteractivityStore, selectHover, selectSelectedDomainId } from '@/store/interactivityStore';
import { FogShaderMaterial } from '@/shaders/FogShaderMaterial';
import * as THREE from 'three';

// Garantir que o material está registrado no R3F
extend({ FogShaderMaterial });

interface FogDomainProps {
  domain: FogDomainType;
  opacity: number;
}

export function FogDomain({ domain, opacity }: FogDomainProps) {
  // Refs
  const sphereRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<FogShaderMaterial>(null);
  
  // Store
  const hover = useInteractivityStore(selectHover);
  const selectedDomainId = useInteractivityStore(selectSelectedDomainId);
  
  // States
  const isHovered = hover.hoveredNodeId === domain.dominio;
  const isSelected = selectedDomainId === domain.dominio;
  const shouldPulse = domain.comparacaoCorpus === 'super-representado';
  
  // Animação temporal via shader
  useFrame((state) => {
    if (materialRef.current) {
      // Atualizar tempo para noise e pulsação
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Hover intensity
      materialRef.current.uniforms.uHoverIntensity.value = isHovered ? 1.0 : 0.0;
      
      // Pulsação dinâmica (aumenta velocidade se super-representado)
      if (shouldPulse) {
        materialRef.current.uniforms.uPulsationSpeed.value = domain.pulsationSpeed * 1.5;
      } else {
        materialRef.current.uniforms.uPulsationSpeed.value = domain.pulsationSpeed;
      }
    }
  });
  
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
      {/* FOG Sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[domain.fogRadius, 24, 24]} />
        <fogShaderMaterial
          ref={materialRef}
          uColor={new THREE.Color(domain.cor)}
          uEmissiveIntensity={domain.emissiveIntensity}
          uOpacity={finalOpacity * domain.baseOpacity}
          uPulsationSpeed={domain.pulsationSpeed}
          uNoiseScale={domain.noiseScale}
          uFresnelPower={2.5}
          uCenterFade={0.4}
          uNoiseIntensity={0.3}
          uHoverIntensity={0.0}
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
        font="/fonts/Inter-Bold.woff"
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
