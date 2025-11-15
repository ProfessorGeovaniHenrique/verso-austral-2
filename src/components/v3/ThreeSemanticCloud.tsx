import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useRef } from 'react';
import { InteractiveDomain } from './InteractiveDomain';
import { InteractiveWord } from './InteractiveWord';
import { ConnectionLines } from './ConnectionLines';
import { VisualNode, DomainConnection } from '@/data/types/threeVisualization.types';
import { useRaycasting } from '@/hooks/useRaycasting';
import { useCameraAnimation } from '@/hooks/useCameraAnimation';
import { COSMIC_STYLE } from '@/config/visualStyle';
import * as THREE from 'three';

interface ThreeSemanticCloudProps {
  nodes: VisualNode[];
  connections: DomainConnection[];
  font: string;
  autoRotate: boolean;
  bloomEnabled: boolean;
  showConnections: boolean;
  filteredNodeIds?: Set<string>;
}

function Scene({ 
  nodes, 
  connections,
  font, 
  autoRotate,
  showConnections,
  filteredNodeIds
}: Omit<ThreeSemanticCloudProps, 'bloomEnabled'>) {
  const groupRef = useRef<THREE.Group>(null);
  
  console.log('🌌 Scene recebeu nodes:', nodes.length);
  console.log('🔍 Primeiro node:', nodes[0]);
  console.log('📊 Tipos de nodes:', nodes.map(n => n.type));
  
  // Hook de raycasting integrado com Zustand
  useRaycasting({ nodes, enabled: true });
  
  // Hook de animação de câmera integrado com Zustand
  const { controlsTarget } = useCameraAnimation({ 
    nodes,
    defaultCameraPosition: new THREE.Vector3(0, 5, 30),
    defaultCameraTarget: new THREE.Vector3(0, 0, 0)
  });
  
  return (
    <>
      <group ref={groupRef}>
        {nodes.map(node => {
          const isFiltered = filteredNodeIds && !filteredNodeIds.has(node.id);
          const opacity = isFiltered ? 0.05 : node.baseOpacity;
          
          return (
            <group key={node.id}>
              {node.type === 'domain' ? (
                <InteractiveDomain
                  node={node}
                  opacity={opacity}
                />
              ) : (
                <InteractiveWord
                  node={node}
                  opacity={opacity}
                  font={font}
                />
              )}
            </group>
          );
        })}
      </group>
      
      <ConnectionLines 
        connections={connections}
        nodes={nodes}
        visible={showConnections}
      />
    </>
  );
}

export function ThreeSemanticCloud({ 
  nodes,
  connections,
  font, 
  autoRotate, 
  bloomEnabled,
  showConnections,
  filteredNodeIds
}: ThreeSemanticCloudProps) {
  return (
    <div className="w-full h-full bg-slate-950">
      <Canvas>
        {/* Câmera com posição inicial */}
        <PerspectiveCamera 
          makeDefault 
          position={[0, 15, 30]}
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
        
        {/* Background de estrelas e ambiente */}
        <Stars
          radius={COSMIC_STYLE.environment.backgroundStars.radius}
          depth={50}
          count={COSMIC_STYLE.environment.backgroundStars.count}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
        
        <Environment preset={COSMIC_STYLE.environment.preset} />
        
        {/* Renderizar nós */}
      <Suspense fallback={null}>
        <Scene 
          nodes={nodes}
          connections={connections}
          font={font}
          autoRotate={autoRotate}
          showConnections={showConnections}
          filteredNodeIds={filteredNodeIds}
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
