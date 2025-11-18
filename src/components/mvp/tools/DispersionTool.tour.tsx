export const dispersionTourSteps = [
  {
    id: 'dispersion-intro',
    title: '📈 Dispersão - Distribuição no Corpus',
    text: 'Visualize como uma palavra está distribuída ao longo do corpus.',
  },
  {
    id: 'dispersion-menu',
    title: '📍 Menu Lateral',
    text: 'Clique em "Dispersão" para ativar esta ferramenta.',
    attachTo: { element: '[data-tour="tool-menu-dispersion"]', on: 'right' as const },
  },
  {
    id: 'dispersion-input',
    title: 'Digite uma Palavra',
    text: 'Insira a palavra que deseja analisar. Experimente "Rio Grande".',
    attachTo: { element: '[data-tour="dispersion-input"]', on: 'bottom' as const },
  },
  {
    id: 'dispersion-analyze',
    title: 'Processar Análise',
    text: 'Clique aqui para calcular a dispersão da palavra no corpus.',
    attachTo: { element: '[data-tour="dispersion-analyze"]', on: 'bottom' as const },
  },
  {
    id: 'dispersion-metrics',
    title: 'Métricas Estatísticas',
    text: 'Veja a densidade de ocorrências e outras métricas.',
    attachTo: { element: '[data-tour="dispersion-metrics"]', on: 'top' as const },
  },
  {
    id: 'dispersion-chart',
    title: 'Visualização Gráfica',
    text: 'O gráfico mostra a posição de cada ocorrência ao longo do corpus.',
    attachTo: { element: '[data-tour="dispersion-chart"]', on: 'top' as const },
  },
];
