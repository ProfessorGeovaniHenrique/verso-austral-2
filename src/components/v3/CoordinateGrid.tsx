import { useMemo } from 'react';
import * as THREE from 'three';

export function CoordinateGrid() {
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(100, 20, '#004466', '#001133');
    grid.position.y = -5;
    
    // Ajustar opacidade
    const material = grid.material as THREE.Material;
    material.transparent = true;
    material.opacity = 0.15;
    
    return grid;
  }, []);

  return <primitive object={gridHelper} />;
}
