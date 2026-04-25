export type GenMood =
  | "apaixonado"
  | "triste"
  | "feliz"
  | "ansioso"
  | "sem força"
  | "grato";

export type GenRecipient = "amor" | "amigo" | "família" | "eu mesmo";

export const GEN_MOODS: GenMood[] = [
  "apaixonado",
  "triste",
  "feliz",
  "ansioso",
  "sem força",
  "grato",
];

export const GEN_RECIPIENTS: GenRecipient[] = [
  "amor",
  "amigo",
  "família",
  "eu mesmo",
];

const OPENINGS: Record<GenMood, string[]> = {
  apaixonado: [
    "quando o coração se apaixona, até o silêncio ganha poesia",
    "amar é deixar o peito virar verso e a alma virar canção",
    "tem sentimentos que não cabem em palavras, só em olhares e suspiros",
  ],
  triste: [
    "tudo bem chorar — as lágrimas também são palavras que a alma escreve",
    "há dias em que a alma pesa, mas nenhuma noite venceu o nascer do sol",
    "a tristeza é só uma visita; ela não veio para morar em você",
  ],
  feliz: [
    "que a alegria que mora em você hoje encontre eco em cada amanhã",
    "rir é o jeito mais bonito de dizer que a vida ainda vale a pena",
    "tem dias que parecem feitos só pra lembrar que ser feliz é simples",
  ],
  ansioso: [
    "respira fundo — o futuro ainda não chegou e você já é mais forte do que pensa",
    "calma com o tempo, ele sempre conspira a favor de quem confia",
    "o coração acelera, mas o caminho se abre quando a gente caminha sem pressa",
  ],
  "sem força": [
    "mesmo cansado, você ainda está aqui — e isso já é um ato de coragem",
    "descansar também é seguir em frente, só que com mais sabedoria",
    "as flores mais bonitas brotam justamente onde a terra precisou descansar",
  ],
  grato: [
    "gratidão é o jeito mais bonito de dizer “eu vi o milagre”",
    "agradecer é fazer das pequenas coisas um grande motivo pra continuar",
    "quem agradece colhe — e a alma de quem é grato nunca vive vazia",
  ],
};

const CLOSINGS: Record<GenRecipient, Record<GenMood, string[]>> = {
  amor: {
    apaixonado: [
      "Que esse sentimento te faça sorrir, sonhar e acreditar que o amor ainda escreve histórias bonitas.",
      "Você é a parte mais linda dos meus dias e o lugar onde meu coração escolhe morar.",
    ],
    triste: [
      "Pode chorar no meu colo — meu amor por você é também um abrigo nos dias cinzas.",
      "Estou aqui, do seu lado, segurando a sua mão até a sua tristeza ir embora.",
    ],
    feliz: [
      "Que a sua alegria me alcance, meu amor, porque ver você feliz é o meu maior presente.",
      "Te amo nesse sorriso e em cada motivo que faz seus olhos brilharem assim.",
    ],
    ansioso: [
      "Vem cá, meu amor — deita no meu peito e escuta o tempo passar mais devagar.",
      "Vamos respirar juntos. O que for pra ser, será — e eu vou estar com você.",
    ],
    "sem força": [
      "Descansa em mim, meu amor. Eu cuido do resto enquanto você se cuida.",
      "Você não precisa ser forte agora. Eu seguro o mundo um instante por nós dois.",
    ],
    grato: [
      "E entre tantas bênçãos, agradeço todo dia por você ter chegado na minha vida.",
      "Obrigado por ser meu lar, meu riso, meu sossego e meu amor de todas as horas.",
    ],
  },
  amigo: {
    apaixonado: [
      "Vive esse amor com leveza, amigo — você merece todas as borboletas que estão no seu peito.",
      "Que esse sentimento te faça crescer e nunca te diminua. Tô na torcida por você.",
    ],
    triste: [
      "Tô aqui. Pode chamar a qualquer hora — amizade boa também serve pra dividir choro.",
      "Sua dor importa, e você não está sozinho. Conta comigo no escuro e no sol.",
    ],
    feliz: [
      "Sua felicidade me alegra! Continua espalhando essa luz que só você tem, amigo.",
      "Olhar pra você assim é lembrar de todas as boas coisas que a vida ainda guarda.",
    ],
    ansioso: [
      "Calma, amigo — uma coisa de cada vez. Eu acredito em você e na sua história.",
      "Respira. Eu tô aqui pra escutar quantas vezes você precisar repetir o mesmo medo.",
    ],
    "sem força": [
      "Descansa um pouco, amigo. O mundo espera, e eu seguro a barra com você quando precisar.",
      "Você já fez muito. Hoje, deixa que a gente cuide de você, nem que seja só com presença.",
    ],
    grato: [
      "Obrigado por ser parte das minhas alegrias. Amizade como a sua é raridade na vida.",
      "Eu também agradeço — ter você comigo já vale por uma porção de bênçãos.",
    ],
  },
  família: {
    apaixonado: [
      "Que esse amor te faça florescer e que a nossa família seja sempre o seu porto seguro.",
      "Você merece amar e ser amado bonito. Daqui, torcemos por cada batida do seu coração.",
    ],
    triste: [
      "Vem pra perto. Família é isso — abraço de graça e colo nos dias difíceis.",
      "A gente atravessa essa fase junto. Você não está sozinho enquanto a gente existir.",
    ],
    feliz: [
      "Ver você feliz é o que faz a nossa casa virar um lugar ainda mais bonito.",
      "Que essa alegria fique — você é orgulho e luz pra essa família toda.",
    ],
    ansioso: [
      "Respira, querido. A gente está junto e nada vai te derrubar enquanto for nossa família.",
      "Calma no peito — em casa você sempre vai encontrar abrigo e abraço.",
    ],
    "sem força": [
      "Descansa em casa. Aqui ninguém cobra nada — só te ama do jeito que você for capaz hoje.",
      "Você é amado mesmo cansado. A gente cuida de você até suas forças voltarem.",
    ],
    grato: [
      "E entre as minhas maiores bênçãos, está ter nascido nessa família ao seu lado.",
      "Obrigado por ser parte de quem eu sou. Amar a nossa família é amar também a mim mesmo.",
    ],
  },
  "eu mesmo": {
    apaixonado: [
      "Se permita amar — inclusive a si mesmo, que é o amor que mais merece florescer.",
      "Você é digno de amar e ser amado, e essa lembrança precisa morar dentro de você.",
    ],
    triste: [
      "Tudo bem não estar bem. Se acolha hoje com a mesma ternura que você daria a quem ama.",
      "Você tem o direito de chorar, de descansar e de recomeçar quantas vezes precisar.",
    ],
    feliz: [
      "Comemore esse momento. Você plantou, regou e merece colher essa alegria.",
      "Guarde esse sentimento — ele é a prova de que a sua história também tem capítulos lindos.",
    ],
    ansioso: [
      "Respire fundo. Você já passou por coisas piores e seguiu — e vai seguir agora também.",
      "Confie em você. O seu tempo é seu, e ele sempre vai chegar na hora certa.",
    ],
    "sem força": [
      "Hoje, descanse. Amanhã o sol volta e você terá força do tamanho do dia que vier.",
      "Você não precisa dar conta de tudo agora. Cuidar de si também é caminhar.",
    ],
    grato: [
      "Agradeça por quem você é hoje — você venceu mais batalhas do que costuma reconhecer.",
      "Olhe pra trás com carinho e pra frente com fé. Você merece toda a paz desse instante.",
    ],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function generateMessage(
  rawName: string,
  mood: GenMood,
  recipient: GenRecipient,
): string {
  const name = rawName.trim();
  const opening = pick(OPENINGS[mood]);
  const closing = pick(CLOSINGS[recipient][mood]);
  const greeting = name.length > 0 ? `${name}, ` : "";
  return `${greeting}${opening}. ${closing}`;
}
