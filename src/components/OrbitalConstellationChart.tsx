import { Badge } from "@/components/ui/badge";

interface WordData {
  word: string;
  strength: number;
  category: string;
  color: string;
}

interface OrbitalConstellationChartProps {
  centerWord?: string;
}

export const OrbitalConstellationChart = ({ 
  centerWord = "verso" 
}: OrbitalConstellationChartProps) => {
  // Dados de prosódia semântica com palavras organizadas por força
  const words: WordData[] = [
    // Órbita Interna: 90-100%
    { word: "açoite", strength: 95, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
    { word: "desgarrou", strength: 94, category: "Solidão e Abandono", color: "hsl(var(--chart-1))" },
    { word: "redomona", strength: 93, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
    { word: "suados", strength: 93, category: "Extensão de Identidade", color: "hsl(var(--chart-2))" },
    { word: "campereada", strength: 92, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
    { word: "caindo", strength: 91, category: "Fim de Ciclo", color: "hsl(var(--chart-3))" },
    { word: "esporas", strength: 90, category: "Solidão e Abandono", color: "hsl(var(--chart-1))" },
    
    // Órbita Intermediária: 70-89%
    { word: "várzea", strength: 89, category: "Refúgio e Frustração", color: "hsl(var(--chart-4))" },
    { word: "desencilhou", strength: 88, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
    { word: "lonjuras", strength: 88, category: "Fim de Ciclo", color: "hsl(var(--chart-3))" },
    { word: "gateada", strength: 88, category: "Extensão de Identidade", color: "hsl(var(--chart-2))" },
    { word: "galpão", strength: 87, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
    { word: "prenda", strength: 86, category: "Refúgio e Frustração", color: "hsl(var(--chart-4))" },
    { word: "encostada", strength: 86, category: "Solidão e Abandono", color: "hsl(var(--chart-1))" },
    { word: "sonhos", strength: 85, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
    { word: "tarde", strength: 85, category: "Fim de Ciclo", color: "hsl(var(--chart-3))" },
    { word: "respeito", strength: 85, category: "Extensão de Identidade", color: "hsl(var(--chart-2))" },
    { word: "gateado", strength: 84, category: "Refúgio e Frustração", color: "hsl(var(--chart-4))" },
    { word: "campeira", strength: 82, category: "Protagonista Personificado", color: "hsl(var(--primary))" },
    { word: "recostada", strength: 82, category: "Solidão e Abandono", color: "hsl(var(--chart-1))" },
    { word: "olhos negros", strength: 81, category: "Dor e Nostalgia", color: "hsl(var(--destructive))" },
    { word: "querência", strength: 79, category: "Extensão de Identidade", color: "hsl(var(--chart-2))" },
    { word: "desgarrou", strength: 78, category: "Refúgio e Frustração", color: "hsl(var(--chart-4))" },
  ];

  // Calcula a órbita baseado na força (90-100% = órbita 1, 80-89% = órbita 2, etc)
  const getOrbit = (strength: number) => {
    if (strength >= 90) return 1;
    if (strength >= 80) return 2;
    if (strength >= 70) return 3;
    return 4;
  };

  // Organiza palavras por órbita
  const wordsByOrbit = words.reduce((acc, word) => {
    const orbit = getOrbit(word.strength);
    if (!acc[orbit]) acc[orbit] = [];
    acc[orbit].push(word);
    return acc;
  }, {} as Record<number, WordData[]>);

  const centerX = 400;
  const centerY = 300;
  const orbitRadii = {
    1: 80,
    2: 140,
    3: 200,
    4: 260,
  };

  // Calcula posição de cada palavra em sua órbita
  const getWordPosition = (word: WordData, index: number, totalInOrbit: number) => {
    const orbit = getOrbit(word.strength);
    const radius = orbitRadii[orbit as keyof typeof orbitRadii];
    const angle = (index / totalInOrbit) * 2 * Math.PI - Math.PI / 2; // Start at top
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      orbit,
      radius,
    };
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full bg-gradient-to-br from-background to-muted/20 rounded-lg border p-4 overflow-hidden">
        <svg width="800" height="600" viewBox="0 0 800 600" className="w-full h-auto">
          {/* Órbitas (círculos concêntricos) */}
          {[1, 2, 3, 4].map((orbit) => (
            <circle
              key={orbit}
              cx={centerX}
              cy={centerY}
              r={orbitRadii[orbit as keyof typeof orbitRadii]}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray={orbit === 1 ? "0" : "4 4"}
              opacity={0.3}
            />
          ))}

          {/* Linhas conectando palavras ao centro */}
          {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) =>
            wordsInOrbit.map((word, index) => {
              const pos = getWordPosition(word, index, wordsInOrbit.length);
              return (
                <line
                  key={`line-${word.word}-${index}`}
                  x1={centerX}
                  y1={centerY}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={word.color}
                  strokeWidth="1"
                  opacity="0.2"
                />
              );
            })
          )}

          {/* Palavra central */}
          <g>
            <circle
              cx={centerX}
              cy={centerY}
              r="35"
              fill="hsl(var(--primary))"
              opacity="0.9"
            />
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-primary-foreground font-bold text-xl"
            >
              {centerWord}
            </text>
          </g>

          {/* Palavras orbitando */}
          {Object.entries(wordsByOrbit).map(([orbit, wordsInOrbit]) =>
            wordsInOrbit.map((word, index) => {
              const pos = getWordPosition(word, index, wordsInOrbit.length);
              return (
                <g key={`word-${word.word}-${index}`}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="6"
                    fill={word.color}
                    opacity="0.8"
                  />
                  <text
                    x={pos.x}
                    y={pos.y - 12}
                    textAnchor="middle"
                    className="fill-foreground text-xs font-medium"
                    style={{ fontSize: '11px' }}
                  >
                    {word.word}
                  </text>
                  <text
                    x={pos.x}
                    y={pos.y + 18}
                    textAnchor="middle"
                    className="fill-muted-foreground text-xs"
                    style={{ fontSize: '9px' }}
                  >
                    {word.strength}%
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>

      {/* Legenda */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
          <span>Protagonista Personificado</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--destructive))" }} />
          <span>Dor e Nostalgia</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-4))" }} />
          <span>Refúgio e Frustração</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-3))" }} />
          <span>Fim de Ciclo</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
          <span>Solidão e Abandono</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
          <span>Extensão de Identidade</span>
        </div>
      </div>

      {/* Explicação das órbitas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded bg-muted/30">
          <div className="font-semibold mb-1">Órbita Interna</div>
          <div className="text-muted-foreground">90-100%</div>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <div className="font-semibold mb-1">Órbita Intermediária</div>
          <div className="text-muted-foreground">80-89%</div>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <div className="font-semibold mb-1">Órbita Externa</div>
          <div className="text-muted-foreground">70-79%</div>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <div className="font-semibold mb-1">Órbita Periférica</div>
          <div className="text-muted-foreground">&lt;70%</div>
        </div>
      </div>
    </div>
  );
};
