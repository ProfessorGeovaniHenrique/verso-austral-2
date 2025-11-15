import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface PlanetLabelProps {
  planet: {
    id: string;
    name: string;
    position: [number, number, number];
    radius: number;
    textColor: string;
  };
  visible: boolean;
}

export function PlanetLabel({ planet, visible }: PlanetLabelProps) {
  const labelPosition: [number, number, number] = [
    planet.position[0],
    planet.position[1] + planet.radius + 2,
    planet.position[2]
  ];

  const linePoints = useMemo(() => {
    return [
      new THREE.Vector3(planet.position[0], planet.position[1] + planet.radius, planet.position[2]),
      new THREE.Vector3(labelPosition[0], labelPosition[1] - 0.5, labelPosition[2])
    ];
  }, [planet, labelPosition]);

  if (!visible) return null;

  return (
    <group>
      {/* Linha conectora */}
      <Line
        points={linePoints}
        color={planet.textColor || '#00d9ff'}
        lineWidth={1}
        transparent
        opacity={0.4}
      />

      {/* Label de texto */}
      <Text
        position={labelPosition}
        fontSize={0.6}
        color={planet.textColor || '#00d9ff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {planet.name}
      </Text>

      {/* Background semi-transparente */}
      <mesh position={labelPosition}>
        <planeGeometry args={[planet.name.length * 0.4, 0.8]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}
