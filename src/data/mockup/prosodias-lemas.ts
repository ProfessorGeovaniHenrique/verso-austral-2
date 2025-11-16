/**
 * Prosódia Semântica por Lema
 * Mapeamento completo dos 72 lemas com suas prosódias semânticas e justificativas
 */

export interface ProsodiaInfo {
  lema: string;
  prosody: 'Positiva' | 'Negativa' | 'Neutra';
  justificativa: string;
}

export const prosodiasLemasMap: Record<string, ProsodiaInfo> = {
  // ========== PROSÓDIA POSITIVA (27 lemas) ==========
  "aberto": {
    lema: "aberto",
    prosody: "Positiva",
    justificativa: "Usado na expressão \"frente aberta de respeito\", uma qualidade que impõe admiração."
  },
  "abrir": {
    lema: "abrir",
    prosody: "Positiva",
    justificativa: "A imagem do \"pañuelo\" que \"se abriu no horizonte\" é de expansão, beleza e promessa."
  },
  "aquerenciar": {
    lema: "aquerenciar",
    prosody: "Positiva",
    justificativa: "Verbo que significa criar afeto por um lugar, enraizar-se. É um ato de pertencimento."
  },
  "asa": {
    lema: "asa",
    prosody: "Positiva",
    justificativa: "Usado poeticamente (\"trouxe coplas entre as asas\"), evocando leveza e inspiração."
  },
  "aurora": {
    lema: "aurora",
    prosody: "Positiva",
    justificativa: "A cor do amanhecer, associada à esperança e renovação, mesmo descrevendo um \"cerne\"."
  },
  "brasa": {
    lema: "brasa",
    prosody: "Positiva",
    justificativa: "A imagem de \"quarto gordo nas brasa\" evoca fartura, calor e conforto."
  },
  "calma": {
    lema: "calma",
    prosody: "Positiva",
    justificativa: "Sentimento de paz e serenidade que abre o poema."
  },
  "campeiro": {
    lema: "campeiro",
    prosody: "Positiva",
    justificativa: "Usado como adjetivo de orgulho e identidade (\"figura campeira\")."
  },
  "candeeiro": {
    lema: "candeeiro",
    prosody: "Positiva",
    justificativa: "A \"luz de candeeiro\" cria uma atmosfera de intimidade, aconchego e simplicidade."
  },
  "casa": {
    lema: "casa",
    prosody: "Positiva",
    justificativa: "No contexto do título 'Quando o verso vem pras casa', representa retorno, acolhimento e pertencimento ao lar."
  },
  "caseiro": {
    lema: "caseiro",
    prosody: "Positiva",
    justificativa: "O verso que é \"mais caseiro\" é mais autêntico, íntimo e confortável."
  },
  "copado": {
    lema: "copado",
    prosody: "Positiva",
    justificativa: "Qualifica a sombra como \"ampla, frondosa\", um refúgio desejável contra o sol."
  },
  "copla": {
    lema: "copla",
    prosody: "Positiva",
    justificativa: "Um pequeno poema ou canção, associado à inspiração trazida pelo vento."
  },
  "estampar": {
    lema: "estampar",
    prosody: "Positiva",
    justificativa: "Significa afirmar com orgulho, mostrar uma identidade (\"estampando a figura\")."
  },
  "fogo": {
    lema: "fogo",
    prosody: "Positiva",
    justificativa: "O \"fogo de chão\" é um símbolo de calor, reunião e vida no acampamento."
  },
  "galo": {
    lema: "galo",
    prosody: "Positiva",
    justificativa: "O sonho de \"ser um galo prás manhãs\" representa o desejo de ser ativo, viril e anunciador de um novo dia."
  },
  "ganhar": {
    lema: "ganhar",
    prosody: "Positiva",
    justificativa: "Verbo que indica uma aquisição positiva (\"ganhou sombra\")."
  },
  "gateado": {
    lema: "gateado",
    prosody: "Positiva",
    justificativa: "Tipo de cavalo valorizado; no poema, é \"de respeito\" e um objeto de sonho."
  },
  "gordo": {
    lema: "gordo",
    prosody: "Positiva",
    justificativa: "Usado em \"quarto gordo\", é um sinal de fartura, abundância e prosperidade."
  },
  "jeito": {
    lema: "jeito",
    prosody: "Positiva",
    justificativa: "Usado para afirmar a autenticidade e a identidade (\"bem do seu jeito\")."
  },
  "lindo": {
    lema: "lindo",
    prosody: "Positiva",
    justificativa: "Qualifica o fim de tarde, estabelecendo um tom de apreciação da beleza."
  },
  "luz": {
    lema: "luz",
    prosody: "Positiva",
    justificativa: "Associada ao conforto e à intimidade do \"candeeiro\"."
  },
  "mansidão": {
    lema: "mansidão",
    prosody: "Positiva",
    justificativa: "Qualidade da \"campanha\", descrevendo um ambiente de paz e serenidade."
  },
  "mate": {
    lema: "mate",
    prosody: "Positiva",
    justificativa: "Símbolo central de ritual, conforto, introspecção e identidade gaúcha."
  },
  "novo": {
    lema: "novo",
    prosody: "Positiva",
    justificativa: "Em \"novo reponte\", indica renovação, uma nova onda de beleza."
  },
  "pontear": {
    lema: "pontear",
    prosody: "Positiva",
    justificativa: "Usado para o sol, é um verbo poético para o raiar do dia, trazendo esperança."
  },
  "prenda": {
    lema: "prenda",
    prosody: "Positiva",
    justificativa: "Figura feminina idealizada, objeto de sonho e afeto."
  },
  "primavera": {
    lema: "primavera",
    prosody: "Positiva",
    justificativa: "Estação associada à beleza, renovação e ao florescer do amor."
  },
  "pura-folha": {
    lema: "pura-folha",
    prosody: "Positiva",
    justificativa: "Adjetivo que qualifica o mate como de alta qualidade."
  },
  "querência": {
    lema: "querência",
    prosody: "Positiva",
    justificativa: "Palavra carregada de afeto que significa o lar, o lugar amado e de pertencimento."
  },
  "reponte": {
    lema: "reponte",
    prosody: "Positiva",
    justificativa: "Uma nova beleza que surge no horizonte."
  },
  "respeito": {
    lema: "respeito",
    prosody: "Positiva",
    justificativa: "Qualidade que enobrece a figura do cavalo e, por extensão, do cavaleiro."
  },
  "sonhar": {
    lema: "sonhar",
    prosody: "Positiva",
    justificativa: "Representa o campo dos desejos, aspirações e da imaginação, mesmo que levem à frustração."
  },
  "sonho": {
    lema: "sonho",
    prosody: "Positiva",
    justificativa: "O substantivo que encapsula as aspirações do \"verso\"."
  },
  "templado": {
    lema: "templado",
    prosody: "Positiva",
    justificativa: "Significa \"harmonizado\", \"ajustado\" pela luz, uma qualidade poética e positiva."
  },
  "ventito": {
    lema: "ventito",
    prosody: "Positiva",
    justificativa: "Um vento leve, uma brisa agradável que traz inspiração (\"coplas\")."
  },
  "sombra": {
    lema: "sombra",
    prosody: "Positiva",
    justificativa: "Refúgio do sol, conforto e descanso durante a lida campeira."
  },
  "sol": {
    lema: "sol",
    prosody: "Positiva",
    justificativa: "Luz e calor, vida e energia do dia campeiro."
  },
  "campo": {
    lema: "campo",
    prosody: "Positiva",
    justificativa: "O espaço da lida e da identidade gaúcha, território de pertencimento."
  },
  "campanha": {
    lema: "campanha",
    prosody: "Positiva",
    justificativa: "Região característica do Rio Grande do Sul, terra natal e identidade."
  },
  "horizonte": {
    lema: "horizonte",
    prosody: "Positiva",
    justificativa: "Promessa de expansão, beleza e liberdade no contexto do pañuelo que se abre."
  },
  "tarde": {
    lema: "tarde",
    prosody: "Positiva",
    justificativa: "Contextualizada como 'fim de tarde lindo', momento de apreciação estética e descanso."
  },
  "cuia": {
    lema: "cuia",
    prosody: "Positiva",
    justificativa: "Objeto ritual do mate, símbolo de tradição, acolhimento e identidade gaúcha."
  },
  "coxilha": {
    lema: "coxilha",
    prosody: "Positiva",
    justificativa: "Elemento da paisagem campeira, elevação do terreno que caracteriza a região gaúcha."
  },
  "tarumã": {
    lema: "tarumã",
    prosody: "Positiva",
    justificativa: "Árvore nativa, símbolo da natureza e identidade regional."
  },
  "várzea": {
    lema: "várzea",
    prosody: "Neutra",
    justificativa: "Terreno baixo e plano, elemento geográfico descritivo da paisagem."
  },
  "maçanilha": {
    lema: "maçanilha",
    prosody: "Positiva",
    justificativa: "Planta aromática usada no mate, elemento cultural e sensorial."
  },
  "frente": {
    lema: "frente",
    prosody: "Positiva",
    justificativa: "Usado em 'frente aberta de respeito', expressão que denota qualidade admirável."
  },
  "vestido": {
    lema: "vestido",
    prosody: "Positiva",
    justificativa: "Usado em 'vestido de primavera', associado à renovação e beleza."
  },

  // ========== PROSÓDIA NEGATIVA (28 lemas) ==========
  "adormecido": {
    lema: "adormecido",
    prosody: "Negativa",
    justificativa: "Refere-se aos olhos \"adormecidos na espera\", transmitindo uma sensação de passividade, ansiedade e tempo suspenso."
  },
  "açoite": {
    lema: "açoite",
    prosody: "Negativa",
    justificativa: "Metáfora direta para a dor e a violência com que a saudade se manifesta."
  },
  "arreio": {
    lema: "arreio",
    prosody: "Negativa",
    justificativa: "Aparece como \"arreios suados\", o vestígio do trabalho árduo e do abandono."
  },
  "cancela": {
    lema: "cancela",
    prosody: "Negativa",
    justificativa: "A \"cancela encostada\" é o símbolo do descuido que permitiu à \"tropa se desgarrou\", denotando perda."
  },
  "cansado": {
    lema: "cansado",
    prosody: "Negativa",
    justificativa: "Expressa diretamente o estado de exaustão física e emocional do \"verso\"."
  },
  "desgarrar": {
    lema: "desgarrar",
    prosody: "Negativa",
    justificativa: "Significa dispersar, perder-se. A imagem da tropa que se perde simboliza a perda dos sonhos."
  },
  "encostado": {
    lema: "encostado",
    prosody: "Negativa",
    justificativa: "Assim como \"recostada\", a palavra denota abandono, desuso e solidão."
  },
  "espera": {
    lema: "espera",
    prosody: "Negativa",
    justificativa: "Descreve um estado de ansiedade passiva e melancólica."
  },
  "ficar": {
    lema: "ficar",
    prosody: "Negativa",
    justificativa: "Verbo que introduz os vestígios do abandono (\"Ficaram arreios suados\")."
  },
  "lonjura": {
    lema: "lonjura",
    prosody: "Negativa",
    justificativa: "Refere-se às longas distâncias, causa do cansaço e da saudade."
  },
  "negro": {
    lema: "negro",
    prosody: "Negativa",
    justificativa: "Em \"olhos negros de noite\", a cor está associada à escuridão e à melancolia da saudade."
  },
  "recostado": {
    lema: "recostado",
    prosody: "Negativa",
    justificativa: "Descreve a bomba e a cuia abandonadas, intensificando a cena de solidão."
  },
  "redomona": {
    lema: "redomona",
    prosody: "Negativa",
    justificativa: "Adjetivo que qualifica a saudade como \"selvagem, indomada\", o que a torna mais poderosa e dolorosa."
  },
  "saudade": {
    lema: "saudade",
    prosody: "Negativa",
    justificativa: "O tema emocional central do poema, explicitamente descrito como doloroso (\"açoite\")."
  },
  "silencio": {
    lema: "silencio",
    prosody: "Negativa",
    justificativa: "O \"silencio de esporas\" é a ausência de som que significa o fim da lida, a partida e a solidão."
  },
  "suado": {
    lema: "suado",
    prosody: "Negativa",
    justificativa: "Adjetivo que marca os arreios com o sinal do esforço pesado e do trabalho que ficou para trás."
  },
  "olho": {
    lema: "olho",
    prosody: "Negativa",
    justificativa: "Em 'olhos negros de noite' e 'adormecidos na espera', transmite melancolia e saudade."
  },
  "tropa": {
    lema: "tropa",
    prosody: "Negativa",
    justificativa: "Aparece no contexto de perda 'a tropa se desgarrou', simbolizando sonhos perdidos."
  },

  // ========== PROSÓDIA NEUTRA (22 lemas) ==========
  "bomba": {
    lema: "bomba",
    prosody: "Neutra",
    justificativa: "Objeto da cultura gaúcha. Sua menção (\"recostada\") contribui para a cena de abandono."
  },
  "cair": {
    lema: "cair",
    prosody: "Neutra",
    justificativa: "Descreve o movimento do sol (\"caindo\"), marcando o fim do dia e o início da noite melancólica."
  },
  "campereada": {
    lema: "campereada",
    prosody: "Neutra",
    justificativa: "Descreve a lida do campo, a jornada de trabalho."
  },
  "encilhar": {
    lema: "encilhar",
    prosody: "Neutra",
    justificativa: "Verbo que descreve a ação de preparar o cavalo para a lida."
  },
  "espora": {
    lema: "espora",
    prosody: "Neutra",
    justificativa: "O objeto em si é neutro, mas seu \"silencio\" no poema é profundamente negativo, significando ausência e fim."
  },
  "galpão": {
    lema: "galpão",
    prosody: "Neutra",
    justificativa: "O principal cenário do poema, o refúgio do gaúcho. É o palco da saudade."
  },
  "rondar": {
    lema: "rondar",
    prosody: "Neutra",
    justificativa: "Verbo ambíguo; \"rondar na madrugada\" pode ser tanto vigiar quanto vagar sem rumo, denotando solidão."
  },
  "verso": {
    lema: "verso",
    prosody: "Neutra",
    justificativa: "É a personificação do eu-lírico, a entidade que sente e narra o poema."
  },
  "trazer": {
    lema: "trazer",
    prosody: "Neutra",
    justificativa: "Verbo neutro que descreve a ação de transportar algo."
  },
  "ser": {
    lema: "ser",
    prosody: "Neutra",
    justificativa: "Verbo existencial neutro."
  },
  "chegar": {
    lema: "chegar",
    prosody: "Neutra",
    justificativa: "Verbo que indica movimento, ação neutra."
  },
  "deixar": {
    lema: "deixar",
    prosody: "Neutra",
    justificativa: "Verbo neutro que indica abandono ou permissão."
  },
  "desencilhar": {
    lema: "desencilhar",
    prosody: "Neutra",
    justificativa: "Ação neutra de retirar a sela do cavalo."
  },
  "cevar": {
    lema: "cevar",
    prosody: "Neutra",
    justificativa: "Ação de preparar o mate, neutra em si."
  },
  "ter": {
    lema: "ter",
    prosody: "Neutra",
    justificativa: "Verbo possessivo neutro."
  },
  "galponeiro": {
    lema: "galponeiro",
    prosody: "Neutra",
    justificativa: "Substantivo que designa uma profissão/identidade."
  },
  "cambona": {
    lema: "cambona",
    prosody: "Neutra",
    justificativa: "Objeto da cultura gaúcha, contexto neutro."
  },
  "maragato": {
    lema: "maragato",
    prosody: "Neutra",
    justificativa: "Identidade política/histórica, contexto neutro no poema."
  },
  "lombo": {
    lema: "lombo",
    prosody: "Neutra",
    justificativa: "Parte do corpo do cavalo onde se coloca a sela, termo técnico."
  },
  "jujado": {
    lema: "jujado",
    prosody: "Neutra",
    justificativa: "Termo regional para algo usado ou desgastado, descritivo neutro."
  },
  "ramada": {
    lema: "ramada",
    prosody: "Positiva",
    justificativa: "Cobertura rústica de ramos, espaço de convívio e descanso."
  },
  "canto": {
    lema: "canto",
    prosody: "Negativa",
    justificativa: "Usado em 'pelos cantos do galpão', evoca abandono, solidão e espaços esquecidos."
  },
  "chão": {
    lema: "chão",
    prosody: "Neutra",
    justificativa: "Termo descritivo em 'fogo de chão', referência espacial neutra."
  },
  "cerne": {
    lema: "cerne",
    prosody: "Positiva",
    justificativa: "Em 'cerne com cor de aurora', representa a essência, o núcleo vital com beleza."
  },
  "cor": {
    lema: "cor",
    prosody: "Positiva",
    justificativa: "Usado em 'cor de aurora', evoca a beleza cromática do amanhecer."
  },
  "espichado": {
    lema: "espichado",
    prosody: "Neutra",
    justificativa: "Regionalismo para 'estendida' em 'várzea espichada', termo descritivo da paisagem."
  },
  "feito": {
    lema: "feito",
    prosody: "Neutra",
    justificativa: "Conjunção comparativa em 'saudades feito açoite', função gramatical neutra."
  },
  "figura": {
    lema: "figura",
    prosody: "Positiva",
    justificativa: "Usado em 'estampando a figura, campeira', representa orgulho e identidade."
  },
  "fim": {
    lema: "fim",
    prosody: "Positiva",
    justificativa: "Em 'fim de tarde bem lindo', marca um momento de beleza e apreciação estética."
  },
  "madrugada": {
    lema: "madrugada",
    prosody: "Neutra",
    justificativa: "Período do dia em 'rondar na madrugada', contexto de vigília ou solidão ambíguo."
  },
  "manhã": {
    lema: "manhã",
    prosody: "Positiva",
    justificativa: "Em 'galo prás manhãs', representa renovação, vitalidade e o início promissor do dia."
  },
  "noite": {
    lema: "noite",
    prosody: "Negativa",
    justificativa: "Usado em 'olhos negros de noite', associado à escuridão, melancolia e saudade."
  },
  "pañuelo": {
    lema: "pañuelo",
    prosody: "Positiva",
    justificativa: "Lenço tradicionalista maragato, símbolo cultural e identitário valorizado."
  },
  "quarto": {
    lema: "quarto",
    prosody: "Positiva",
    justificativa: "Em 'quarto gordo nas brasa', representa fartura, abundância e conforto."
  },
  "queimar": {
    lema: "queimar",
    prosody: "Positiva",
    justificativa: "Usado poeticamente em 'queimando em fogo de chão', evoca calor, vida e energia."
  },
  "vir": {
    lema: "vir",
    prosody: "Positiva",
    justificativa: "Em 'quando o verso vem pras casa', verbo de movimento que indica aproximação, retorno e chegada ao lar, com conotação positiva de pertencimento."
  }
};

/**
 * Helper function para obter prosódia de um lema
 * @param lema - O lema da palavra
 * @returns A prosódia semântica do lema (Positiva, Negativa ou Neutra)
 */
export function getProsodiaByLema(lema: string): 'Positiva' | 'Negativa' | 'Neutra' {
  const normalized = lema.toLowerCase();
  const info = prosodiasLemasMap[normalized];
  return info?.prosody || 'Neutra';
}

/**
 * Helper function para obter informações completas de prosódia
 * @param lema - O lema da palavra
 * @returns Informações completas de prosódia ou undefined
 */
export function getProsodiaInfo(lema: string): ProsodiaInfo | undefined {
  const normalized = lema.toLowerCase();
  return prosodiasLemasMap[normalized];
}
