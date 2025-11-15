import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { SemanticWord } from '@/data/types/fogPlanetVisualization.types';
import { useInteractivityStore, selectHover, selectSelectedDomainId } from '@/store/interactivityStore';
import { PlanetShaderMaterial } from '@/shaders/PlanetShaderMaterial';
import * as THREE from 'three';

interface PlanetWordProps {
  word: SemanticWord;
  domainColor: string;
  domainPosition: [number, number, number];
  opacity: number;
  isInSelectedDomain: boolean;
}

export function PlanetWord({ 
  word, 
  domainColor, 
  domainPosition, 
  opacity,
  isInSelectedDomain 
}: PlanetWordProps) {
  // Refs
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<PlanetShaderMaterial>(null);
  const orbitalAngleRef = useRef(word.orbitalAngle);
  
  // Store
  const hover = useInteractivityStore(selectHover);
  const selectedDomainId = useInteractivityStore(selectSelectedDomainId);
  
  // States
  const isHovered = hover.hoveredNodeId === word.palavra;
  
  // Carregar textura
  const texture = useTexture(word.planetTexture);
  
  // Converter cor HSL para THREE.Color
  const domainColorObj = useMemo(() => new THREE.Color(domainColor), [domainColor]);
  
  // Calcular tamanho do planeta baseado na frequência
  const planetRadius = useMemo(() => {
    const baseSize = 0.12;
    const maxSize = 0.25;
    const minSize = 0.08;
    
    // Normalizar ocorrências (assumindo max ~100)
    const normalizedFreq = Math.min(word.ocorrencias / 100, 1.0);
    return baseSize + (normalizedFreq * (maxSize - baseSize));
  }, [word.ocorrencias]);
  
  // Movimento orbital
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Atualizar ângulo orbital
      orbitalAngleRef.current += word.orbitalSpeed * delta;
      
      // Calcular posição orbital elíptica
      const a = word.orbitalRadius; // Semi-eixo maior
      const b = word.orbitalRadius * (1 - word.orbitalEccentricity); // Semi-eixo menor
      
      const x = domainPosition[0] + a * Math.cos(orbitalAngleRef.current);
      const y = domainPosition[1] + (Math.sin(orbitalAngleRef.current * 2) * 0.3); // Variação vertical
      const z = domainPosition[2] + b * Math.sin(orbitalAngleRef.current);
      
      groupRef.current.position.set(x, y, z);
    }
    
    // Atualizar shader uniforms
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uHoverIntensity.value = isHovered ? 1.0 : 0.0;
    }
    
    // Rotação suave do planeta
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
    }
  });
  
  // Opacidade contextual
  const finalOpacity = useMemo(() => {
    if (isHovered) return 1.0;
    if (selectedDomainId && !isInSelectedDomain) {
      return 0.2; // Palavras de outros domínios ficam bem transparentes
    }
    return opacity;
  }, [isHovered, selectedDomainId, isInSelectedDomain, opacity]);
  
  // Animações de hover
  const springProps = useSpring({
    scale: isHovered ? 1.4 : 1.0,
    labelOpacity: isHovered ? 1.0 : 0.0,
    config: { tension: 300, friction: 20 },
  });
  
  // userData para raycasting
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.nodeId = word.palavra;
      groupRef.current.userData.nodeType = 'word';
      groupRef.current.userData.word = word;
    }
    if (meshRef.current) {
      meshRef.current.userData.nodeId = word.palavra;
      meshRef.current.userData.nodeType = 'word';
      meshRef.current.userData.word = word;
    }
  }, [word]);
  
  return (
    <animated.group ref={groupRef} scale={springProps.scale}>
      {/* Mini-Planeta */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[planetRadius, 24, 24]} />
        <planetShaderMaterial
          ref={materialRef}
          map={texture}
          uDomainColor={domainColorObj}
          uHueShift={word.hueShift}
          uEmissiveIntensity={0.3}
          uHoverIntensity={0.0}
          uColorMixStrength={0.2}
        />
      </mesh>
      
      {/* Label Flutuante (aparece no hover) */}
      {isHovered && (
        <Text
          position={[0, planetRadius + 0.3, 0]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.015}
          outlineColor="#000000"
          font="/fonts/Inter-Bold.woff"
        >
          {word.palavra}
          <animated.meshBasicMaterial
            transparent
            opacity={springProps.labelOpacity}
          />
        </Text>
      )}
      
      {/* Indicador de Frequência (pequeno anel no hover) */}
      {isHovered && (
        <animated.mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[planetRadius * 1.2, planetRadius * 1.3, 32]} />
          <animated.meshBasicMaterial
            color={domainColor}
            transparent
            opacity={springProps.labelOpacity.to(o => o * 0.6)}
            side={THREE.DoubleSide}
          />
        </animated.mesh>
      )}
    </animated.group>
  );
}
