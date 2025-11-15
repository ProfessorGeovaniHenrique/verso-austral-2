import { useEffect, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useInteractivityStore } from '@/store/interactivityStore';
import { VisualNode, VisualWordNode, VisualDomainNode } from '@/data/types/threeVisualization.types';

interface UseRaycastingProps {
  nodes: VisualNode[];
  enabled?: boolean;
}

export function useRaycasting({ nodes, enabled = true }: UseRaycastingProps) {
  const { camera, gl, scene } = useThree();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // Usar ref para evitar que callbacks sejam recriados constantemente
  const nodesRef = useRef<VisualNode[]>(nodes);
  
  // Atualizar ref quando nodes mudar
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  const { 
    showTooltip, 
    hideTooltip, 
    updateTooltipPosition,
    openModal,
    setHoveredNode,
  } = useInteractivityStore();
  
  // Mapa de objetos 3D para nós de dados
  const objectToNodeMap = new Map<THREE.Object3D, VisualNode>();
  
  // Construir mapa de objetos 3D (não precisa mais com a abordagem de ref)
  // useEffect removido para evitar re-execuções desnecessárias
  
  // Handler de mouse move (hover)
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!enabled) return;
    
    // Calcular posição do mouse normalizada
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycasting
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Encontrar primeiro objeto com userData válido
    let foundNode: VisualNode | null = null;
    let foundObject: THREE.Object3D | null = null;
    
    for (const intersect of intersects) {
      let obj = intersect.object;
      
      // Subir na hierarquia até encontrar um objeto com nodeId
      while (obj) {
        if (obj.userData.nodeId) {
          // Usar nodesRef para evitar dependência de nodes
          const node = nodesRef.current.find(n => n.id === obj.userData.nodeId);
          if (node) {
            foundNode = node;
            foundObject = obj;
            break;
          }
        }
        obj = obj.parent as THREE.Object3D;
      }
      
      if (foundNode) break;
    }
    
    if (foundNode) {
      // Hover cascade effect
      setHoveredNode(foundNode.id, foundNode.type);
      
      // Mostrar tooltip
      const tooltipData = createTooltipData(foundNode);
      showTooltip(tooltipData, { x: event.clientX, y: event.clientY });
      
      // Atualizar cursor
      gl.domElement.style.cursor = 'pointer';
    } else {
      // Nenhum objeto sob o mouse
      setHoveredNode(null, null);
      hideTooltip();
      gl.domElement.style.cursor = 'default';
    }
    // Nota: funções do Zustand são estáveis, nodes usa ref
  }, [enabled, camera, scene, gl]);
  
  // Handler de click
  const handleClick = useCallback((event: MouseEvent) => {
    if (!enabled) return;
    
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    for (const intersect of intersects) {
      let obj = intersect.object;
      
      while (obj) {
        if (obj.userData.nodeId) {
          // Usar nodesRef para evitar dependência de nodes
          const node = nodesRef.current.find(n => n.id === obj.userData.nodeId);
          if (node) {
            handleNodeClick(node);
            return;
          }
        }
        obj = obj.parent as THREE.Object3D;
      }
    }
  }, [enabled, camera, scene, gl]);
  
  // Handler de node click (lógica de negócio)
  const handleNodeClick = useCallback((node: VisualNode) => {
    if (node.type === 'word') {
      // Palavra: abrir modal KWIC
      openModal(node);
    } else if (node.type === 'domain') {
      // Domínio: zoom (será tratado pelo useCameraAnimation)
      // A lógica de zoom está no componente principal
    }
    // Nota: openModal é estável do Zustand
  }, []);
  
  // Criar dados do tooltip a partir do nó
  const createTooltipData = (node: VisualNode) => {
    if (node.type === 'word') {
      const wordNode = node as VisualWordNode;
      return {
        title: node.label,
        domain: {
          name: wordNode.domain,
          color: node.color,
        },
        frequency: {
          raw: wordNode.rawData.rawFrequency,
          normalized: wordNode.rawData.normalizedFrequency,
        },
        prosody: {
          type: wordNode.prosody,
        },
        type: 'word' as const,
      };
    } else {
      const domainNode = node as VisualDomainNode;
      return {
        title: node.label,
        domain: {
          name: node.label,
          color: node.color,
        },
        frequency: {
          raw: domainNode.rawData.rawFrequency,
          normalized: domainNode.rawData.normalizedFrequency,
        },
        prosody: {
          type: 'Neutra' as const,
        },
        lexicalRichness: domainNode.rawData.lexicalRichness,
        textualWeight: domainNode.rawData.textualWeight,
        type: 'domain' as const,
      };
    }
  };
  
  // Registrar event listeners
  useEffect(() => {
    if (!enabled) return;
    
    const canvas = gl.domElement;
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      
      // Cleanup - usar funções diretamente sem chamar no cleanup para evitar loops
      // O estado será limpo naturalmente quando o componente desmontar
      gl.domElement.style.cursor = 'default';
    };
  }, [enabled, handleMouseMove, handleClick, gl]);
  
  return {
    // Expor para uso externo se necessário
    handleNodeClick,
  };
}
