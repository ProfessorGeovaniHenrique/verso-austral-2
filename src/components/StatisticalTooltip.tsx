import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WordStats {
  word: string;
  frequency: number;
  normalizedFreq: number;
  significance: 'Alta' | 'Média' | 'Baixa';
  prosody: 'Positiva' | 'Neutra' | 'Negativa';
  category: string;
  color: string;
}

interface StatisticalTooltipProps {
  stats: WordStats;
  children: React.ReactNode;
}

export const StatisticalTooltip: React.FC<StatisticalTooltipProps> = ({ stats, children }) => {
  const getProsodyEmoji = (prosody: string) => {
    switch (prosody) {
      case 'Positiva': return '😊';
      case 'Negativa': return '😔';
      default: return '😐';
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-[#1e1e1e]/95 border-[#f0b500]/30 text-white p-4 max-w-[280px]"
          sideOffset={10}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <span className="text-lg font-bold" style={{ color: stats.color }}>
                {stats.word}
              </span>
            </div>
            
            <div className="space-y-1.5 text-sm border-b border-border/30 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">🔢 Frequência:</span>
                <span className="font-medium">{stats.frequency} ocorrências</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">📈 Freq. normalizada:</span>
                <span className="font-medium">{stats.normalizedFreq.toFixed(1)}/1000</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">⚡ Significância:</span>
                <span className={`font-medium ${
                  stats.significance === 'Alta' ? 'text-green-400' : 
                  stats.significance === 'Média' ? 'text-yellow-400' : 
                  'text-gray-400'
                }`}>
                  {stats.significance}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {getProsodyEmoji(stats.prosody)} Prosódia:
                </span>
                <span className="font-medium">{stats.prosody}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">🎯 Categoria:</span>
                <span className="font-medium" style={{ color: stats.color }}>
                  {stats.category}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-1 border-t border-border/30">
              👆 Clique para ver concordância (KWIC)
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
