import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeCloudNode } from '@/hooks/useThreeSemanticData';

interface DomainConnection {
  from: string;
  to: string;
  strength: number;
}

interface ConnectionLinesProps {
  connections: DomainConnection[];
  nodes: ThreeCloudNode[];
  visible: boolean;
}

export function ConnectionLines({ connections, nodes, visible }: ConnectionLinesProps) {
  if (!visible) return null;

  return (
    <group>
      {connections.map((conn, i) => {
        const fromNode = nodes.find(n => n.domain === conn.from && n.type === 'domain');
        const toNode = nodes.find(n => n.domain === conn.to && n.type === 'domain');
        
        if (!fromNode || !toNode) return null;
        
        const points = [
          new THREE.Vector3(...fromNode.position),
          new THREE.Vector3(...toNode.position)
        ];
        
        const fromColor = new THREE.Color(fromNode.color);
        const toColor = new THREE.Color(toNode.color);
        const lineColor = new THREE.Color().lerpColors(fromColor, toColor, 0.5);
        
        return (
          <Line
            key={`${conn.from}-${conn.to}-${i}`}
            points={points}
            color={lineColor}
            lineWidth={conn.strength * 2}
            transparent
            opacity={0.3 * conn.strength}
            dashed
            dashScale={10}
            dashSize={2}
            gapSize={1}
          />
        );
      })}
    </group>
  );
}
