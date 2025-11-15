interface GalaxyLegendPanelProps {
  visible: boolean;
}

export const GalaxyLegendPanel = ({ visible }: GalaxyLegendPanelProps) => {
  if (!visible) return null;

  return (
    <div 
      className="w-full border-2 border-cyan-400/50 rounded-lg backdrop-blur-md p-6 animate-fade-in relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(27, 94, 32, 0.3))',
        boxShadow: '0 0 30px rgba(0, 229, 255, 0.3)'
      }}
    >
      {/* Corner Indicators */}
      <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-green-400/60 animate-pulse" />
      <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-green-400/60 animate-pulse" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-green-400/60 animate-pulse" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-green-400/60 animate-pulse" />
      <h3 className="text-cyan-400 font-mono text-base font-bold mb-4 tracking-wider flex items-center gap-2 relative z-10">
        <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
        LEGENDA GALÁXIA
      </h3>
      
      <div className="space-y-3 text-white/90 font-mono relative z-10">
        {/* Comparação vs. Corpus */}
        <div className="border-b border-cyan-500/20 pb-3">
          <div className="text-green-300 font-semibold mb-2 text-sm">
            Comparação vs. Corpus NE:
          </div>
          <div className="space-y-1.5 pl-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-base">⬆️</span>
              <span className="text-sm">Super-representado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-base">➖</span>
              <span className="text-sm">Equilibrado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-base">⬇️</span>
              <span className="text-sm">Sub-representado</span>
            </div>
          </div>
        </div>
        
        {/* Métricas Visuais */}
        <div className="space-y-1.5">
          <div className="text-green-300 font-semibold mb-2 text-sm">
            Métricas Visuais:
          </div>
          <div className="pl-2 space-y-1.5 leading-relaxed text-sm">
            <div>• <strong className="text-cyan-300">Tamanho</strong> = Riqueza Lexical</div>
            <div>• <strong className="text-cyan-300">Posição</strong> = Relevância Temática</div>
            <div>• <strong className="text-cyan-300">Cor</strong> = Domínio Semântico</div>
          </div>
        </div>
      </div>
    </div>
  );
};
