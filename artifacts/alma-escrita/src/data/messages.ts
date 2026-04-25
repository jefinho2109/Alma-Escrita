export type Category =
  | "Amor"
  | "Motivação"
  | "Fé"
  | "Superação"
  | "Tristeza"
  | "Amizade"
  | "Bom dia"
  | "Boa noite";

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
];
