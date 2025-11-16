import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DevOpsMetrics } from '@/types/devops.types';

export async function exportDashboardToPdf(metrics: DevOpsMetrics) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(59, 130, 246); // primary color
  pdf.text('DevOps Metrics Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // Summary Section
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Resumo Executivo', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(12);
  pdf.text(`Taxa de Sucesso: ${metrics.summary.successRate}%`, 20, yPosition);
  yPosition += 7;
  pdf.text(`Cobertura de Testes: ${metrics.summary.totalCoverage}%`, 20, yPosition);
  yPosition += 7;
  pdf.text(`Tempo Médio CI: ${metrics.summary.averageCITime}`, 20, yPosition);
  yPosition += 7;
  pdf.text(`Última Release: ${metrics.summary.latestVersion}`, 20, yPosition);
  yPosition += 15;

  // Workflows Section
  pdf.setFontSize(16);
  pdf.text('Status dos Workflows', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  metrics.workflows.forEach((workflow) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }

    const statusColor = workflow.status === 'success' ? [34, 197, 94] : 
                       workflow.status === 'failure' ? [239, 68, 68] : [250, 204, 21];
    
    pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    pdf.text(`● ${workflow.name}`, 25, yPosition);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${workflow.lastRun} | ${workflow.duration}`, 80, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Test History
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Histórico de Testes (Últimos 7 dias)', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.text('Data', 25, yPosition);
  pdf.text('Aprovados', 60, yPosition);
  pdf.text('Falharam', 95, yPosition);
  pdf.text('Cobertura', 130, yPosition);
  yPosition += 7;

  metrics.testHistory.slice(-7).forEach((test) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setTextColor(100, 100, 100);
    pdf.text(test.date, 25, yPosition);
    pdf.text(test.passed.toString(), 60, yPosition);
    pdf.text(test.failed.toString(), 95, yPosition);
    pdf.text(`${test.coverage}%`, 130, yPosition);
    yPosition += 7;
  });

  // Corpus Metrics
  if (yPosition > pageHeight - 40) {
    pdf.addPage();
    yPosition = 20;
  }

  yPosition += 10;
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Métricas do Corpus', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  metrics.corpusMetrics.forEach((metric) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setTextColor(0, 0, 0);
    pdf.text(metric.label, 25, yPosition);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${metric.value} / ${metric.total} (${metric.change > 0 ? '+' : ''}${metric.change.toFixed(1)}%)`, 80, yPosition);
    yPosition += 7;
  });

  // Footer on every page
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Página ${i} de ${totalPages} | DevOps Dashboard`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `devops-metrics-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

export async function exportSectionToPdf(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
  pdf.save(`${fileName}.pdf`);
}
