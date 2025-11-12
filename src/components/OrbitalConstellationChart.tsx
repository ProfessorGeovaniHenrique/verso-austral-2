import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface WordData {
  word: string;
  strength: number;
  category: string;
}

interface Constellation {
  name: string;
  color: string;
  words: WordData[];
}

interface OrbitalConstellationChartProps {
  centerWord?: string;
}

export const OrbitalConstellationChart = ({ 
  centerWord = "verso" 
}: OrbitalConstellationChartProps) => {
  const [selectedConstellation, setSelectedConstellation] = useState<string | null>(null);

  // Cores temáticas para cada categoria semântica
  const categoryColors = {
    "Protagonista Personificado": "#ef4444", // vermelho
    "Fim de Ciclo": "#eab308", // amarelo
    "Dor e Nostalgia": "#8b5cf6", // roxo
    "Refúgio e Frustração": "#f97316", // laranja
    "Solidão e Abandono": "#06b6d4", // ciano
    "Extensão de Identidade": "#22c55e", // verde
  };

  // Dados organizados por constelação (categoria semântica)
  const constellations: Constellation[] = [
    {
      name: "Protagonista Personificado",
      color: categoryColors["Protagonista Personificado"],
      words: [
        { word: "campereada", strength: 92, category: "Protagonista Personificado" },
        { word: "desencilhou", strength: 88, category: "Protagonista Personificado" },
        { word: "sonhou", strength: 85, category: "Protagonista Personificado" },
        { word: "campeira", strength: 82, category: "Protagonista Personificado" },
      ]
    },
    {
      name: "Fim de Ciclo",
      color: categoryColors["Fim de Ciclo"],
      words: [
        { word: "caindo", strength: 91, category: "Fim de Ciclo" },
        { word: "lonjuras", strength: 88, category: "Fim de Ciclo" },
        { word: "tarde", strength: 85, category: "Fim de Ciclo" },
        { word: "cansado", strength: 78, category: "Fim de Ciclo" },
      ]
    },
    {
      name: "Dor e Nostalgia",
      color: categoryColors["Dor e Nostalgia"],
      words: [
        { word: "açoite", strength: 95, category: "Dor e Nostalgia" },
        { word: "redomona", strength: 93, category: "Dor e Nostalgia" },
        { word: "galpão", strength: 87, category: "Dor e Nostalgia" },
        { word: "olhos negros", strength: 81, category: "Dor e Nostalgia" },
      ]
    },
    {
      name: "Refúgio e Frustração",
      color: categoryColors["Refúgio e Frustração"],
      words: [
        { word: "várzea", strength: 89, category: "Refúgio e Frustração" },
        { word: "prenda", strength: 86, category: "Refúgio e Frustração" },
        { word: "gateado", strength: 84, category: "Refúgio e Frustração" },
        { word: "desgarrou", strength: 78, category: "Refúgio e Frustração" },
      ]
    },
    {
      name: "Solidão e Abandono",
      color: categoryColors["Solidão e Abandono"],
      words: [
        { word: "desgarrou", strength: 94, category: "Solidão e Abandono" },
        { word: "esporas", strength: 90, category: "Solidão e Abandono" },
        { word: "encostada", strength: 86, category: "Solidão e Abandono" },
        { word: "recostada", strength: 82, category: "Solidão e Abandono" },
      ]
    },
    {
      name: "Extensão de Identidade",
      color: categoryColors["Extensão de Identidade"],
      words: [
        { word: "suados", strength: 93, category: "Extensão de Identidade" },
        { word: "gateada", strength: 88, category: "Extensão de Identidade" },
        { word: "respeito", strength: 85, category: "Extensão de Identidade" },
        { word: "querência", strength: 79, category: "Extensão de Identidade" },
      ]
    },
  ];

  // Renderiza uma única constelação
  const renderConstellation = (constellation: Constellation, centerX: number, centerY: number, scale: number = 1) => {
    const baseRadius = 60 * scale;
    const maxRadius = 120 * scale;
    
    return (
      <g key={constellation.name}>
        {/* Núcleo da constelação */}
        <circle
          cx={centerX}
          cy={centerY}
          r={15 * scale}
          fill={constellation.color}
          opacity="0.8"
          className="cursor-pointer transition-all hover:opacity-100"
          onClick={() => setSelectedConstellation(constellation.name)}
        />
        <text
          x={centerX}
          y={centerY + 30 * scale}
          textAnchor="middle"
          className="fill-foreground font-semibold text-xs cursor-pointer"
          onClick={() => setSelectedConstellation(constellation.name)}
        >
          {constellation.name}
        </text>

        {/* Palavras orbitando */}
        {constellation.words.map((word, index) => {
          const angle = (index / constellation.words.length) * 2 * Math.PI - Math.PI / 2;
          const radius = baseRadius + (maxRadius - baseRadius) * ((100 - word.strength) / 20);
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          return (
            <g key={`${constellation.name}-${word.word}-${index}`}>
              {/* Linha conectando ao centro */}
              <line
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke={constellation.color}
                strokeWidth={scale}
                opacity="0.3"
              />
              {/* Glow effect */}
              <circle
                cx={x}
                cy={y}
                r={8 * scale}
                fill={constellation.color}
                opacity="0.2"
              />
              {/* Palavra */}
              <circle
                cx={x}
                cy={y}
                r={5 * scale}
                fill={constellation.color}
                opacity="1"
                stroke="hsl(var(--background))"
                strokeWidth={scale}
              />
              <text
                x={x}
                y={y - 10 * scale}
                textAnchor="middle"
                className="fill-foreground text-xs font-medium"
                style={{ fontSize: `${10 * scale}px` }}
              >
                {word.word}
              </text>
              <text
                x={x}
                y={y + 18 * scale}
                textAnchor="middle"
                className="fill-muted-foreground text-xs"
                style={{ fontSize: `${8 * scale}px` }}
              >
                {word.strength}%
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  if (selectedConstellation) {
    const constellation = constellations.find(c => c.name === selectedConstellation);
    if (!constellation) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Constelação: {constellation.name}</h3>
          <button
            onClick={() => setSelectedConstellation(null)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao sistema estelar
          </button>
        </div>
        <div className="relative w-full bg-gradient-to-br from-background to-muted/20 rounded-lg border p-8 overflow-hidden">
          <svg width="800" height="600" viewBox="0 0 800 600" className="w-full h-auto">
            {renderConstellation(constellation, 400, 300, 2.5)}
          </svg>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Esta constelação representa o domínio semântico "<strong>{constellation.name}</strong>". 
            Palavras mais próximas do centro têm maior força de associação com o tema central.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full bg-gradient-to-br from-background to-muted/20 rounded-lg border p-4 overflow-hidden">
        <svg width="1200" height="800" viewBox="0 0 1200 800" className="w-full h-auto">
          {/* Sistema estelar - grid de constelações */}
          {constellations.map((constellation, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            const x = 200 + col * 400;
            const y = 200 + row * 400;
            
            return renderConstellation(constellation, x, y, 0.8);
          })}
        </svg>
      </div>
      
      <div className="p-4 bg-muted/30 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Sistema Estelar de Prosódia Semântica:</strong> Cada constelação representa um domínio emocional. 
          Clique em uma constelação para explorar suas palavras em detalhe.
        </p>
      </div>

      {/* Legenda das Constelações */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        {constellations.map((constellation) => (
          <div 
            key={constellation.name}
            className="flex items-center gap-2 p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedConstellation(constellation.name)}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: constellation.color }} />
            <span>{constellation.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
