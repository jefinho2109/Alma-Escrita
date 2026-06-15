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
  if (/perdao|desculpa|magoa|perdo/.test(normalized)) return "esse pedido de paz";
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

function buildSeedSentence(
  seed: AuthorVoiceSeed | undefined,
  data: GenRequest,
  rng: () => number,
  style: VariationStyle,
  index: number,
): string {
  const feeling = summarizeIntention(data);
  if (!seed) return pick(bridgeSentences, rng);

  const emotion = pick(seed.emotions.length > 0 ? seed.emotions : [data.tone], rng);
  const image = pickSeedImage(seed, rng);
  const reflection = stripFinalPunctuation(seed.reflection);
  const impact = stripFinalPunctuation(seed.impact);
  const styleLine = pick(styleSentences[style], rng);

  // Usa termos seguros em vez de injetar o tema bruto da seed como sujeito da frase
  const variants = [
    `A imagem de ${image} me lembra que ${lowerFirst(reflection)}, e hoje isso ganha o tamanho de ${feeling}.`,
    `Entre o cuidado e a ${emotion}, eu escolho uma presença que valoriza cada momento ao seu lado.`,
    `Fica uma certeza serena: ${lowerFirst(impact)}, e é com essa delicadeza que quero honrar nosso laço.`,
    `O que sinto é genuíno; por isso busco chegar até você com respeito, verdade e ternura.`,
    `Nossa conexão não é uma ideia distante; aparece como gesto, como cuidado e como apoio real no dia a dia.`,
    styleLine,
  ];

  return variants[index % variants.length];
}

function buildClosing(seed: AuthorVoiceSeed | undefined, data: GenRequest, rng: () => number): string {
  const shouldUseFfp = /fé|motivacional|reflexão|perdão/.test(data.tone) || /f[eé]|luta|cansa|recome/i.test(data.intention);
  const variants = [
    pick(closingSentences, rng),
    `Que esse laço seja um motivo real para você sentir cuidado e proteção no dia a dia.`,
    shouldUseFfp
      ? "Fé, força e paciência: que esses pilares sustentem o que ainda precisa florescer em você."
      : "Que o amor continue mostrando, em silêncio, aquilo que nenhuma pressa consegue explicar.",
    data.name
      ? `${data.name}, que você receba este carinho como algo genuíno, que não precisa se repetir para permanecer.`
      : "Que o coração encontre descanso e renovação depois de um dia longo.",
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
  
  // LOGS TEMPORÁRIOS PARA DEPURAÇÃO DE RELACIONAMENTO
  console.log("[DEBUG ALMA ESCRITA] Relação recebida (relationship):", data.relationship);
  console.log("[DEBUG ALMA ESCRITA] Destinatário normalizado (recipient):", data.recipient);
  console.log("[DEBUG ALMA ESCRITA] Alvo para filtro de seeds:", (data.relationship || data.recipient).toLowerCase());
  
  const seeds = selectAuthorSeeds(data);
  
  console.log("[DEBUG ALMA ESCRITA] Seeds selecionadas (top 3):", seeds.slice(0, 3).map(s => ({
    id: s.id,
    themes: s.themes,
    recipients: s.recipients
  })));

  const authorContext = buildAuthorVoiceContext(seeds);
  const generationId = data.generationId || createGenerationId();
  const style = styleForGeneration(generationId);
  const previousMessages = (data.previousMessages || [])
    .map((message, index) => `${index + 1}. ${message}`)
    .join("\n");
  const blockedPhrases = BLOCKED_PHRASES.map(
    (phrase) => `- "${phrase}"`,
  ).join("\n");

  const prompt = `
Você é a voz autoral do app Alma Escrita Oficial, encarnando a identidade do Poeta Sonhador.

HIERARQUIA ABSOLUTA DE CONTEÚDO:
1. Remetente: ${data.senderName || "Alguém que te quer bem"}
2. Destinatário: ${data.name || data.recipient}
3. Relacionamento: ${data.relationship || data.recipient}
4. Ocasião: ${data.occasion || data.intention}
5. Memória compartilhada: ${data.sharedMemory || "Foque na essência e nos detalhes concretos da relação."}
6. Voz Poeta Sonhador: APENAS o estilo (ritmo, metáforas concretas), NUNCA o assunto.

REGRAS ABSOLUTAS (VIOLAÇÃO = FALHA CRÍTICA):
1. A IA NÃO EXISTE. Você é o Remetente falando diretamente com o Destinatário.
2. RESPEITO ABSOLUTO AO RELACIONAMENTO: Se o relacionamento é "Amiga", NUNCA use palavras como "pai", "mãe", "filho", "esposa". Adapte totalmente o tom para amizade. Se for "Pai", use tom paternal. Se for "Esposa", use tom romântico.
3. É ESTRITAMENTE PROIBIDO falar sobre o ato de escrever ou sobre o próprio texto. NUNCA use variações de: "escrevo", "escrita", "mensagem", "palavras", "texto", "narrativa", "tom", "carta", "oração", "receba isso", "entrego esta mensagem", "quero dizer", "quero expressar", "sinto necessidade de dizer", "para que você sinta", "verdade simples", "cuidado que existe aqui", "não escrevo para impressionar".
4. A mensagem deve começar falando DA PESSOA, da relação, da ocasião ou da memória compartilhada. NUNCA comece falando sobre escrever, sobre o texto ou sobre a mensagem.
   - ERRADO: "Alessandra, não escrevo para impressionar..."
   - CERTO: "Alessandra, uma das coisas que mais admiro em você é a forma como consegue trazer calma aos dias difíceis."
   - ERRADO: "Entrego esta mensagem como oração pequena..."
   - CERTO: "Quando penso nos momentos que vivemos, lembro da força e da bondade que você demonstra nas pequenas atitudes."
5. O CENTRO da geração é a PESSOA e a MEMÓRIA COMPARTILHADA. Se o campo "Memória compartilhada" foi fornecido, você DEVE mencioná-lo ou aludir a ele de forma concreta no corpo do texto.
6. PRIORIZE FATOS CONCRETOS sobre abstrações.
   - ERRADO: "o amor aparece como caminho possível"
   - CERTO: "você esteve ao meu lado quando eu mais precisei"
   - ERRADO: "amizade como gesto"
   - CERTO: "você me ouviu quando ninguém mais ouviu"

Gere UMA resposta direta, profunda, emocional e pronta para compartilhar.

Dados do pedido:
- Quem envia: ${data.senderName || "Alguém que te quer bem"}
- Quem recebe: ${data.name || data.recipient}
- Relação: ${data.relationship || data.recipient}
- Ocasião: ${data.occasion || data.intention}
- Memória ou detalhe especial: ${data.sharedMemory || "Foque na essência e nos detalhes concretos da relação."}
- Tom escolhido: ${data.tone}
- Tamanho escolhido: ${data.length} (${lengthGuidance[data.length]})
- Categoria emocional inferida: ${category}
- ID único desta geração: ${generationId}

Base autoral ampliada extraída dos livros e poemas do projeto:
- Total de sinais autorais disponíveis no app: ${AUTHOR_VOICE_STATS.totalSeeds}
- Use os sinais abaixo APENAS como identidade literária (ritmo, metáforas concretas), NUNCA como texto para copiar.

${authorContext}

Método autoral obrigatório:
- Comece DIRETAMENTE tratando a pessoa pelo nome ou pelo vínculo, citando uma qualidade, um momento ou a memória compartilhada.
- Se houver uma memória especial, faça dela o coração da mensagem. Use os detalhes fornecidos de forma orgânica e concreta.
- Incorpore o FFP (Fé, Força, Paciência) como a espinha dorsal invisível da mensagem, não como um slogan.
- Termine com uma frase marcante, madura e humana, reafirmando o vínculo.

Mensagens anteriores que NÃO devem ser repetidas nem parafraseadas de perto:
${previousMessages || "- nenhuma nesta sessão"}

Regras de escrita:
- Escreva em português do Brasil.
- Escreva em primeira pessoa (eu) falando diretamente com a pessoa (você).
- Não use tom de autoajuda genérica.
- Não use slogans motivacionais.
- Não copie trechos longos literalmente dos livros.
- Não cite "base", "seed", "livro", "poema", "IA", "Gemini" ou "prompt".
- Não use título.
- Não use lista.
- Não invente fatos concretos que o usuário não informou.
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
