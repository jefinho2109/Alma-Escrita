export type Category =
  | "Amor"
  | "Motivação"
  | "Fé"
  | "Superação"
  | "Tristeza"
  | "Amizade"
  | "Bom dia"
  | "Boa noite"
  | "Gratidão"
  | "Recomeço";

export type Mood =
  | "Feliz"
  | "Triste"
  | "Ansioso"
  | "Grato"
  | "Sem força"
  | "Apaixonado";

export interface Message {
  id: string;
  text: string;
  category: Category;
  moods: Mood[];
}

export const CATEGORIES: Category[] = [
  "Amor",
  "Motivação",
  "Fé",
  "Superação",
  "Tristeza",
  "Amizade",
  "Bom dia",
  "Boa noite",
  "Gratidão",
  "Recomeço",
];

export const MOODS: Mood[] = [
  "Feliz",
  "Triste",
  "Ansioso",
  "Grato",
  "Sem força",
  "Apaixonado",
];

export const SIGNATURE = "— Jefferson Poeta Sonhador";

export const MESSAGES: Message[] = [
  {
    id: "amor-1",
    category: "Amor",
    moods: ["Apaixonado", "Feliz"],
    text:
      "Te amo no silêncio das manhãs, no barulho dos pensamentos e na calma das noites. Te amo de um jeito que nem sempre cabe em palavras, mas cabe inteiro dentro do meu peito.",
  },
  {
    id: "amor-2",
    category: "Amor",
    moods: ["Apaixonado"],
    text:
      "Quando o amor é verdadeiro, ele não pede explicações. Ele apenas chega, se acomoda no peito e transforma tudo em poesia.",
  },
  {
    id: "amor-3",
    category: "Amor",
    moods: ["Apaixonado", "Grato"],
    text:
      "Existem encontros que não são acaso. São abraços que a vida estava guardando para o tempo certo.",
  },

  {
    id: "motivacao-1",
    category: "Motivação",
    moods: ["Sem força", "Ansioso"],
    text:
      "Não desista no meio da tempestade. As estrelas só aparecem depois que o céu escurece por completo.",
  },
  {
    id: "motivacao-2",
    category: "Motivação",
    moods: ["Feliz", "Grato"],
    text:
      "Você é mais forte do que imagina. Cada cicatriz é a prova de que a dor passou, mas você ficou.",
  },
  {
    id: "motivacao-3",
    category: "Motivação",
    moods: ["Sem força"],
    text:
      "Recomeçar não é voltar ao começo. É continuar de onde a coragem te trouxe.",
  },

  {
    id: "fe-1",
    category: "Fé",
    moods: ["Ansioso", "Grato"],
    text:
      "Confie. Mesmo quando o caminho parece escuro, Deus está acendendo lanternas que você ainda não consegue ver.",
  },
  {
    id: "fe-2",
    category: "Fé",
    moods: ["Sem força", "Triste"],
    text:
      "A fé não tira a tempestade, mas segura a sua mão para que você não se perca dentro dela.",
  },
  {
    id: "fe-3",
    category: "Fé",
    moods: ["Grato"],
    text:
      "Agradeça antes do milagre acontecer. A gratidão é o idioma que o céu mais escuta.",
  },

  {
    id: "superacao-1",
    category: "Superação",
    moods: ["Triste", "Sem força"],
    text:
      "Você já sobreviveu a 100% dos seus piores dias. Isso também vai passar — e você vai continuar de pé.",
  },
  {
    id: "superacao-2",
    category: "Superação",
    moods: ["Sem força", "Ansioso"],
    text:
      "Cair faz parte. Levantar é uma escolha. E você, meu amigo, já provou muitas vezes que sabe escolher.",
  },
  {
    id: "superacao-3",
    category: "Superação",
    moods: ["Grato"],
    text:
      "O que te quebrou não te definiu. O modo como você se reconstruiu, sim — e ele é belíssimo.",
  },

  {
    id: "tristeza-1",
    category: "Tristeza",
    moods: ["Triste"],
    text:
      "Chore se for preciso. As lágrimas também são palavras que a alma escreve quando a boca não consegue.",
  },
  {
    id: "tristeza-2",
    category: "Tristeza",
    moods: ["Triste", "Sem força"],
    text:
      "Tudo bem não estar bem hoje. A tristeza é só uma visita — não veio para morar em você.",
  },
  {
    id: "tristeza-3",
    category: "Tristeza",
    moods: ["Triste"],
    text:
      "Há dias em que a alma pesa. Respira fundo. Amanhã o sol volta a entrar pela janela e tudo terá outro tom.",
  },

  {
    id: "amizade-1",
    category: "Amizade",
    moods: ["Grato", "Feliz"],
    text:
      "Amigo de verdade é aquele que entra na sua vida pela porta da frente e nunca mais procura a saída.",
  },
  {
    id: "amizade-2",
    category: "Amizade",
    moods: ["Grato"],
    text:
      "Tem amizades que não são feitas de tempo, são feitas de presença. E essas a gente guarda com carinho.",
  },
  {
    id: "amizade-3",
    category: "Amizade",
    moods: ["Feliz"],
    text:
      "Obrigado por ser luz nos meus dias cinzas e por dividir os coloridos comigo. Amizade boa é assim: leve, leal e eterna.",
  },

  {
    id: "bomdia-1",
    category: "Bom dia",
    moods: ["Feliz", "Grato"],
    text:
      "Bom dia! Que hoje seja leve, sorridente e cheio de pequenos motivos para agradecer. Você merece um dia bonito.",
  },
  {
    id: "bomdia-2",
    category: "Bom dia",
    moods: ["Grato"],
    text:
      "Acordar é um presente. Que neste novo dia você reconheça a sorte de estar vivo e o poder de recomeçar.",
  },
  {
    id: "bomdia-3",
    category: "Bom dia",
    moods: ["Feliz", "Apaixonado"],
    text:
      "Que o seu café seja quentinho, o seu coração esteja calmo e o seu dia seja tão bonito quanto o seu sorriso pela manhã.",
  },

  {
    id: "boanoite-1",
    category: "Boa noite",
    moods: ["Grato"],
    text:
      "Boa noite! Descanse a mente, abrace o silêncio e durma com a certeza de que amanhã é uma nova chance.",
  },
  {
    id: "boanoite-2",
    category: "Boa noite",
    moods: ["Apaixonado"],
    text:
      "Que a lua te embale e os sonhos te levem para os lugares mais bonitos da sua imaginação. Boa noite com carinho.",
  },
  {
    id: "boanoite-3",
    category: "Boa noite",
    moods: ["Triste", "Ansioso"],
    text:
      "Solte o peso do dia. Feche os olhos com fé. A noite também é remédio para o que o dia cansou.",
  },

  // === Fé, Força e Paciência (FFP) ===

  {
    id: "fe-4",
    category: "Fé",
    moods: ["Sem força", "Ansioso"],
    text:
      "Fé não é não sentir medo. É caminhar mesmo tremendo, porque você sabe Quem segura a sua mão.",
  },
  {
    id: "fe-5",
    category: "Fé",
    moods: ["Triste", "Sem força"],
    text:
      "Davi enfrentou um gigante com cinco pedras e um Deus. Você também tem o suficiente — só precisa lembrar de Quem está com você.",
  },
  {
    id: "fe-6",
    category: "Fé",
    moods: ["Ansioso"],
    text:
      "Quando tudo parecer atrasado, lembra: Deus nunca chega tarde. Ele chega no tempo que cura, não no tempo que pressiona.",
  },
  {
    id: "fe-7",
    category: "Fé",
    moods: ["Sem força", "Grato"],
    text:
      "Jó perdeu tudo, mas não perdeu a fé. E foi pela fé que recebeu de volta o dobro do que a dor levou. Resista mais um dia.",
  },
  {
    id: "fe-8",
    category: "Fé",
    moods: ["Ansioso", "Grato"],
    text:
      "A oração silenciosa é a mais alta. Deus escuta o coração antes da boca.",
  },
  {
    id: "fe-9",
    category: "Fé",
    moods: ["Sem força"],
    text:
      "O silêncio de Deus não é ausência. Muitas vezes é a Sua mão preparando o melhor de você longe dos olhos do mundo.",
  },

  {
    id: "motivacao-4",
    category: "Motivação",
    moods: ["Sem força"],
    text:
      "José foi do poço ao palácio. O lugar onde te jogaram não é o lugar onde você vai ficar. Levanta e segue.",
  },
  {
    id: "motivacao-5",
    category: "Motivação",
    moods: ["Sem força", "Ansioso"],
    text:
      "Fé, Força e Paciência. Três palavras que sustentam quem o mundo tentou derrubar.",
  },
  {
    id: "motivacao-6",
    category: "Motivação",
    moods: ["Feliz"],
    text:
      "Não compete com ninguém. Você é a única pessoa do mundo carregando a sua história — e isso já te faz raro.",
  },
  {
    id: "motivacao-7",
    category: "Motivação",
    moods: ["Sem força"],
    text:
      "Tem dia que vencer é só não desistir. E hoje, se você ainda está aqui, você venceu.",
  },
  {
    id: "motivacao-8",
    category: "Motivação",
    moods: ["Grato", "Feliz"],
    text:
      "O que Deus reserva para você, ninguém tira. Confie no tempo, mas não pare de caminhar.",
  },

  {
    id: "superacao-4",
    category: "Superação",
    moods: ["Triste", "Sem força"],
    text:
      "A dor de hoje é o testemunho de amanhã. Quem chora à noite, um dia ensina o mundo a sorrir.",
  },
  {
    id: "superacao-5",
    category: "Superação",
    moods: ["Sem força"],
    text:
      "Você não é o que te aconteceu. Você é o que escolheu fazer com isso depois.",
  },
  {
    id: "superacao-6",
    category: "Superação",
    moods: ["Triste"],
    text:
      "Antes de ser rei, Davi foi pastor de ovelhas, fugitivo e injustiçado. A coroa veio depois da paciência. A sua também vem.",
  },
  {
    id: "superacao-7",
    category: "Superação",
    moods: ["Sem força", "Grato"],
    text:
      "Tem batalha que Deus não tira de você porque é nela que você vai descobrir o quanto é forte.",
  },
  {
    id: "superacao-8",
    category: "Superação",
    moods: ["Ansioso"],
    text:
      "Você já passou por noites que achou que não amanheceria. E aqui está, lendo isso. Isso é prova de que Deus ainda não terminou.",
  },

  {
    id: "tristeza-4",
    category: "Tristeza",
    moods: ["Triste"],
    text:
      "Tem dores que ninguém vê, mas Deus conta cada lágrima sua. Você nunca chorou sozinho.",
  },
  {
    id: "tristeza-5",
    category: "Tristeza",
    moods: ["Triste", "Sem força"],
    text:
      "Sentir é humano. Chorar é coragem. Quem se permite a dor é quem um dia se permite curar.",
  },
  {
    id: "tristeza-6",
    category: "Tristeza",
    moods: ["Triste"],
    text:
      "A noite mais escura da alma sempre vem antes do amanhecer mais bonito. Aguenta, vai valer a pena.",
  },
  {
    id: "tristeza-7",
    category: "Tristeza",
    moods: ["Sem força"],
    text:
      "Deus não despreza um coração quebrantado. É justamente nele que Ele entra com mais cuidado.",
  },

  {
    id: "amor-4",
    category: "Amor",
    moods: ["Apaixonado", "Grato"],
    text:
      "O amor verdadeiro não cobra, não grita, não some. Ele apenas fica — quando o mundo todo vai embora.",
  },
  {
    id: "amor-5",
    category: "Amor",
    moods: ["Apaixonado"],
    text:
      "Amar é também ter paciência. Quem ama de verdade espera o tempo do outro sem deixar de cuidar do seu.",
  },
  {
    id: "amor-6",
    category: "Amor",
    moods: ["Grato", "Apaixonado"],
    text:
      "Antes de amar alguém, aprende a amar o que Deus já fez de bonito dentro de você. O amor próprio é o primeiro milagre.",
  },
  {
    id: "amor-7",
    category: "Amor",
    moods: ["Apaixonado", "Feliz"],
    text:
      "Tem amores que chegam como resposta de oração. E quando isso acontece, a gente reconhece pelo silêncio bom no peito.",
  },

  {
    id: "gratidao-1",
    category: "Gratidão",
    moods: ["Grato"],
    text:
      "Gratidão é a memória do coração. É lembrar que, mesmo no pouco, Deus nunca te deixou faltar o essencial.",
  },
  {
    id: "gratidao-2",
    category: "Gratidão",
    moods: ["Grato", "Feliz"],
    text:
      "Obrigado, Senhor, pelo café simples, pela cama quente, pelos olhos que abrem mais um dia. O milagre mora nas pequenas coisas.",
  },
  {
    id: "gratidao-3",
    category: "Gratidão",
    moods: ["Grato"],
    text:
      "Quem agradece o pouco, recebe o muito. A gratidão abre portas que o esforço sozinho não alcança.",
  },
  {
    id: "gratidao-4",
    category: "Gratidão",
    moods: ["Grato", "Sem força"],
    text:
      "Agradeça também pelas dores. Foram elas que te fizeram olhar pra cima e enxergar Deus de perto.",
  },
  {
    id: "gratidao-5",
    category: "Gratidão",
    moods: ["Grato", "Apaixonado"],
    text:
      "Sou grato pelas pessoas que ficaram quando eu não tinha nada para oferecer além de mim mesmo. Essas Deus me deu de presente.",
  },
  {
    id: "gratidao-6",
    category: "Gratidão",
    moods: ["Grato"],
    text:
      "Há quem peça muito e nunca esteja satisfeito. Há quem agradeça o pouco e viva inteiro. Seja o segundo.",
  },
  {
    id: "gratidao-7",
    category: "Gratidão",
    moods: ["Grato", "Feliz"],
    text:
      "A gratidão transforma o que temos em suficiente. E o suficiente, aos olhos de Deus, é sempre fartura.",
  },

  {
    id: "recomeco-1",
    category: "Recomeço",
    moods: ["Sem força", "Grato"],
    text:
      "Recomeçar não é apagar o passado. É escrever uma página nova com a letra mais firme da experiência.",
  },
  {
    id: "recomeco-2",
    category: "Recomeço",
    moods: ["Sem força"],
    text:
      "Toda manhã Deus te entrega um novo começo embrulhado em silêncio. Cabe a você abrir com fé.",
  },
  {
    id: "recomeco-3",
    category: "Recomeço",
    moods: ["Triste", "Sem força"],
    text:
      "Não tenha vergonha de recomeçar. Tenha medo de desistir antes da virada. Ela está mais perto do que parece.",
  },
  {
    id: "recomeco-4",
    category: "Recomeço",
    moods: ["Ansioso"],
    text:
      "O barro que se quebra na mão do Oleiro não é jogado fora — é refeito. Deus é especialista em recomeços.",
  },
  {
    id: "recomeco-5",
    category: "Recomeço",
    moods: ["Sem força", "Grato"],
    text:
      "Você tem dentro de si tudo que precisa para começar de novo. Fé, Força e Paciência — três presentes que ninguém pode te tirar.",
  },
  {
    id: "recomeco-6",
    category: "Recomeço",
    moods: ["Grato", "Feliz"],
    text:
      "Recomeçar é dizer a si mesmo: 'Eu mereço outra chance'. E merecer, você sempre mereceu.",
  },
  {
    id: "recomeco-7",
    category: "Recomeço",
    moods: ["Sem força"],
    text:
      "José foi vendido pelos irmãos, esquecido na prisão, e ainda assim governou o Egito. O seu recomeço também tem propósito — confie.",
  },
];
