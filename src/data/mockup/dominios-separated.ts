import { DominioSemantico } from '../types/corpus.types';

/**
 * Domínios Semânticos Separados para Visualização FOG & PLANETS
 * 
 * Baseado em dominiosNormalizados com a separação de:
 * "Partes do Corpo e Seres Vivos" → "Partes do Corpo" + "Seres Vivos"
 * 
 * Total de domínios: 7 (6 originais + 1 novo)
 */
export const dominiosSeparated: DominioSemantico[] = [
  {
    dominio: "Cultura e Lida Gaúcha",
    riquezaLexical: 27,
    ocorrencias: 28,
    percentual: 13.21,
    percentualTematico: 23.93,
    palavras: [
      "gateada", "arreio", "bomba", "brasa", "cambona", "campereada",
      "cancela", "candeeiro", "caseiro", "copla", "cuia", "espora", 
      "galpão", "galponeiro", "jujado", "lombo", "lonjura", "maragato", 
      "mate", "pañuelo", "prenda", "pura-folha", "quarto", "querência", 
      "ramada", "templado", "tropa"
    ],
    palavrasComFrequencia: [
      { palavra: "gateada", ocorrencias: 2 },
      { palavra: "arreio", ocorrencias: 1 },
      { palavra: "bomba", ocorrencias: 1 },
      { palavra: "brasa", ocorrencias: 1 },
      { palavra: "cambona", ocorrencias: 1 },
      { palavra: "campereada", ocorrencias: 1 },
      { palavra: "cancela", ocorrencias: 1 },
      { palavra: "candeeiro", ocorrencias: 1 },
      { palavra: "caseiro", ocorrencias: 1 },
      { palavra: "copla", ocorrencias: 1 },
      { palavra: "cuia", ocorrencias: 1 },
      { palavra: "espora", ocorrencias: 1 },
      { palavra: "galpão", ocorrencias: 1 },
      { palavra: "galponeiro", ocorrencias: 1 },
      { palavra: "jujado", ocorrencias: 1 },
      { palavra: "lombo", ocorrencias: 1 },
      { palavra: "lonjura", ocorrencias: 1 },
      { palavra: "maragato", ocorrencias: 1 },
      { palavra: "mate", ocorrencias: 1 },
      { palavra: "pañuelo", ocorrencias: 1 },
      { palavra: "prenda", ocorrencias: 1 },
      { palavra: "pura-folha", ocorrencias: 1 },
      { palavra: "quarto", ocorrencias: 1 },
      { palavra: "querência", ocorrencias: 1 },
      { palavra: "ramada", ocorrencias: 1 },
      { palavra: "templado", ocorrencias: 1 },
      { palavra: "tropa", ocorrencias: 1 }
    ],
    cor: "hsl(142, 71%, 45%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 23.93,
    comparacaoCorpus: 'super-representado',
    diferencaCorpus: 8.83,
    percentualCorpusNE: 15.1
  },
  {
    dominio: "Natureza e Paisagem",
    riquezaLexical: 20,
    ocorrencias: 26,
    percentual: 12.26,
    percentualTematico: 22.22,
    palavras: [
      "coxilha", "sol", "sombra", "tarde", "tarumã", "várzea", "asa", 
      "aurora", "campo", "campanha", "chão", "fogo", "horizonte", 
      "madrugada", "manhã", "maçanilha", "noite", "primavera", 
      "reponte", "ventito"
    ],
    palavrasComFrequencia: [
      { palavra: "coxilha", ocorrencias: 2 },
      { palavra: "sol", ocorrencias: 2 },
      { palavra: "sombra", ocorrencias: 2 },
      { palavra: "tarde", ocorrencias: 2 },
      { palavra: "tarumã", ocorrencias: 2 },
      { palavra: "várzea", ocorrencias: 2 },
      { palavra: "asa", ocorrencias: 1 },
      { palavra: "aurora", ocorrencias: 1 },
      { palavra: "campo", ocorrencias: 1 },
      { palavra: "campanha", ocorrencias: 1 },
      { palavra: "chão", ocorrencias: 1 },
      { palavra: "fogo", ocorrencias: 1 },
      { palavra: "horizonte", ocorrencias: 1 },
      { palavra: "madrugada", ocorrencias: 1 },
      { palavra: "manhã", ocorrencias: 1 },
      { palavra: "maçanilha", ocorrencias: 1 },
      { palavra: "noite", ocorrencias: 1 },
      { palavra: "primavera", ocorrencias: 1 },
      { palavra: "reponte", ocorrencias: 1 },
      { palavra: "ventito", ocorrencias: 1 }
    ],
    cor: "hsl(200, 70%, 50%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 22.22,
    comparacaoCorpus: 'super-representado',
    diferencaCorpus: 15.02,
    percentualCorpusNE: 7.2
  },
  {
    dominio: "Ações e Processos",
    riquezaLexical: 19,
    ocorrencias: 24,
    percentual: 11.32,
    percentualTematico: 20.51,
    palavras: [
      "trazer", "ser", "sonhar", "abrir", "aquerenciar", "cair", "cevar", 
      "chegar", "deixar", "desencilhar", "desgarrar", "encilhar", 
      "estampar", "ficar", "ganhar", "pontear", "queimar", "rondar", "ter"
    ],
    palavrasComFrequencia: [
      { palavra: "trazer", ocorrencias: 3 },
      { palavra: "ser", ocorrencias: 3 },
      { palavra: "sonhar", ocorrencias: 2 },
      { palavra: "abrir", ocorrencias: 1 },
      { palavra: "aquerenciar", ocorrencias: 1 },
      { palavra: "cair", ocorrencias: 1 },
      { palavra: "cevar", ocorrencias: 1 },
      { palavra: "chegar", ocorrencias: 1 },
      { palavra: "deixar", ocorrencias: 1 },
      { palavra: "desencilhar", ocorrencias: 1 },
      { palavra: "desgarrar", ocorrencias: 1 },
      { palavra: "encilhar", ocorrencias: 1 },
      { palavra: "estampar", ocorrencias: 1 },
      { palavra: "ficar", ocorrencias: 1 },
      { palavra: "ganhar", ocorrencias: 1 },
      { palavra: "pontear", ocorrencias: 1 },
      { palavra: "queimar", ocorrencias: 1 },
      { palavra: "rondar", ocorrencias: 1 },
      { palavra: "ter", ocorrencias: 1 }
    ],
    cor: "hsl(280, 65%, 60%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 20.51,
    comparacaoCorpus: 'equilibrado',
    diferencaCorpus: -4.99,
    percentualCorpusNE: 25.5
  },
  {
    dominio: "Sentimentos e Abstrações",
    riquezaLexical: 16,
    ocorrencias: 20,
    percentual: 9.43,
    percentualTematico: 17.09,
    palavras: [
      "verso", "saudade", "sonho", "açoite", "calma", "canto", "cerne", 
      "cor", "espera", "figura", "fim", "jeito", "luz", "mansidão", 
      "respeito", "silencio"
    ],
    palavrasComFrequencia: [
      { palavra: "verso", ocorrencias: 4 },
      { palavra: "saudade", ocorrencias: 2 },
      { palavra: "sonho", ocorrencias: 1 },
      { palavra: "açoite", ocorrencias: 1 },
      { palavra: "calma", ocorrencias: 1 },
      { palavra: "canto", ocorrencias: 1 },
      { palavra: "cerne", ocorrencias: 1 },
      { palavra: "cor", ocorrencias: 1 },
      { palavra: "espera", ocorrencias: 1 },
      { palavra: "figura", ocorrencias: 1 },
      { palavra: "fim", ocorrencias: 1 },
      { palavra: "jeito", ocorrencias: 1 },
      { palavra: "luz", ocorrencias: 1 },
      { palavra: "mansidão", ocorrencias: 1 },
      { palavra: "respeito", ocorrencias: 1 },
      { palavra: "silencio", ocorrencias: 1 }
    ],
    cor: "hsl(30, 85%, 55%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 17.09,
    comparacaoCorpus: 'equilibrado',
    diferencaCorpus: -1.71,
    percentualCorpusNE: 18.8
  },
  {
    dominio: "Qualidades e Estados",
    riquezaLexical: 16,
    ocorrencias: 16,
    percentual: 7.55,
    percentualTematico: 13.68,
    palavras: [
      "aberto", "adormecido", "campeiro", "cansado", "copado", "encostado", 
      "espichado", "feito", "gordo", "lindo", "negro", "novo", "recostado", 
      "redomona", "suado", "vestido"
    ],
    palavrasComFrequencia: [
      { palavra: "aberto", ocorrencias: 1 },
      { palavra: "adormecido", ocorrencias: 1 },
      { palavra: "campeiro", ocorrencias: 1 },
      { palavra: "cansado", ocorrencias: 1 },
      { palavra: "copado", ocorrencias: 1 },
      { palavra: "encostado", ocorrencias: 1 },
      { palavra: "espichado", ocorrencias: 1 },
      { palavra: "feito", ocorrencias: 1 },
      { palavra: "gordo", ocorrencias: 1 },
      { palavra: "lindo", ocorrencias: 1 },
      { palavra: "negro", ocorrencias: 1 },
      { palavra: "novo", ocorrencias: 1 },
      { palavra: "recostado", ocorrencias: 1 },
      { palavra: "redomona", ocorrencias: 1 },
      { palavra: "suado", ocorrencias: 1 },
      { palavra: "vestido", ocorrencias: 1 }
    ],
    cor: "hsl(45, 93%, 47%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 13.68,
    comparacaoCorpus: 'super-representado',
    diferencaCorpus: 7.68,
    percentualCorpusNE: 6.0
  },
  {
    dominio: "Partes do Corpo",
    riquezaLexical: 1,
    ocorrencias: 2,
    percentual: 0.94,
    percentualTematico: 1.71,
    palavras: ["olho"],
    palavrasComFrequencia: [
      { palavra: "olho", ocorrencias: 2 }
    ],
    cor: "hsl(350, 80%, 55%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 1.71,
    comparacaoCorpus: 'sub-representado',
    diferencaCorpus: -12.42,
    percentualCorpusNE: 14.13
  },
  {
    dominio: "Seres Vivos",
    riquezaLexical: 1,
    ocorrencias: 1,
    percentual: 0.47,
    percentualTematico: 0.85,
    palavras: ["galo"],
    palavrasComFrequencia: [
      { palavra: "galo", ocorrencias: 1 }
    ],
    cor: "hsl(320, 75%, 60%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 0.85,
    comparacaoCorpus: 'sub-representado',
    diferencaCorpus: -12.42,
    percentualCorpusNE: 13.27
  }
];
