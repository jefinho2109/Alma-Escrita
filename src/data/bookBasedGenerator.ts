import { generateAIMsg } from "@/lib/gemini";
import {
  AUTHOR_VOICE_SEEDS,
  AUTHOR_VOICE_STATS,
  GENERIC_PHRASE_BLOCKLIST,
  GOLDEN_SEEDS,
  buildAuthorVoiceContext,
  findAuthorVoiceSeeds,
  type AuthorVoiceSeed,
} from "@/data/authorVoiceKnowledge";
import {
  type GenRequest,
  type GenTone,
  normalizeGenRequest,
} from "@/data/generator";

const toneToCategory: Record<GenTone, string> = {
  romântica: "amor",
  emocionante: "identidade emocional",
  fé: "fé",
  gratidão: "gratidão",
  perdão: "recomeço",
  saudade: "saudade",
  motivacional: "coragem",
  reflexão: "silêncio e identidade",
};

const lengthGuidance: Record<GenRequest["length"], string> = {
  curta: "45 a 70 palavras",
  média: "80 a 120 palavras",
  longa: "130 a 180 palavras",
};

const BLOCKED_PHRASES = [
  ...GENERIC_PHRASE_BLOCKLIST,
  "eu guardei com cuidado",
  "existe uma verdade por trás disso",
  "eu aprendi a não apressar",
  "eu não quero enfeitar a dor",
  "eu precisava transformar em palavra",
  "que estas palavras cheguem como abraço",
  "quando a alma fala com amor",
  "é importante lembrar",
  "nesta jornada",
  "te convido a refletir",
  "a vida é uma montanha-russa",
  "no final, tudo dá certo",
  "acredite no seu potencial",
  "você é capaz de conquistar",
  "siga em frente",
  "nunca desista dos seus sonhos",
  "o universo conspira a seu favor",
  "tudo tem um motivo",
  "confie no processo",
  "há sentimentos que ficam maiores quando são escritos com alma",
  "o tom que nasce aqui",
  "amizade não aparece aqui como ideia distante",
  "caminho possível",
  "forma de dizer presença",
  "lugar especial",
  "ilumina os dias",
  "esta mensagem",
  "estas palavras",
  "texto",
  "tom",
  "narrativa",
  "escrevo",
  "escrita",
  "mensagem",
  "palavras",
  "poesia",
  "o que tento dizer",
  "entrego estas palavras",
  "não escrevo para impressionar",
  "oração pequena",
  "receba isso",
  "entrego esta mensagem",
  "quero dizer",
  "quero expressar",
  "sinto necessidade de dizer",
  "para que você sinta",
  "verdade simples",
  "cuidado que existe aqui",
  "escrevo para que você sinta",
  "frase pronta",
  "poucas linhas",
  "resumir tudo",
  "esta versão nasce",
  "tom poético",
  "diferente da anterior",
  "por outro caminho",
  "poesia quieta",
  "cada palavra procura",
  "alma, verdade e ternura",
  "eu te escrevo",
  "só palavra",
  "três palavras",
  "dizer presença",
  "quando penso em esse amor",
  "em esse amor",
  "presença faz toda diferença",
  "esse momento me lembra",
  "amar é escrever cuidado",
  "escolho te entregar presença",
  "não precisa se repetir para permanecer",
] as const;

const simpleTextCorrections: Array<[RegExp, string]> = [
  [/\bvc\b/gi, "você"],
  [/\bvoce\b/gi, "você"],
  [/\bnao\b/gi, "não"],
  [/\bta\b/gi, "está"],
  [/\bto\b/gi, "estou"],
  [/\bpra\b/gi, "para"],
  [/\bpro\b/gi, "para o"],
  [/\bpq\b/gi, "porque"],
  [/\bq\b/gi, "que"],
  [/\bmt\b|\bmto\b/gi, "muito"],
  [/\btbm\b/gi, "também"],
  [/\bagente\b/gi, "a gente"],
  [/\bcoracao\b/gi, "coração"],
  [/\bfe\b/gi, "fé"],
  [/\bperdao\b/gi, "perdão"],
  [/\bmae\b/gi, "mãe"],
  [/\birmao\b/gi, "irmão"],
  [/\birma\b/gi, "irmã"],
  [/\bsaudadee+\b/gi, "saudade"],
];

const fallbackOpenings = {
  self: [
    "Hoje eu me escuto com mais verdade e menos cobrança.",
    "Eu volto para dentro de mim como quem acende uma luz pequena, mas sincera.",
    "Tem dias em que a alma só precisa ser tratada com presença.",
  ],
  named: [
    "uma das coisas que mais admiro em você é a forma como consegue trazer calma aos dias difíceis.",
    "quando penso nos momentos que vivemos, lembro da força e da bondade que você demonstra nas pequenas atitudes.",
    "há laços que ficam maiores quando a vida nos testa de verdade.",
    "trago no peito a certeza de que sua presença faz toda a diferença no meu caminho.",
  ],
};

const bridgeSentences = [
  "O que sinto precisa respirar com ternura, verdade e um pouco de silêncio.",
  "Dentro desse sentimento existe cuidado, existe escolha e existe uma forma bonita de permanecer.",
  "A vida me ensinou que o que é profundo não precisa repetir caminhos: encontra uma forma nova de chegar.",
  "Entre o que a alma sente e a vida nos mostra, escolho te entregar presença.",
  "Que cada gesto carregue intenção, memória boa e carinho vivo.",
];

const closingSentences = [
  "Que fique em você o essencial: meu carinho é presença, não aparência.",
  "Que a paz e o cuidado que sinto por você permaneçam no seu coração.",
  "E que o seu coração sinta todo o afeto que tenho por você.",
  "Fica aqui meu afeto, simples por fora e profundo por dentro.",
  "Que este carinho encontre em você um lugar bonito para permanecer.",
];

const variationStyles = [
  "romântico",
  "profundo",
  "simples",
  "poético",
  "espiritual",
  "motivacional",
  "carta curta",
  "declaração intensa",
] as const;

type VariationStyle = (typeof variationStyles)[number];

const styleSentences: Record<VariationStyle, string[]> = {
  romântico: [
    "Quando penso nesse amor, percebo que amar também é cuidar dos silêncios e dos pequenos gestos do dia a dia.",
    "Meu carinho aparece nos detalhes, como quem escolhe permanecer mesmo quando nada exige espetáculo.",
  ],
  profundo: [
    "Há uma profundidade mansa nesse sentimento: ele não pede palco, pede verdade.",
    "O que sinto desce além da superfície e encontra um lugar onde a alma reconhece presença.",
  ],
  simples: [
    "Eu só queria que você sentisse, sem exagero, que existe um carinho real e constante em tudo que fazemos.",
    "Às vezes o mais bonito é dizer o essencial com calma, sem enfeitar demais o coração.",
  ],
  poético: [
    "Esse sentimento chega como luz baixa na janela da alma, sem pressa, mas inteiro.",
    "Há uma beleza quieta em tudo que é verdadeiro: ela toca sem empurrar e fica sem prender.",
  ],
  espiritual: [
    "Que Deus cuide do que o meu afeto não alcança e faça esse cuidado chegar com paz.",
    "Deixo este carinho como um pedido sereno, para que ele encontre o lugar certo no seu coração.",
  ],
  motivacional: [
    "Mesmo nos dias difíceis, esse sentimento me lembra que ainda existe beleza em cuidar e continuar.",
    "Que este apoio levante algo bom dentro de você, como força serena para seguir com o coração mais leve.",
  ],
  "carta curta": [
    "Meu cuidado por você chega limpo, direto e verdadeiro, atravessando qualquer distância.",
    "Meu carinho por você é inteiro, direto e verdadeiro, sem precisar de rodeios.",
  ],
  "declaração intensa": [
    "O que sinto não passa pela superfície; chega inteiro, firme e cheio de presença.",
    "Existe uma intensidade bonita aqui, dessas que não precisam gritar para serem inesquecíveis.",
  ],
};

const similarityStopwords = new Set([
  "a",
  "o",
  "e",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "um",
  "uma",
  "que",
  "com",
  "para",
  "por",
  "se",
  "eu",
  "voce",
  "você",
  "isso",
  "esse",
  "essa",
  "como",
  "mais",
  "meu",
  "minha",
]);

const recentGeneratedMessages: string[] = [];

const intentionToCategory: Array<[RegExp, string]> = [
  [/m[aã]e|colo|materno/i, "mãe"],
  [/pai|paterno/i, "pai"],
  [/esposa|marido|namorad|amor|declara/i, "amor"],
  [/saudade|falta|dist[aâ]ncia|luto|perda|aus[eê]ncia/i, "saudade"],
  [/abandono|sozinh|rejei[cç][aã]o/i, "abandono"],
  [/perd[aã]o|desculpa|m[aá]goa|cura/i, "perdão"],
  [/recome[cç]|novo|levantar|transforma/i, "recomeço"],
  [/sil[eê]ncio|calad|quiet/i, "silêncio"],
  [/identidade|verdade|m[aá]scara|quem sou/i, "identidade"],
  [/prop[oó]sito|sonho|sentido|caminho/i, "propósito"],
  [/f[eé]|ora[cç][aã]o|deus|b[eê]n[cç][aã]o|esperan[cç]a/i, "fé"],
  [/for[cç]a|coragem|resili[eê]ncia|luta|imposs[ií]vel/i, "coragem"],
  [/gratid[aã]o|agradec|obrigad/i, "gratidão"],
];

function inferCategory(intention: string, tone: GenTone): string {
  const found = intentionToCategory.find(([pattern]) => pattern.test(intention));
  return found ? found[1] : toneToCategory[tone];
}

function containsGenericPhrase(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return BLOCKED_PHRASES.some((phrase) =>
    normalized.includes(
      phrase
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    ),
  );
}

function cleanGeneratedText(text: string): string {
  return text
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createGenerationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: string): () => number {
  let state = hashString(seed) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function applySimpleCorrections(value: string): string {
  const corrected = simpleTextCorrections.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value.replace(/\s+/g, " ").trim(),
  );

  return corrected.replace(/\s+([,.!?;:])/g, "$1").trim();
}

function normalizePersonName(value: string): string {
  return applySimpleCorrections(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1).toLocaleLowerCase("pt-BR"),
    )
    .join(" ");
}

function prepareRequest(request: GenRequest): GenRequest {
  const data = normalizeGenRequest(request);

  return {
    ...data,
    name: normalizePersonName(data.name),
    intention: applySimpleCorrections(data.intention),
    generationId: data.generationId || createGenerationId(),
    previousMessages: (data.previousMessages || [])
      .map(cleanGeneratedText)
      .filter(Boolean)
      .slice(0, 6),
  };
}

function normalizeForSimilarity(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !similarityStopwords.has(word));
}

function isTooSimilarToPrevious(text: string, previousMessages: string[] = []): boolean {
  const normalizedText = cleanGeneratedText(text);
  const words = new Set(normalizeForSimilarity(normalizedText));
  if (words.size === 0) return false;

  return previousMessages.some((previous) => {
    const normalizedPrevious = cleanGeneratedText(previous);
    if (!normalizedPrevious) return false;

    const a = normalizedText
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const b = normalizedPrevious
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (a === b) return true;
    if (a.slice(0, 80) === b.slice(0, 80)) return true;

    const previousWords = new Set(normalizeForSimilarity(previous));
    const intersection = [...words].filter((word) => previousWords.has(word)).length;
    const union = new Set([...words, ...previousWords]).size;
    return union > 0 && intersection / union > 0.72;
  });
}

function styleForGeneration(generationId: string): VariationStyle {
  return variationStyles[hashString(generationId) % variationStyles.length]!;
}

function rememberGeneratedMessage(text: string): string {
  const cleaned = cleanGeneratedText(text);
  if (!cleaned) return cleaned;

  recentGeneratedMessages.unshift(cleaned);
  const unique = new Set<string>();
  for (let i = recentGeneratedMessages.length - 1; i >= 0; i -= 1) {
    const message = recentGeneratedMessages[i]!;
    const key = message
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (unique.has(key)) {
      recentGeneratedMessages.splice(i, 1);
    } else {
      unique.add(key);
    }
  }
  recentGeneratedMessages.splice(8);
  return cleaned;
}

function mergePreviousMessages(data: GenRequest): string[] {
  return [...(data.previousMessages || []), ...recentGeneratedMessages]
    .map(cleanGeneratedText)
    .filter(Boolean)
    .slice(0, 8);
}

function destinationFor(data: GenRequest): string {
  if (data.recipient === "mim") return "a própria pessoa que está escrevendo";
  if (data.name) return `${data.recipient} chamada ${data.name}`;
  return data.recipient;
}

function selectAuthorSeeds(data: GenRequest): AuthorVoiceSeed[] {
  const rng = createRng(`${data.generationId || createGenerationId()}-seeds`);
  
  // Prioriza o campo relationship (novo) sobre recipient (legado) para filtrar seeds
  const targetRecipient = (data.relationship || data.recipient).toLowerCase();
  
  const ranked = findAuthorVoiceSeeds({
    intention: `${data.intention} ${inferCategory(data.intention, data.tone)}`,
    tone: data.tone,
    recipient: targetRecipient,
    sharedMemory: data.sharedMemory, // PASSANDO A MEMÓRIA PARA O SCORE
    limit: 24,
  });

  if (ranked.length === 0 && AUTHOR_VOICE_SEEDS.length === 0) {
    console.warn(
      "[Alma Escrita] Nenhuma base autoral local foi encontrada em authorVoiceKnowledge.ts. Usando fallback temporário variado.",
    );
    return [];
  }

  const relevant = ranked.length > 0 ? ranked : AUTHOR_VOICE_SEEDS;
  const head = relevant.slice(0, 8);
  const tail = shuffle(relevant.slice(8), rng).slice(0, 8);
  return shuffle([...head, ...tail], rng).slice(0, 10);
}

function shuffle<T>(values: T[], rng: () => number = Math.random): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function pick<T>(values: readonly T[], rng: () => number = Math.random): T {
  return values[Math.floor(rng() * values.length)]!;
}

function sentenceCase(value: string): string {
  return value.replace(/^./, (char) => char.toLocaleUpperCase("pt-BR"));
}

function stripFinalPunctuation(value: string): string {
  return value.replace(/[.!?]+$/g, "").trim();
}

function lowerFirst(value: string): string {
  return value.replace(/^./, (char) => char.toLocaleLowerCase("pt-BR"));
}

function summarizeIntention(data: GenRequest): string {
  const intention = data.intention.trim();
  const normalized = intention
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!intention) return "o que está vivo dentro de mim";
  if (/amo|amor|amar|paixao|paix/.test(normalized)) return "esse amor";
  if (/saudade|falta|longe|distancia/.test(normalized)) return "essa saudade";
  if (/perdao|desculpa|magoa|perdo|erro/.test(normalized)) return "esse pedido de perdão e o reconhecimento do meu erro";
  if (/obrigad|gratidao|grato|grata/.test(normalized)) return "essa gratidão";
  if (/fe|deus|oracao|bencao|esperanca/.test(normalized)) return "essa fé";
  if (/forca|coragem|luta|recomec/.test(normalized)) return "essa vontade de recomeçar";
  return `esse sentimento por você`;
}

function buildAddress(data: GenRequest): string {
  if (data.recipient === "mim") return "Hoje";
  if (data.name) return data.name;
  return data.recipient.charAt(0).toLocaleUpperCase("pt-BR") + data.recipient.slice(1);
}

function buildOpening(data: GenRequest, rng: () => number, style: VariationStyle): string {
  if (data.recipient === "mim") return pick(fallbackOpenings.self, rng);

  const address = buildAddress(data);
  const feeling = summarizeIntention(data);
  const variants = [
    `${address}, ${pick(fallbackOpenings.named, rng)}`,
    `${address}, quando penso em ${feeling}, percebo o quanto sua presença faz toda a diferença.`,
    `${address}, uma das coisas que mais admiro em você é a forma como traz calma aos dias difíceis.`,
    `${address}, o que trago no peito é a certeza de que nosso laço é forte e verdadeiro.`,
    `${address}, lembro com carinho dos momentos em que sua força me ajudou a seguir em frente.`,
  ];
  return pick(variants, rng);
}

function pickSeedImage(seed: AuthorVoiceSeed, rng: () => number): string {
  const preferred = seed.vocabulary.filter((word) =>
    /alma|caminho|cicatriz|hoje|oraç|sil[eê]ncio|presen|verdade|amor|coraç|luz|abraç|cuidado|vida|sonho|tempo|f[eé]|força/i.test(word),
  );
  const usable = seed.vocabulary.filter((word) => {
    const normalized = word
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return word.length > 3 && !["livro", "sobre", "forma", "minhas", "todos"].includes(normalized);
  });

  return pick(
    preferred.length > 0
      ? preferred
      : usable.length > 0
        ? usable
        : ["alma", "caminho", "silêncio", "presença", "verdade"],
    rng,
  );
}

function isEmotionalAnchor(text: string): boolean {
  const normalized = text.toLowerCase();
  // Se for curto e contiver declarações diretas, é uma âncora emocional, não um relato de fato.
  const isShort = text.split(/\s+/).length < 15;
  const hasDeclaration = /você é|amo|sou grato|me faz feliz|motivo do meu|te amo/i.test(normalized);
  return isShort && hasDeclaration;
}

function buildSeedSentence(
  seed: AuthorVoiceSeed | undefined,
  data: GenRequest,
  rng: () => number,
  style: VariationStyle,
  index: number,
): string {
  if (!seed) return pick(bridgeSentences, rng);

  // REGRA DE OURO: Tratar detalhes emocionais como âncora, sem inventar fatos.
  if (data.sharedMemory) {
    if (isEmotionalAnchor(data.sharedMemory)) {
      const anchorVariants = [
        `Tem uma verdade simples que carrego comigo: ${data.sharedMemory}.`,
        `Sempre levo no peito a certeza de que ${data.sharedMemory}.`,
        `Guardo como um tesouro o fato de que ${data.sharedMemory}.`,
      ];
      return pick(anchorVariants, rng);
    } else {
      const factVariants = [
        `Lembro-me concretamente de ${data.sharedMemory}, e é por isso que nosso laço é tão valioso.`,
        `Quando penso em ${data.sharedMemory}, percebo o quanto isso marcou a minha vida e a nossa relação.`,
        `Nunca vou esquecer de ${data.sharedMemory}. Foi ali que eu entendi o tamanho do seu cuidado.`,
      ];
      return pick(factVariants, rng);
    }
  }

  // CORREÇÃO DEFINITIVA: Removido o uso de seed.impact e seed.reflection para evitar injeção de frases prontas dos livros.
  // O fallback agora usa apenas estruturas neutras que forçam o foco na relação e no destinatário, sem conclusões poéticas prontas.
  const variants = [
    `Esse momento me faz valorizar ainda mais o que temos, e isso ganha um significado especial entre nós.`,
    `Entre o cuidado e o que sentimos, eu escolho valorizar cada instante ao seu lado.`,
    `Fica uma certeza serena: é com essa delicadeza que quero honrar nosso laço e reafirmar o que sinto por você.`,
    `O que sinto é genuíno; por isso busco chegar até você com respeito e verdade todos os dias.`,
    `Nossa conexão se mostra no dia a dia, através de gestos simples e de um apoio real que não precisa de grandes discursos.`,
  ];

  return variants[index % variants.length];
}

function buildClosing(seed: AuthorVoiceSeed | undefined, data: GenRequest, rng: () => number): string {
  const shouldUseFfp = /fé|motivacional|reflexão|perdão/.test(data.tone) || /f[eé]|luta|cansa|recome/i.test(data.intention);
  
  // CORREÇÃO DEFINITIVA: Removidas conclusões poéticas prontas ("amor mostrando em silêncio").
  // O fechamento agora é estrutural e focado no vínculo com o destinatário.
  const variants = [
    pick(closingSentences, rng),
    `Que esse laço seja um motivo real para você sentir cuidado e proteção no dia a dia.`,
    shouldUseFfp
      ? "Que a fé, a força e a paciência continuem sustentando o que construímos juntos."
      : `Que você sinta, em cada detalhe do seu dia, o tamanho do que sinto por você, ${data.name || "meu bem"}.`,
    data.name
      ? `${data.name}, que você receba este carinho como algo genuíno, que se renova a cada dia ao seu lado.`
      : "Que o coração encontre descanso e renovação, sabendo que há alguém torcendo por você.",
  ];

  return pick(variants, rng);
}

function buildGoldenFallbackSentence(data: GenRequest, rng: () => number): string {
  const golden = GOLDEN_SEEDS[Math.floor(rng() * GOLDEN_SEEDS.length)]!;
  const variants = [
    golden.reflection,
    golden.impact,
    `A ${golden.theme.split(" ")[0].toLowerCase()} não é sobre perfeição, é sobre ${golden.vocabulary.slice(0, 2).join(" e ")}.`,
  ];
  return pick(variants, rng);
}

function buildFallback(request: GenRequest, seeds: AuthorVoiceSeed[]): string {
  const data = prepareRequest(request);
  const selected = seeds.length > 0 ? seeds : selectAuthorSeeds(data);
  const rng = createRng(`${data.generationId}-fallback`);
  const retryRng = createRng(`${data.generationId}-fallback-retry`);
  const style = styleForGeneration(data.generationId || createGenerationId());
  
  const sentences = [
    buildOpening(data, rng, style),
    selected[0] ? buildSeedSentence(selected[0], data, rng, style, Math.floor(rng() * 6)) : buildGoldenFallbackSentence(data, rng),
    selected[1] ? buildSeedSentence(selected[1], data, rng, style, Math.floor(rng() * 6) + 1) : buildGoldenFallbackSentence(data, rng),
    pick(bridgeSentences, rng),
    buildClosing(selected[2], data, rng),
  ];

  const count = data.length === "curta" ? 2 : data.length === "média" ? 4 : 5;
  const middle = shuffle(sentences.slice(1, -1), rng);
  const selectedSentences =
    count === 2
      ? [sentences[0]!, middle[0] || sentences[1]!]
      : [sentences[0]!, ...middle.slice(0, count - 2), sentences[sentences.length - 1]!];
  const text = cleanGeneratedText(selectedSentences.join(" "));

  return containsGenericPhrase(text) || isTooSimilarToPrevious(text, data.previousMessages)
    ? cleanGeneratedText(
        [
          buildOpening(data, retryRng, style),
          pick(styleSentences[style], retryRng),
          selected[3] ? buildSeedSentence(selected[3], data, retryRng, style, Math.floor(retryRng() * 6) + 2) : buildGoldenFallbackSentence(data, retryRng),
          buildClosing(selected[4], data, retryRng),
        ]
          .slice(0, count)
          .join(" "),
      )
    : text;
}

export async function generateBookBasedMessage(
  request: GenRequest,
): Promise<string> {
  const prepared = prepareRequest(request);
  const data = {
    ...prepared,
    previousMessages: mergePreviousMessages(prepared),
  };
  const category = inferCategory(data.intention, data.tone);
  
  const seeds = selectAuthorSeeds(data);
  const authorContext = buildAuthorVoiceContext(seeds);
  const generationId = data.generationId || createGenerationId();
  const style = styleForGeneration(generationId);
  const previousMessages = (data.previousMessages || [])
    .map((message, index) => `${index + 1}. ${message}`)
    .join("\n");
  const blockedPhrases = BLOCKED_PHRASES.map(
    (phrase) => `- "${phrase}"`,
  ).join("\n");

  // LOGS DE AUDITORIA AUTORAL (EXATAMENTE COMO SOLICITADO)
  console.log("[DEBUG AUTORAL] Seeds escolhidas:", seeds.slice(0, 3).map(s => s.id).join(", "));
  console.log("[DEBUG AUTORAL] Temas:", seeds.slice(0, 3).map(s => s.themes.join(", ")).join(" | "));
  console.log("[DEBUG AUTORAL] Reflexões (OCULTAS DO PROMPT, mas presentes nas seeds):", seeds.slice(0, 3).map(s => s.reflection).join(" | "));
  console.log("[DEBUG AUTORAL] Trechos enviados ao prompt (apenas ingredientes, SEM reflexões):", authorContext.substring(0, 400) + "...");
  console.log("[DEBUG AUTORAL] Memória/Detalhes do usuário:", data.sharedMemory || "Nenhum");

  const prompt = `
Você é a voz autoral do app Alma Escrita Oficial, encarnando a identidade do Poeta Sonhador.

HIERARQUIA ABSOLUTA DE CONTEÚDO (REGRA 80/20):
1. OCASIÃO: Define o propósito central e inegociável da mensagem.
2. RELAÇÃO: Define o tom e os limites (ex: Pai para Filho = proteção, responsabilidade, legado; NUNCA romance).
3. MEMÓRIA/DETALHES: Fornece os fatos concretos para ancorar a mensagem.
4. VOZ AUTORAL: Apenas 20% do texto, servindo como tempero de ritmo e emoção, NUNCA dominando o propósito da ocasião.

REGRAS ABSOLUTAS (VIOLAÇÃO = FALHA CRÍTICA):
1. A IA NÃO EXISTE. Você é o Remetente falando diretamente com o Destinatário.
2. DOMÍNIO ABSOLUTO DA OCASIÃO: Se a Ocasião for "Pedido de desculpas" ou similar, a mensagem DEVE conter explicitamente: reconhecimento do erro, arrependimento sincero, pedido de perdão e responsabilidade. É ESTRITAMENTE PROIBIDO transformar um pedido de desculpas em declaração de amor romântico, homenagem ou mensagem genérica de carinho.
   - Exemplo para Pedido de Desculpas (Pai para Filho): "Jordan, quero reconhecer que errei e peço perdão por isso. Como pai, assumo minha responsabilidade e prometo fazer diferente, porque nosso laço é o que mais importa para mim."
3. PROIBIDO COPIAR REFLEXÕES: O contexto autoral abaixo fornece APENAS ingredientes (temas, vocabulário, tom). É ESTRITAMENTE PROIBIDO copiar, parafrasear ou usar as frases de reflexão/impacto completas dos livros. Construa as frases do zero usando os dados do usuário.
4. RESPEITO ABSOLUTO AO RELACIONAMENTO: Adapte totalmente o tom à relação informada.
5. É ESTRITAMENTE PROIBIDO falar sobre o ato de escrever ou sobre o próprio texto. NUNCA use: "escrevo", "escrita", "mensagem", "palavras", "texto", "narrativa", "tom", "carta", "oração", "receba isso", "entrego esta mensagem", "quero dizer", "quero expressar", "sinto necessidade de dizer", "para que você sinta", "cuidado que existe aqui", "não escrevo para impressionar".
6. REGRA DA ÂNCORA: Se o campo "Memória/Detalhes" contiver uma declaração emocional (ex: "você é o motivo do meu melhor sorriso"), use essa frase EXATAMENTE ou adaptada naturalmente como o centro da mensagem. NÃO invente fatos, locais ou acontecimentos que o usuário não informou.
   - ERRADO (Inventando fatos): "Lembro daquele dia no hospital..." (se o usuário só disse "você me faz feliz").
   - CERTO (Usando a âncora): "Tem uma verdade simples que carrego comigo: você é o motivo do meu melhor sorriso. Em muitos dias, basta lembrar do seu jeito para meu coração encontrar paz."
7. Se o campo contiver um relato de fato concreto, use os detalhes desse fato como centro da narrativa.

Dados do pedido:
- Quem envia: ${data.senderName || "Alguém que te quer bem"}
- Quem recebe: ${data.name || data.recipient}
- Relação: ${data.relationship || data.recipient}
- Ocasião: ${data.occasion || data.intention}
- Memória ou detalhe especial: ${data.sharedMemory || "Foque na essência e nos detalhes concretos da relação."}
- Tom escolhido: ${data.tone}
- Tamanho escolhido: ${data.length} (${lengthGuidance[data.length]})

Base autoral (APENAS INGREDIENTES DE ESTILO):
- Use APENAS o vocabulário, os temas e o padrão narrativo abaixo como inspiração de ritmo e tom.
- NÃO use frases de reflexão ou impacto completas.

${authorContext}

Método autoral obrigatório:
- Comece DIRETAMENTE tratando a pessoa pelo nome ou pelo vínculo, integrando a memória/detalhe fornecido.
- Incorpore o FFP (Fé, Força, Paciência) como a espinha dorsal invisível da mensagem, não como um slogan.
- Termine com uma frase marcante, madura e humana, reafirmando o vínculo.

Mensagens anteriores que NÃO devem ser repetidas nem parafraseadas de perto:
${previousMessages || "- nenhuma nesta sessão"}

Regras de escrita:
- Escreva em português do Brasil.
- Escreva em primeira pessoa (eu) falando diretamente com a pessoa (você).
- Não use tom de autoajuda genérica.
- Não copie trechos longos literalmente dos livros.
- Não cite "base", "seed", "livro", "poema", "IA", "Gemini" ou "prompt".
- Não use título.
- Não use lista.
- Entregue SOMENTE o texto final. Nada de comentários antes ou depois.

Frases proibidas (bloqueio rigoroso):
${blockedPhrases}
`.trim();

  try {
    const aiText = cleanGeneratedText(await generateAIMsg(prompt));
    const finalText = containsGenericPhrase(aiText) ||
      isTooSimilarToPrevious(aiText, data.previousMessages)
      ? buildFallback(data, seeds)
      : aiText;
    return rememberGeneratedMessage(finalText);
  } catch (error) {
    console.warn("IA indisponível, usando base autoral local:", error);
    return rememberGeneratedMessage(buildFallback(data, seeds));
  }
}
