import jsPDF from 'jspdf';
import { DemoDomain } from '@/services/demoCorpusService';

interface DomainsPDFData {
  dominios: DemoDomain[];
  estatisticas: {
    totalDominios: number;
    dominante: { nome: string; percentual: number };
    densidadeLexical: number;
  };
}

export async function exportDomainsToPDF(data: DomainsPDFData) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPosition = 20;

  // === HEADER ===
  pdf.setFontSize(24);
  pdf.setTextColor(36, 166, 91); // Verde gaúcho
  pdf.text('Análise de Domínios Semânticos', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Corpus: "Quando o Verso Vem pras Casa" - Luiz Marenco', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // === RESUMO EXECUTIVO ===
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text('📊 Resumo Executivo', 15, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  const resumo = [
    { label: 'Total de Domínios Identificados', value: data.estatisticas.totalDominios },
    { label: 'Domínio Dominante', value: data.estatisticas.dominante.nome },
    { label: 'Representatividade do Dominante', value: `${data.estatisticas.dominante.percentual.toFixed(1)}%` },
    { label: 'Densidade Lexical Média', value: data.estatisticas.densidadeLexical.toFixed(2) },
  ];

  resumo.forEach((item) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${item.label}:`, 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(item.value), 120, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // === TABELA DE DOMÍNIOS ===
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('📋 Distribuição por Domínio Semântico', 15, yPosition);
  yPosition += 8;

  // Header da tabela
  pdf.setFontSize(9);
  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, yPosition, pageWidth - 30, 8, 'F');
  pdf.text('Domínio', 20, yPosition + 5);
  pdf.text('Percentual', 100, yPosition + 5);
  pdf.text('Ocorrências', 135, yPosition + 5);
  pdf.text('Lemas', 170, yPosition + 5);
  yPosition += 10;

  // Linhas da tabela
  pdf.setFont('helvetica', 'normal');
  data.dominios.forEach((dominio, index) => {
    // Verificar se precisa de nova página
    if (yPosition > 270) {
      pdf.addPage();
      yPosition = 20;
    }

    // Linha alternada
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(15, yPosition - 3, pageWidth - 30, 8, 'F');
    }

    // Dados da linha
    pdf.setTextColor(0, 0, 0);
    pdf.text(dominio.dominio, 20, yPosition + 2);
    pdf.text(`${dominio.percentual.toFixed(2)}%`, 100, yPosition + 2);
    pdf.text(String(dominio.ocorrencias), 135, yPosition + 2);
    pdf.text(String(dominio.riquezaLexical), 170, yPosition + 2);
    
    yPosition += 8;
  });

  // === NOVA PÁGINA: PALAVRAS-CHAVE POR DOMÍNIO ===
  pdf.addPage();
  yPosition = 20;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('🔑 Palavras-Chave por Domínio', 15, yPosition);
  yPosition += 10;

  data.dominios.forEach((dominio) => {
    // Verificar espaço para novo domínio
    if (yPosition > 260) {
      pdf.addPage();
      yPosition = 20;
    }

    // Nome do domínio
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(36, 166, 91);
    pdf.text(dominio.dominio, 15, yPosition);
    yPosition += 8;

    // Palavras-chave
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    
    const palavrasText = dominio.palavras.join(', ');
    const lines = pdf.splitTextToSize(palavrasText, pageWidth - 40);
    
    lines.forEach((line: string) => {
      if (yPosition > 280) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(line, 20, yPosition);
      yPosition += 5;
    });

    yPosition += 8;
  });

  // === FOOTER EM TODAS AS PÁGINAS ===
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} | Verso Austral - UFRGS`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 20, pdf.internal.pageSize.getHeight() - 10);
  }

  // Salvar PDF
  pdf.save(`dominios-semanticos-${new Date().toISOString().split('T')[0]}.pdf`);
}
