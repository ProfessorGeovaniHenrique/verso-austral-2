import jsPDF from 'jspdf';
import {
  productVision,
  personas,
  mvpEpics,
  postMvpEpics,
  v2Epics,
  futureProspects,
  mvpMetrics,
  immediatePriorities,
  type Epic,
  type Story
} from '@/data/developer-logs/product-roadmap';
import { getCurrentReportDate, formatDateBR } from './dateHelpers';

interface ExportOptions {
  includeTimeline?: boolean;
  includeRoadmap?: boolean;
  includeScientific?: boolean;
  includeCorrections?: boolean;
}

export async function exportDeveloperHistoryToPDF(options: ExportOptions = {}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // ========== CAPA ==========
  pdf.setFillColor(36, 166, 91); // Verde gaúcho
  pdf.rect(0, 0, pageWidth, 60, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.text('Developer History Report', pageWidth / 2, 30, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.text('Plataforma de Análise Cultural', pageWidth / 2, 40, { align: 'center' });
  
  pdf.setFontSize(10);
  const timestamp = formatDateBR(getCurrentReportDate());
  pdf.text(`Gerado em: ${timestamp}`, pageWidth / 2, 50, { align: 'center' });

  yPosition = 80;
  pdf.setTextColor(0, 0, 0);

  // ========== ÍNDICE ==========
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Índice', 15, yPosition);
  yPosition += 10;

  const sections = [
    '1. Visão do Produto',
    '2. Personas',
    '3. Status do MVP',
    '4. Épicos Detalhados',
    '5. Prioridades Imediatas',
    '6. Roadmap Futuro'
  ];

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  sections.forEach(section => {
    pdf.text(section, 20, yPosition);
    yPosition += 7;
  });

  // ========== NOVA PÁGINA: VISÃO DO PRODUTO ==========
  pdf.addPage();
  yPosition = 20;

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(36, 166, 91);
  pdf.text('1. Visão do Produto', 15, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  
  // Problema
  pdf.setFont('helvetica', 'bold');
  pdf.text('Problema:', 15, yPosition);
  yPosition += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const problemLines = pdf.splitTextToSize(productVision.problem, pageWidth - 40);
  pdf.text(problemLines, 20, yPosition);
  yPosition += problemLines.length * 5 + 5;

  // Solução
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Solução:', 15, yPosition);
  yPosition += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const solutionLines = pdf.splitTextToSize(productVision.solution, pageWidth - 40);
  pdf.text(solutionLines, 20, yPosition);
  yPosition += solutionLines.length * 5 + 5;

  // Value Proposition
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Proposta de Valor:', 15, yPosition);
  yPosition += 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const valueLines = pdf.splitTextToSize(productVision.valueProposition, pageWidth - 40);
  pdf.text(valueLines, 20, yPosition);
  yPosition += valueLines.length * 5 + 15;

  // ========== PERSONAS ==========
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(36, 166, 91);
  pdf.text('2. Personas', 15, yPosition);
  yPosition += 12;

  personas.forEach(persona => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFillColor(240, 240, 240);
    pdf.roundedRect(15, yPosition - 5, pageWidth - 30, 25, 3, 3, 'F');

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${persona.name} - ${persona.role}`, 20, yPosition + 3);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(persona.type === 'primary' ? '⭐ Primária' : '○ Secundária', 20, yPosition + 9);
    
    pdf.setFontSize(10);
    const descLines = pdf.splitTextToSize(persona.description, pageWidth - 50);
    pdf.text(descLines, 20, yPosition + 15);
    
    yPosition += 30;
  });

  // ========== STATUS DO MVP ==========
  pdf.addPage();
  yPosition = 20;

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(36, 166, 91);
  pdf.text('3. Status do MVP', 15, yPosition);
  yPosition += 12;

  // Overall Progress
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Progresso Geral', 15, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Conclusão: ${mvpMetrics.overallCompletion}%`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Stories Implementadas: ${mvpMetrics.implementedStories} / ${mvpMetrics.totalMvpStories}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Épicos Concluídos: ${mvpMetrics.completedEpics} / ${mvpMetrics.totalEpics}`, 20, yPosition);
  yPosition += 15;

  // Helper function para adicionar épicos
  const addEpicsSection = (epics: Epic[], title: string) => {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(36, 166, 91);
    pdf.text(title, 15, yPosition);
    yPosition += 10;

    epics.forEach((epic, index) => {
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = 20;
      }

      // Status badge
      const statusColor = epic.status === 'completed' ? [34, 197, 94] : 
                         epic.status === 'in-progress' ? [234, 179, 8] : [156, 163, 175];
      const statusText = epic.status === 'completed' ? '✓ Concluído' :
                        epic.status === 'in-progress' ? '⏱ Em Progresso' : '○ Planejado';
      
      pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2], 20);
      pdf.roundedRect(15, yPosition - 4, 30, 6, 2, 2, 'F');
      pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.setFontSize(8);
      pdf.text(statusText, 17, yPosition);

      // Epic title
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Épico ${epic.number}: ${epic.name}`, 50, yPosition);
      yPosition += 8;

      // Progress bar
      pdf.setFillColor(230, 230, 230);
      pdf.rect(20, yPosition, 100, 4, 'F');
      pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.rect(20, yPosition, epic.completionPercentage, 4, 'F');
      pdf.setFontSize(9);
      pdf.text(`${epic.completionPercentage}%`, 125, yPosition + 3);
      yPosition += 10;

      // Stories
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      epic.stories.forEach(story => {
        if (yPosition > pageHeight - 15) {
          pdf.addPage();
          yPosition = 20;
        }
        const icon = story.implemented ? '✓' : '○';
        const color = story.implemented ? [34, 197, 94] : [156, 163, 175];
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(icon, 25, yPosition);
        pdf.setTextColor(0, 0, 0);
        const storyLines = pdf.splitTextToSize(story.title, pageWidth - 50);
        pdf.text(storyLines, 30, yPosition);
        yPosition += storyLines.length * 4 + 2;
      });

      yPosition += 8;
    });
  };

  // Adicionar épicos
  addEpicsSection(mvpEpics, 'Épicos MVP');
  
  if (options.includeRoadmap) {
    pdf.addPage();
    yPosition = 20;
    addEpicsSection(postMvpEpics, 'Épicos Pós-MVP');
    
    pdf.addPage();
    yPosition = 20;
    addEpicsSection(v2Epics, 'Épicos V2.0');
  }

  // ========== PRIORIDADES IMEDIATAS ==========
  pdf.addPage();
  yPosition = 20;

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(36, 166, 91);
  pdf.text('5. Prioridades Imediatas', 15, yPosition);
  yPosition += 12;

  immediatePriorities.forEach((priority, index) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFillColor(255, 243, 205);
    pdf.roundedRect(15, yPosition - 5, pageWidth - 30, 30, 3, 3, 'F');

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}. ${priority.story}`, 20, yPosition + 2);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Épico: ${priority.epic}`, 20, yPosition + 8);
    pdf.text(`Esforço: ${priority.effort} | Impacto: ${priority.impact}`, 20, yPosition + 13);
    
    const rationaleLines = pdf.splitTextToSize(`Justificativa: ${priority.rationale}`, pageWidth - 50);
    pdf.text(rationaleLines, 20, yPosition + 18);

    yPosition += 35;
  });

  // ========== RODAPÉ EM TODAS AS PÁGINAS ==========
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Página ${i} de ${totalPages} | Developer History Report | Verso Austral`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Salvar PDF
  pdf.save(`developer-history-${Date.now()}.pdf`);
}
