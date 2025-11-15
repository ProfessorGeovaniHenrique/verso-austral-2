import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useInteractivityStore, selectCamera, selectSelectedDomainId } from '@/store/interactivityStore';
import { animateDomainZoom, animateCameraReset } from '@/lib/gsapAnimations';
import * as THREE from 'three';

interface UseCameraAnimationProps {
  nodes: any[];
  defaultCameraPosition?: THREE.Vector3;
  defaultCameraTarget?: THREE.Vector3;
}

export function useCameraAnimation({
  nodes,
  defaultCameraPosition = new THREE.Vector3(0, 5, 30),
  defaultCameraTarget = new THREE.Vector3(0, 0, 0),
}: UseCameraAnimationProps) {
  const { camera, scene } = useThree();
  const { setCameraAnimating, camera: cameraState } = useInteractivityStore();
  const selectedDomainId = useInteractivityStore(selectSelectedDomainId);
  
  const controlsTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Animar zoom para domínio selecionado
  useEffect(() => {
    if (!selectedDomainId) return;
    
    const domainNode = nodes.find(
      n => n.type === 'domain' && n.id === selectedDomainId
    );
    
    if (!domainNode) return;
    
    setCameraAnimating(true);
    
    const timeline = animateDomainZoom(
      camera,
      controlsTargetRef.current,
      domainNode.position,
      domainNode.label,
      scene
    );
    
    timeline.then(() => {
      setCameraAnimating(false);
    });
    // Nota: setCameraAnimating é estável do Zustand
  }, [selectedDomainId, nodes, camera, scene]);
  
  // Reset de câmera
  useEffect(() => {
    if (!cameraState.shouldReset) return;
    
    setCameraAnimating(true);
    
    const timeline = animateCameraReset(
      camera,
      controlsTargetRef.current,
      defaultCameraPosition,
      defaultCameraTarget,
      scene
    );
    
    timeline.then(() => {
      setCameraAnimating(false);
    });
    // Nota: setCameraAnimating é estável do Zustand
  }, [cameraState.shouldReset, camera, scene, defaultCameraPosition, defaultCameraTarget]);
  
  return {
    controlsTarget: controlsTargetRef.current,
  };
}
