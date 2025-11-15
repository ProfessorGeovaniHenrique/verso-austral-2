import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface OrbitalRingsProps {
  planets: Array<{
    id: string;
    position: [number, number, number];
    radius: number;
  }>;
}

export function OrbitalRings({ planets }: OrbitalRingsProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (groupRef.current) {
      // Rotação lenta do grupo inteiro
      groupRef.current.rotation.y = time * 0.05;
    }
  });

  const createOrbitPoints = (center: [number, number, number], radius: number) => {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = center[0] + Math.cos(angle) * (radius + 2);
      const y = center[1];
      const z = center[2] + Math.sin(angle) * (radius + 2);
      points.push(new THREE.Vector3(x, y, z));
    }
    
    return points;
  };

  return (
    <group ref={groupRef}>
      {planets.map((planet) => {
        const orbitPoints = createOrbitPoints(planet.position, planet.radius);
        
        return (
          <Line
            key={`orbit-${planet.id}`}
            points={orbitPoints}
            color="#00d9ff"
            lineWidth={1.5}
            transparent
            opacity={0.25}
            dashed
            dashScale={10}
            dashSize={0.5}
            gapSize={0.3}
          />
        );
      })}
    </group>
  );
}
