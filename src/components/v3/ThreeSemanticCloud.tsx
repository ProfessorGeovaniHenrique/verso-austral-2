import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useState, useRef } from 'react';
import { Text3DNode } from './Text3DNode';
import { ThreeCloudNode } from '@/hooks/useThreeSemanticData';
import * as THREE from 'three';

interface ThreeSemanticCloudProps {
  nodes: ThreeCloudNode[];
  font: string;
  autoRotate: boolean;
  bloomEnabled: boolean;
  onWordClick: (node: ThreeCloudNode) => void;
  onWordHover: (node: ThreeCloudNode | null) => void;
  cameraRef?: React.MutableRefObject<any>;
}

function Scene({ 
  nodes, 
  font, 
  autoRotate, 
  onWordClick, 
  onWordHover 
}: Omit<ThreeSemanticCloudProps, 'bloomEnabled' | 'cameraRef'>) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Rotação automática suave
  useFrame((state, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });
  
  const handlePointerOver = (node: ThreeCloudNode) => (e: any) => {
    e.stopPropagation();
    setHoveredNodeId(node.id);
    onWordHover(node);
    document.body.style.cursor = 'pointer';
  };
  
  const handlePointerOut = () => {
    setHoveredNodeId(null);
    onWordHover(null);
    document.body.style.cursor = 'auto';
  };
  
  const handleClick = (node: ThreeCloudNode) => (e: any) => {
    e.stopPropagation();
    onWordClick(node);
  };
  
  return (
    <group ref={groupRef}>
      {nodes.map(node => (
        <Text3DNode
          key={node.id}
          node={node}
          font={font}
          isHovered={hoveredNodeId === node.id}
          onPointerOver={handlePointerOver(node)}
          onPointerOut={handlePointerOut}
          onClick={handleClick(node)}
        />
      ))}
    </group>
  );
}

export function ThreeSemanticCloud({ 
  nodes, 
  font, 
  autoRotate, 
  bloomEnabled,
  onWordClick, 
  onWordHover,
  cameraRef
}: ThreeSemanticCloudProps) {
  return (
    <div className="w-full h-full bg-slate-950">
      <Canvas>
        {/* Câmera com posição inicial */}
        <PerspectiveCamera 
          makeDefault 
          position={[0, 15, 30]} 
          ref={cameraRef}
        />
        
        {/* Controles orbitais */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={10}
          maxDistance={80}
          autoRotate={false}
        />
        
        {/* Iluminação */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#06b6d4" />
        
        {/* Background de estrelas */}
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
        
        {/* Renderizar nós */}
        <Suspense fallback={null}>
          <Scene
            nodes={nodes}
            font={font}
            autoRotate={autoRotate}
            onWordClick={onWordClick}
            onWordHover={onWordHover}
          />
        </Suspense>
        
        {/* Post-processing: Bloom (glow effect) */}
        {bloomEnabled && (
          <EffectComposer>
            <Bloom
              intensity={1.5}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              height={300}
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
