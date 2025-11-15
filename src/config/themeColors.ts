/**
 * Tema Acadêmico Gaúcho - Paleta baseada na Bandeira do Rio Grande do Sul
 * Cores principais: Verde, Vermelho e Amarelo
 */

export const ACADEMIC_RS_COLORS = {
  // Cores da Bandeira do RS
  verde: {
    main: '#24824A',      // Verde principal da bandeira
    light: '#36B368',     // Verde claro (success)
    dark: '#1A5F36',      // Verde escuro (borders/hover)
    subtle: '#E8F5EE',    // Verde muito claro (backgrounds)
  },
  vermelho: {
    main: '#D62828',      // Vermelho principal da bandeira
    light: '#E85D5D',     // Vermelho claro
    dark: '#A01F1F',      // Vermelho escuro (hover)
    subtle: '#FCE8E8',    // Vermelho muito claro (backgrounds)
  },
  amarelo: {
    main: '#F2B705',      // Amarelo principal da bandeira
    light: '#FFD23F',     // Amarelo claro
    dark: '#C79400',      // Amarelo escuro (hover)
    subtle: '#FFF9E6',    // Amarelo muito claro (backgrounds)
  },
  
  // Tons off-white (não branco puro)
  background: {
    main: '#F7F5F2',      // Background principal - bege claro
    card: '#FAFAFA',      // Cards - off-white
    muted: '#EBE9E6',     // Elementos mutados - cinza bege
    hover: '#F0EDE8',     // Hover state
  },
  
  // Cinzas e textos
  foreground: {
    main: '#2E2B26',      // Texto principal - marrom escuro
    muted: '#6D6860',     // Texto secundário - cinza marrom
    light: '#9B948C',     // Texto terciário - cinza claro
  },
  
  // Borders
  border: {
    main: '#DDD9D3',      // Border padrão
    light: '#E8E6E3',     // Border sutil
    strong: '#C9C4BC',    // Border forte
  },
};

/**
 * Mapeamento de prosódia semântica para cores gaúchas
 */
export const PROSODY_COLORS = {
  Positiva: ACADEMIC_RS_COLORS.verde.main,
  Negativa: ACADEMIC_RS_COLORS.vermelho.main,
  Neutra: ACADEMIC_RS_COLORS.amarelo.main,
};

/**
 * Mapeamento de comparação de corpus para cores gaúchas
 */
export const CORPUS_COMPARISON_COLORS = {
  'super-representado': ACADEMIC_RS_COLORS.verde.main,
  'equilibrado': ACADEMIC_RS_COLORS.amarelo.main,
  'sub-representado': ACADEMIC_RS_COLORS.vermelho.main,
};

/**
 * Variantes de badges acadêmicos
 */
export const BADGE_VARIANTS = {
  success: {
    bg: ACADEMIC_RS_COLORS.verde.subtle,
    border: ACADEMIC_RS_COLORS.verde.main,
    text: ACADEMIC_RS_COLORS.verde.dark,
  },
  warning: {
    bg: ACADEMIC_RS_COLORS.amarelo.subtle,
    border: ACADEMIC_RS_COLORS.amarelo.main,
    text: ACADEMIC_RS_COLORS.amarelo.dark,
  },
  error: {
    bg: ACADEMIC_RS_COLORS.vermelho.subtle,
    border: ACADEMIC_RS_COLORS.vermelho.main,
    text: ACADEMIC_RS_COLORS.vermelho.dark,
  },
};

/**
 * Conversão de hex para HSL para uso em Tailwind/CSS variables
 */
export const hexToHSL = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};
