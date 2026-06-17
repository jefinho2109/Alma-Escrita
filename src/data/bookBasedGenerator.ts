import { generateAIMsg } from "@/lib/gemini";
import {
  AUTHOR_VOICE_SEEDS,
  AUTHOR_VOICE_STATS,
  GENERIC_PHRASE_BLOCKLIST,
  findAuthorVoiceSeeds,
  type AuthorVoiceSeed,
} from "@/data/authorVoiceKnowledge";
import {
  EMOTIONAL_UNIVERSES,
  buildEmotionalUniverseFallback,
  buildPremiumEmotionalUniverseFallback,
  buildUniversePromptBlock,
  buildValidationRetryInstruction,
  isTextAllowedInUniverse,
  normalizeUniverseText,
  resolveEmotionalUniverse,
  validateEmotionalUniverseText,
  type EmotionalUniverseKey,
} from "@/data/emotionalUniverses";
import {
  type GenRequest,
  type GenTone,
  normalizeGenRequest,
} from "@/data/generator";
import { interpretGenerationRequest } from "@/data/userEmotionInterpreter";

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
  curta: "40 a 55 palavras",
  média: "40 a 70 palavras",
  longa: "80 a 100 palavras",
};

const PREMIUM_MIN_WORDS = 100;
const PREMIUM_MAX_WORDS = 120;

const PREMIUM_GENERIC_PATTERNS = [
  "há momentos em que",
  "nem tudo",
  "a vida pede",
  "a vida ensina",
  "a caminhada",
  "o processo",
  "essa fase",
  "esta fase",
  "versão mais",
  "coração precisa",
  "chegue como",
  "motivos sinceros",
  "presença importa",
  "frase bonita",
  "resposta pronta",
  "de um jeito profundo",
] as const;

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

const grammaticalContractions: Array<[RegExp, string]> = [
  [/\bem\s+o\b/gi, "no"],
  [/\bem\s+a\b/gi, "na"],
  [/\bde\s+o\b/gi, "do"],
  [/\bde\s+a\b/gi, "da"],
  [/\bpor\s+o\b/gi, "pelo"],
  [/\bpor\s+a\b/gi, "pela"],
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
  const cleaned = text
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return grammaticalContractions
    .reduce(
      (value, [pattern, replacement]) =>
        value.replace(pattern, (match) =>
          /^[A-Z]/.test(match)
            ? replacement.charAt(0).toLocaleUpperCase("pt-BR") + replacement.slice(1)
            : replacement,
        ),
      cleaned,
    )
    .trim();
}

function stripGeneratedSignature(text: string): string {
  return cleanGeneratedText(text)
    .replace(/\s*(?:\n|\s){0,2}Alma Escrita\s*$/i, "")
    .replace(/\s*(?:\n|\s){0,2}Com carinho,\s*[A-Za-zÀ-ÿ\s.'-]{2,80}\s*$/i, "")
    .trim();
}

function countWords(text: string): number {
  const words = stripGeneratedSignature(text).match(
    /[A-Za-zÀ-ÿ0-9]+(?:[-'][A-Za-zÀ-ÿ0-9]+)*/g,
  );
  return words?.length || 0;
}

function isPremiumRequest(data: GenRequest): boolean {
  return Boolean(data.messageStart?.trim() || data.premiumMessage);
}

function hasAnyNormalizedTerm(text: string, terms: string[]): boolean {
  const normalizedText = normalizeUniverseText(text);
  return terms.some((term) => normalizedText.includes(normalizeUniverseText(term)));
}

function countGenericPremiumSignals(text: string): number {
  const normalizedText = normalizeUniverseText(text);
  return PREMIUM_GENERIC_PATTERNS.reduce(
    (count, pattern) =>
      normalizedText.includes(normalizeUniverseText(pattern)) ? count + 1 : count,
    0,
  );
}

function validatePremiumGeneration(
  text: string,
  data: GenRequest,
  universeKey: EmotionalUniverseKey,
): { ok: boolean; wordCount: number; reason: string } {
  const wordCount = countWords(text);

  if (!isPremiumRequest(data)) {
    return { ok: true, wordCount, reason: "" };
  }

  if (wordCount < PREMIUM_MIN_WORDS) {
    return {
      ok: false,
      wordCount,
      reason: `curta demais: ${wordCount} palavras`,
    };
  }

  if (wordCount > PREMIUM_MAX_WORDS) {
    return {
      ok: false,
      wordCount,
      reason: `longa demais: ${wordCount} palavras`,
    };
  }

  if (universeKey === "gratidao") {
    const missing = [
      hasAnyNormalizedTerm(text, [
        "gratidão",
        "agradeço",
        "agradecer",
        "obrigado",
        "obrigada",
        "reconhecimento",
        "reconheço",
      ])
        ? ""
        : "reconhecimento claro",
      hasAnyNormalizedTerm(text, [
        "importância",
        "importa",
        "representa",
        "valor",
        "valorizo",
      ])
        ? ""
        : "importância da pessoa",
      hasAnyNormalizedTerm(text, [
        "cuidado",
        "apoio",
        "gesto",
        "presença",
        "sustenta",
        "marcou",
        "fez diferença",
        "faz diferença",
      ])
        ? ""
        : "impacto emocional do cuidado ou apoio",
    ].filter(Boolean);

    if (missing.length > 0) {
      return {
        ok: false,
        wordCount,
        reason: `gratidão premium incompleta: ${missing.join(", ")}`,
      };
    }
  }

  const normalizedText = ` ${normalizeUniverseText(text)} `;
  const hasFirstPerson = /\b(eu|meu|minha|me|comigo|sinto|guardo|reconheco|agradeco|amo|lembro)\b/.test(
    normalizedText,
  );
  const hasDirectAddress = /\b(voce|te|seu|sua|contigo)\b/.test(normalizedText);
  const genericSignals = countGenericPremiumSignals(text);

  if (!hasFirstPerson || !hasDirectAddress) {
    return {
      ok: false,
      wordCount,
      reason: "voz pouco pessoal: falta primeira pessoa ou fala direta com a pessoa",
    };
  }

  if (genericSignals >= 2) {
    return {
      ok: false,
      wordCount,
      reason: `voz generica demais: ${genericSignals} sinais abstratos`,
    };
  }

  return { ok: true, wordCount, reason: "" };
}

function buildPremiumRetryInstruction(
  premiumValidation: ReturnType<typeof validatePremiumGeneration>,
  universeKey: EmotionalUniverseKey,
): string {
  const lines = [
    "A versão anterior não atingiu o padrão Premium.",
    `Ela teve ${premiumValidation.wordCount} palavras; reescreva com obrigatoriamente ${PREMIUM_MIN_WORDS} a ${PREMIUM_MAX_WORDS} palavras no corpo do texto.`,
    "Use exatamente esta estrutura em parágrafos fluidos: abertura pessoal, desenvolvimento emocional e fechamento marcante.",
    "Aumente a proximidade humana: menos frase universal, mais confissão direta, memória afetiva, vulnerabilidade e sentimento concreto.",
    "Faça parecer que uma pessoa está escrevendo para aquela pessoa específica.",
    "Não inclua assinatura, não escreva \"Alma Escrita\" e não escreva \"Com carinho\".",
  ];

  if (universeKey === "gratidao") {
    lines.push(
      "Como o universo é Gratidão, inclua reconhecimento claro, importância da pessoa e impacto emocional do cuidado ou apoio recebido, sem romance e sem reflexão genérica.",
    );
  }

  if (premiumValidation.reason) {
    lines.push(`Motivo da rejeição: ${premiumValidation.reason}.`);
  }

  return lines.join("\n");
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
  const data = interpretGenerationRequest(normalizeGenRequest(request));

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

function repeatsMessageStart(text: string, messageStart?: string): boolean {
  const start = cleanGeneratedText(messageStart || "");
  if (start.length < 18) return false;

  const normalizedText = normalizeUniverseText(cleanGeneratedText(text));
  const normalizedStart = normalizeUniverseText(start);
  return normalizedText.includes(normalizedStart);
}

function stylesForUniverse(universeKey: EmotionalUniverseKey): VariationStyle[] {
  switch (universeKey) {
    case "amor":
      return ["romântico", "simples", "poético", "declaração intensa"];
    case "fe":
      return ["espiritual", "profundo", "simples"];
    case "amizade":
      return ["simples", "profundo", "motivacional"];
    case "pedido_desculpas":
      return ["simples", "profundo", "carta curta"];
    case "gratidao":
      return ["simples", "profundo", "carta curta"];
    case "reflexao":
      return ["profundo", "simples", "poético"];
    case "motivacao":
      return ["motivacional", "simples", "profundo"];
    case "aniversario":
      return ["simples", "poético", "carta curta"];
  }
}

function styleForUniverse(
  generationId: string,
  universeKey: EmotionalUniverseKey,
): VariationStyle {
  const styles = stylesForUniverse(universeKey);
  return styles[hashString(`${generationId}-${universeKey}`) % styles.length]!;
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

function safeSeedPieces(
  values: string[],
  universeKey: EmotionalUniverseKey,
): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => isTextAllowedInUniverse(value, universeKey));
}

const AUTHOR_VOICE_STOPWORDS = new Set([
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
  "um",
  "uma",
]);

const AUTHOR_VOICE_METAPHOR_TERMS = [
  "abrigo",
  "caminho",
  "casa",
  "chao",
  "cicatriz",
  "cuidado",
  "detalhe",
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

const DEFAULT_AUTHOR_RHYTHM = [
  "primeira pessoa direta",
  "frases medias com fechamento breve",
  "imagem concreta antes da conclusao",
  "profundidade sem moralizar",
  "acolhimento sem cliche motivacional",
];

interface AuthorVoiceProfile {
  sourceBooks: string[];
  sourceFiles: string[];
  seedCount: number;
  themes: string[];
  vocabulary: string[];
  metaphors: string[];
  rhythm: string[];
}

function normalizeVoiceSignal(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueSignals(values: string[], universeKey: EmotionalUniverseKey, limit: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of values) {
    const signal = normalizeVoiceSignal(raw);
    const key = normalizeUniverseText(signal);

    if (!signal || signal.length < 3 || signal.length > 70) continue;
    if (AUTHOR_VOICE_STOPWORDS.has(key)) continue;
    if (!isTextAllowedInUniverse(signal, universeKey)) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(signal);
    if (output.length >= limit) break;
  }

  return output;
}

function collectVoiceVocabulary(seeds: AuthorVoiceSeed[], universeKey: EmotionalUniverseKey): string[] {
  return uniqueSignals(
    seeds.flatMap((seed) => seed.vocabulary),
    universeKey,
    18,
  );
}

function collectVoiceThemes(seeds: AuthorVoiceSeed[], universeKey: EmotionalUniverseKey): string[] {
  const themes = uniqueSignals(
    seeds.flatMap((seed) => [
      ...seed.themes,
      ...seed.emotions,
      ...seed.archetypes,
    ]),
    universeKey,
    12,
  );
  return themes.length ? themes : EMOTIONAL_UNIVERSES[universeKey].allowed.slice(0, 8);
}

function collectVoiceMetaphors(seeds: AuthorVoiceSeed[], universeKey: EmotionalUniverseKey): string[] {
  const rawTerms = uniqueSignals(
    seeds.flatMap((seed) => [
      ...seed.vocabulary,
      ...seed.themes,
      ...seed.archetypes,
    ]),
    universeKey,
    80,
  );
  const metaphors = rawTerms.filter((term) => {
    const normalized = normalizeUniverseText(term);
    return AUTHOR_VOICE_METAPHOR_TERMS.some((image) => normalized.includes(image));
  });
  const fallback = EMOTIONAL_UNIVERSES[universeKey].allowed.filter((term) =>
    isTextAllowedInUniverse(term, universeKey),
  );
  return (metaphors.length ? metaphors : fallback).slice(0, 8);
}

function filterSeedsForUniverse(
  seeds: AuthorVoiceSeed[],
  universeKey: EmotionalUniverseKey,
): AuthorVoiceSeed[] {
  return seeds.filter((seed) => {
    const metadataSignals = safeSeedPieces(
      [
        ...seed.themes,
        ...seed.emotions,
        ...seed.recipients,
        ...seed.archetypes,
        ...seed.vocabulary,
        seed.tone,
        seed.narrativePattern,
        ...seed.styleRules,
      ],
      universeKey,
    );
    return metadataSignals.length >= 2;
  });
}

function buildUniverseFallbackContext(universeKey: EmotionalUniverseKey): string {
  const universe = EMOTIONAL_UNIVERSES[universeKey];
  return [
    `Fonte autoral filtrada: guia seguro do universo ${universe.label}.`,
    `Campo semântico permitido: ${universe.allowed.join(", ")}.`,
    "Use linguagem humana, específica, em primeira pessoa e sem copiar frases prontas.",
  ].join("\n");
}

function buildAuthorVoiceProfile(
  seeds: AuthorVoiceSeed[],
  universeKey: EmotionalUniverseKey,
): AuthorVoiceProfile {
  const sourceBooks = [...new Set(seeds.map((seed) => seed.sourceBook))]
    .filter(Boolean)
    .slice(0, 6);
  const sourceFiles = [...new Set(seeds.map((seed) => seed.sourceFile))]
    .filter(Boolean)
    .slice(0, 6);

  return {
    sourceBooks,
    sourceFiles,
    seedCount: seeds.length,
    themes: collectVoiceThemes(seeds, universeKey),
    vocabulary: collectVoiceVocabulary(seeds, universeKey),
    metaphors: collectVoiceMetaphors(seeds, universeKey),
    rhythm: DEFAULT_AUTHOR_RHYTHM,
  };
}

function buildAuthorVoiceProfileContext(
  seeds: AuthorVoiceSeed[],
  universeKey: EmotionalUniverseKey,
): string {
  if (seeds.length === 0) return buildUniverseFallbackContext(universeKey);

  const profile = buildAuthorVoiceProfile(seeds, universeKey);
  return [
    "Perfil autoral Jefferson (sinais agregados, sem frases literais):",
    `Livros usados apenas como amostra de voz: ${profile.sourceBooks.join(", ") || "base autoral local"}.`,
    `Arquivos de origem: ${profile.sourceFiles.join(", ") || "fontes autorais agregadas"}.`,
    `Escopo: ${profile.seedCount} sinais compativeis nesta geracao, de ${AUTHOR_VOICE_STATS.totalSeeds} sinais mapeados.`,
    `Temas compativeis extraidos: ${profile.themes.join(", ")}.`,
    `Palavras recorrentes seguras: ${profile.vocabulary.join(", ") || EMOTIONAL_UNIVERSES[universeKey].allowed.join(", ")}.`,
    `Metaforas/imagens recorrentes permitidas: ${profile.metaphors.join(", ")}.`,
    `Ritmo e estilo: ${profile.rhythm.join("; ")}.`,
    "Regra de aplicacao: primeiro obedeca ao universo emocional ativo; depois aplique esta voz apenas em estilo, ritmo, profundidade, vocabulario e metaforas.",
    "Proibido copiar, reescrever ou parafrasear reflexoes, frases de impacto ou trechos dos livros.",
  ].join("\n");
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

function classifySharedMemory(text: string): "memory" | "advice" | "declaration" | "other" {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;
  
  // 1. Conselhos/Motivação curtos ou diretos
  if (/não desista|acredite|continue|força|lute|supere|não desanime|siga em frente|confie|nunca desista/i.test(lower)) {
    return "advice";
  }
  
  // 2. Declarações afetivas diretas e curtas
  if (wordCount < 6 && /\bamo\b|\bte amo\b|sou grato|me faz feliz|motivo do meu|obrigado/i.test(lower)) {
    return "declaration";
  }
  
  // 3. Memórias concretas (passado, eventos específicos)
  if (/quando|lembr|aquele dia|vez que|no dia|quando você/i.test(lower)) {
    return "memory";
  }
  
  // 4. Outros (frases completas, orações complexas, mensagens centrais elaboradas)
  return "other";
}

function adaptDetailToNaturalNarrative(detail: string, context: 'memory' | 'apology' | 'advice' | 'declaration' | 'general' | 'other'): string {
  const trimmed = detail.trim();
  const lower = trimmed.toLowerCase();

  // 1. Pedido de desculpas + oração de dúvida/rejeição
  if (context === 'apology' && /você pode pensar que não te amo/i.test(lower)) {
    return "qualquer atitude minha que tenha feito você pensar que eu não te amo";
  }
  if (context === 'apology' && /(você pode pensar|acha que|duvida)/i.test(lower)) {
    return `qualquer situação que tenha feito você pensar que ${trimmed.toLowerCase().replace(/^que\s+/i, '')}`;
  }

  // 2. Declaração/Gratidão iniciando com "obrigado" ou "agradeço"
  if (/^obrigado|^agradeço/i.test(trimmed)) {
    const cleaned = trimmed.replace(/^obrigado\s+(por\s+)?/i, "").replace(/^agradeço\s+(por\s+)?/i, "").replace(/^estar\s+/i, "").trim();
    return `ter ${cleaned}`; 
  }

  // 3. Declaração direta e frases de amor/permanência
  if (/^você é|^te amo|^amo muito|vou te amar|pra sempre|tudo pra mim|meu tudo/i.test(lower)) {
    return trimmed; // O template adicionará "que " ou "por " de forma fluida
  }

  // 4. Conselho imperativo curto
  if (/não desista/i.test(lower)) return "de não desistir";
  if (/acredite em você/i.test(lower)) return "de acreditar em si";
  if (/continue|força|lute|supere|não desanime|siga em frente|confie|nunca desista/i.test(lower)) {
    return `de que ${trimmed}`;
  }

  // 5. Memória concreta (mantém fluido)
  if (context === 'memory' && /^(quando|lembro|aquele dia|vez que)/i.test(lower)) {
    return trimmed; 
  }

  // 6. Fallback seguro: transforma em oração subordinada suave, SEM aspas literais
  return `que ${trimmed}`;
}

function splitFallbackSentences(data: GenRequest): string[] {
  return buildEmotionalUniverseFallback(data)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function pickSafeFallbackSentence(
  data: GenRequest,
  rng: () => number,
  universeKey: EmotionalUniverseKey,
): string {
  const safeSentences = splitFallbackSentences(data).filter((sentence) =>
    isTextAllowedInUniverse(sentence, universeKey),
  );
  return pick(safeSentences.length ? safeSentences : splitFallbackSentences(data), rng);
}

function buildClosing(seed: AuthorVoiceSeed | undefined, data: GenRequest, rng: () => number): string {
  const universe = resolveEmotionalUniverse(data);
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

  const safeVariants = variants.filter((sentence) =>
    isTextAllowedInUniverse(sentence, universe.key),
  );
  return safeVariants.length
    ? pick(safeVariants, rng)
    : pickSafeFallbackSentence(data, rng, universe.key);
}

function buildPremiumUniverseFallback(data: GenRequest): string {
  return buildPremiumEmotionalUniverseFallback(data);
}

function buildFallback(request: GenRequest, _seeds: AuthorVoiceSeed[]): string {
  const data = prepareRequest(request);
  const fallback = cleanGeneratedText(
    data.messageStart || data.premiumMessage
      ? buildPremiumUniverseFallback(data)
      : buildEmotionalUniverseFallback(data),
  );
  const validation = validateEmotionalUniverseText(fallback, data);
  return validation.ok ? fallback : cleanGeneratedText(buildEmotionalUniverseFallback({ ...data, sharedMemory: "" }));
}

function buildApologyFallback(data: GenRequest): string {
  const name = data.name ? data.name : "você";
  
  const sentence1 = `${name}, quero reconhecer que errei e peço perdão por isso.`;
  const sentence2 = `Assumo minha responsabilidade e sinto arrependimento pelo que aconteceu.`;
  
  let sentences = [sentence1, sentence2];
  
  if (data.sharedMemory) {
    const adapted = adaptDetailToNaturalNarrative(data.sharedMemory, 'apology');
    sentences.push(`Peço perdão de coração por ${adapted}, e espero que possamos reconstruir nossa confiança.`);
  } else {
    sentences.push(`Peço desculpas de coração e espero que, com o tempo, possamos reconstruir o que foi abalado.`);
  }
  
  const count = data.length === "longa" ? 4 : 3;
  return cleanGeneratedText(sentences.slice(0, count).join(" "));
}

export async function generateBookBasedMessage(
  request: GenRequest,
): Promise<string> {
  const prepared = prepareRequest(request);
  const data = {
    ...prepared,
    previousMessages: mergePreviousMessages(prepared),
  };
  const inferredCategory = inferCategory(data.intention, data.tone);
  const universe = resolveEmotionalUniverse(data);
  const rawSeeds = selectAuthorSeeds(data);
  const seeds = filterSeedsForUniverse(rawSeeds, universe.key);
  const authorContext = buildAuthorVoiceProfileContext(seeds, universe.key);
  const generationId = data.generationId || createGenerationId();
  const style = styleForUniverse(generationId, universe.key);
  const previousMessages = (data.previousMessages || [])
    .map((message, index) => `${index + 1}. ${message}`)
    .join("\n");
  const blockedPhrases = BLOCKED_PHRASES.map(
    (phrase) => `- "${phrase}"`,
  ).join("\n");

  // LOGS DE AUDITORIA AUTORAL
  console.log("[AUTHOR_BASE]");
  console.log("query:", {
    intention: data.intention,
    tone: data.tone,
    recipient: data.relationship,
    universe: universe.label,
    inferredCategory,
  });
  console.log("livros encontrados:", [...new Set(seeds.map((s) => s.sourceBook))].join(", "));
  console.log("seeds brutas:", rawSeeds.length, "seeds seguras:", seeds.length);
  console.log("perfil de voz autoral:", buildAuthorVoiceProfile(seeds, universe.key));
  console.log("motivo da seleção:", "Universo emocional primeiro; voz autoral aplicada apenas como estilo");
  
  console.log("[FINAL_PROMPT]");
  console.log("resumo:", `Dados: ${data.name} (${data.relationship}), Universo: ${universe.label}. Base autoral filtrada: ${seeds.length} seeds.`);

  const occasionForPrompt =
    universe.key === "reflexao"
      ? "Reflexão"
      : universe.key === "fe"
        ? "Fé"
        : universe.key === "motivacao"
          ? "Motivação"
          : universe.key === "gratidao"
            ? "Gratidão"
            : universe.key === "pedido_desculpas"
              ? "Pedido de desculpas"
              : universe.key === "aniversario"
                ? "Aniversário"
                : universe.key === "amizade"
                  ? "Amizade"
                  : data.occasion || "Declaração de amor";
  const targetLengthGuidance =
    data.messageStart || data.premiumMessage
      ? "100 a 120 palavras"
      : lengthGuidance[data.length];

  const buildPrompt = (retryInstruction = "") => `
Você é o escritor do Alma Escrita, inspirado na voz autoral de Jefferson Rodrigues da Silva. Primeiro obedeça ao universo emocional ativo. Depois aplique a voz Jefferson apenas como estilo, ritmo, profundidade, vocabulário e metáforas seguras. Nunca use os livros como base de frases.

DADOS DO PEDIDO:
- Quem envia: ${data.senderName || "Alguém que te quer bem"}
- Quem recebe: ${data.name || data.recipient}
- Relação: ${data.relationship || data.recipient}
- Tipo emocional dominante: ${universe.label}
- Ocasião interpretada: ${occasionForPrompt}
- Intenção emocional interpretada do detalhe: ${data.sharedMemory || "Foque na essência e nos detalhes concretos da relação."}
- Intenção emocional interpretada do início: ${data.messageStart || "Não informado."}
- Ponto humano concreto obrigatório: ${data.sharedMemory || data.messageStart || data.intention || "um detalhe real da relação, sem inventar cena específica"}
- Mensagem Premium: ${data.premiumMessage ? "sim" : "não"}
- Assinatura personalizada ativa: ${data.shouldSignMessage ? "sim, aplicada fora do gerador" : "não"}
- Tom escolhido: ${data.tone}
- Tamanho escolhido: ${data.length} (${targetLengthGuidance})
- Variação autoral segura: ${style}

PERFIL DE VOZ AUTORAL (SINAIS AGREGADOS, NÃO CONTEÚDO TEMÁTICO):
${authorContext}

REGRAS ABSOLUTAS DE ESCRITA:
1. GRAMÁTICA NATURAL DO PORTUGUÊS: Escreva com fluidez e correção gramatical impecável. Evite construções artificiais, repetições de preposições (ex: use "nesse" em vez de "em esse") e frases truncadas. O texto deve soar como uma pessoa real e culta escrevendo com o coração.
2. UNIVERSO EMOCIONAL ESTRITO:
${buildUniversePromptBlock(universe)}
3. VOZ AUTORAL SEM CONTAMINAÇÃO: O perfil autoral acima não define tema. Ele só pode influenciar estilo, ritmo, profundidade, vocabulário e metáforas. A categoria escolhida pelo usuário sempre vence.
4. NÃO COPIAR LIVROS: É proibido copiar, reescrever ou parafrasear reflexões, frases de impacto, trechos literais ou ensinamentos dos livros. Gere uma mensagem inédita.
5. COMPLETAR MINHA MENSAGEM: Se "Intenção emocional interpretada do início" estiver informada, continue essa intenção em 100 a 120 palavras. Não repita literalmente o início original do usuário, não use aspas e não faça referência ao ato de completar.
6. MENSAGEM PREMIUM: Se "Mensagem Premium" for "sim", o corpo do texto deve ter obrigatoriamente entre 100 e 120 palavras. Use abertura pessoal, desenvolvimento emocional e fechamento marcante. Não entregue texto curto.
7. PADRÃO PREMIUM HUMANO: Escreva como alguém real falando com essa pessoa, não como um gerador. Use primeira pessoa, fale diretamente com "você", traga vulnerabilidade e uma emoção concreta ligada ao detalhe/memória. Prefira confissões simples ("eu sinto", "eu reconheço", "eu lembro", "me marcou") a frases universais.
8. VOZ JEFFERSON APLICADA: A voz autoral deve aparecer no ritmo íntimo, na profundidade sóbria, na ternura sem exagero e em imagens concretas pequenas. Não use frases de efeito, moral da história, encerramento padronizado nem reflexão abstrata para parecer profundo.
9. ASSINATURA: Não assine o texto. Não escreva "Alma Escrita", "Com carinho" nem nome de quem envia no final. A assinatura é aplicada fora do gerador.
10. GRATIDÃO PREMIUM: Se o universo for GRATIDÃO e a mensagem for Premium, inclua reconhecimento claro, importância da pessoa e impacto emocional do cuidado/apoio recebido. Não transforme em reflexão genérica e não use romance.
11. INTERPRETAÇÃO SEMÂNTICA OBRIGATÓRIA: Os campos acima já são intenções emocionais interpretadas. Use somente essas intenções, nunca tente reproduzir o texto literal digitado pelo usuário.
12. PRIORIDADE ABSOLUTA DO DETALHE ROMÂNTICO/ÍNTIMO: Se o detalhe fornecido pelo usuário contiver elementos de desejo romântico, saudade física, beijo, abraço ou carinho íntimo, a mensagem DEVE obrigatoriamente seguir esse tom romântico, delicado e íntimo. É ESTRITAMENTE PROIBIDO ignorar esse detalhe ou substituí-lo por temas espirituais genéricos.
13. ANTI-REPETIÇÃO: Nenhuma frase ou ideia principal pode aparecer duas vezes na mesma mensagem com palavras iguais ou quase iguais. Evite ecos e redundâncias.
14. DOMÍNIO DA OCASIÃO: Se a ocasião for "Pedido de desculpas" ou similar, a mensagem DEVE conter explicitamente: reconhecimento do erro, arrependimento sincero, pedido de perdão e responsabilidade.
15. TOM E VOZ: Escreva em primeira pessoa (eu) falando diretamente com a pessoa (você). Use linguagem poética, profunda e acolhedora somente quando isso couber no universo emocional ativo.
16. PROIBIÇÕES: Não use palavras como "escrevo", "escrita", "mensagem", "palavras", "texto", "narrativa", "tom", "carta", "receba isso", "entrego esta mensagem". Não cite "base", "seed", "livro", "poema", "IA", "Gemini" ou "prompt". Evite "há momentos em que", "nem tudo", "a vida pede", "a caminhada", "processo", "fase" e outros fechamentos de autoajuda.
17. FORMATO: Entregue SOMENTE o texto final, em parágrafos fluidos. Nada de títulos, listas ou comentários antes/depois.

Mensagens anteriores que NÃO devem ser repetidas nem parafraseadas:
${previousMessages || "- nenhuma nesta sessão"}

Frases e clichês proibidos (bloqueio rigoroso):
${blockedPhrases}

${retryInstruction ? `REGERAÇÃO OBRIGATÓRIA:\n${retryInstruction}` : ""}
`.trim();

  try {
    let retryInstruction = "";

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const aiText = stripGeneratedSignature(await generateAIMsg(buildPrompt(retryInstruction), data));
      const validation = validateEmotionalUniverseText(aiText, data);
      const premiumValidation = validatePremiumGeneration(aiText, data, universe.key);
      const generic = containsGenericPhrase(aiText);
      const similar = isTooSimilarToPrevious(aiText, data.previousMessages);
      const repeatedStart = repeatsMessageStart(aiText, data.messageStart);
      const approved =
        validation.ok &&
        premiumValidation.ok &&
        !generic &&
        !similar &&
        !repeatedStart;

      console.log("[VALIDACAO_UNIVERSO]");
      console.log("tentativa:", attempt);
      console.log("universo:", validation.universe.label);
      console.log("texto_final:", aiText);
      console.log("termos_bloqueados:", validation.forbiddenTerms.join(", ") || "nenhum");
      console.log("obrigatorios_ausentes:", validation.missingRequired.join(", ") || "nenhum");
      console.log("palavras:", premiumValidation.wordCount);
      console.log("premium:", isPremiumRequest(data) ? premiumValidation.reason || "aprovado" : "nao");
      console.log("generico:", generic);
      console.log("similar:", similar);
      console.log("repetiu_inicio:", repeatedStart);
      console.log("resultado:", approved ? "aprovado" : "reprovado");

      if (approved) {
        return rememberGeneratedMessage(aiText);
      }

      if (!validation.ok) {
        retryInstruction = buildValidationRetryInstruction(validation);
      } else if (!premiumValidation.ok) {
        retryInstruction = buildPremiumRetryInstruction(premiumValidation, universe.key);
      } else if (repeatedStart) {
        retryInstruction = "A versão anterior repetiu literalmente o início escrito pelo usuário. Continue a intenção emocional sem copiar esse início.";
      } else {
        retryInstruction = "A versão anterior foi rejeitada por conter clichê, repetição ou proximidade excessiva com mensagens recentes. Gere uma versão nova, específica e sem repetir a estrutura.";
      }
    }

    console.log("[VALIDACAO_UNIVERSO]");
    console.log("resultado: reprovado apos retry (usando fallback de segurança)");
    return rememberGeneratedMessage(buildFallback(data, seeds));
  } catch (error) {
    console.warn("IA indisponível, usando fallback seguro de universo emocional:", error);
    if (isPremiumRequest(data)) {
      return rememberGeneratedMessage(buildFallback(data, seeds));
    }
    if (universe.key === "pedido_desculpas") {
      const fallback = buildApologyFallback(data);
      const validation = validateEmotionalUniverseText(fallback, data);
      return rememberGeneratedMessage(
        validation.ok ? fallback : buildEmotionalUniverseFallback(data),
      );
    }
    return rememberGeneratedMessage(buildFallback(data, seeds));
  }
}
