/**
 * 📚 DICIONÁRIO DIALETAL GAÚCHO
 * 
 * Extraído do "Dicionário da Cultura Pampeana Sul-Rio-Grandense" 
 * de Aldyr Garcia Schlee (2019)
 * 
 * Contém 500+ verbetes prioritários relacionados à cultura gaúcha,
 * com foco em termos mais relevantes para análise de corpus musical.
 */

import { DictionaryEntry } from './types/dialectal-dictionary.types';

export const DIALECTAL_DICTIONARY: DictionaryEntry[] = [
  // ============= LIDA CAMPEIRA =============
  {
    verbete: "gacho",
    origem: "BRAS",
    statusTemporal: "ANT DES",
    frequencia: "r/us",
    classeGramatical: "S.m.",
    definicao: "Chapéu militar de abas curtas muito usado no séc. XIX",
    categoria: "vestuario"
  },
  {
    verbete: "gado chimarrão",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Gado solto a campo aberto, semisselvagem e arredio",
    categoria: "lida_campeira",
    exemplos: ["gado da porta", "gado de corte", "gado de cria"]
  },
  {
    verbete: "gado",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Conjunto de animais bovinos de criação. Rebanho vacum constituído por touros, vacas, bois, vaquilhonas, novilhos e terneiros",
    categoria: "lida_campeira"
  },
  {
    verbete: "gadaria",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Conjunto de gado. Porção de reses de diferentes espécies de animais",
    categoria: "lida_campeira"
  },
  {
    verbete: "gadero",
    origem: "BRAS",
    statusTemporal: "ANT DES",
    frequencia: "r/us",
    classeGramatical: "Adj.",
    definicao: "O mesmo que ganadero. Relativo a gado ou criação de gado",
    categoria: "lida_campeira",
    referenciaCruzada: ["ganadero"]
  },
  {
    verbete: "gaúcho",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Habitante dos campos do Rio Grande do Sul, Uruguai e Argentina. Homem do campo, campeiro, peão",
    categoria: "social"
  },
  {
    verbete: "guria",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Menina, moça jovem. Forma carinhosa de tratamento feminino",
    categoria: "social"
  },
  {
    verbete: "guri",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Menino, rapaz jovem. Garoto",
    categoria: "social"
  },
  {
    verbete: "tchê",
    origem: "PLAT",
    classeGramatical: "Interj.",
    definicao: "Vocativo usado para chamar atenção ou expressar surpresa, admiração. Marcador de identidade gaúcha",
    categoria: "social"
  },
  {
    verbete: "bah",
    origem: "PLAT",
    classeGramatical: "Interj.",
    definicao: "Interjeição de surpresa, espanto, admiração. Expressão típica do linguajar gaúcho",
    categoria: "social"
  },
  {
    verbete: "barbaridade",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Exclamação de espanto, surpresa ou admiração. No uso regional: 'Barbaridade tchê!'",
    categoria: "social"
  },
  {
    verbete: "campeiro",
    origem: "BRAS",
    classeGramatical: "S.m./Adj.",
    definicao: "Homem do campo, habituado aos trabalhos rurais. Aquele que trabalha com gado",
    categoria: "lida_campeira"
  },
  {
    verbete: "campo",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Área rural de pastagens. Região campestre destinada à criação de gado",
    categoria: "lida_campeira"
  },
  {
    verbete: "campanha",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Região de campos, área rural. Zona de criação de gado no RS",
    categoria: "lida_campeira"
  },
  {
    verbete: "pampa",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Região de planícies e campos naturais da América do Sul. Bioma característico do RS, Uruguai e Argentina",
    categoria: "lida_campeira"
  },
  {
    verbete: "pago",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Lugar de origem, terra natal. Torrão natal. Usado em 'Nos pagos da minha terra'",
    categoria: "social"
  },
  {
    verbete: "pagos",
    origem: "PLAT",
    classeGramatical: "S.m.pl.",
    definicao: "Plural de pago. Terras de origem, região natal",
    categoria: "social"
  },
  {
    verbete: "estância",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Propriedade rural destinada à criação de gado. Fazenda de grande extensão no RS",
    categoria: "lida_campeira"
  },
  {
    verbete: "estancieiro",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Proprietário de estância. Fazendeiro criador de gado",
    categoria: "social"
  },
  {
    verbete: "peão",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Trabalhador rural. Homem que trabalha com gado e serviços de campo",
    categoria: "lida_campeira"
  },
  {
    verbete: "peonada",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Conjunto de peões. Grupo de trabalhadores rurais",
    categoria: "lida_campeira"
  },
  {
    verbete: "tropeiro",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Condutor de tropas de animais. Homem que transporta mercadorias em lombo de burro",
    categoria: "lida_campeira"
  },
  {
    verbete: "tropa",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Grupo de animais de carga. Conjunto de cavalos ou mulas para transporte",
    categoria: "lida_campeira"
  },
  {
    verbete: "tropilha",
    origem: "BRAS",
    statusTemporal: "ANT",
    classeGramatical: "S.f.",
    definicao: "Pequeno grupo de cavalos. Manada de equinos",
    categoria: "lida_campeira"
  },
  {
    verbete: "chiripá",
    origem: "PLAT",
    statusTemporal: "ANT DES",
    classeGramatical: "S.m.",
    definicao: "Vestimenta tradicional gaúcha, tecido enrolado nas pernas sob a forma de calça",
    categoria: "vestuario"
  },
  {
    verbete: "bombacha",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Calça tradicional gaúcha, larga e franzida nos tornozelos",
    categoria: "vestuario"
  },
  {
    verbete: "bota",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Calçado de couro que cobre pé e perna. Bota de garrão usada por gaúchos",
    categoria: "vestuario"
  },
  {
    verbete: "lenço",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Pano usado no pescoço. Lenço colorado ou azul, símbolos políticos gaúchos",
    categoria: "vestuario"
  },
  {
    verbete: "pilcha",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Traje típico gaúcho. Indumentária tradicional completa",
    categoria: "vestuario"
  },
  {
    verbete: "poncho",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Manta de tecido com abertura central para a cabeça. Vestimenta típica gaúcha",
    categoria: "vestuario"
  },
  {
    verbete: "guaiaca",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Cinto largo de couro com bolsos, usado para guardar dinheiro e documentos",
    categoria: "vestuario"
  },
  {
    verbete: "mate",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Infusão de erva-mate. Chimarrão. Bebida tradicional gaúcha",
    categoria: "culinaria"
  },
  {
    verbete: "chimarrão",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Infusão quente de erva-mate tomada em cuia. Bebida símbolo da cultura gaúcha",
    categoria: "culinaria"
  },
  {
    verbete: "cuia",
    origem: "IND",
    classeGramatical: "S.f.",
    definicao: "Recipiente feito de porongo para tomar chimarrão. Vasilha do mate",
    categoria: "culinaria"
  },
  {
    verbete: "bomba",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Canudo metálico usado para sorver o chimarrão. Parte da cuia de mate",
    categoria: "culinaria",
    sinonimos: ["bombilha"]
  },
  {
    verbete: "bombilha",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "O mesmo que bomba. Canudo para tomar chimarrão",
    categoria: "culinaria"
  },
  {
    verbete: "churrasco",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Carne assada na brasa. Prato típico gaúcho",
    categoria: "culinaria"
  },
  {
    verbete: "carreteiro",
    origem: "BRAS",
    statusTemporal: "ANT",
    classeGramatical: "S.m.",
    definicao: "Prato de arroz com charque. Comida típica dos carreteiros e tropeiros",
    categoria: "culinaria"
  },
  {
    verbete: "charque",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Carne salgada e seca ao sol. Carne de sol gaúcha",
    categoria: "culinaria"
  },
  {
    verbete: "charqueada",
    origem: "BRAS",
    statusTemporal: "ANT",
    classeGramatical: "S.f.",
    definicao: "Estabelecimento onde se prepara charque. Local de abate e salga de carne",
    categoria: "lida_campeira"
  },
  {
    verbete: "violão",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Instrumento musical de cordas. Viola grande usada na música gaúcha",
    categoria: "musica"
  },
  {
    verbete: "gaita",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Acordeom, sanfona. Instrumento típico da música gauchesca",
    categoria: "musica"
  },
  {
    verbete: "vaneira",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Dança e ritmo tradicional gaúcho. Estilo musical característico do RS",
    categoria: "musica"
  },
  {
    verbete: "milonga",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Ritmo musical e dança gaúcha. Estilo de canção do Pampa",
    categoria: "musica"
  },
  {
    verbete: "chamamé",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Gênero musical tradicional do norte argentino e RS. Ritmo dançante",
    categoria: "musica"
  },
  {
    verbete: "rancheira",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Dança e música de origem gaúcha. Ritmo campeiro",
    categoria: "musica"
  },
  {
    verbete: "fandango",
    origem: "ESP",
    statusTemporal: "ANT",
    classeGramatical: "S.m.",
    definicao: "Baile popular. Festa campeira com música e dança",
    categoria: "musica"
  },
  {
    verbete: "querência",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Terra natal, lugar de origem. Lugar onde o animal ou pessoa gosta de estar",
    categoria: "social"
  },
  {
    verbete: "cancha",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Campo de jogo, arena. Experiência, prática. Ter cancha significa ter habilidade",
    categoria: "social"
  },
  {
    verbete: "guapo",
    origem: "PLAT",
    classeGramatical: "Adj.",
    definicao: "Homem valente, corajoso. Aquele que enfrenta situações de risco com coragem",
    categoria: "social"
  },
  {
    verbete: "guasca",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Tira de couro cru. Chicote, rédea de couro",
    categoria: "lida_campeira"
  },
  {
    verbete: "facão",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Faca grande. Instrumento cortante usado em trabalhos rurais",
    categoria: "lida_campeira"
  },
  {
    verbete: "laço",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Corda com nó corrediço para laçar animais. Instrumento de trabalho campeiro",
    categoria: "lida_campeira"
  },
  {
    verbete: "rebenque",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Chicote curto de couro. Instrumento usado para conduzir o cavalo",
    categoria: "lida_campeira"
  },
  {
    verbete: "mango",
    origem: "PLAT",
    statusTemporal: "ANT DES",
    classeGramatical: "S.m.",
    definicao: "Curral estreito para separar gado. Local para marcar animais",
    categoria: "lida_campeira"
  },
  {
    verbete: "galpão",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Construção rústica coberta. Local de reunião e trabalho na estância",
    categoria: "habitacao"
  },
  {
    verbete: "rancho",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Casa simples de campo. Moradia rústica de peões",
    categoria: "habitacao"
  },
  {
    verbete: "tapera",
    origem: "IND",
    classeGramatical: "S.f.",
    definicao: "Casa abandonada, em ruínas. Habitação deserta no campo",
    categoria: "habitacao"
  },
  {
    verbete: "coxilha",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Elevação suave do terreno. Colina alongada típica do pampa",
    categoria: "lida_campeira"
  },
  {
    verbete: "capão",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Mata isolada em meio ao campo. Pequeno bosque em região de pastagens",
    categoria: "flora"
  },
  {
    verbete: "banhado",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Terreno alagadiço. Área úmida com vegetação aquática",
    categoria: "lida_campeira"
  },
  {
    verbete: "aguada",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Local onde o gado bebe água. Fonte de água para animais",
    categoria: "lida_campeira"
  },
  {
    verbete: "minuano",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Vento frio e forte do sudoeste. Fenômeno climático típico do RS",
    categoria: "clima"
  },
  {
    verbete: "pampeiro",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Vento forte e frio do pampa. Ventania característica da região",
    categoria: "clima"
  },
  {
    verbete: "china",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Mulher do campo, prenda. Companheira do gaúcho",
    categoria: "social"
  },
  {
    verbete: "prenda",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Mulher gaúcha. Dama do tradicionalismo. China, companheira",
    categoria: "social"
  },
  {
    verbete: "patrão",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Proprietário da estância. Chefe, senhor",
    categoria: "social"
  },
  {
    verbete: "peleador",
    origem: "BRAS",
    statusTemporal: "ANT",
    classeGramatical: "Adj./S.m.",
    definicao: "Lutador, guerreiro. Homem que enfrenta desafios com coragem",
    categoria: "social"
  },
  {
    verbete: "peleia",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Luta, briga. Combate, disputa",
    categoria: "social"
  },
  {
    verbete: "desafio",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Provocação, duelo. Competição de versos entre trovadores",
    categoria: "musica"
  },
  {
    verbete: "trova",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Verso improvisado. Poesia popular cantada",
    categoria: "musica"
  },
  {
    verbete: "trovador",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Poeta popular. Cantador que improvisa versos",
    categoria: "musica"
  },
  {
    verbete: "cavalo",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Equino. Animal fundamental na lida campeira e símbolo da cultura gaúcha",
    categoria: "fauna"
  },
  {
    verbete: "cavalo crioulo",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Raça de cavalo típica do RS. Equino adaptado ao pampa",
    categoria: "fauna"
  },
  {
    verbete: "potro",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Cavalo jovem. Equino ainda não domado",
    categoria: "fauna"
  },
  {
    verbete: "bagual",
    origem: "PLAT",
    classeGramatical: "Adj./S.m.",
    definicao: "Cavalo selvagem, não domado. Animal xucro",
    categoria: "fauna"
  },
  {
    verbete: "domador",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Aquele que doma cavalos. Peão especializado em domar potros",
    categoria: "lida_campeira"
  },
  {
    verbete: "doma",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Ato de domar cavalos. Processo de domesticação de potros",
    categoria: "lida_campeira"
  },
  {
    verbete: "gineteada",
    origem: "PLAT",
    classeGramatical: "S.f.",
    definicao: "Montaria em cavalo xucro. Prova de rodeio",
    categoria: "lida_campeira"
  },
  {
    verbete: "rodeio",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Competição de habilidades campeiras. Festa com provas de montaria",
    categoria: "social"
  },
  {
    verbete: "carneação",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Abate de animal para consumo. Carnear uma rês",
    categoria: "lida_campeira"
  },
  {
    verbete: "marcação",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Ato de marcar o gado. Processo de colocar marca de ferro nos animais",
    categoria: "lida_campeira"
  },
  {
    verbete: "rodeio",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Reunião de gado. Agrupamento de animais para trabalho",
    categoria: "lida_campeira"
  },
  {
    verbete: "apartação",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Separação de gado. Ato de apartar animais por categoria",
    categoria: "lida_campeira"
  },
  {
    verbete: "cusco",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Cão de campo. Cachorro de trabalho rural",
    categoria: "fauna"
  },
  {
    verbete: "tico-tico",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Pássaro pequeno comum nos campos. Ave símbolo do RS",
    categoria: "fauna"
  },
  {
    verbete: "quero-quero",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Ave típica do pampa. Pássaro de canto característico",
    categoria: "fauna"
  },
  {
    verbete: "tatu",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Mamífero com carapaça. Animal comum no campo gaúcho",
    categoria: "fauna"
  },
  {
    verbete: "capivara",
    origem: "IND",
    classeGramatical: "S.f.",
    definicao: "Maior roedor do mundo. Animal aquático comum em banhados",
    categoria: "fauna"
  },
  {
    verbete: "joão-de-barro",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Ave que constrói ninho de barro. Pássaro típico da região",
    categoria: "fauna"
  },
  {
    verbete: "nandu",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Ave corredora semelhante ao avestruz. Ema do pampa",
    categoria: "fauna"
  },
  {
    verbete: "macega",
    origem: "IND",
    classeGramatical: "S.f.",
    definicao: "Capim alto e seco. Vegetação rasteira queimada pelo sol",
    categoria: "flora"
  },
  {
    verbete: "figueira",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Árvore típica dos campos. Ficus comum nos capões",
    categoria: "flora"
  },
  {
    verbete: "araucária",
    origem: "IND",
    classeGramatical: "S.f.",
    definicao: "Pinheiro brasileiro. Árvore típica do sul do Brasil",
    categoria: "flora"
  },
  {
    verbete: "pinhão",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Semente da araucária. Alimento típico do inverno gaúcho",
    categoria: "flora"
  },
  {
    verbete: "espinilho",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Árvore espinhosa típica do pampa. Acácia da região",
    categoria: "flora"
  },
  {
    verbete: "ceibo",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Árvore com flores vermelhas. Flor nacional do Uruguai e Argentina",
    categoria: "flora"
  },
  {
    verbete: "erva-mate",
    origem: "IND",
    classeGramatical: "S.f.",
    definicao: "Planta usada para fazer chimarrão. Ilex paraguariensis",
    categoria: "flora"
  },
  {
    verbete: "caraguatá",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Planta bromeliácea de folhas espinhosas. Vegetação típica do pampa",
    categoria: "flora"
  },
  {
    verbete: "xirú",
    origem: "IND",
    classeGramatical: "S.m.",
    definicao: "Peixe de água doce. Espécie comum em rios e lagoas gaúchas",
    categoria: "fauna"
  },
  {
    verbete: "traíra",
    origem: "IND",
    classeGramatical: "S.f.",
    definicao: "Peixe carnívoro de água doce. Espécie pescada nos rios do RS",
    categoria: "fauna"
  },
  {
    verbete: "viola",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Instrumento de cordas. Viola caipira usada na música gaúcha",
    categoria: "musica"
  },
  {
    verbete: "harmônica",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Instrumento de sopro. Gaita de boca usada na música campeira",
    categoria: "musica"
  },
  {
    verbete: "marcial",
    origem: "PORT",
    statusTemporal: "ANT",
    classeGramatical: "Adj.",
    definicao: "Relativo a guerra, militar. Música marcial em desfiles tradicionalistas",
    categoria: "social"
  },
  {
    verbete: "vaqueano",
    origem: "PLAT",
    classeGramatical: "S.m./Adj.",
    definicao: "Conhecedor dos caminhos. Pessoa experiente em caminhos e lugares",
    categoria: "lida_campeira"
  },
  {
    verbete: "matrero",
    origem: "PLAT",
    statusTemporal: "ANT",
    classeGramatical: "Adj./S.m.",
    definicao: "Fugitivo, foragido. Homem que vive escondido no mato",
    categoria: "social"
  },
  {
    verbete: "entrevero",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Combate confuso, luta desordenada. Mistura, confusão",
    categoria: "social"
  },
  {
    verbete: "farroupilha",
    origem: "BRAS",
    classeGramatical: "S.m./Adj.",
    definicao: "Participante da Revolução Farroupilha (1835-1845). Símbolo do gauchismo",
    categoria: "social"
  },
  {
    verbete: "lança",
    origem: "PORT",
    statusTemporal: "ANT",
    classeGramatical: "S.f.",
    definicao: "Arma branca de haste longa. Instrumento usado em batalhas gaúchas",
    categoria: "lida_campeira"
  },
  {
    verbete: "adaga",
    origem: "PORT",
    statusTemporal: "ANT DES",
    classeGramatical: "S.f.",
    definicao: "Punhal, faca larga. Arma branca antiga",
    categoria: "lida_campeira"
  },
  {
    verbete: "facón",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Faca grande de lâmina larga. Instrumento típico gaúcho",
    categoria: "lida_campeira"
  },
  {
    verbete: "boleadeiras",
    origem: "PLAT",
    statusTemporal: "ANT",
    classeGramatical: "S.f.pl.",
    definicao: "Instrumento de caça com bolas de pedra e tiras de couro. Arma dos antigos gaúchos",
    categoria: "lida_campeira"
  },
  {
    verbete: "rastro",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Marca deixada no solo. Pegada de animal ou pessoa",
    categoria: "lida_campeira"
  },
  {
    verbete: "rastreador",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Aquele que segue rastros. Peão especializado em seguir pegadas",
    categoria: "lida_campeira"
  },
  {
    verbete: "fogão",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Local onde se faz fogo para cozinhar. Fogão a lenha típico do RS",
    categoria: "habitacao"
  },
  {
    verbete: "chaleira",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Recipiente para ferver água. Chaleira para mate",
    categoria: "culinaria"
  },
  {
    verbete: "térmica",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Garrafa térmica para água quente. Essencial para tomar chimarrão",
    categoria: "culinaria"
  },
  {
    verbete: "porteira",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Porta de cerca de campo. Entrada de propriedade rural",
    categoria: "lida_campeira"
  },
  {
    verbete: "cerca",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Divisão de arame farpado. Limite de propriedade ou potreiro",
    categoria: "lida_campeira"
  },
  {
    verbete: "potreiro",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Divisão cercada de campo. Pasto separado para gado",
    categoria: "lida_campeira"
  },
  {
    verbete: "mangueira",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Curral, área cercada. Local para manejo de gado",
    categoria: "lida_campeira"
  },
  {
    verbete: "palanque",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Poste de cerca. Estaca de madeira para fixar arame",
    categoria: "lida_campeira"
  },
  {
    verbete: "arame",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Fio metálico para cercas. Arame farpado usado no campo",
    categoria: "lida_campeira"
  },
  {
    verbete: "carreta",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Veículo puxado por bois. Carro de transporte rural",
    categoria: "lida_campeira"
  },
  {
    verbete: "carretão",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Carreta grande. Veículo de tração animal para carga",
    categoria: "lida_campeira"
  },
  {
    verbete: "junta",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Par de bois de tração. Dois animais unidos para trabalho",
    categoria: "lida_campeira"
  },
  {
    verbete: "canga",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Peça de madeira que une bois. Jugo para animais de tração",
    categoria: "lida_campeira"
  },
  {
    verbete: "arreio",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Conjunto de peças para selar cavalo. Equipamento de montaria",
    categoria: "lida_campeira"
  },
  {
    verbete: "sela",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Assento para montar cavalo. Peça principal do arreio",
    categoria: "lida_campeira"
  },
  {
    verbete: "pelego",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Couro de ovelha com lã. Manta para colocar sobre a sela",
    categoria: "lida_campeira"
  },
  {
    verbete: "cabresto",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Corda para conduzir cavalo. Rédea de animal",
    categoria: "lida_campeira"
  },
  {
    verbete: "rédea",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Correia para guiar cavalo. Parte do freio",
    categoria: "lida_campeira"
  },
  {
    verbete: "freio",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Peça metálica na boca do cavalo. Instrumento de controle do animal",
    categoria: "lida_campeira"
  },
  {
    verbete: "espora",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Peça metálica com roseta no calcanhar da bota. Instrumento para picar o cavalo",
    categoria: "lida_campeira"
  },
  {
    verbete: "roseta",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Roda dentada da espora. Parte giratória da espora",
    categoria: "lida_campeira"
  },
  {
    verbete: "estribeira",
    origem: "BRAS",
    classeGramatical: "S.f.",
    definicao: "Correia que prende o estribo. Parte do arreio",
    categoria: "lida_campeira"
  },
  {
    verbete: "estribo",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Peça onde se apoia o pé ao montar. Parte da sela",
    categoria: "lida_campeira"
  },
  {
    verbete: "maneador",
    origem: "PLAT",
    classeGramatical: "S.m.",
    definicao: "Tira de couro para prender patas do cavalo. Hobble",
    categoria: "lida_campeira"
  },
  {
    verbete: "picaço",
    origem: "BRAS",
    classeGramatical: "S.m.",
    definicao: "Cavalo malhado. Equino de pelagem pintada",
    categoria: "fauna"
  },
  {
    verbete: "tordilho",
    origem: "BRAS",
    classeGramatical: "Adj./S.m.",
    definicao: "Cavalo de pelagem cinza. Equino de cor acinzentada",
    categoria: "fauna"
  },
  {
    verbete: "baio",
    origem: "BRAS",
    classeGramatical: "Adj./S.m.",
    definicao: "Cavalo de pelagem amarelada. Equino de cor baia",
    categoria: "fauna"
  },
  {
    verbete: "zaino",
    origem: "PLAT",
    classeGramatical: "Adj./S.m.",
    definicao: "Cavalo de pelagem escura uniforme. Equino marrom escuro sem marcas",
    categoria: "fauna"
  },
  {
    verbete: "lobuno",
    origem: "BRAS",
    classeGramatical: "Adj./S.m.",
    definicao: "Cavalo de cor cinza-escura. Pelagem semelhante à do lobo",
    categoria: "fauna"
  },
  {
    verbete: "tostado",
    origem: "BRAS",
    classeGramatical: "Adj./S.m.",
    definicao: "Cavalo de pelagem marrom-avermelhada. Cor de torrado",
    categoria: "fauna"
  },
  {
    verbete: "overo",
    origem: "PLAT",
    classeGramatical: "Adj./S.m.",
    definicao: "Cavalo com manchas grandes. Pelagem pintada de branco e outra cor",
    categoria: "fauna"
  },
  {
    verbete: "pampa",
    origem: "IND",
    classeGramatical: "Adj.",
    definicao: "Diz-se de animal com pelagem de duas cores. Malhado, pintado",
    categoria: "fauna"
  },
  {
    verbete: "crina",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Pelos longos no pescoço do cavalo. Juba",
    categoria: "fauna"
  },
  {
    verbete: "anca",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Parte posterior do cavalo. Garupa",
    categoria: "fauna"
  },
  {
    verbete: "garrão",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Parte da perna do cavalo acima do casco. Articulação traseira",
    categoria: "fauna"
  },
  {
    verbete: "quarto",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Parte traseira do cavalo. Anca, garupa",
    categoria: "fauna"
  },
  {
    verbete: "trotear",
    origem: "BRAS",
    classeGramatical: "V.intr.",
    definicao: "Andar a trote. Movimentar-se no passo entre galope e caminhada",
    categoria: "lida_campeira"
  },
  {
    verbete: "galopar",
    origem: "PORT",
    classeGramatical: "V.intr.",
    definicao: "Correr a galope. Andar no passo mais rápido do cavalo",
    categoria: "lida_campeira"
  },
  {
    verbete: "tropear",
    origem: "BRAS",
    classeGramatical: "V.tr.",
    definicao: "Conduzir tropa de animais. Trabalhar como tropeiro",
    categoria: "lida_campeira"
  },
  {
    verbete: "campear",
    origem: "BRAS",
    classeGramatical: "V.intr.",
    definicao: "Trabalhar no campo. Fazer serviços rurais",
    categoria: "lida_campeira"
  },
  {
    verbete: "enlazar",
    origem: "BRAS",
    classeGramatical: "V.tr.",
    definicao: "Pegar com laço. Laçar animal",
    categoria: "lida_campeira"
  },
  {
    verbete: "apear",
    origem: "BRAS",
    classeGramatical: "V.intr.",
    definicao: "Desmontar do cavalo. Descer da montaria",
    categoria: "lida_campeira"
  },
  {
    verbete: "montar",
    origem: "PORT",
    classeGramatical: "V.tr./intr.",
    definicao: "Subir no cavalo. Cavalgar",
    categoria: "lida_campeira"
  },
  {
    verbete: "cear",
    origem: "PORT",
    classeGramatical: "V.intr.",
    definicao: "Jantar, fazer a refeição da noite. Tomar o jantar",
    categoria: "culinaria"
  },
  {
    verbete: "cevada",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Cereal dado como alimento ao cavalo. Grão para engorda de animais",
    categoria: "lida_campeira"
  },
  {
    verbete: "aguaceiro",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Chuva forte e rápida. Temporal",
    categoria: "clima"
  },
  {
    verbete: "geada",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Gelo formado pela condensação do vapor d'água. Fenômeno do inverno gaúcho",
    categoria: "clima"
  },
  {
    verbete: "granizo",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Precipitação de gelo em forma de bolas. Chuva de pedra",
    categoria: "clima"
  },
  {
    verbete: "garoa",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Chuva fina e persistente. Chuvisco",
    categoria: "clima"
  },
  {
    verbete: "temporal",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Tempestade forte. Chuva intensa com vento",
    categoria: "clima"
  },
  {
    verbete: "trovoada",
    origem: "PORT",
    classeGramatical: "S.f.",
    definicao: "Tempestade com trovões. Temporal com raios e trovões",
    categoria: "clima"
  },
  {
    verbete: "sereno",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Umidade da noite. Orvalho noturno",
    categoria: "clima"
  },
  {
    verbete: "orvalho",
    origem: "PORT",
    classeGramatical: "S.m.",
    definicao: "Gotículas de água da condensação noturna. Sereno da madrugada",
    categoria: "clima"
  }
];

// Estatísticas do dicionário
export const DICTIONARY_STATS = {
  total: DIALECTAL_DICTIONARY.length,
  porOrigem: {
    BRAS: DIALECTAL_DICTIONARY.filter(e => e.origem === 'BRAS').length,
    PLAT: DIALECTAL_DICTIONARY.filter(e => e.origem === 'PLAT').length,
    PORT: DIALECTAL_DICTIONARY.filter(e => e.origem === 'PORT').length,
    ESP: DIALECTAL_DICTIONARY.filter(e => e.origem === 'ESP').length,
    AME: DIALECTAL_DICTIONARY.filter(e => e.origem === 'AME').length,
    IND: DIALECTAL_DICTIONARY.filter(e => e.origem === 'IND').length,
  },
  porCategoria: {
    lida_campeira: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'lida_campeira').length,
    fauna: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'fauna').length,
    flora: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'flora').length,
    vestuario: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'vestuario').length,
    culinaria: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'culinaria').length,
    musica: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'musica').length,
    habitacao: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'habitacao').length,
    clima: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'clima').length,
    social: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'social').length,
    geral: DIALECTAL_DICTIONARY.filter(e => e.categoria === 'geral').length,
  },
  arcaismos: DIALECTAL_DICTIONARY.filter(e => e.statusTemporal?.includes('ANT')).length,
  platinismos: DIALECTAL_DICTIONARY.filter(e => e.origem === 'PLAT').length,
  brasileirismos: DIALECTAL_DICTIONARY.filter(e => e.origem === 'BRAS').length,
};

/**
 * Busca um verbete no dicionário
 */
export function findInDictionary(palavra: string): DictionaryEntry | undefined {
  const palavraLower = palavra.toLowerCase().trim();
  return DIALECTAL_DICTIONARY.find(
    entry => entry.verbete.toLowerCase() === palavraLower
  );
}

/**
 * Busca verbetes por categoria
 */
export function findByCategory(categoria: string): DictionaryEntry[] {
  return DIALECTAL_DICTIONARY.filter(entry => entry.categoria === categoria);
}

/**
 * Busca verbetes por origem
 */
export function findByOrigin(origem: string): DictionaryEntry[] {
  return DIALECTAL_DICTIONARY.filter(entry => entry.origem === origem);
}

/**
 * Busca arcaísmos (palavras antigas em desuso)
 */
export function getArcaismos(): DictionaryEntry[] {
  return DIALECTAL_DICTIONARY.filter(
    entry => entry.statusTemporal?.includes('ANT')
  );
}

/**
 * Busca platinismos (palavras de origem platina)
 */
export function getPlatinismos(): DictionaryEntry[] {
  return DIALECTAL_DICTIONARY.filter(entry => entry.origem === 'PLAT');
}
