export type GenRecipient =
  | "mim"
  | "amor"
  | "mãe"
  | "pai"
  | "irmão"
  | "irmã"
  | "amigo"
  | "amiga"
  | "esposa"
  | "esposo"
  | "marido"
  | "namorado"
  | "namorada"
  | "filho"
  | "filha"
  | "família"
  | "outro";

export type GenTone =
  | "romântica"
  | "emocionante"
  | "fé"
  | "gratidão"
  | "perdão"
  | "saudade"
  | "motivacional"
  | "reflexão";

export type GenLength = "curta" | "média" | "longa";

export type GenRelationship =
  | "Esposa"
  | "Marido"
  | "Namorada"
  | "Namorado"
  | "Mãe"
  | "Pai"
  | "Filho"
  | "Filha"
  | "Amigo"
  | "Amiga"
  | "Irmão"
  | "Irmã"
  | "Outro";

export type GenOccasion =
  | "Declaração de amor"
  | "Agradecimento"
  | "Homenagem"
  | "Saudade"
  | "Pedido de desculpas"
  | "Motivação"
  | "Aniversário"
  | "Fé e superação";

export interface GenRequest {
  recipient: GenRecipient;
  name: string;
  senderName?: string;
  relationship?: GenRelationship;
  occasion?: GenOccasion;
  sharedMemory?: string;
  intention: string;
  tone: GenTone;
  length: GenLength;
  generationId?: string;
  previousMessages?: string[];
}

export const GEN_RECIPIENTS: GenRecipient[] = [
  "mim",
  "amor",
  "mãe",
  "pai",
  "irmão",
  "irmã",
  "amigo",
  "amiga",
  "esposa",
  "esposo",
  "marido",
  "namorado",
  "namorada",
  "filho",
  "filha",
  "família",
  "outro",
];

export const GEN_TONES: GenTone[] = [
  "romântica",
  "emocionante",
  "fé",
  "gratidão",
  "perdão",
  "saudade",
  "motivacional",
  "reflexão",
];

export const GEN_LENGTHS: GenLength[] = ["curta", "média", "longa"];

export const GEN_RELATIONSHIPS: GenRelationship[] = [
  "Esposa",
  "Marido",
  "Namorada",
  "Namorado",
  "Mãe",
  "Pai",
  "Filho",
  "Filha",
  "Amigo",
  "Amiga",
  "Irmão",
  "Irmã",
  "Outro",
];

export const GEN_OCCASIONS: GenOccasion[] = [
  "Declaração de amor",
  "Agradecimento",
  "Homenagem",
  "Saudade",
  "Pedido de desculpas",
  "Motivação",
  "Aniversário",
  "Fé e superação",
];

const TONE_OPENINGS: Record<GenTone, string[]> = {
  romântica: [
    "amar é reconhecer morada no coração de alguém",
    "existem sentimentos que chegam mansos e ficam eternos",
  ],
  emocionante: [
    "algumas verdades só cabem quando a alma fala sem pressa",
    "tem palavras que nascem do lugar mais bonito do peito",
  ],
  fé: [
    "Deus também escreve caminhos onde os olhos só enxergam espera",
    "a fé acende luz até nos dias em que o coração quase apaga",
  ],
  gratidão: [
    "gratidão é quando a alma percebe que recebeu mais do que palavras explicam",
    "agradecer é guardar no coração aquilo que a vida fez florescer",
  ],
  perdão: [
    "perdoar não apaga a história, mas devolve ar ao coração",
    "há curas que começam quando a alma decide não viver presa à dor",
  ],
  saudade: [
    "a saudade é presença que aprendeu a morar no silêncio",
    "existem ausências que continuam tocando a alma com ternura",
  ],
  motivacional: [
    "quem ainda respira esperança já começou a vencer por dentro",
    "mesmo devagar, cada passo sincero aproxima a alma do recomeço",
  ],
  reflexão: [
    "a vida ensina mais quando a alma aceita escutar com calma",
    "há dias que não mudam tudo, mas revelam o que precisa florescer",
  ],
};

const LENGTH_SENTENCES: Record<GenLength, number> = {
  curta: 2,
  média: 3,
  longa: 5,
};

function pick<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

function formatGenLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function normalizeGenRequest(request: GenRequest): GenRequest {
  return {
    recipient: GEN_RECIPIENTS.includes(request.recipient)
      ? request.recipient
      : "mim",
    name: request.name.trim(),
    senderName: request.senderName?.trim(),
    relationship: request.relationship,
    occasion: request.occasion,
    sharedMemory: request.sharedMemory?.trim(),
    intention: request.intention.trim(),
    tone: GEN_TONES.includes(request.tone) ? request.tone : "emocionante",
    length: GEN_LENGTHS.includes(request.length) ? request.length : "média",
    generationId: request.generationId?.trim() || undefined,
    previousMessages: (request.previousMessages || [])
      .map((message) => message.trim())
      .filter(Boolean)
      .slice(0, 6),
  };
}

export function generateMessage(request: GenRequest): string {
  const data = normalizeGenRequest(request);
  const opening = pick(TONE_OPENINGS[data.tone]);

  const firstSentence =
    data.recipient === "mim"
      ? "Hoje eu me escrevo com honestidade e descanso no que sinto."
      : data.name
        ? `${data.name}, ${opening}.`
        : `${formatGenLabel(data.recipient)}, ${opening}.`;

  const secondSentence =
    data.recipient === "mim"
      ? "Eu precisava transformar em palavra o que guardo por dentro, porque algumas verdades só encontram paz quando atravessam a escrita."
      : data.tone === "romântica"
        ? "Eu queria que você soubesse o quanto sou grato por tudo o que você faz por mim e por tudo o que você desperta em mim."
        : data.tone === "gratidão"
          ? "Eu agradeço, do fundo da alma, por cada gesto seu que me sustenta e me faz sentir cuidado."
          : data.tone === "saudade"
            ? "Eu sinto a sua falta de um jeito que ainda mora em mim e insiste em pedir um pouco mais de presença."
            : data.tone === "fé"
              ? "Eu sigo acreditando que existe luz mesmo nos dias em que o coração treme."
              : data.tone === "motivacional"
                ? "Eu sigo em frente porque ainda existe em mim uma vontade sincera de recomeçar."
                : data.tone === "perdão"
                  ? "Eu quero deixar a dor menos pesada e abrir espaço para a cura."
                  : "Eu queria que você sentisse, nas minhas palavras, o quanto a sua presença toca a minha vida.";

  const intentionSentence = data.intention
    ? `E o que eu quero dizer, com verdade, é isto: ${data.intention}.`
    : "Escrevo como quem confessa o que a alma não consegue guardar em silêncio.";

  const sentences = [
    firstSentence,
    secondSentence,
    intentionSentence,
    "Que estas palavras cheguem como abraço, presença e luz no ponto exato onde o coração precisa sentir.",
    "E que fique o essencial: quando a alma fala com amor, até o silêncio entende.",
  ];

  return sentences.slice(0, LENGTH_SENTENCES[data.length]).join(" ");
}
