export const keywordsTourSteps = [
  {
    id: 'keywords-intro',
    title: '🔑 Keywords - Palavras-Chave Estatísticas',
    text: 'Descubra palavras estatisticamente significativas comparando dois corpus diferentes usando Log-Likelihood e Mutual Information.',
  },
  {
    id: 'keywords-menu',
    title: '📍 Ferramenta Ativa',
    text: 'A ferramenta "Keywords" está selecionada no menu lateral. Você pode alternar para outras ferramentas a qualquer momento.',
    attachTo: { element: '[data-tour="tool-menu-keywords"]', on: 'right' as const },
  },
  {
    id: 'keywords-corpus-selection',
    title: 'Selecione os Corpus',
    text: 'Escolha um corpus de estudo e um de referência para comparação estatística.',
    attachTo: { element: '[data-tour="keywords-corpus"]', on: 'bottom' as const },
  },
  {
    id: 'keywords-process',
    title: 'Processar Análise',
    text: 'Clique em "Processar Keywords" para calcular as palavras-chave.',
    attachTo: { element: '[data-tour="keywords-process"]', on: 'bottom' as const },
  },
  {
    id: 'keywords-results',
    title: 'Resultados',
    text: 'Veja as palavras super-representadas (mais frequentes no corpus de estudo) e sub-representadas. Clique em uma palavra para ver concordâncias.',
    attachTo: { element: '[data-tour="keywords-results"]', on: 'top' as const },
  },
];
