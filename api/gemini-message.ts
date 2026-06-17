/// <reference types="node" />

import crypto from "node:crypto";

type GenRecipient =
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

type GenTone =
  | "romântica"
  | "emocionante"
  | "fé"
  | "gratidão"
  | "perdão"
  | "saudade"
  | "motivacional"
  | "reflexão";

type GenLength = "curta" | "média" | "longa";

interface GenRequest {
  recipient: GenRecipient;
  name: string;
  senderName?: string;
  relationship?: string;
  occasion?: string;
  sharedMemory?: string;
  messageStart?: string;
  premiumMessage?: boolean;
  shouldSignMessage?: boolean;
  intention: string;
  tone: GenTone;
  length: GenLength;
}

declare const process: {
  env: Record<string, string | undefined>;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-1.5-flash";
const MAX_PROMPT_LENGTH = 8_000;
const MAX_ENRICHED_PROMPT_LENGTH = 11_000;
const MAX_BOOK_CONTEXT_CHARS = 2_700;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const BOOK_COLLECTION = "book_sources";

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateStore = new Map<string, RateEntry>();
let cachedFirebaseToken: { token: string; expiresAt: number } | null = null;

interface BookSource {
  title: string;
  category: string;
  content: string;
  tags: string[];
  tone: string;
}

function getIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = rateStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function parseBody(req: any): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

const GEN_RECIPIENTS: GenRecipient[] = [
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

const GEN_TONES: GenTone[] = [
  "romântica",
  "emocionante",
  "fé",
  "gratidão",
  "perdão",
  "saudade",
  "motivacional",
  "reflexão",
];

const GEN_LENGTHS: GenLength[] = ["curta", "média", "longa"];

const TONE_OPENINGS: Record<GenTone, string[]> = {
  romântica: [
    "amar é reconhecer morada no coração de alguém",
    "existem sentimentos que chegam mansos e ficam eternos",
  ],
  emocionante: [
    "algumas verdades só cabem quando o coração fala sem pressa",
    "tem palavras que nascem do lugar mais bonito do peito",
  ],
  fé: [
    "Deus também escreve caminhos onde os olhos só enxergam espera",
    "a fé acende luz até nos dias em que o coração quase apaga",
  ],
  gratidão: [
    "gratidão é quando o coração reconhece que recebeu mais do que palavras explicam",
    "agradecer é guardar no coração aquilo que a vida fez florescer",
  ],
  perdão: [
    "perdoar não apaga a história, mas devolve ar ao coração",
    "há curas que começam quando a pessoa decide não viver presa à dor",
  ],
  saudade: [
    "a saudade é presença que aprendeu a morar no silêncio",
    "existem ausências que continuam tocando a memória com ternura",
  ],
  motivacional: [
    "quem escolhe a coragem já começou a vencer por dentro",
    "mesmo devagar, cada passo sincero aproxima você do recomeço",
  ],
  reflexão: [
    "a vida ensina mais quando a gente aceita escutar com calma",
    "há dias que não mudam tudo, mas revelam o que precisa florescer",
  ],
};

const LENGTH_SENTENCES: Record<GenLength, number> = {
  curta: 2,
  média: 3,
  longa: 5,
};

type EmotionalUniverseKey =
  | "amor"
  | "fe"
  | "amizade"
  | "pedido_desculpas"
  | "gratidao"
  | "reflexao"
  | "motivacao"
  | "aniversario";

interface ServerUniverse {
  key: EmotionalUniverseKey;
  label: string;
  allowed: string[];
  blocked: string[];
}

const SERVER_SPIRITUAL_BLOCKS = [
  "Deus",
  "fé",
  "oração",
  "orar",
  "alma",
  "esperança espiritual",
  "espiritual",
  "espiritualidade",
  "Senhor",
  "milagre",
  "céu",
  "propósito divino",
];

const SERVER_ROMANTIC_BLOCKS = [
  "romance",
  "romântico",
  "paixão",
  "apaixonado",
  "beijo",
  "beijar",
  "lábios",
  "desejo",
  "meu amor",
  "minha vida",
  "namorado",
  "namorada",
  "casal",
];

const SERVER_UNIVERSES: Record<EmotionalUniverseKey, ServerUniverse> = {
  amor: {
    key: "amor",
    label: "AMOR",
    allowed: [
      "carinho",
      "afeto",
      "presença",
      "saudade",
      "desejo respeitoso",
      "admiração",
      "companheirismo",
      "escolha",
      "romance",
    ],
    blocked: [...SERVER_SPIRITUAL_BLOCKS, "esperança"],
  },
  fe: {
    key: "fe",
    label: "FÉ",
    allowed: ["Deus", "oração", "esperança", "propósito", "confiança", "espiritualidade"],
    blocked: SERVER_ROMANTIC_BLOCKS,
  },
  amizade: {
    key: "amizade",
    label: "AMIZADE",
    allowed: ["apoio", "parceria", "lealdade", "companheirismo", "presença"],
    blocked: SERVER_ROMANTIC_BLOCKS,
  },
  pedido_desculpas: {
    key: "pedido_desculpas",
    label: "PEDIDO DE DESCULPAS",
    allowed: ["erro", "responsabilidade", "arrependimento", "perdão", "reconstrução"],
    blocked: [...SERVER_SPIRITUAL_BLOCKS, ...SERVER_ROMANTIC_BLOCKS],
  },
  gratidao: {
    key: "gratidao",
    label: "GRATIDÃO",
    allowed: ["reconhecimento", "importância", "lembrança", "gratidão"],
    blocked: [...SERVER_SPIRITUAL_BLOCKS, ...SERVER_ROMANTIC_BLOCKS],
  },
  reflexao: {
    key: "reflexao",
    label: "REFLEXÃO",
    allowed: ["aprendizado", "maturidade", "tempo", "crescimento"],
    blocked: [...SERVER_SPIRITUAL_BLOCKS, ...SERVER_ROMANTIC_BLOCKS],
  },
  motivacao: {
    key: "motivacao",
    label: "MOTIVAÇÃO",
    allowed: ["coragem", "recomeço", "força", "perseverança"],
    blocked: [...SERVER_SPIRITUAL_BLOCKS, ...SERVER_ROMANTIC_BLOCKS],
  },
  aniversario: {
    key: "aniversario",
    label: "ANIVERSÁRIO",
    allowed: ["celebração", "alegria", "vida", "bênçãos"],
    blocked: [...SERVER_SPIRITUAL_BLOCKS, ...SERVER_ROMANTIC_BLOCKS],
  },
};

function normalizeUniverseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function includesUniverseTerm(text: string, term: string): boolean {
  const normalizedText = ` ${normalizeUniverseText(text)} `;
  const normalizedTerm = normalizeUniverseText(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^a-z0-9])${normalizedTerm.replace(/\s+/g, "\\s+")}([^a-z0-9]|$)`);
  return pattern.test(normalizedText);
}

function resolveServerUniverse(request: GenRequest): ServerUniverse {
  const joined = normalizeUniverseText(
    [
      request.tone,
      request.occasion,
      request.relationship,
      request.recipient,
      request.intention,
      request.sharedMemory,
      request.messageStart,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (
    request.tone === "perdão" ||
    /pedido de desculpas|desculpa|perdao|erro|errei|arrepend/.test(joined)
  ) {
    return SERVER_UNIVERSES.pedido_desculpas;
  }
  if (/aniversario|celebracao|parabens/.test(joined)) return SERVER_UNIVERSES.aniversario;
  if (request.tone === "romântica") return SERVER_UNIVERSES.amor;
  if (request.tone === "fé") return SERVER_UNIVERSES.fe;
  if (request.tone === "gratidão") return SERVER_UNIVERSES.gratidao;
  if (request.tone === "motivacional") return SERVER_UNIVERSES.motivacao;
  if (request.tone === "reflexão") return SERVER_UNIVERSES.reflexao;
  if (/amig/.test(joined)) return SERVER_UNIVERSES.amizade;
  return SERVER_UNIVERSES.reflexao;
}

function isAllowedForServerUniverse(text: string, universe: ServerUniverse): boolean {
  return !universe.blocked.some((term) => includesUniverseTerm(text, term));
}

function compactServerConcreteSignal(request: GenRequest, universe: ServerUniverse): string {
  const raw = [
    request.sharedMemory,
    request.messageStart,
    request.intention,
  ].find((value) => {
    const normalized = normalizeUniverseText(value || "");
    return (
      normalized.length > 3 &&
      !/^uma mensagem especial$/.test(normalized) &&
      !/^nao informado$/.test(normalized)
    );
  });

  if (!raw) return "";

  const cleaned = raw
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?;:]+$/g, "")
    .trim();

  if (!cleaned || !isAllowedForServerUniverse(cleaned, universe)) return "";

  const words = cleaned.match(/[A-Za-zÀ-ÿ0-9]+(?:[-'][A-Za-zÀ-ÿ0-9]+)*/g) || [];
  return words.slice(0, 10).join(" ").toLocaleLowerCase("pt-BR");
}

function buildServerUniverseFallback(request: GenRequest): string {
  const name = request.name?.trim() || "você";
  const universe = resolveServerUniverse(request);
  const concreteSignal = compactServerConcreteSignal(request, universe);
  const memoryByUniverse: Record<EmotionalUniverseKey, string> = {
    amor: concreteSignal || "seu jeito de chegar perto de mim",
    fe: concreteSignal || "o que ainda tenho colocado em oração",
    amizade: concreteSignal || "os momentos em que sua parceria me sustentou",
    pedido_desculpas: concreteSignal || "o que eu fiz e preciso reparar",
    gratidao: concreteSignal || "o cuidado que recebi de você",
    reflexao: concreteSignal || "o que este tempo tem me mostrado",
    motivacao: concreteSignal || "o esforço que ninguém vê por inteiro",
    aniversario: concreteSignal || "a alegria de celebrar sua vida",
  };
  const memory = memoryByUniverse[universe.key];
  const messages: Record<EmotionalUniverseKey, string> = {
    amor: `${name}, eu sinto carinho por você de um jeito que pede presença, afeto e cuidado. A saudade aumenta meu desejo respeitoso de estar perto, admirando seus detalhes e escolhendo esse romance com companheirismo.`,
    fe: `${name}, sigo confiando em Deus e levando em oração o que ainda precisa amadurecer. Que a esperança fortaleça seu propósito e renove sua confiança com serenidade espiritual.`,
    amizade: `${name}, sua presença tem valor de parceria verdadeira. Obrigado pelo apoio, pela lealdade e pelo companheirismo que tornam nossa amizade um lugar de cuidado sincero.`,
    pedido_desculpas: `${name}, reconheço meu erro e assumo a responsabilidade pelo que aconteceu. Sinto arrependimento sincero, peço perdão de coração e quero reconstruir a confiança com atitudes melhores.`,
    gratidao: `${name}, guardo reconhecimento pela sua importância na minha vida. Cada lembrança do seu cuidado aumenta minha gratidão e me faz valorizar ainda mais o que você representa.`,
    reflexao: `${name}, este momento me chama para aprendizado e maturidade. O tempo mostra caminhos de crescimento, e eu quero acolher essa fase com calma e consciência.`,
    motivacao: `${name}, respire e siga com coragem. Todo recomeço pede força, mas a perseverança transforma passos pequenos em uma caminhada firme.`,
    aniversario: `${name}, hoje é dia de celebração, alegria e vida. Que este novo ciclo chegue com bênçãos, boas lembranças e motivos bonitos para sorrir.`,
  };
  const premiumMessages: Record<EmotionalUniverseKey, string> = {
    amor: `${name}, quando penso em ${memory}, meu peito fica mais honesto do que eu consigo disfarçar. Eu sinto carinho, saudade e um desejo respeitoso de estar perto, não por costume, mas porque sua presença mudou o lugar das coisas dentro de mim. Gosto da sua forma de me alcançar nos detalhes, da admiração que cresce quando lembro do seu sorriso e da escolha que faço quando penso em nós. Esse romance aparece no cuidado, no companheirismo e na verdade do que eu sinto. Eu queria que você soubesse, sem rodeio, que meu amor por você é presença que fica.`,
    fe: `${name}, quando penso em ${memory}, eu levo tudo a Deus com menos pressa e mais confiança. Há dias em que minha oração não vem perfeita, mas vem sincera, porque eu ainda acredito que a esperança encontra caminho mesmo quando a resposta demora. Peço que Deus fortaleça seu propósito, guarde sua espiritualidade e renove sua confiança nos detalhes que ninguém vê. Eu também aprendo a descansar, a respirar e a não soltar a fé quando o coração cansa. Que você se sinta amparada por dentro, como quem descobre que a paz pode chegar devagar e ainda assim chegar inteira.`,
    amizade: `${name}, quando lembro de ${memory}, eu reconheço o quanto sua amizade tem sido apoio de verdade. Você não aparece apenas nos dias leves; sua parceria também se mostra quando a vida pede escuta, lealdade e presença sem espetáculo. Isso me toca mais do que talvez eu consiga dizer, porque companheirismo assim não se encontra em qualquer lugar. Eu valorizo sua forma de permanecer, de acolher e de fazer a caminhada parecer menos pesada. Que você saiba que pode contar comigo também, com a mesma sinceridade. Nossa amizade é um desses vínculos que dão coragem para continuar sendo quem a gente é.`,
    pedido_desculpas: `${name}, quando encaro ${memory}, eu não quero fugir da responsabilidade que me cabe. Eu errei, e reconhecer isso dói porque sei que minhas atitudes tocaram um lugar que merecia cuidado. Sinto arrependimento sincero, com a consciência clara do que preciso mudar em mim. Peço perdão com respeito, sem exigir que você esqueça depressa ou finja que nada aconteceu. Quero reconstrução com atitudes, paciência e coerência, mesmo que leve tempo. Se ainda houver espaço, desejo reparar o que ficou ferido e provar, no cotidiano, que aprendi com essa falha.`,
    gratidao: `${name}, quando lembro de ${memory}, minha gratidão deixa de ser ideia e vira reconhecimento vivo. Seu cuidado teve impacto real em mim; não foi apenas uma gentileza passando pelo dia, foi apoio que ficou guardado e me fez sentir visto de um jeito importante. Eu reconheço sua importância na minha história, nos gestos pequenos, na presença que sustentou e na lembrança que ainda aquece por dentro. Talvez você nem tenha percebido o quanto fez diferença, mas eu percebi. Por isso agradeço com sinceridade: o que veio de você me alcançou, me marcou e merece ser lembrado com carinho.`,
    reflexao: `${name}, quando penso em ${memory}, percebo que o aprendizado não chegou como resposta pronta. Ele veio me pedindo maturidade, tempo e coragem para olhar com mais verdade para o que eu sinto. Algumas coisas só amadurecem quando a gente para de fugir do próprio silêncio e aceita crescer por dentro. Quero reconhecer o que mudou em mim, o que ainda precisa de cuidado e o que já não posso carregar do mesmo jeito. Se existe crescimento aqui, ele começa nessa honestidade simples: aprender também é admitir que certas fases nos tornam mais humanos.`,
    motivacao: `${name}, quando penso em ${memory}, eu vejo uma força que talvez você mesma nem consiga medir. Há coragem no jeito como você continua, mesmo quando o recomeço parece pequeno e ninguém enxerga o esforço por trás do seu silêncio. Sua perseverança não precisa fazer barulho para ter valor; ela aparece no passo que você dá cansada, na decisão de tentar de novo e na vontade de não desistir de si. Eu queria que você se lembrasse disso nos dias difíceis: ainda existe vida esperando sua firmeza. Continue. O que você está construindo por dentro também é vitória.`,
    aniversario: `${name}, quando penso em ${memory}, celebrar sua vida ganha um sentido mais bonito. Hoje não é só uma data; é a alegria de reconhecer sua presença, sua história e o bem que você deixa nos lugares por onde passa. Desejo que este novo ciclo venha com bênçãos, saúde, encontros sinceros e lembranças que façam seu coração sorrir sem esforço. Que você receba carinho de quem conhece seu valor e alegria de quem torce por você de verdade. Minha vontade é que este dia abrace sua vida com leveza e permaneça como uma lembrança feliz, simples e inteira.`,
  };

  return request.messageStart || request.premiumMessage
    ? premiumMessages[universe.key]
    : messages[universe.key];
}

function pick<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

function formatGenLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeGenRequest(request: GenRequest): GenRequest {
  return {
    recipient: GEN_RECIPIENTS.includes(request.recipient)
      ? request.recipient
      : "mim",
    name: request.name.trim(),
    senderName: request.senderName?.trim(),
    relationship: request.relationship?.trim(),
    occasion: request.occasion?.trim(),
    sharedMemory: request.sharedMemory?.trim(),
    messageStart: request.messageStart?.trim(),
    premiumMessage: Boolean(request.premiumMessage),
    shouldSignMessage: Boolean(request.shouldSignMessage),
    intention: request.intention.trim(),
    tone: GEN_TONES.includes(request.tone) ? request.tone : "emocionante",
    length: GEN_LENGTHS.includes(request.length) ? request.length : "média",
  };
}

function buildLocalFallbackMessage(request: GenRequest): string {
  const data = normalizeGenRequest(request);
  if (data.messageStart || data.premiumMessage) {
    return buildServerUniverseFallback(data);
  }

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
          ? "Eu agradeço, com reconhecimento sincero, por cada gesto seu que me sustenta e me faz sentir cuidado."
          : data.tone === "saudade"
            ? "Eu sinto a sua falta de um jeito que ainda mora em mim e insiste em pedir um pouco mais de presença."
            : data.tone === "fé"
              ? "Eu sigo acreditando que existe luz mesmo nos dias em que o coração treme."
              : data.tone === "motivacional"
                ? "Eu sigo em frente porque ainda existe em mim uma vontade sincera de recomeçar."
                : data.tone === "perdão"
                  ? "Eu quero deixar a dor menos pesada e abrir espaço para a cura."
                  : "Eu queria que você sentisse, nas minhas palavras, o quanto a sua presença toca a minha vida.";

  const sentences = [
    firstSentence,
    secondSentence,
    "Digo isso com a sinceridade de quem guarda esse sentimento no peito.",
    "Que este carinho chegue como abraço, presença e cuidado no ponto exato onde o coração precisa sentir.",
    "Nem tudo que é profundo precisa ser complicado; às vezes, basta uma palavra sincera para tocar uma vida inteira.",
    "E que fique o essencial: quando o afeto é verdadeiro, até o silêncio entende.",
  ];

  const text = sentences.slice(0, LENGTH_SENTENCES[data.length]).join(" ");
  return isAllowedForServerUniverse(text, resolveServerUniverse(data))
    ? text
    : buildServerUniverseFallback(data);
}

function parseStructuredPrompt(prompt: string): GenRequest {
  const getLine = (label: string) => {
    const match = prompt.match(new RegExp(`^- ${label}:\\s*(.+)$`, "m"));
    return match?.[1]?.trim() || "";
  };

  const destination = getLine("Esta mensagem é para");
  const name = getLine("Nome da pessoa");
  const intention = getLine("O que o usuário quer dizer");
  const toneRaw = getLine("Tom escolhido").toLowerCase();
  const lengthRaw = getLine("Tamanho escolhido").toLowerCase();

  const recipientFromDestination = (): GenRecipient => {
    const normalized = destination.toLowerCase();
    if (/pr[óo]pria pessoa/.test(normalized)) return "mim";
    if (/mãe/.test(normalized)) return "mãe";
    if (/pai/.test(normalized)) return "pai";
    if (/irmão/.test(normalized)) return "irmão";
    if (/irmã/.test(normalized)) return "irmã";
    if (/amiga/.test(normalized)) return "amiga";
    if (/amigo/.test(normalized)) return "amigo";
    if (/esposa/.test(normalized)) return "esposa";
    if (/esposo/.test(normalized)) return "esposo";
    if (/namorada/.test(normalized)) return "namorada";
    if (/namorado/.test(normalized)) return "namorado";
    if (/filha/.test(normalized)) return "filha";
    if (/filho/.test(normalized)) return "filho";
    return "outro";
  };

  const recipient = recipientFromDestination();

  const toneMap: Array<[RegExp, GenTone]> = [
    [/rom[aâ]nt/i, "romântica"],
    [/emocion/i, "emocionante"],
    [/\bf[ée]\b|fé/, "fé"],
    [/gratid/i, "gratidão"],
    [/perd[aã]o|perdo/i, "perdão"],
    [/saudad/i, "saudade"],
    [/motiv/i, "motivacional"],
    [/reflex/i, "reflexão"],
  ];

  const tone =
    toneMap.find(([pattern]) => pattern.test(toneRaw))?.[1] || "emocionante";

  const length =
    lengthRaw.includes("curta")
      ? "curta"
      : lengthRaw.includes("longa")
        ? "longa"
        : "média";

  return normalizeGenRequest({
    recipient,
    name: name && !/n[ãa]o informado/i.test(name) ? name : "",
    intention,
    tone,
    length: length as GenLength,
  });
}

function parseGenerationRequest(value: unknown): GenRequest | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<GenRequest>;

  return normalizeGenRequest({
    recipient: (raw.recipient || "outro") as GenRecipient,
    name: String(raw.name || ""),
    senderName: raw.senderName ? String(raw.senderName) : undefined,
    relationship: raw.relationship ? String(raw.relationship) : undefined,
    occasion: raw.occasion ? String(raw.occasion) : undefined,
    sharedMemory: raw.sharedMemory ? String(raw.sharedMemory) : undefined,
    messageStart: raw.messageStart ? String(raw.messageStart) : undefined,
    premiumMessage: Boolean(raw.premiumMessage),
    shouldSignMessage: Boolean(raw.shouldSignMessage),
    intention: String(raw.intention || raw.sharedMemory || ""),
    tone: (raw.tone || "emocionante") as GenTone,
    length: (raw.length || "média") as GenLength,
  });
}

function base64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function readFirebaseServiceAccount():
  | { project_id?: string; client_email: string; private_key: string; token_uri?: string }
  | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch (error) {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON invalido", error);
      return null;
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
      token_uri: "https://oauth2.googleapis.com/token",
    };
  }

  return null;
}

async function getFirebaseAccessToken(
  serviceAccount: { client_email: string; private_key: string; token_uri?: string },
): Promise<string> {
  const nowMs = Date.now();
  if (cachedFirebaseToken && cachedFirebaseToken.expiresAt > nowMs + 60_000) {
    return cachedFirebaseToken.token;
  }

  const now = Math.floor(nowMs / 1000);
  const tokenUri = serviceAccount.token_uri || "https://oauth2.googleapis.com/token";
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(serviceAccount.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Firebase token failed: ${response.status}`);
  }

  const data = await response.json();
  cachedFirebaseToken = {
    token: data.access_token,
    expiresAt: nowMs + Math.max(60, Number(data.expires_in || 3600) - 120) * 1000,
  };
  return cachedFirebaseToken.token;
}

function decodeFirestoreValue(value: any): any {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map((item: any) => decodeFirestoreValue(item));
  }
  return undefined;
}

function decodeBookSource(row: any): BookSource | null {
  const fields = row?.document?.fields;
  if (!fields) return null;

  const active = decodeFirestoreValue(fields.active);
  if (active === false) return null;

  const content = String(decodeFirestoreValue(fields.content) || "").trim();
  if (content.length < 40) return null;

  return {
    title: String(decodeFirestoreValue(fields.title) || "Trecho sem titulo"),
    category: String(decodeFirestoreValue(fields.category) || "geral"),
    content,
    tags: Array.isArray(decodeFirestoreValue(fields.tags))
      ? decodeFirestoreValue(fields.tags)
      : [],
    tone: String(decodeFirestoreValue(fields.tone) || "autoral e emocional"),
  };
}

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isBookSourceAllowed(source: BookSource, universe: ServerUniverse): boolean {
  const searchable = [
    source.title,
    source.category,
    source.tags.join(" "),
    source.tone,
    source.content,
  ].join(" ");
  return isAllowedForServerUniverse(searchable, universe);
}

function scoreBookSource(source: BookSource, prompt: string, universe: ServerUniverse): number {
  const searchable = normalizeForSearch(
    `${source.title} ${source.category} ${source.tags.join(" ")} ${source.tone} ${source.content}`,
  );
  const promptText = normalizeForSearch(prompt);
  const keywords = universe.allowed.map((term) => normalizeForSearch(term));

  return keywords.reduce((score, keyword) => {
    if (!keyword) return score;
    if (promptText.includes(keyword) && searchable.includes(keyword)) return score + 4;
    if (searchable.includes(keyword)) return score + 2;
    return score;
  }, 0);
}

const SOURCE_VOICE_STOPWORDS = new Set([
  "a",
  "ao",
  "aos",
  "as",
  "com",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "entre",
  "essa",
  "esse",
  "esta",
  "este",
  "isso",
  "mais",
  "minha",
  "meu",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "por",
  "que",
  "sem",
  "ser",
  "sua",
  "seu",
  "uma",
  "voce",
]);

const SOURCE_METAPHOR_TERMS = [
  "abrigo",
  "caminho",
  "casa",
  "cicatriz",
  "cuidado",
  "estrada",
  "janela",
  "luz",
  "memoria",
  "passo",
  "presenca",
  "raiz",
  "silencio",
  "tempo",
];

function collectSafeSignals(values: string[], universe: ServerUniverse, limit: number): string[] {
  const seen = new Set<string>();
  const signals: string[] = [];

  for (const value of values) {
    const signal = value.replace(/\s+/g, " ").trim();
    const key = normalizeForSearch(signal);
    if (!signal || signal.length < 3 || signal.length > 70) continue;
    if (SOURCE_VOICE_STOPWORDS.has(key)) continue;
    if (!isAllowedForServerUniverse(signal, universe)) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    signals.push(signal);
    if (signals.length >= limit) break;
  }

  return signals;
}

function collectFrequentSourceWords(content: string, universe: ServerUniverse, limit: number): string[] {
  const counts = new Map<string, number>();
  const words = normalizeForSearch(content)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    if (word.length < 4) continue;
    if (SOURCE_VOICE_STOPWORDS.has(word)) continue;
    if (!isAllowedForServerUniverse(word, universe)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, limit);
}

function buildBookSourceVoiceContext(source: BookSource, index: number, universe: ServerUniverse): string {
  const metadata = collectSafeSignals(
    [source.category, source.tone, ...source.tags],
    universe,
    8,
  );
  const words = collectFrequentSourceWords(source.content, universe, 10);
  const metaphors = words.filter((word) =>
    SOURCE_METAPHOR_TERMS.some((image) => word.includes(image)),
  );

  return [
    `${index + 1}. Fonte dinamica: ${source.title}`,
    `Sinais tematicos compativeis: ${metadata.join(", ") || universe.allowed.join(", ")}.`,
    `Palavras recorrentes seguras: ${words.join(", ") || universe.allowed.join(", ")}.`,
    `Metaforas/imagens permitidas: ${(metaphors.length ? metaphors : universe.allowed).slice(0, 6).join(", ")}.`,
    "Aplicacao: usar estes dados apenas como perfil de voz. Nao copiar frases, trechos ou explicacoes da fonte.",
  ].join("\n");
}

async function fetchBookSources(prompt: string, universe: ServerUniverse): Promise<BookSource[]> {
  const serviceAccount = readFirebaseServiceAccount();
  if (!serviceAccount) return [];

  const projectId =
    serviceAccount.project_id ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return [];

  const token = await getFirebaseAccessToken(serviceAccount);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: BOOK_COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: "active" },
            op: "EQUAL",
            value: { booleanValue: true },
          },
        },
        limit: 80,
      },
    }),
  });

  if (!response.ok) {
    console.error("Firestore book_sources query failed", {
      status: response.status,
      body: await response.text().catch(() => ""),
    });
    return [];
  }

  const rows = await response.json();
  return (Array.isArray(rows) ? rows : [])
    .map(decodeBookSource)
    .filter((source: BookSource | null): source is BookSource => source !== null)
    .filter((source) => isBookSourceAllowed(source, universe))
    .sort((a: BookSource, b: BookSource) => scoreBookSource(b, prompt, universe) - scoreBookSource(a, prompt, universe))
    .slice(0, 6);
}

async function enrichPromptWithBookSources(prompt: string, request: GenRequest): Promise<string> {
  try {
    const universe = resolveServerUniverse(request);
    const sources = await fetchBookSources(prompt, universe);
    if (sources.length === 0) return prompt;

    let used = 0;
    const context = sources
      .map((source, index) => {
        const profile = buildBookSourceVoiceContext(source, index, universe);
        used += profile.length;
        if (used > MAX_BOOK_CONTEXT_CHARS) return "";
        return profile;
      })
      .filter(Boolean)
      .join("\n\n");

    if (!context) return prompt;

    const enriched = `
Base dinamica do Firestore (colecao book_sources) convertida em perfil de voz.
Universo emocional ativo: ${universe.label}.
Use estes sinais apenas como estilo, ritmo, vocabulario e metaforas dentro desse universo.
O universo emocional do pedido define a categoria. A base dinamica nao pode alterar essa categoria.
Nao copie frases, trechos ou explicacoes da fonte. Nao cite livros, Firestore, base, prompt ou IA.

${context}

Pedido original do usuário:
${prompt}
`.trim();

    return enriched.length > MAX_ENRICHED_PROMPT_LENGTH
      ? enriched.slice(0, MAX_ENRICHED_PROMPT_LENGTH)
      : enriched;
  } catch (error) {
    console.error("Erro ao enriquecer prompt com book_sources", error);
    return prompt;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  const body = parseBody(req);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const structuredRequest = parseGenerationRequest(body.generationRequest) || parseStructuredPrompt(prompt);

  if (!prompt) {
    return res.status(400).json({ error: "Prompt obrigatorio." });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(413).json({ error: "Prompt muito grande." });
  }

  if (!GEMINI_API_KEY) {
    return res.status(200).json({
      text: buildLocalFallbackMessage(structuredRequest),
      fallback: true,
    });
  }

  const ip = getIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: "Muitas tentativas. Aguarde um minuto e tente novamente.",
    });
  }

  try {
    const finalPrompt = await enrichPromptWithBookSources(prompt, structuredRequest);
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: finalPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens:
              structuredRequest.messageStart || structuredRequest.premiumMessage ? 560 : 420,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      console.error("Gemini request failed", {
        status: geminiResponse.status,
        body: await geminiResponse.text().catch(() => ""),
      });
      return res.status(502).json({
        error: "Nao consegui gerar a mensagem agora.",
      });
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return res.status(502).json({
        error: "A resposta do Gemini veio vazia.",
      });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Gemini server error", error);
    return res.status(500).json({
      error: "Erro interno ao gerar mensagem.",
    });
  }
}
