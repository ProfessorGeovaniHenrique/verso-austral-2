import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TooltipData {
  title: string;
  domain: { name: string; color: string };
  frequency: { raw: number; normalized: number };
  prosody: { type: 'Positiva' | 'Negativa' | 'Neutra'; justification?: string };
  lexicalRichness?: number;
  textualWeight?: number;
  type: 'domain' | 'word';
}

interface SmartTooltip3DProps {
  data: TooltipData;
  position: { x: number; y: number };
}

export function SmartTooltip3D({ data, position }: SmartTooltip3DProps) {
  return (
    <div 
      className="absolute bg-slate-900/98 border-2 rounded-xl p-4 backdrop-blur-xl shadow-2xl animate-scale-in z-50 pointer-events-none"
      style={{ 
        left: position.x + 20, 
        top: position.y - 20,
        borderColor: data.domain.color,
        maxWidth: '320px'
      }}
    >
      {/* Header */}
      <h3 
        className="text-xl font-bold mb-2 truncate" 
        style={{ color: data.domain.color }}
      >
        {data.title}
      </h3>
      
      {/* Badge de domínio */}
      <Badge 
        className="mb-3"
        style={{ 
          backgroundColor: `${data.domain.color}33`,
          color: data.domain.color,
          borderColor: data.domain.color
        }}
      >
        {data.domain.name}
      </Badge>
      
      {/* Grid de estatísticas */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-800/50 rounded p-2">
          <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Frequência Bruta
          </p>
          <p className="font-mono font-bold text-cyan-400">{data.frequency.raw}</p>
        </div>
        <div className="bg-slate-800/50 rounded p-2">
          <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Normalizada
          </p>
          <p className="font-mono font-bold text-cyan-400">
            {data.frequency.normalized.toFixed(2)}%
          </p>
        </div>
        
        {/* Prosódia com ícone */}
        <div className="col-span-2 flex items-center gap-2 p-2 bg-slate-800/50 rounded">
          <Sparkles className={cn(
            "w-4 h-4 flex-shrink-0",
            data.prosody.type === 'Positiva' && "text-green-400",
            data.prosody.type === 'Negativa' && "text-red-400",
            data.prosody.type === 'Neutra' && "text-slate-400"
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400">Prosódia Semântica</p>
            <p className={cn(
              "font-semibold text-sm",
              data.prosody.type === 'Positiva' && "text-green-400",
              data.prosody.type === 'Negativa' && "text-red-400",
              data.prosody.type === 'Neutra' && "text-slate-400"
            )}>
              {data.prosody.type}
            </p>
          </div>
        </div>
        
        {/* Se for domínio, mostrar stats avançadas */}
        {data.type === 'domain' && data.lexicalRichness !== undefined && (
          <>
            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-slate-400 text-xs mb-1">Riqueza Lexical</p>
              <p className="font-mono font-bold text-purple-400">
                {(data.lexicalRichness * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-slate-400 text-xs mb-1">Peso Textual</p>
              <p className="font-mono font-bold text-pink-400">
                {data.textualWeight?.toFixed(1)}%
              </p>
            </div>
          </>
        )}
      </div>
      
      {/* Hint de ação */}
      <p className="text-xs text-slate-500 mt-3 border-t border-slate-700 pt-2">
        {data.type === 'domain'
          ? "Clique para explorar • Duplo clique para modo orbital"
          : "Clique para ver concordâncias (KWIC)"}
      </p>
    </div>
  );
}
