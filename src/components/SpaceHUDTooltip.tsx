interface SpaceHUDTooltipProps {
  word: {
    id: string;
    label: string;
    freq?: number;
    normalized?: number;
    logLikelihood?: number;
    prosody?: string;
    sentiment?: string;
    miScore?: number;
    associationStrength?: number;
    level?: string;
    // Galaxy level fields
    riquezaLexical?: number;
    pesoTextual?: number;
    percentualTematico?: number;
    comparacaoCorpus?: 'super-representado' | 'equilibrado' | 'sub-representado';
    diferencaCorpus?: number;
    numRings?: number;
  } | null;
  visible: boolean;
  level?: string;
}

export const SpaceHUDTooltip = ({ word, visible, level }: SpaceHUDTooltipProps) => {
  if (!visible || !word) return null;

  const getProsodyColor = (prosody?: string) => {
    switch (prosody?.toLowerCase()) {
      case 'positiva':
      case 'positive':
        return '#1B5E20';
      case 'negativa':
      case 'negative':
        return '#C62828';
      default:
        return '#F57F17';
    }
  };

  const getComparisonBadgeColor = (comparison?: string) => {
    switch (comparison) {
      case 'super-representado':
        return 'bg-green-500/20 border-green-400 text-green-300';
      case 'sub-representado':
        return 'bg-red-500/20 border-red-400 text-red-300';
      default:
        return 'bg-gray-500/20 border-gray-400 text-gray-300';
    }
  };

  return (
    <div
      className="fixed right-[130px] top-1/2 -translate-y-1/2 z-30 pointer-events-none"
      style={{
        animation: 'slideInFromRight 0.3s ease-out'
      }}
    >
      <div
        className="relative"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.98), rgba(0, 229, 255, 0.15))',
          border: '2px solid #00E5FF',
          borderRadius: '12px',
          padding: '20px',
          width: '340px',
          boxShadow: '0 0 40px rgba(0, 229, 255, 0.5), inset 0 0 30px rgba(0, 229, 255, 0.1)',
          fontFamily: 'monospace',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Animated corner decorations (Mass Effect style) */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>

        {/* Header with pulsing indicator */}
        <div className="flex justify-between items-start border-b border-cyan-400/30 pb-3 mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-cyan-300/60 tracking-widest">CODEX LINGUÍSTICO</span>
              <div className="w-2 h-2 rounded-full animate-pulse bg-cyan-400" 
                   style={{ boxShadow: '0 0 10px #00E5FF' }}></div>
            </div>
            <span className="text-yellow-400 font-bold text-xl tracking-wider">
              {word.label.toUpperCase()}
            </span>
            <span className="text-cyan-300/50 text-[9px] tracking-widest mt-1">
              ID: {word.id}
            </span>
          </div>
        </div>

        {/* Galaxy Level Stats */}
        {level === 'galaxy' && (
          <div className="space-y-3">
            {/* Comparison Badge */}
            {word.comparacaoCorpus && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold ${getComparisonBadgeColor(word.comparacaoCorpus)}`}>
                <span>
                  {word.comparacaoCorpus === 'super-representado' && '⬆️'}
                  {word.comparacaoCorpus === 'equilibrado' && '➖'}
                  {word.comparacaoCorpus === 'sub-representado' && '⬇️'}
                </span>
                <span className="uppercase tracking-wide">
                  {word.comparacaoCorpus.replace('-', ' ')}
                </span>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="space-y-2.5">
              {/* Riqueza Lexical */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-300/80 uppercase tracking-wide">Riqueza Lexical:</span>
                  <span className="text-white font-bold">{word.riquezaLexical || 0} lemas únicos</span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all duration-500"
                    style={{ width: `${Math.min((word.riquezaLexical || 0) * 3, 100)}%` }}
                  />
                </div>
              </div>

              {/* Peso Textual */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-300/80 uppercase tracking-wide">Peso Textual:</span>
                  <span className="text-white font-bold">{word.pesoTextual || 0} ocorrências</span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-500"
                    style={{ width: `${Math.min((word.pesoTextual || 0) * 3, 100)}%` }}
                  />
                </div>
              </div>

              {/* Representação Temática */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-300/80 uppercase tracking-wide">Representação:</span>
                  <span className="text-white font-bold">{word.percentualTematico?.toFixed(2)}%</span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all duration-500"
                    style={{ width: `${word.percentualTematico || 0}%` }}
                  />
                </div>
              </div>

              {/* Comparison with Corpus */}
              <div className="pt-2 mt-2 border-t border-cyan-500/30">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-cyan-300/80 uppercase tracking-wide">vs. Corpus NE:</span>
                  <span className={`font-bold ${(word.diferencaCorpus || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(word.diferencaCorpus || 0) > 0 ? '+' : ''}{word.diferencaCorpus?.toFixed(2)}pp
                  </span>
                </div>
              </div>

              {/* Orbital Rings Indicator */}
              <div className="flex justify-between text-xs pt-1">
                <span className="text-cyan-300/80 uppercase tracking-wide">Anéis Orbitais:</span>
                <span className="text-white font-bold">{word.numRings || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Universe Level Stats */}
        {level !== 'galaxy' && (
          <div className="space-y-2.5">
            {/* Frequência */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-cyan-300/80 uppercase tracking-wide">Frequência:</span>
                <span className="text-white font-bold">{word.freq || 0} ocorrências</span>
              </div>
              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-500"
                  style={{ width: `${Math.min((word.freq || 0) * 10, 100)}%` }}
                />
              </div>
            </div>

            {/* Normalized Value */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-cyan-300/80 uppercase tracking-wide">Valor Normalizado:</span>
                <span className="text-white font-bold">{word.normalized?.toFixed(4) || '0.0000'}</span>
              </div>
              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-400 transition-all duration-500"
                  style={{ width: `${Math.min((word.normalized || 0) * 1000, 100)}%` }}
                />
              </div>
            </div>

            {/* Log-Likelihood */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-cyan-300/80 uppercase tracking-wide">Log-Likelihood:</span>
                <span className="text-white font-bold">{word.logLikelihood?.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            {/* MI Score */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-cyan-300/80 uppercase tracking-wide">MI Score:</span>
                <span className="text-white font-bold">{word.miScore?.toFixed(3) || '0.000'}</span>
              </div>
            </div>

            {/* Association Strength */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-cyan-300/80 uppercase tracking-wide">Força de Associação:</span>
                <span className="text-white font-bold">{word.associationStrength?.toFixed(3) || '0.000'}</span>
              </div>
            </div>

            {/* Prosody */}
            {word.prosody && (
              <div className="pt-2 mt-2 border-t border-cyan-500/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-cyan-300/80 uppercase tracking-wide">Prosódia:</span>
                  <span 
                    className="px-2 py-1 rounded text-white font-bold text-[10px]"
                    style={{ 
                      backgroundColor: getProsodyColor(word.prosody),
                      boxShadow: `0 0 10px ${getProsodyColor(word.prosody)}`
                    }}
                  >
                    {word.prosody.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Sentiment */}
            {word.sentiment && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-cyan-300/80 uppercase tracking-wide">Sentimento:</span>
                <span className="text-white font-bold">{word.sentiment}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer - Call to Action */}
        <div className="mt-4 pt-3 border-t border-cyan-400/30 text-center">
          <span className="text-[10px] text-cyan-300/70 uppercase tracking-widest">
            ▶ Clique para análise detalhada
          </span>
        </div>
      </div>
    </div>
  );
};
