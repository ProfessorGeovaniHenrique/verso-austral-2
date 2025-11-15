import { useMemo } from 'react';
import * as THREE from 'three';

interface LatLongGridProps {
  radius: number;
  opacity?: number;
}

export function LatLongGrid({ radius, opacity = 0.25 }: LatLongGridProps) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 72; // Suavidade das linhas

    // Linhas de Latitude (horizontais)
    for (let lat = -75; lat <= 75; lat += 15) {
      for (let i = 0; i <= segments; i++) {
        const lon = (i / segments) * 360 - 180;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        points.push(new THREE.Vector3(x, y, z));
      }
    }

    // Linhas de Longitude (verticais)
    for (let lon = -180; lon < 180; lon += 15) {
      for (let i = 0; i <= segments; i++) {
        const lat = (i / segments) * 180 - 90;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        points.push(new THREE.Vector3(x, y, z));
      }
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#00ff88" transparent opacity={opacity} />
    </lineSegments>
  );
}
