import { Line } from '@react-three/drei';

/**
 * Guia visual mostrando as 6 camadas orbitais e setores de prosódia
 * Camadas agora são RELATIVAS ao fogRadius do domínio selecionado
 */
export function ProsodySectorGuide({ 
  visible = false,
  domainFogRadius = 2.0
}: { 
  visible?: boolean;
  domainFogRadius?: number;
}) {
  if (!visible) return null;
  
  // ✅ CAMADAS RELATIVAS (fatores do fogRadius)
  const orbitalLayerFactors = [0.85, 1.2, 1.6, 2.1, 2.8, 3.8];
  
  return (
    <group>
      {/* Círculos das 6 camadas orbitais RELATIVAS */}
      {orbitalLayerFactors.map((factor, idx) => {
        const radius = domainFogRadius * factor;
        return (
          <mesh key={idx} rotation-x={Math.PI / 2} position={[0, -0.01, 0]}>
            <ringGeometry args={[radius - 0.03, radius + 0.03, 64]} />
            <meshBasicMaterial 
              color="#00ffff" 
              opacity={0.2} 
              transparent 
            />
          </mesh>
        );
      })}
      
      {/* Linhas divisórias de setores de prosódia */}
      {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((angle, idx) => {
        const colors = ['#4ade80', '#fbbf24', '#f87171'];
        const maxRadius = domainFogRadius * 4.5;
        return (
          <Line
            key={idx}
            points={[
              [0, 0, 0], 
              [maxRadius * Math.cos(angle), 0, maxRadius * Math.sin(angle)]
            ]}
            color={colors[idx]}
            lineWidth={2}
            opacity={0.4}
          />
        );
      })}
    </group>
  );
}
