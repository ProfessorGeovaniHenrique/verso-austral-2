export const kwicTourSteps = [
  {
    id: 'kwic-intro',
    title: '🔍 KWIC - Key Word In Context',
    text: 'Esta ferramenta mostra todas as ocorrências de uma palavra com seu contexto ao redor.',
  },
  {
    id: 'kwic-menu',
    title: '📍 Navegação Rápida',
    text: 'Use o menu lateral para alternar entre ferramentas sem perder suas configurações. Clique em "KWIC" para ativar esta ferramenta.',
    attachTo: { element: '[data-tour="tool-menu-kwic"]', on: 'right' as const },
  },
  {
    id: 'kwic-input',
    title: 'Digite uma Palavra',
    text: 'Comece digitando uma palavra para buscar. Experimente "pampa" ou "gaúcho".',
    attachTo: { element: '[data-tour="kwic-input"]', on: 'bottom' as const },
  },
  {
    id: 'kwic-results',
    title: 'Resultados',
    text: 'As concordâncias aparecem aqui, mostrando a palavra destacada em contexto.',
    attachTo: { element: '[data-tour="kwic-results"]', on: 'top' as const },
  },
];
