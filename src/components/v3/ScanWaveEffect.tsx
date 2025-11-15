import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface ScanWaveEffectProps {
  position: [number, number, number];
  color: string;
  onComplete?: () => void;
}

export function ScanWaveEffect({ position, color, onComplete }: ScanWaveEffectProps) {
  const meshRef = useRef<Mesh>(null);
  const startTime = useRef(Date.now());
  const duration = 1500; // ms

  useFrame(() => {
    if (!meshRef.current) return;
    
    const elapsed = Date.now() - startTime.current;
    const progress = Math.min(elapsed / duration, 1);
    
    // Expandir o anel
    const scale = 0.5 + progress * 2.5;
    meshRef.current.scale.set(scale, scale, 1);
    
    // Fade out
    const material = meshRef.current.material as any;
    material.opacity = 1 - progress;
    
    // Completar e remover
    if (progress >= 1 && onComplete) {
      onComplete();
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[1, 0.1, 16, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={1}
      />
    </mesh>
  );
}
