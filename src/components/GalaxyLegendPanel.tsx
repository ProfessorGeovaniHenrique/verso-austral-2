interface GalaxyLegendPanelProps {
  visible: boolean;
}

export const GalaxyLegendPanel = ({ visible }: GalaxyLegendPanelProps) => {
  if (!visible) return null;

  return (
    <div 
      className="w-full border-2 border-cyan-400/50 rounded-lg backdrop-blur-md p-4 animate-fade-in relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(27, 94, 32, 0.3))',
        boxShadow: '0 0 30px rgba(0, 229, 255, 0.3)'
      }}
    >
      {/* Corner Indicators */}
      <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-l-2 border-t-2 border-green-400/60 animate-pulse" />
      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-r-2 border-t-2 border-green-400/60 animate-pulse" />
      <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-l-2 border-b-2 border-green-400/60 animate-pulse" />
      <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-r-2 border-b-2 border-green-400/60 animate-pulse" />
      
      <div className="space-y-2 text-white/90 font-mono relative z-10">
        {/* Comparação vs. Corpus */}
        <div className="border-b border-cyan-500/20 pb-2">
          <div className="text-green-300 font-semibold mb-1.5 text-xs">
            Comparação vs. Corpus NE:
          </div>
          <div className="space-y-1 pl-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">⬆️</span>
              <span className="text-xs">Super-representado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">➖</span>
              <span className="text-xs">Equilibrado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm">⬇️</span>
              <span className="text-xs">Sub-representado</span>
            </div>
          </div>
        </div>
        
        {/* Métricas Visuais */}
        <div className="space-y-1">
          <div className="text-green-300 font-semibold mb-1.5 text-xs">
            Métricas Visuais:
          </div>
          <div className="pl-2 space-y-1 leading-relaxed text-xs">
            <div>• <strong className="text-cyan-300">Tamanho</strong> = Riqueza Lexical</div>
            <div>• <strong className="text-cyan-300">Posição</strong> = Relevância Temática</div>
            <div>• <strong className="text-cyan-300">Cor</strong> = Domínio Semântico</div>
          </div>
        </div>
      </div>
    </div>
  );
};
