import { Trophy, Compass, BarChart3, GraduationCap, Crown, Guitar } from "lucide-react";

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'explorer' | 'analyst' | 'expert' | 'master';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: typeof Trophy;
  emoji: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  requirement: {
    type: 'feature_usage' | 'combo' | 'milestone';
    features?: string[];
    count?: number;
    timeframe?: 'session' | 'week' | 'all-time';
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // ===== EXPLORER (5 conquistas - primeiras vezes) =====
  {
    id: 'first_kwic',
    name: 'Explorador KWIC',
    description: 'Visualize seu primeiro contexto de concordância',
    icon: Compass,
    emoji: '🔍',
    category: 'explorer',
    rarity: 'common',
    requirement: {
      type: 'feature_usage',
      features: ['kwic'],
      count: 1,
    }
  },
  {
    id: 'first_keywords',
    name: 'Caçador de Palavras-Chave',
    description: 'Extraia sua primeira lista de keywords estatísticas',
    icon: Compass,
    emoji: '🎯',
    category: 'explorer',
    rarity: 'common',
    requirement: {
      type: 'feature_usage',
      features: ['keywords'],
      count: 1,
    }
  },
  {
    id: 'first_ngrams',
    name: 'Descobridor de Padrões',
    description: 'Analise seus primeiros N-gramas',
    icon: Compass,
    emoji: '🧩',
    category: 'explorer',
    rarity: 'common',
    requirement: {
      type: 'feature_usage',
      features: ['ngrams'],
      count: 1,
    }
  },
  {
    id: 'first_wordlist',
    name: 'Contador de Frequências',
    description: 'Gere sua primeira lista de palavras',
    icon: Compass,
    emoji: '📊',
    category: 'explorer',
    rarity: 'common',
    requirement: {
      type: 'feature_usage',
      features: ['wordlist'],
      count: 1,
    }
  },
  {
    id: 'first_dispersion',
    name: 'Mapeador Textual',
    description: 'Visualize sua primeira dispersão de palavras',
    icon: Compass,
    emoji: '🗺️',
    category: 'explorer',
    rarity: 'common',
    requirement: {
      type: 'feature_usage',
      features: ['dispersion'],
      count: 1,
    }
  },
  {
    id: 'chamamecero',
    name: 'Chamamecero',
    description: 'Complete o quiz cultural com aprovação (70%+)',
    icon: Guitar,
    emoji: '🎸',
    category: 'explorer',
    rarity: 'rare',
    requirement: {
      type: 'feature_usage',
      features: ['quiz_passed'],
      count: 1,
    }
  },
  {
    id: 'sede_conhecimento',
    name: 'Sede de Conhecimento',
    description: 'Desbloqueie todas as 5 abas do módulo de aprendizagem',
    icon: GraduationCap,
    emoji: '🎓',
    category: 'explorer',
    rarity: 'rare',
    requirement: {
      type: 'feature_usage',
      features: ['all_tabs_unlocked'],
      count: 1,
    }
  },
  {
    id: 'cientista_junior',
    name: 'Cientista Júnior',
    description: 'Processe seu primeiro corpus para análise semântica',
    icon: BarChart3,
    emoji: '🔬',
    category: 'explorer',
    rarity: 'rare',
    requirement: {
      type: 'feature_usage',
      features: ['corpus_processed'],
      count: 1,
    }
  },

  // ===== ANALYST (4 conquistas - uso regular) =====
  {
    id: 'kwic_enthusiast',
    name: 'Entusiasta do Contexto',
    description: 'Use KWIC 10 vezes',
    icon: BarChart3,
    emoji: '🔥',
    category: 'analyst',
    rarity: 'rare',
    requirement: {
      type: 'feature_usage',
      features: ['kwic'],
      count: 10,
    }
  },
  {
    id: 'keywords_master',
    name: 'Mestre das Keywords',
    description: 'Extraia keywords 25 vezes',
    icon: BarChart3,
    emoji: '💎',
    category: 'analyst',
    rarity: 'rare',
    requirement: {
      type: 'feature_usage',
      features: ['keywords'],
      count: 25,
    }
  },
  {
    id: 'ngrams_specialist',
    name: 'Especialista em N-gramas',
    description: 'Analise N-gramas 15 vezes',
    icon: BarChart3,
    emoji: '🎓',
    category: 'analyst',
    rarity: 'rare',
    requirement: {
      type: 'feature_usage',
      features: ['ngrams'],
      count: 15,
    }
  },
  {
    id: 'frequency_analyst',
    name: 'Analista de Frequências',
    description: 'Gere listas de palavras 20 vezes',
    icon: BarChart3,
    emoji: '📈',
    category: 'analyst',
    rarity: 'rare',
    requirement: {
      type: 'feature_usage',
      features: ['wordlist'],
      count: 20,
    }
  },

  // ===== EXPERT (3 conquistas - combos) =====
  {
    id: 'tool_explorer',
    name: 'Explorador Completo',
    description: 'Use todas as 5 ferramentas ao menos uma vez',
    icon: GraduationCap,
    emoji: '🌟',
    category: 'expert',
    rarity: 'epic',
    requirement: {
      type: 'combo',
      features: ['kwic', 'keywords', 'ngrams', 'wordlist', 'dispersion'],
      count: 1,
    }
  },
  {
    id: 'triple_combo',
    name: 'Combo Analítico',
    description: 'Use 3 ferramentas diferentes na mesma sessão',
    icon: GraduationCap,
    emoji: '⚡',
    category: 'expert',
    rarity: 'epic',
    requirement: {
      type: 'combo',
      features: ['kwic', 'keywords', 'ngrams', 'wordlist', 'dispersion'],
      count: 3,
      timeframe: 'session',
    }
  },
  {
    id: 'power_week',
    name: 'Semana Produtiva',
    description: 'Realize 50 análises em uma semana',
    icon: GraduationCap,
    emoji: '🔥',
    category: 'expert',
    rarity: 'epic',
    requirement: {
      type: 'milestone',
      count: 50,
      timeframe: 'week',
    }
  },

  // ===== MASTER (3 conquistas - marcos épicos) =====
  {
    id: 'century_club',
    name: 'Clube dos 100',
    description: 'Complete 100 análises no total',
    icon: Crown,
    emoji: '👑',
    category: 'master',
    rarity: 'legendary',
    requirement: {
      type: 'milestone',
      count: 100,
      timeframe: 'all-time',
    }
  },
  {
    id: 'corpus_master',
    name: 'Mestre do Corpus',
    description: 'Use cada ferramenta ao menos 10 vezes',
    icon: Crown,
    emoji: '🏆',
    category: 'master',
    rarity: 'legendary',
    requirement: {
      type: 'combo',
      features: ['kwic', 'keywords', 'ngrams', 'wordlist', 'dispersion'],
      count: 10,
    }
  },
  {
    id: 'dedication_award',
    name: 'Dedicação Absoluta',
    description: 'Realize análises em 7 dias consecutivos',
    icon: Crown,
    emoji: '💫',
    category: 'master',
    rarity: 'legendary',
    requirement: {
      type: 'milestone',
      count: 7,
      timeframe: 'week',
    }
  },
];

export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: 'text-muted-foreground',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-amber-500',
};

export const RARITY_BG: Record<AchievementRarity, string> = {
  common: 'bg-muted',
  rare: 'bg-blue-500/10',
  epic: 'bg-purple-500/10',
  legendary: 'bg-amber-500/10',
};
