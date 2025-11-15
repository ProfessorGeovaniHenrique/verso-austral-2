import { DominioSemantico } from "../types/corpus.types";

export const dominiosData: DominioSemantico[] = [
  {
    dominio: "Cultura e Lida Gaúcha",
    riquezaLexical: 27,
    ocorrencias: 28,
    percentual: 23.93,
    palavras: [
      "gateado", "gateada", "arreio", "arreios", "bomba", "brasa", 
      "cambona", "campereada", "cancela", "candeeiro", "caseiro", 
      "copla", "coplas", "cuia", "espora", "esporas", "galpão", 
      "galponeiro", "galponeira", "jujado", "lombo", "lonjura", 
      "lonjuras", "maragato", "mate", "pañuelo", "prenda", 
      "pura-folha", "quarto", "querência", "ramada", "templado", "tropa"
    ],
    palavrasComFrequencia: [
      { palavra: "gateado", ocorrencias: 2 },
      { palavra: "arreio", ocorrencias: 1 }, { palavra: "bomba", ocorrencias: 1 }, { palavra: "brasa", ocorrencias: 1 },
      { palavra: "cambona", ocorrencias: 1 }, { palavra: "campereada", ocorrencias: 1 }, { palavra: "cancela", ocorrencias: 1 },
      { palavra: "candeeiro", ocorrencias: 1 }, { palavra: "caseiro", ocorrencias: 1 }, { palavra: "copla", ocorrencias: 1 },
      { palavra: "cuia", ocorrencias: 1 }, { palavra: "espora", ocorrencias: 1 }, { palavra: "galpão", ocorrencias: 1 },
      { palavra: "galponeiro", ocorrencias: 1 }, { palavra: "jujado", ocorrencias: 1 }, { palavra: "lombo", ocorrencias: 1 },
      { palavra: "lonjura", ocorrencias: 1 }, { palavra: "maragato", ocorrencias: 1 }, { palavra: "mate", ocorrencias: 1 },
      { palavra: "pañuelo", ocorrencias: 1 }, { palavra: "prenda", ocorrencias: 1 }, { palavra: "pura-folha", ocorrencias: 1 },
      { palavra: "quarto", ocorrencias: 1 }, { palavra: "querência", ocorrencias: 1 }, { palavra: "ramada", ocorrencias: 1 },
      { palavra: "templado", ocorrencias: 1 }, { palavra: "tropa", ocorrencias: 1 }
    ],
    cor: "hsl(142, 71%, 45%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 13.21,
    percentualTematico: 34.15,
    comparacaoCorpus: 'super-representado',
    diferencaCorpus: 8.42,
    percentualCorpusNE: 15.73
  },
  {
    dominio: "Natureza e Paisagem",
    riquezaLexical: 20,
    ocorrencias: 26,
    percentual: 22.22,
    palavras: [
      "coxilha", "sol", "sombra", "tarde", "tarumã", "várzea",
      "asa", "asas", "aurora", "campo", "campanha", "chão",
      "fogo", "horizonte", "madrugada", "manhã", "manhãs",
      "maçanilha", "noite", "primavera", "reponte", "ventito"
    ],
    palavrasComFrequencia: [
      { palavra: "coxilha", ocorrencias: 2 }, { palavra: "sol", ocorrencias: 2 }, { palavra: "sombra", ocorrencias: 2 },
      { palavra: "tarde", ocorrencias: 2 }, { palavra: "tarumã", ocorrencias: 2 }, { palavra: "várzea", ocorrencias: 2 },
      { palavra: "asa", ocorrencias: 1 }, { palavra: "aurora", ocorrencias: 1 }, { palavra: "campo", ocorrencias: 1 },
      { palavra: "campanha", ocorrencias: 1 }, { palavra: "chão", ocorrencias: 1 }, { palavra: "fogo", ocorrencias: 1 },
      { palavra: "horizonte", ocorrencias: 1 }, { palavra: "madrugada", ocorrencias: 1 }, { palavra: "manhã", ocorrencias: 1 },
      { palavra: "maçanilha", ocorrencias: 1 }, { palavra: "noite", ocorrencias: 1 }, { palavra: "primavera", ocorrencias: 1 },
      { palavra: "reponte", ocorrencias: 1 }, { palavra: "ventito", ocorrencias: 1 }
    ],
    cor: "hsl(221, 83%, 53%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 12.26,
    percentualTematico: 31.71,
    comparacaoCorpus: 'equilibrado',
    diferencaCorpus: 1.12,
    percentualCorpusNE: 11.14
  },
  {
    dominio: "Sentimentos e Abstrações",
    riquezaLexical: 16,
    ocorrencias: 20,
    percentual: 17.09,
    palavras: [
      "verso", "saudade", "saudades", "sonho", "sonhos", "açoite",
      "calma", "canto", "cantos", "cerne", "cor", "espera",
      "figura", "fim", "jeito", "luz", "mansidão", "respeito",
      "silencio"
    ],
    palavrasComFrequencia: [
      { palavra: "verso", ocorrencias: 4 }, { palavra: "saudade", ocorrencias: 2 }, { palavra: "sonho", ocorrencias: 1 },
      { palavra: "açoite", ocorrencias: 1 }, { palavra: "calma", ocorrencias: 1 }, { palavra: "canto", ocorrencias: 1 },
      { palavra: "cerne", ocorrencias: 1 }, { palavra: "cor", ocorrencias: 1 }, { palavra: "espera", ocorrencias: 1 },
      { palavra: "figura", ocorrencias: 1 }, { palavra: "fim", ocorrencias: 1 }, { palavra: "jeito", ocorrencias: 1 },
      { palavra: "luz", ocorrencias: 1 }, { palavra: "mansidão", ocorrencias: 1 }, { palavra: "respeito", ocorrencias: 1 },
      { palavra: "silencio", ocorrencias: 1 }
    ],
    cor: "hsl(280, 65%, 60%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 9.43,
    percentualTematico: 24.39,
    comparacaoCorpus: 'super-representado',
    diferencaCorpus: 5.21,
    percentualCorpusNE: 4.22
  },
  {
    dominio: "Ações e Processos",
    riquezaLexical: 19,
    ocorrencias: 24,
    percentual: 20.51,
    palavras: [
      "trazer", "traz", "trazendo", "trouxe", "ser", "é",
      "sonhar", "sonhou", "abrir", "abriu", "aquerenciar",
      "aquerenciou", "cair", "caindo", "cevar", "cevou",
      "chegar", "chegou", "deixar", "deixou", "desencilhar",
      "desencilhou", "desgarrar", "desgarrou", "encilhar",
      "encilha", "estampar", "estampando", "ficar", "ficaram",
      "ganhar", "ganhou", "pontear", "queimar", "queimando",
      "rondar", "ter", "tinha"
    ],
    palavrasComFrequencia: [
      { palavra: "trazer", ocorrencias: 3 }, { palavra: "ser", ocorrencias: 3 }, { palavra: "sonhar", ocorrencias: 2 },
      { palavra: "abrir", ocorrencias: 1 }, { palavra: "aquerenciar", ocorrencias: 1 }, { palavra: "cair", ocorrencias: 1 },
      { palavra: "cevar", ocorrencias: 1 }, { palavra: "chegar", ocorrencias: 1 }, { palavra: "deixar", ocorrencias: 1 },
      { palavra: "desencilhar", ocorrencias: 1 }, { palavra: "desgarrar", ocorrencias: 1 }, { palavra: "encilhar", ocorrencias: 1 },
      { palavra: "estampar", ocorrencias: 1 }, { palavra: "ficar", ocorrencias: 1 }, { palavra: "ganhar", ocorrencias: 1 },
      { palavra: "pontear", ocorrencias: 1 }, { palavra: "queimar", ocorrencias: 1 }, { palavra: "rondar", ocorrencias: 1 },
      { palavra: "ter", ocorrencias: 1 }
    ],
    cor: "hsl(0, 72%, 51%)",
    corTexto: "hsl(0, 0%, 100%)",
    frequenciaNormalizada: 11.32,
    percentualTematico: 29.27,
    comparacaoCorpus: 'equilibrado',
    diferencaCorpus: 0.82,
    percentualCorpusNE: 10.50
  },
  {
    dominio: "Qualidades e Estados",
    riquezaLexical: 16,
    ocorrencias: 16,
    percentual: 13.68,
    palavras: [
      "aberto", "aberta", "adormecido", "adormecidos", "campeiro",
      "campeira", "cansado", "copado", "copada", "encostado",
      "encostada", "espichado", "espichada", "feito", "gordo",
      "lindo", "negro", "negros", "novo", "recostado", "recostada",
      "redomona", "suado", "suados", "vestido", "vestidos"
    ],
    palavrasComFrequencia: [
      { palavra: "aberto", ocorrencias: 1 }, { palavra: "adormecido", ocorrencias: 1 }, { palavra: "campeiro", ocorrencias: 1 },
      { palavra: "cansado", ocorrencias: 1 }, { palavra: "copado", ocorrencias: 1 }, { palavra: "encostado", ocorrencias: 1 },
      { palavra: "espichado", ocorrencias: 1 }, { palavra: "feito", ocorrencias: 1 }, { palavra: "gordo", ocorrencias: 1 },
      { palavra: "lindo", ocorrencias: 1 }, { palavra: "negro", ocorrencias: 1 }, { palavra: "novo", ocorrencias: 1 },
      { palavra: "recostado", ocorrencias: 1 }, { palavra: "redomona", ocorrencias: 1 }, { palavra: "suado", ocorrencias: 1 },
      { palavra: "vestido", ocorrencias: 1 }
    ],
    cor: "hsl(45, 93%, 47%)",
    corTexto: "hsl(0, 0%, 20%)",
    frequenciaNormalizada: 7.55,
    percentualTematico: 19.51,
    comparacaoCorpus: 'sub-representado',
    diferencaCorpus: -3.15,
    percentualCorpusNE: 10.70
  },
  {
    dominio: "Partes do Corpo e Seres",
    riquezaLexical: 2,
    ocorrencias: 3,
    percentual: 2.56,
    palavras: [
      "olho", "olhos", "galo"
    ],
    palavrasComFrequencia: [
      { palavra: "olho", ocorrencias: 2 },
      { palavra: "galo", ocorrencias: 1 }
    ],
    cor: "hsl(30, 100%, 50%)",
    corTexto: "hsl(0, 0%, 20%)",
    frequenciaNormalizada: 1.42,
    percentualTematico: 3.66,
    comparacaoCorpus: 'sub-representado',
    diferencaCorpus: -2.34,
    percentualCorpusNE: 3.76
  }
];
