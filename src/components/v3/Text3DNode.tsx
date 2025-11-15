import { Text, Billboard } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { ThreeCloudNode } from '@/hooks/useThreeSemanticData';

interface Text3DNodeProps {
  node: ThreeCloudNode;
  font: string;
  isHovered: boolean;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

export function Text3DNode({ 
  node, 
  font, 
  isHovered, 
  onPointerOver, 
  onPointerOut, 
  onClick 
}: Text3DNodeProps) {
  const isDomain = node.type === 'domain';
  
  // Mapear nome de fonte para arquivo (fallback para Arial)
  const getFontPath = (fontName: string) => {
    const fontMap: Record<string, string> = {
      'Orbitron': 'Orbitron',
      'Audiowide': 'Audiowide',
      'Rajdhani': 'Rajdhani',
      'Arial': 'Arial'
    };
    return fontMap[fontName] || 'Arial';
  };
  
  return (
    <Billboard
      follow={true}
      lockX={false}
      lockY={false}
      lockZ={false}
      position={node.position}
    >
      <Text
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
          emissiveIntensity={isHovered ? 1.2 : (isDomain ? 0.6 : 0.3)}
          toneMapped={false}
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
  );
}
