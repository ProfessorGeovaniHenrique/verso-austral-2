import { jsPDF } from 'jspdf';

interface AnalysisSuggestion {
  id: string;
  priority: 1 | 2 | 3 | 4 | 5;
  category: 'security' | 'performance' | 'bugfix' | 'optimization';
  title: string;
  description: string;
  affectedFiles: string[];
  codeSnippet: string;
  testSuggestion?: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  creditsSaved: string;
}

interface AnalysisResult {
  timestamp: string;
  analysisId?: string;
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  suggestions: AnalysisSuggestion[];
  nextSteps: string[];
}

interface ExportOptions {
  format: 'pdf' | 'json' | 'markdown';
  analysisResult: AnalysisResult;
  includeCode?: boolean;
}

function getPriorityLabel(priority: number): string {
  const labels = ['', 'Crítico', 'Alto', 'Médio', 'Baixo', 'Trivial'];
  return labels[priority] || 'Desconhecido';
}

function getEffortLabel(effort: string): string {
  const labels: Record<string, string> = {
    low: 'Baixo',
    medium: 'Médio',
    high: 'Alto'
  };
  return labels[effort] || effort;
}

function exportToPDF(result: AnalysisResult, includeCode: boolean) {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('Resultados da Análise IA', 20, 20);
  
  // Timestamp
  doc.setFontSize(10);
  doc.text(`Data: ${new Date(result.timestamp).toLocaleString('pt-BR')}`, 20, 28);
  
  // Sumário
  doc.setFontSize(14);
  doc.text('Sumário', 20, 40);
  doc.setFontSize(10);
  doc.text(`Total de Problemas: ${result.summary.totalIssues}`, 25, 48);
  doc.text(`Críticos: ${result.summary.critical}`, 25, 54);
  doc.text(`Altos: ${result.summary.high}`, 25, 60);
  doc.text(`Médios: ${result.summary.medium}`, 25, 66);
  
  let yPos = 78;
  
  // Sugestões
  result.suggestions.forEach((suggestion, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.text(`${idx + 1}. ${suggestion.title}`, 20, yPos);
    yPos += 7;
    
    doc.setFontSize(9);
    doc.text(`Prioridade: ${getPriorityLabel(suggestion.priority)} | Categoria: ${suggestion.category}`, 25, yPos);
    yPos += 5;
    doc.text(`Esforço: ${getEffortLabel(suggestion.estimatedEffort)} | Economia: ${suggestion.creditsSaved}`, 25, yPos);
    yPos += 8;
    
    // Descrição
    const descLines = doc.splitTextToSize(suggestion.description, 170);
    doc.text(descLines, 25, yPos);
    yPos += descLines.length * 5 + 5;
    
    // Arquivos afetados
    if (suggestion.affectedFiles.length > 0) {
      doc.text(`Arquivos: ${suggestion.affectedFiles.slice(0, 3).join(', ')}`, 25, yPos);
      yPos += 5;
    }
    
    // Código (opcional)
    if (includeCode && suggestion.codeSnippet) {
      doc.setFont('courier');
      const codeLines = doc.splitTextToSize(suggestion.codeSnippet, 160);
      const linesToShow = codeLines.slice(0, 10);
      doc.text(linesToShow, 25, yPos);
      yPos += linesToShow.length * 4 + 8;
      doc.setFont('helvetica');
    }
    
    yPos += 5;
  });
  
  // Próximos passos
  if (result.nextSteps.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text('Próximos Passos', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    result.nextSteps.forEach((step, idx) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      const stepLines = doc.splitTextToSize(`${idx + 1}. ${step}`, 170);
      doc.text(stepLines, 25, yPos);
      yPos += stepLines.length * 5 + 3;
    });
  }
  
  // Salvar
  const filename = `analise-ia-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

function exportToJSON(result: AnalysisResult) {
  const jsonStr = JSON.stringify(result, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analise-ia-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToMarkdown(result: AnalysisResult, includeCode: boolean) {
  let md = `# Resultados da Análise IA\n\n`;
  md += `**Data:** ${new Date(result.timestamp).toLocaleString('pt-BR')}\n\n`;
  md += `## 📊 Sumário\n\n`;
  md += `- **Total de Problemas:** ${result.summary.totalIssues}\n`;
  md += `- **Críticos:** ${result.summary.critical}\n`;
  md += `- **Altos:** ${result.summary.high}\n`;
  md += `- **Médios:** ${result.summary.medium}\n`;
  md += `- **Baixos:** ${result.summary.low}\n\n`;
  md += `---\n\n`;
  
  result.suggestions.forEach((suggestion, idx) => {
    md += `## ${idx + 1}. ${suggestion.title}\n\n`;
    md += `**Prioridade:** ${getPriorityLabel(suggestion.priority)} | `;
    md += `**Categoria:** ${suggestion.category} | `;
    md += `**Esforço:** ${getEffortLabel(suggestion.estimatedEffort)}\n\n`;
    md += `**Economia Estimada:** ${suggestion.creditsSaved}\n\n`;
    md += `### 📝 Descrição\n\n${suggestion.description}\n\n`;
    md += `### 📁 Arquivos Afetados\n\n`;
    suggestion.affectedFiles.forEach(file => {
      md += `- \`${file}\`\n`;
    });
    md += `\n`;
    
    if (includeCode && suggestion.codeSnippet) {
      md += `### 💡 Solução Sugerida\n\n\`\`\`typescript\n${suggestion.codeSnippet}\n\`\`\`\n\n`;
    }
    
    if (suggestion.testSuggestion) {
      md += `### 🧪 Teste Sugerido\n\n${suggestion.testSuggestion}\n\n`;
    }
    
    md += `---\n\n`;
  });
  
  if (result.nextSteps.length > 0) {
    md += `## 🎯 Próximos Passos\n\n`;
    result.nextSteps.forEach((step, idx) => {
      md += `${idx + 1}. ${step}\n`;
    });
  }
  
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analise-ia-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAnalysisReport({ format, analysisResult, includeCode = true }: ExportOptions) {
  switch (format) {
    case 'pdf':
      return exportToPDF(analysisResult, includeCode);
    case 'json':
      return exportToJSON(analysisResult);
    case 'markdown':
      return exportToMarkdown(analysisResult, includeCode);
  }
}
