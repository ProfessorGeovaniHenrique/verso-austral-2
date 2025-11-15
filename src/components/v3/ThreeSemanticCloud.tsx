import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useState, useRef, useEffect } from 'react';
import { Text3DNode } from './Text3DNode';
import { ConnectionLines } from './ConnectionLines';
import { ThreeCloudNode, DomainConnection } from '@/hooks/useThreeSemanticData';
import * as THREE from 'three';
import gsap from 'gsap';

interface ThreeSemanticCloudProps {
  nodes: ThreeCloudNode[];
  connections: DomainConnection[];
  font: string;
  autoRotate: boolean;
  bloomEnabled: boolean;
  showConnections: boolean;
  onWordClick: (node: ThreeCloudNode) => void;
  onWordHover: (node: ThreeCloudNode | null) => void;
  onDomainClick?: (node: ThreeCloudNode) => void;
  cameraRef?: React.MutableRefObject<any>;
  filteredNodeIds?: Set<string>;
}

function Scene({ 
  nodes, 
  connections,
  font, 
  autoRotate,
  showConnections,
  onWordClick, 
  onWordHover,
  onDomainClick,
  filteredNodeIds
}: Omit<ThreeSemanticCloudProps, 'bloomEnabled' | 'cameraRef'>) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [cascadeNodes, setCascadeNodes] = useState<Set<string>>(new Set());
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<Map<string, THREE.Group>>(new Map());
  
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
    
    // Hover cascade effect
    if (node.type === 'word') {
      const sameDomainNodes = nodes
        .filter(n => n.domain === node.domain && n.id !== node.id)
        .map(n => n.id);
      setCascadeNodes(new Set(sameDomainNodes));
    }
  };
  
  const handlePointerOut = () => {
    setHoveredNodeId(null);
    onWordHover(null);
    setCascadeNodes(new Set());
    document.body.style.cursor = 'auto';
  };
  
  const handleClick = (node: ThreeCloudNode) => (e: any) => {
    e.stopPropagation();
    
    if (node.type === 'domain' && onDomainClick) {
      onDomainClick(node);
    } else if (node.type === 'word') {
      onWordClick(node);
    }
  };
  
  // Aplicar cascade opacity effect
  useEffect(() => {
    if (cascadeNodes.size > 0) {
      nodes.forEach(node => {
        const nodeGroup = nodesRef.current.get(node.id);
        if (!nodeGroup) return;
        
        // Navegar até o material do Text mesh
        const billboard = nodeGroup.children[0];
        if (billboard && billboard.children[0]) {
          const textMesh = billboard.children[0] as THREE.Mesh;
          if (textMesh.material) {
            const targetOpacity = cascadeNodes.has(node.id) ? 0.8 : 
                                 hoveredNodeId === node.id ? 1.0 : 0.2;
            
            gsap.to(textMesh.material, {
              opacity: targetOpacity,
              duration: 0.3
            });
          }
        }
      });
    } else if (!hoveredNodeId) {
      // Reset all opacities
      nodes.forEach(node => {
        const nodeGroup = nodesRef.current.get(node.id);
        if (nodeGroup) {
          const billboard = nodeGroup.children[0];
          if (billboard && billboard.children[0]) {
            const textMesh = billboard.children[0] as THREE.Mesh;
            if (textMesh.material) {
              gsap.to(textMesh.material, {
                opacity: node.baseOpacity,
                duration: 0.3
              });
            }
          }
        }
      });
    }
  }, [cascadeNodes, hoveredNodeId, nodes]);
  
  return (
    <>
      <group ref={groupRef}>
        {nodes.map(node => {
          const isFiltered = filteredNodeIds && !filteredNodeIds.has(node.id);
          const opacity = isFiltered ? 0.05 : node.baseOpacity;
          
          return (
            <group 
              key={node.id} 
              ref={(ref) => {
                if (ref) nodesRef.current.set(node.id, ref);
              }}
            >
              <Text3DNode
                node={{ ...node, baseOpacity: opacity }}
                font={font}
                isHovered={hoveredNodeId === node.id}
                onPointerOver={handlePointerOver(node)}
                onPointerOut={handlePointerOut}
                onClick={handleClick(node)}
              />
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
  onWordClick, 
  onWordHover,
  onDomainClick,
  cameraRef,
  filteredNodeIds
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
            connections={connections}
            font={font}
            autoRotate={autoRotate}
            showConnections={showConnections}
            onWordClick={onWordClick}
            onWordHover={onWordHover}
            onDomainClick={onDomainClick}
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
