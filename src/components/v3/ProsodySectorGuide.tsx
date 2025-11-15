import { Line } from '@react-three/drei';

/**
 * Guia visual mostrando os setores de prosódia
 * (opcional, para ajudar usuário a entender a distribuição)
 */
export function ProsodySectorGuide({ visible = false }: { visible?: boolean }) {
  if (!visible) return null;
  
  const radius = 4.5; // Raio máximo das órbitas
  
  return (
    <group>
      {/* Linha 0° - 120° (Prosódia Positiva) - Verde */}
      <Line
        points={[[0, 0, 0], [radius, 0, 0]]}
        color="#4ade80"
        lineWidth={1}
        opacity={0.3}
      />
      
      {/* Linha 120° - 240° (Prosódia Neutra) - Amarelo */}
      <Line
        points={[[0, 0, 0], [radius * Math.cos(Math.PI * 2 / 3), 0, radius * Math.sin(Math.PI * 2 / 3)]]}
        color="#fbbf24"
        lineWidth={1}
        opacity={0.3}
      />
      
      {/* Linha 240° - 360° (Prosódia Negativa) - Vermelho */}
      <Line
        points={[[0, 0, 0], [radius * Math.cos(Math.PI * 4 / 3), 0, radius * Math.sin(Math.PI * 4 / 3)]]}
        color="#f87171"
        lineWidth={1}
        opacity={0.3}
      />
      
      {/* Círculos de camadas (opcional) */}
      {[1.0, 2.0, 3.0, 4.0].map((r) => (
        <mesh key={r} rotation-x={Math.PI / 2} position={[0, -0.01, 0]}>
          <ringGeometry args={[r - 0.02, r + 0.02, 64]} />
          <meshBasicMaterial color="#ffffff" opacity={0.1} transparent />
        </mesh>
      ))}
    </group>
  );
}
