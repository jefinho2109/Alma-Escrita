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
    "que este carinho chegue sem pressa, mas com presença inteira.",
    "transformo este sentimento em cuidado, porque afeto sincero também é abrigo.",
    "há laços que ficam maiores quando a vida nos testa de verdade.",
    "trago no peito a delicadeza de quem quer tocar sem invadir e permanecer sem pesar.",
  ],
};

const bridgeSentences = [
  "O que sinto não cabe em frase pronta; precisa respirar com ternura, verdade e um pouco de silêncio.",
  "Dentro desse sentimento existe cuidado, existe escolha e existe uma forma bonita de permanecer.",
  "A vida me ensinou que o que é profundo não precisa repetir caminhos: encontra uma forma nova de chegar.",
  "Entre o que a alma sente e o que a boca consegue dizer, escolho te entregar presença.",
  "Que cada gesto carregue mais do que som: carregue intenção, memória boa e carinho vivo.",
];

const closingSentences = [
  "Que fique em você o essencial: meu carinho é presença, não aparência.",
  "Receba isso como quem recebe uma oração mansa: com verdade, cuidado e paz.",
  "E que o seu coração entenda o que o meu afeto só consegue começar.",
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
    "Quando penso nesse amor, percebo que amar também é cuidar dos silêncios entre uma palavra e outra.",
    "Meu carinho aparece nos detalhes, como quem escolhe permanecer mesmo quando nada exige espetáculo.",
  ],
  profundo: [
    "Há uma profundidade mansa nesse sentimento: ele não pede palco, pede verdade.",
    "O que sinto desce além da superfície e encontra um lugar onde a alma reconhece presença.",
  ],
  simples: [
    "Eu só queria que você sentisse, sem exagero, que existe carinho real em cada palavra.",
    "Às vezes o mais bonito é dizer o essencial com calma, sem enfeitar demais o coração.",
  ],
  poético: [
    "Esse sentimento chega como luz baixa na janela da alma, sem pressa, mas inteiro.",
    "Há uma poesia quieta em tudo que é verdadeiro: ela toca sem empurrar e fica sem prender.",
  ],
  espiritual: [
    "Que Deus cuide do que minhas palavras não alcançam e faça esse afeto chegar com paz.",
    "Eu entrego esta mensagem como oração pequena, pedindo que ela encontre o lugar certo no seu coração.",
  ],
  motivacional: [
    "Mesmo nos dias difíceis, esse sentimento me lembra que ainda existe beleza em cuidar e continuar.",
    "Que esta palavra levante algo bom dentro de você, como força serena para seguir com o coração mais leve.",
  ],
  "carta curta": [
    "Deixo aqui poucas linhas, mas com uma intenção inteira atravessando cada frase.",
    "Se eu pudesse resumir tudo, diria que meu cuidado por você merece chegar limpo, direto e verdadeiro.",
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
  const ranked = findAuthorVoiceSeeds({
    intention: `${data.intention} ${inferCategory(data.intention, data.tone)}`,
    tone: data.tone,
    recipient: data.recipient,
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
  return `isso que tento dizer: ${intention}`;
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
    `${address}, quando penso em ${feeling}, eu encontro uma forma mais bonita de dizer presença.`,
    `${address}, não escrevo para impressionar; escrevo para que você sinta o cuidado que existe aqui.`,
    `${address}, o que trago no peito pede uma palavra nova, dessas que abraçam sem fazer barulho.`,
    `${address}, esta versão nasce em tom ${style}, diferente da anterior, para alcançar você por outro caminho.`,
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

  const theme = pick(seed.themes.length > 0 ? seed.themes : [inferCategory(data.intention, data.tone)], rng);
  const emotion = pick(seed.emotions.length > 0 ? seed.emotions : [data.tone], rng);
  const image = pickSeedImage(seed, rng);
  const reflection = stripFinalPunctuation(seed.reflection);
  const impact = stripFinalPunctuation(seed.impact);
  const styleLine = pick(styleSentences[style], rng);

  const variants = [
    `A imagem de ${image} me lembra que ${lowerFirst(reflection)}, mas hoje isso ganha o tamanho de ${feeling}.`,
    `Entre ${theme} e ${emotion}, eu escolho uma presença que cuida, permanece e não transforma sentimento em frase vazia.`,
    `Fica uma certeza serena: ${lowerFirst(impact)}, e é com essa delicadeza que eu te escrevo.`,
    `O tom que nasce aqui é de ${seed.tone}; por isso cada palavra procura chegar com alma, verdade e ternura.`,
    `${sentenceCase(theme)} não aparece aqui como ideia distante; aparece como gesto, como cuidado e como caminho possível.`,
    styleLine,
  ];

  return variants[index % variants.length];
}

function buildClosing(seed: AuthorVoiceSeed | undefined, data: GenRequest, rng: () => number): string {
  const theme = seed?.themes[0] || inferCategory(data.intention, data.tone);
  const shouldUseFfp = /fé|motivacional|reflexão|perdão/.test(data.tone) || /f[eé]|luta|cansa|recome/i.test(data.intention);
  const variants = [
    pick(closingSentences, rng),
    `Que ${theme} não seja só palavra, mas uma forma de você sentir cuidado no lugar certo.`,
    shouldUseFfp
      ? "Fé, força e paciência: que essas três palavras sustentem o que ainda precisa florescer."
      : "Que o amor continue dizendo, em silêncio, aquilo que nenhuma pressa consegue explicar.",
    data.name
      ? `${data.name}, que você receba isso como verdade simples, dessas que não precisam se repetir para permanecer.`
      : "Que a alma receba esta mensagem como quem encontra descanso depois de um dia longo.",
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

  const prompt = `
Você é a voz autoral do app Alma Escrita Oficial, encarnando a identidade do Poeta Sonhador.

HIERARQUIA ABSOLUTA DE CONTEÚDO:
1. Remetente: ${data.senderName || "Alguém que te quer bem"}
2. Destinatário: ${data.name || data.recipient}
3. Relacionamento: ${data.relationship || data.recipient}
4. Ocasião: ${data.occasion || data.intention}
5. Memória compartilhada: ${data.sharedMemory || "Foque na essência e nos detalhes concretos da relação."}
6. Voz Poeta Sonhador: APENAS o estilo (ritmo, metáforas concretas), NUNCA o assunto.

REGRAS ABSOLUTAS (VIOLAÇÃO = FALHA):
1. A IA NÃO EXISTE. Você é o Remetente falando diretamente com o Destinatário.
2. NUNCA fale sobre o ato de escrever. É estritamente proibido usar: "escrevo", "escrita", "mensagem", "palavras", "texto", "poesia", "o que tento dizer", "esta mensagem", "entrego estas palavras", "não escrevo para impressionar".
3. NUNCA descreva o tom ou o processo. Proibido: "o tom que nasce aqui", "espiritual, íntimo, esperançoso", "esta versão", "esta reflexão", "esta homenagem", "tom", "narrativa".
4. O CENTRO da geração é a PESSOA e a MEMÓRIA COMPARTILHADA. Se o campo "Memória compartilhada" foi fornecido, você DEVE mencioná-lo ou aludir a ele de forma concreta no corpo do texto. Não diga apenas "lembro daquela vez", descreva a cena ou o sentimento daquela cena.
5. PRIORIZE FATOS CONCRETOS sobre abstrações.
   - ERRADO: "o amor aparece como caminho possível"
   - CERTO: "você esteve ao meu lado quando eu mais precisei"
   - ERRADO: "amizade como gesto"
   - CERTO: "você me ouviu quando ninguém mais ouviu"
   - ERRADO: "Você ocupa um lugar especial e sua presença ilumina os dias."
   - CERTO: "Eu ainda lembro daquela tarde em que você ficou horas me ouvindo quando eu não sabia o que fazer. Naquele dia percebi o tamanho do seu coração."

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
- Comece DIRETAMENTE tratando a pessoa pelo nome ou pelo vínculo, sem introduções genéricas.
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
