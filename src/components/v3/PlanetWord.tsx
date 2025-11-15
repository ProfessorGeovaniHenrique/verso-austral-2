import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { SemanticWord } from '@/data/types/fogPlanetVisualization.types';
import { VisualWordNode } from '@/data/types/threeVisualization.types';
import { useInteractivityStore, selectHover, selectSelectedDomainId } from '@/store/interactivityStore';
import * as THREE from 'three';

interface PlanetWordProps {
  word: SemanticWord;
  domainColor: string;
  domainPosition: [number, number, number];
  opacity: number;
  isInSelectedDomain: boolean;
  preloadedTexture?: THREE.Texture; // Textura pré-carregada (otimização)
}

export function PlanetWord({ 
  word, 
  domainColor, 
  domainPosition, 
  opacity,
  isInSelectedDomain,
  preloadedTexture 
}: PlanetWordProps) {
  // Refs
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const orbitalAngleRef = useRef(word.orbitalAngle);
  
  // Three.js
  const { gl } = useThree();
  
  // Store
  const hover = useInteractivityStore(selectHover);
  const selectedDomainId = useInteractivityStore(selectSelectedDomainId);
  
  // States
  const isHovered = hover.hoveredNodeId === word.palavra;
  
  // Sempre carregar a textura (useTexture faz cache automaticamente)
  const texture = useTexture(word.planetTexture) as THREE.Texture;
  
  // Converter cor HSL para THREE.Color
  const domainColorObj = useMemo(() => new THREE.Color(domainColor), [domainColor]);
  
  // Calcular tamanho do planeta baseado na frequência
  const planetRadius = useMemo(() => {
    // Recalibrado para o range REAL do corpus gaúcho (1-28 ocorrências)
    const baseSize = 0.25;  // Era 0.15 → +67% maior
    const maxSize = 0.6;    // Era 0.35 → +71% maior
    const minSize = 0.18;   // Era 0.12 → +50% maior
    
    // Normalizar para o range do corpus (max ~30 ocorrências)
    const normalizedFreq = Math.min(word.ocorrencias / 30, 1.0);
    
    // Curva de crescimento não-linear (raiz quadrada para amplificar diferenças pequenas)
    const scaleFactor = Math.sqrt(normalizedFreq);
    
    const calculatedSize = baseSize + (scaleFactor * (maxSize - baseSize));
    
    // Garantir tamanho mínimo visível
    return Math.max(calculatedSize, minSize);
  }, [word.ocorrencias]);
  
  // Movimento orbital em espiral
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Atualizar ângulo orbital
      orbitalAngleRef.current += word.orbitalSpeed * delta;
      
      // Calcular posição orbital ELÍPTICA (sem espiral)
      const a = word.orbitalRadius; // Semi-eixo maior
      const b = word.orbitalRadius * (1 - word.orbitalEccentricity); // Semi-eixo menor
      
      // Posição X e Z (órbita elíptica no plano horizontal)
      const x = domainPosition[0] + a * Math.cos(orbitalAngleRef.current);
      const z = domainPosition[2] + b * Math.sin(orbitalAngleRef.current);
      
      // Variação em Y AUMENTADA para evitar colisões verticais
      // Usar um offset único por palavra baseado no seu nome
      const wordHash = word.palavra.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const yOffset = ((wordHash % 100) / 100) * 1.2 - 0.6; // -0.6 a +0.6 (era -0.4 a +0.4)
      const y = domainPosition[1] + yOffset;
      
      groupRef.current.position.set(x, y, z);
    }
    
    // Rotação suave do planeta em seu próprio eixo
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.x += delta * 0.05;
    }
  });
  
  // Opacidade contextual com VARIAÇÃO por Prosódia
  const finalOpacity = useMemo(() => {
    let baseOpacity = opacity;
    
    // Palavras com prosódia positiva são mais opacas/visíveis
    if (word.prosody === 'Positiva') {
      baseOpacity = Math.min(opacity * 1.2, 1.0);
    } else if (word.prosody === 'Negativa') {
      baseOpacity = opacity * 0.85;
    }
    
    if (isHovered) return 1.0;
    if (selectedDomainId && !isInSelectedDomain) {
      return 0.2; // Palavras de outros domínios ficam bem transparentes
    }
    return baseOpacity;
  }, [isHovered, selectedDomainId, isInSelectedDomain, opacity, word.prosody]);
  
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
      {/* Planeta com Material Nativo */}
      <mesh 
        ref={meshRef}
        renderOrder={10}
        onClick={(e) => {
          e.stopPropagation();
          // Criar um VisualWordNode compatível a partir do SemanticWord
          const visualNode: VisualWordNode = {
            id: word.palavra,
            label: word.palavra,
            type: 'word',
            position: [0, 0, 0], // Posição será calculada dinamicamente
            scale: planetRadius,
            color: domainColor,
            opacity: finalOpacity,
            baseOpacity: opacity,
            glowIntensity: isHovered ? 0.4 : 0.2,
            domain: word.dominio,
            frequency: word.ocorrencias,
            prosody: word.prosody,
            rawData: {
              text: word.palavra,
              rawFrequency: word.ocorrencias,
              normalizedFrequency: word.ocorrencias,
              prosody: word.prosody
            }
          };
          useInteractivityStore.getState().openModal(visualNode);
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
        <sphereGeometry args={[planetRadius, 24, 24]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={finalOpacity}
          emissive={domainColorObj}
          emissiveIntensity={isHovered ? 0.4 : 0.2}
          roughness={0.7}
          metalness={0.3}
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
