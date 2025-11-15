import { useEffect, useState } from 'react';

interface CodexDrawerProps {
  word?: {
    id: string;
    label?: string;
    palavra?: string;
    freq?: number;
    normalized?: number;
    frequencia?: number;
    relevancia?: number;
    logLikelihood?: number;
    ll?: number;
    mi?: number;
    miScore?: number;
    prosody?: string;
    dominio?: string;
    riquezaLexical?: number;
    ocorrenciasNE?: number;
    ocorrenciasCorpus?: number;
    comparacaoCorpus?: 'super-representado' | 'equilibrado' | 'sub-representado';
  } | null;
  level?: 'universe' | 'galaxy' | string;
}

type AnimationState = 'collapsed' | 'sliding-in' | 'expanding' | 'expanded';

export const CodexDrawer = ({ word, level }: CodexDrawerProps) => {
  const [animState, setAnimState] = useState<AnimationState>('collapsed');

  useEffect(() => {
    if (word) {
      setAnimState('sliding-in');
      const timer1 = setTimeout(() => setAnimState('expanding'), 300);
      const timer2 = setTimeout(() => setAnimState('expanded'), 700);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setAnimState('collapsed');
    }
  }, [word]);

  const getProsodyColor = (prosody?: string) => {
    if (!prosody) return 'text-gray-400';
    if (prosody === 'positiva' || prosody === 'positive') return 'text-green-400';
    if (prosody === 'negativa' || prosody === 'negative') return 'text-red-400';
    return 'text-yellow-400';
  };

  const getComparisonBadgeColor = (comparison?: string) => {
    if (!comparison) return { bg: 'bg-gray-500/20', border: 'border-gray-500' };
    if (comparison === 'super-representado') return { bg: 'bg-green-500/20', border: 'border-green-500' };
    if (comparison === 'sub-representado') return { bg: 'bg-red-500/20', border: 'border-red-500' };
    return { bg: 'bg-gray-500/20', border: 'border-gray-500' };
  };

  const displayWord = word?.palavra || word?.label || 'N/A';
  const displayFreq = word?.frequencia || word?.freq || 0;
  const displayLL = word?.ll || word?.logLikelihood || 0;
  const displayMI = word?.mi || word?.miScore || 0;

  // Estado Colapsado
  if (animState === 'collapsed') {
    return (
      <div 
        className="w-16 h-48 rounded-l-lg backdrop-blur-sm transition-all duration-300"
        style={{
          background: 'linear-gradient(180deg, rgba(0, 229, 255, 0.3), rgba(0, 229, 255, 0.1))',
          border: '2px solid rgba(0, 229, 255, 0.5)',
          boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)'
        }}
      >
        <div className="h-full flex items-center justify-center">
          <span className="text-cyan-300 text-xs tracking-widest font-mono" style={{ writingMode: 'vertical-rl' }}>
            💫 CODEX
          </span>
        </div>
      </div>
    );
  }

  // Fase Sliding-In
  if (animState === 'sliding-in') {
    return (
      <div 
        className="w-full h-[60px] rounded-lg backdrop-blur-md relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(0, 229, 255, 0.15))',
          border: '2px solid rgba(0, 229, 255, 0.6)',
          boxShadow: '0 0 30px rgba(0, 229, 255, 0.5)',
          animation: 'slideInHorizontal 300ms ease-out forwards'
        }}
      >
        {/* Bordas Sci-Fi Superior */}
        <div className="absolute -top-[2px] left-0 right-0 h-[2px] flex items-center">
          <div className="flex-1 h-full bg-gradient-to-r from-transparent via-cyan-400 to-cyan-400" />
          <div className="w-6 h-[2px] bg-cyan-400" />
          <div className="flex-1 h-full bg-gradient-to-l from-transparent via-cyan-400 to-cyan-400" />
        </div>
        
        {/* Bordas Sci-Fi Inferior */}
        <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] flex items-center">
          <div className="flex-1 h-full bg-gradient-to-r from-transparent via-cyan-400 to-cyan-400" />
          <div className="w-6 h-[2px] bg-cyan-400" />
          <div className="flex-1 h-full bg-gradient-to-l from-transparent via-cyan-400 to-cyan-400" />
        </div>

        <div className="h-full flex items-center justify-center">
          <span className="text-cyan-300 text-sm font-mono tracking-wider animate-pulse">
            💫 CODEX LOADING...
          </span>
        </div>
      </div>
    );
  }

  // Fases Expanding e Expanded
  const colors = getComparisonBadgeColor(word?.comparacaoCorpus);
  
  return (
    <div 
      className={`w-full rounded-lg backdrop-blur-md relative overflow-hidden ${
        animState === 'expanding' ? 'animate-expandVertical' : ''
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.98), rgba(0, 229, 255, 0.15))',
        border: '2px solid rgba(0, 229, 255, 0.6)',
        boxShadow: '0 0 40px rgba(0, 229, 255, 0.5)',
        animation: animState === 'expanding' ? 'expandVertical 400ms ease-out forwards' : 'sciFiBorderGlow 3s ease-in-out infinite'
      }}
    >
      {/* Bordas Sci-Fi Superior */}
      <div className="absolute -top-[2px] left-0 right-0 h-[2px] flex items-center">
        <div className="flex-1 h-full bg-gradient-to-r from-transparent via-cyan-400 to-cyan-400" />
        <div className="w-8 h-[2px] bg-cyan-400" />
        <div className="flex-1 h-full bg-gradient-to-l from-transparent via-cyan-400 to-cyan-400" />
      </div>
      
      {/* Bordas Sci-Fi Inferior */}
      <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] flex items-center">
        <div className="flex-1 h-full bg-gradient-to-r from-transparent via-cyan-400 to-cyan-400" />
        <div className="w-8 h-[2px] bg-cyan-400" />
        <div className="flex-1 h-full bg-gradient-to-l from-transparent via-cyan-400 to-cyan-400" />
      </div>

      {/* Corner Indicators */}
      <div className="absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2 border-cyan-400 animate-pulse" />
      <div className="absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2 border-cyan-400 animate-pulse" />
      <div className="absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2 border-cyan-400 animate-pulse" />
      <div className="absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2 border-cyan-400 animate-pulse" />

      {/* Scan Lines Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="w-full h-[1px] bg-cyan-400 absolute"
            style={{
              top: `${i * 6.67}%`,
              animation: `scanLine ${2 + (i % 3)}s linear infinite`,
              animationDelay: `${(i % 5) * 0.4}s`
            }}
          />
        ))}
      </div>

      {/* Data Stream Effect */}
      <div className="absolute top-6 right-6 text-[8px] text-cyan-400/30 font-mono leading-tight">
        {['01001100', '01001111', '01010110'].map((binary, i) => (
          <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
            {binary}
          </div>
        ))}
      </div>

      {/* Conteúdo */}
      <div className={`p-6 ${animState === 'expanding' ? 'opacity-0' : 'opacity-100 animate-fade-in'}`}>
        {/* Header */}
        <div className="mb-4 pb-3 border-b border-cyan-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-cyan-400 font-mono text-base font-bold tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              💫 CODEX LINGUÍSTICO
            </h3>
            <span className="text-cyan-400/60 text-[10px] font-mono">v2.0</span>
          </div>
          <div className="text-2xl font-bold text-white uppercase tracking-wide">
            {displayWord}
          </div>
        </div>

        {/* Métricas - Visão Galáxia */}
        {level === 'galaxy' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-cyan-300 text-xs font-mono">Riqueza Lexical</span>
                <span className="text-white font-bold text-sm">{word?.riquezaLexical?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden border border-cyan-500/30">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${(word?.riquezaLexical || 0) * 100}%` }}
                >
                  <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 rounded-lg p-3 border border-cyan-500/20">
                <div className="text-cyan-300 text-[10px] font-mono mb-1">Ocorrências NE</div>
                <div className="text-white font-bold text-lg">{word?.ocorrenciasNE || 0}</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-cyan-500/20">
                <div className="text-cyan-300 text-[10px] font-mono mb-1">Corpus</div>
                <div className="text-white font-bold text-lg">{word?.ocorrenciasCorpus || 0}</div>
              </div>
            </div>

            {word?.comparacaoCorpus && (
              <div className={`${colors.bg} ${colors.border} border-2 rounded-lg p-3 text-center`}>
                <div className="text-white font-mono text-xs uppercase tracking-wider">
                  {word.comparacaoCorpus === 'super-representado' && '⬆️ Super-representado'}
                  {word.comparacaoCorpus === 'equilibrado' && '➖ Equilibrado'}
                  {word.comparacaoCorpus === 'sub-representado' && '⬇️ Sub-representado'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Métricas - Visão Universo */}
        {level !== 'galaxy' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-cyan-300 text-xs font-mono">Relevância</span>
                <span className="text-white font-bold text-sm">{((word?.relevancia || 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden border border-cyan-500/30">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${(word?.relevancia || 0) * 100}%` }}
                >
                  <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 rounded-lg p-3 border border-cyan-500/20">
                <div className="text-cyan-300 text-[10px] font-mono mb-1">LL Score</div>
                <div className="text-white font-bold text-lg">{displayLL.toFixed(2)}</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-cyan-500/20">
                <div className="text-cyan-300 text-[10px] font-mono mb-1">MI Score</div>
                <div className="text-white font-bold text-lg">{displayMI.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-3 border border-cyan-500/20">
              <div className="text-cyan-300 text-[10px] font-mono mb-1">Frequência</div>
              <div className="text-white font-bold text-lg">{displayFreq}</div>
            </div>

            {word?.dominio && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 rounded-lg p-3 text-center">
                <div className="text-purple-300 text-[10px] font-mono mb-1">Domínio Semântico</div>
                <div className="text-white font-bold text-sm uppercase tracking-wide">{word.dominio}</div>
              </div>
            )}

            {word?.prosody && (
              <div className="bg-black/30 rounded-lg p-3 border border-cyan-500/20">
                <div className="text-cyan-300 text-[10px] font-mono mb-1">Prosódia Semântica</div>
                <div className={`font-bold text-sm uppercase tracking-wide ${getProsodyColor(word.prosody)}`}>
                  {word.prosody}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
