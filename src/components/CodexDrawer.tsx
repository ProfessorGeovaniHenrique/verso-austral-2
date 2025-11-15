import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { prosodiaSemanticaData } from '@/data/mockup';
import { Smile, Frown, Minus } from 'lucide-react';

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
    percentual?: number;
    percentualTematico?: number;
    comparacaoCorpus?: 'super-representado' | 'equilibrado' | 'sub-representado';
    diferencaCorpus?: number;
    percentualCorpusNE?: number;
    palavrasFrequentes?: Array<{ palavra: string; ocorrencias: number }>;
    cor?: string;
    // Estatísticas do núcleo galáctico
    isGalacticCore?: boolean;
    totalDominios?: number;
    totalPalavras?: number;
    totalOcorrencias?: number;
    dominioMaisRico?: string;
    dominioMaisFrequente?: string;
    top3Dominios?: Array<{ nome: string; percentual: number; cor: string }>;
    // Dados de sistema estelar
    isStellarCore?: boolean;
    frequenciaNormalizadaDominio?: number;
    ocorrencias?: number;
    orbitIndex?: number;
    // Propriedades orbitais
    orbitalRadius?: number;
    orbitalAngle?: number;
    orbitalSpeed?: number;
    orbitalEccentricity?: number;
  } | null;
  level?: 'universe' | 'galaxy' | 'stellar-system' | string;
}

type AnimationState = 'collapsed' | 'sliding-in' | 'expanding' | 'expanded';

export const CodexDrawer = ({ word, level }: CodexDrawerProps) => {
  const [animState, setAnimState] = useState<AnimationState>('collapsed');
  const isGalacticCore = word?.isGalacticCore === true;

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
    border: '2px solid hsl(var(--primary) / 0.6)',
    boxShadow: '0 0 40px hsl(var(--primary) / 0.5)',
    maxHeight: '450px',
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
      <div className={`p-6 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent ${animState === 'expanding' ? 'opacity-0' : 'opacity-100 animate-fade-in'}`}>
        {/* Header */}
        <div className="mb-4 pb-3 border-b border-cyan-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-cyan-400 font-mono text-base font-bold tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              💫 CODEX LINGUÍSTICO
            </h3>
            <span className="text-cyan-400/60 text-[10px] font-mono">v3.0</span>
          </div>
          <div className="text-2xl font-bold text-white uppercase tracking-wide">
            {displayWord}
          </div>
        </div>

        {/* 🌌 CASO ESPECIAL: Núcleo Galáctico */}
        {isGalacticCore && (
          <div className="space-y-4">
            {/* Header Especial */}
            <div className="text-center pb-3 border-b border-cyan-500/30">
              <div className="text-3xl mb-2">☀️</div>
            <div className="text-cyan-300 font-bold text-lg">VISÃO GERAL DOS DOMÍNIOS</div>
            <div className="text-white/60 text-xs font-mono mt-1">Corpus Completo</div>
            </div>
            
            {/* Grid de Estatísticas Principais */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/40 rounded-lg p-3 border border-yellow-500/30">
                <div className="text-yellow-400 text-[10px] font-mono mb-1">Total Domínios</div>
                <div className="text-white font-bold text-2xl">{word?.totalDominios}</div>
              </div>
              
              <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/30">
                <div className="text-cyan-400 text-[10px] font-mono mb-1">Total Lemas</div>
                <div className="text-white font-bold text-2xl">{word?.totalPalavras}</div>
              </div>
              
              <div className="bg-black/40 rounded-lg p-3 border border-purple-500/30">
                <div className="text-purple-400 text-[10px] font-mono mb-1">Ocorrências</div>
                <div className="text-white font-bold text-2xl">{word?.totalOcorrencias}</div>
              </div>
              
              <div className="bg-black/40 rounded-lg p-3 border border-orange-500/30">
                <div className="text-orange-400 text-[10px] font-mono mb-1">Riqueza Média</div>
                <div className="text-white font-bold text-2xl">
                  {word?.totalDominios && word?.totalPalavras 
                    ? (word.totalPalavras / word.totalDominios).toFixed(1) 
                    : '0.0'}
                </div>
              </div>
            </div>
            
            {/* Campeões */}
            <div className="bg-black/40 rounded-lg p-3 border border-green-500/30">
              <div className="text-green-300 text-[10px] font-mono mb-2">🏆 DOMÍNIOS CAMPEÕES</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Mais Rico:</span>
                  <span className="text-cyan-400 font-bold">{word?.dominioMaisRico}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Mais Frequente:</span>
                  <span className="text-purple-400 font-bold">{word?.dominioMaisFrequente}</span>
                </div>
              </div>
            </div>
            
            {/* Top 3 Domínios */}
            <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/30">
              <div className="text-cyan-300 text-[10px] font-mono mb-2">⭐ TOP 3 DOMÍNIOS TEMÁTICOS</div>
              <div className="space-y-2">
                {word?.top3Dominios?.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: d.cor }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-xs font-mono">{d.nome}</div>
                      <div className="w-full bg-gray-800/50 rounded-full h-1.5 mt-1">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${d.percentual}%`,
                            backgroundColor: d.cor
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-white font-bold text-xs">{d.percentual.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Métricas - Visão Galáxia V3.0 */}
        {level === 'galaxy' && !isGalacticCore && (
          <div className="space-y-5">
            
            {/* 1. ESTATÍSTICAS PRINCIPAIS */}
            <div className="space-y-3">
              
              {/* Riqueza Lexical */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-cyan-300 text-xs font-mono">
                    💎 Riqueza Lexical
                  </span>
                  <span className="text-white font-bold text-sm">
                    {word?.riquezaLexical || 0} lemas únicos
                  </span>
                </div>
                <div className="w-full bg-gray-800/50 rounded-full h-2.5 overflow-hidden border border-cyan-500/30">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 relative overflow-hidden"
                    style={{ width: `${Math.min((word?.riquezaLexical || 0) / 30 * 100, 100)}%` }}
                  >
                    <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </div>
                </div>
              </div>

              {/* Grid de Pesos Textuais */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-black/30 rounded-lg p-2 border border-cyan-500/20">
                  <div className="text-cyan-300 text-[9px] font-mono mb-0.5">Ocorrências</div>
                  <div className="text-white font-bold text-base">{word?.ocorrenciasNE || 0}</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2 border border-purple-500/20">
                  <div className="text-purple-300 text-[9px] font-mono mb-0.5">Peso Abs.</div>
                  <div className="text-white font-bold text-base">{word?.percentual?.toFixed(1) || '0.0'}%</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2 border border-green-500/20">
                  <div className="text-green-300 text-[9px] font-mono mb-0.5">Peso Tem.</div>
                  <div className="text-white font-bold text-base">{word?.percentualTematico?.toFixed(1) || '0.0'}%</div>
                </div>
              </div>
            </div>

            {/* 2. COMPARAÇÃO COM CORPUS NORDESTINO */}
            <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/30">
              <div className="text-cyan-300 text-[10px] font-mono mb-3 flex items-center gap-2">
                <span>📊</span>
                COMPARAÇÃO vs CORPUS NORDESTINO
              </div>
              
              {/* Barra Dupla Comparativa */}
              <div className="space-y-2">
                {/* Poema Gaúcho */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-cyan-400 text-[10px] font-mono">Poema Gaúcho</span>
                    <span className="text-cyan-400 font-bold text-xs">{word?.percentualTematico?.toFixed(2) || '0.00'}%</span>
                  </div>
                  <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden border border-cyan-500/30 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${Math.min(word?.percentualTematico || 0, 100)}%` }}
                    />
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent absolute top-1/2 animate-scanLineHorizontal" />
                    </div>
                  </div>
                </div>
                
                {/* Corpus Nordestino */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-orange-400 text-[10px] font-mono">Corpus Nordestino</span>
                    <span className="text-orange-400 font-bold text-xs">{word?.percentualCorpusNE?.toFixed(2) || '0.00'}%</span>
                  </div>
                  <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden border border-orange-500/30">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                      style={{ width: `${Math.min(word?.percentualCorpusNE || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Badge de Status */}
              <div className={`mt-3 ${colors.bg} ${colors.border} border-2 rounded-lg p-2 text-center`}>
                <div className="text-white font-mono text-[11px] uppercase tracking-wider">
                  {word?.comparacaoCorpus === 'super-representado' && '⬆️ SUPER-REPRESENTADO'}
                  {word?.comparacaoCorpus === 'equilibrado' && '➖ EQUILIBRADO'}
                  {word?.comparacaoCorpus === 'sub-representado' && '⬇️ SUB-REPRESENTADO'}
                </div>
                <div className="text-white/70 text-[9px] font-mono mt-1">
                  {word?.diferencaCorpus && word.diferencaCorpus > 0 ? '+' : ''}
                  {word?.diferencaCorpus?.toFixed(2) || '0.00'}% vs Corpus NE
                </div>
              </div>
            </div>

            {/* 3. TOP 5 PALAVRAS DO DOMÍNIO */}
            {word?.palavrasFrequentes && word.palavrasFrequentes.length > 0 && (
              <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/30">
                <div className="text-cyan-300 text-[10px] font-mono mb-3 flex items-center gap-2">
                  <span>🔤</span>
                  TOP PALAVRAS DESTE DOMÍNIO
                </div>
                
                <div className="space-y-2">
                  {word.palavrasFrequentes.slice(0, 5).map((item, index) => {
                    const maxOcorrencias = Math.max(...word.palavrasFrequentes!.map(p => p.ocorrencias));
                    const widthPercent = (item.ocorrencias / maxOcorrencias) * 100;
                    
                    return (
                      <div key={index} className="group cursor-pointer hover:bg-cyan-500/10 rounded p-1 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white text-xs font-mono">{item.palavra}</span>
                          <span className="text-cyan-400 font-bold text-[10px]">{item.ocorrencias}×</span>
                        </div>
                        <div className="w-full bg-gray-800/50 rounded-full h-1.5 overflow-hidden relative">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{ 
                              width: `${widthPercent}%`,
                              background: word.cor || 'linear-gradient(to right, #06b6d4, #3b82f6)'
                            }}
                          />
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="w-[2px] h-full bg-gradient-to-b from-transparent via-white/50 to-transparent absolute left-0 animate-scanLineHorizontal" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. PROSÓDIA SEMÂNTICA */}
            {displayWord && (() => {
              const prosodiaInfo = prosodiaSemanticaData.find(
                p => p.lema.toLowerCase() === displayWord.toLowerCase()
              );
              
              if (!prosodiaInfo) return null;
              
              const getProsodyBadge = () => {
                if (prosodiaInfo.prosody === 'Positiva') {
                  return {
                    icon: <Smile className="w-4 h-4" />,
                    bg: 'bg-green-500/20',
                    border: 'border-green-500',
                    text: 'text-green-400',
                    emoji: '🟢'
                  };
                }
                if (prosodiaInfo.prosody === 'Negativa') {
                  return {
                    icon: <Frown className="w-4 h-4" />,
                    bg: 'bg-red-500/20',
                    border: 'border-red-500',
                    text: 'text-red-400',
                    emoji: '🔴'
                  };
                }
                return {
                  icon: <Minus className="w-4 h-4" />,
                  bg: 'bg-gray-500/20',
                  border: 'border-gray-500',
                  text: 'text-gray-400',
                  emoji: '⚪'
                };
              };
              
              const badge = getProsodyBadge();
              
              return (
                <div className="bg-black/40 rounded-lg p-3 border border-purple-500/30">
                  <div className="text-purple-300 text-[10px] font-mono mb-3 flex items-center gap-2">
                    <span>💭</span>
                    PROSÓDIA SEMÂNTICA
                  </div>
                  
                  {/* Badge de Prosódia */}
                  <div className={`${badge.bg} ${badge.border} border-2 rounded-lg p-3 mb-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{badge.emoji}</span>
                      <div className="flex-1">
                        <div className={`${badge.text} font-bold text-sm uppercase tracking-wide`}>
                          {prosodiaInfo.prosody}
                        </div>
                        <div className="text-white/60 text-[9px] font-mono">
                          Análise Contextual
                        </div>
                      </div>
                      <div className={badge.text}>
                        {badge.icon}
                      </div>
                    </div>
                  </div>
                  
                  {/* Justificativa */}
                  <div className="bg-black/30 rounded p-2 border border-purple-500/20">
                    <div className="text-purple-300/70 text-[9px] font-mono mb-1 uppercase">
                      Justificativa:
                    </div>
                    <p className="text-white/90 text-xs leading-relaxed">
                      {prosodiaInfo.justificativa}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 4. ESTATÍSTICAS DE ASSOCIAÇÃO (para palavras) */}
            {word?.miScore !== undefined && (
              <div className="bg-cyan-950/30 rounded-lg p-3 border border-cyan-500/20">
                <div className="text-cyan-300 text-[10px] font-mono mb-3 flex items-center gap-2">
                  <span>📊</span>
                  ESTATÍSTICAS DE ASSOCIAÇÃO
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs">MI Score:</span>
                    <span className="text-white font-bold font-mono text-sm">
                      {word.miScore.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs">Distância Orbital:</span>
                    <span className="text-white font-bold font-mono text-sm">
                      {word.orbitalRadius?.toFixed(2) || 'N/A'} UA
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs">Setor de Prosódia:</span>
                    <span className={`font-bold text-sm ${
                      word.prosody === 'Positiva' ? 'text-green-400' :
                      word.prosody === 'Neutra' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {word.prosody}
                      {word.prosody === 'Positiva' ? ' (0°-120°)' :
                       word.prosody === 'Neutra' ? ' (120°-240°)' :
                       ' (240°-360°)'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-cyan-500/20">
                  <p className="text-gray-400 text-[9px] leading-relaxed">
                    💡 <strong className="text-cyan-300">MI Score alto</strong> indica forte associação semântica. 
                    Palavras próximas ao núcleo (distância baixa) têm maior força de associação com o domínio.
                  </p>
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

            {/* Prosódia Semântica Enriquecida */}
            {displayWord && (() => {
              const prosodiaInfo = prosodiaSemanticaData.find(
                p => p.lema.toLowerCase() === displayWord.toLowerCase()
              );
              
              if (!prosodiaInfo) return null;
              
              const getProsodyBadge = () => {
                if (prosodiaInfo.prosody === 'Positiva') {
                  return {
                    icon: <Smile className="w-3 h-3" />,
                    bg: 'bg-green-500/20',
                    border: 'border-green-500',
                    text: 'text-green-400',
                    emoji: '🟢'
                  };
                }
                if (prosodiaInfo.prosody === 'Negativa') {
                  return {
                    icon: <Frown className="w-3 h-3" />,
                    bg: 'bg-red-500/20',
                    border: 'border-red-500',
                    text: 'text-red-400',
                    emoji: '🔴'
                  };
                }
                return {
                  icon: <Minus className="w-3 h-3" />,
                  bg: 'bg-gray-500/20',
                  border: 'border-gray-500',
                  text: 'text-gray-400',
                  emoji: '⚪'
                };
              };
              
              const badge = getProsodyBadge();
              
              return (
                <div className="bg-black/40 rounded-lg p-3 border border-purple-500/30">
                  <div className="text-purple-300 text-[10px] font-mono mb-2 flex items-center gap-2">
                    <span>💭</span>
                    PROSÓDIA SEMÂNTICA
                  </div>
                  
                  {/* Badge de Prosódia */}
                  <div className={`${badge.bg} ${badge.border} border-2 rounded-lg p-2 mb-2`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{badge.emoji}</span>
                      <div className="flex-1">
                        <div className={`${badge.text} font-bold text-xs uppercase tracking-wide`}>
                          {prosodiaInfo.prosody}
                        </div>
                      </div>
                      <div className={badge.text}>
                        {badge.icon}
                      </div>
                    </div>
                  </div>
                  
                  {/* Justificativa */}
                  <div className="bg-black/30 rounded p-2 border border-purple-500/20">
                    <div className="text-purple-300/70 text-[9px] font-mono mb-1 uppercase">
                      Justificativa:
                    </div>
                    <p className="text-white/90 text-[10px] leading-relaxed">
                      {prosodiaInfo.justificativa}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* STELLAR SYSTEM VIEW - Palavra em Sistema Estelar */}
        {level === 'stellar-system' && word && !word.isStellarCore && (
          <div className="space-y-3">
            {/* Frequência no Sistema */}
            <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/30">
              <div className="text-cyan-300 text-[10px] font-mono mb-2">🌟 FREQUÊNCIA NO SISTEMA</div>
              <div className="text-3xl font-bold text-white">
                {word.frequenciaNormalizadaDominio?.toFixed(2) || '0.00'}%
              </div>
              <div className="text-white/50 text-[10px] mt-1">
                {word.ocorrencias}× ocorrências em "{word.dominio}"
              </div>
            </div>
            
            {/* Órbita */}
            <div className="bg-black/40 rounded-lg p-3 border border-purple-500/30">
              <div className="text-purple-300 text-[10px] font-mono mb-2">🪐 POSIÇÃO ORBITAL</div>
              <div className="text-white text-sm">
                Órbita {(word.orbitIndex || 0) + 1} 
                <span className="text-white/50 ml-2">
                  ({(word.orbitIndex || 0) * 10}-{((word.orbitIndex || 0) + 1) * 10}%)
                </span>
              </div>
              <div className="text-white/40 text-[9px] mt-2">
                Palavras de mesma frequência orbital agrupadas
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
