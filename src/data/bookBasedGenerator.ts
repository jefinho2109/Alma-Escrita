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
    return `qualquer situação que tenha feito você pensar: "${trimmed}"`;
  }

  // 2. Declaração/Gratidão iniciando com "obrigado" ou "agradeço"
  if (/^obrigado|^agradeço/i.test(trimmed)) {
    const cleaned = trimmed.replace(/^obrigado\s+(por\s+)?/i, "").replace(/^agradeço\s+(por\s+)?/i, "").replace(/^estar\s+/i, "").trim();
    return `ter ${cleaned}`; 
  }

  // 3. Declaração direta ("você é...", "te amo")
  if (/^você é|^te amo|^amo muito/i.test(trimmed)) {
    return `que ${trimmed}`;
  }

  // 4. Conselho imperativo curto
  if (/não desista/i.test(lower)) {
    return "de não desistir";
  }
  if (/acredite em você/i.test(lower)) {
    return "de acreditar em si mesma";
  }
  if (/continue|força|lute|supere|não desanime|siga em frente|confie|nunca desista/i.test(lower)) {
    return `de que "${trimmed}"`;
  }

  // 5. Memória concreta (mantém fluido)
  if (context === 'memory' && /^(quando|lembro|aquele dia|vez que)/i.test(lower)) {
    return trimmed; 
  }

  // 6. Fallback seguro: isola com aspas
  return `"${trimmed}"`;
}

function buildSeedSentence(
  seed: AuthorVoiceSeed | undefined,
  data: GenRequest,
  rng: () => number,
  style: VariationStyle,
  index: number,
): string {
  if (!seed) return pick(bridgeSentences, rng);

  // REGRA DE OURO: Adaptar sintaticamente o detalhe para evitar quebra gramatical e fundi-lo à narrativa.
  if (data.sharedMemory) {
    const memoryType = classifySharedMemory(data.sharedMemory);
    const adapted = adaptDetailToNaturalNarrative(data.sharedMemory, memoryType);
    
    if (memoryType === "advice") {
      const adviceVariants = [
        `Quero lembrar você ${adapted}.`,
        `Levo sempre comigo ${adapted}.`,
        `Espero que você nunca esqueça ${adapted}.`,
      ];
      return pick(adviceVariants, rng);
    }
    
    if (memoryType === "declaration") {
      const declarationVariants = [
        `Sou grato por ${adapted}.`,
        `Quero que esta mensagem seja um eco do que sinto: ${adapted}.`,
        `Deixo aqui registrado o que meu coração diz: ${adapted}.`,
      ];
      return pick(declarationVariants, rng);
    }
    
    if (memoryType === "memory") {
      const factVariants = [
        `Lembro-me concretamente de ${adapted}, e é por isso que nosso laço é tão valioso.`,
        `Quando penso em ${adapted}, percebo o quanto isso marcou a minha vida e a nossa relação.`,
        `Nunca vou esquecer de ${adapted}. Foi ali que eu entendi o tamanho do seu cuidado.`,
      ];
      return pick(factVariants, rng);
    }

    // Fallback para "other"
    const otherVariants = [
      `Quero que esta mensagem leve até você este sentimento: "${data.sharedMemory.trim()}".`,
      `Deixo esta verdade registrada no meu coração: "${data.sharedMemory.trim()}".`,
      `Este pensamento guia o que sinto por você: "${data.sharedMemory.trim()}".`,
    ];
    return pick(otherVariants, rng);
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
  
  const count = data.length === "curta" ? 2 : data.length === "média" ? 3 : 4;
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

  // LOGS DE AUDITORIA AUTORAL
  console.log("[AUTHOR_BASE]");
  console.log("query:", { intention: data.intention, tone: data.tone, recipient: data.relationship });
  console.log("livros encontrados:", [...new Set(seeds.map(s => s.sourceBook))].join(", "));
  console.log("trechos selecionados:", seeds.slice(0, 2).map(s => s.impact).join(" | "));
  console.log("temas selecionados:", seeds.slice(0, 2).map(s => s.themes.join(", ")).join(" | "));
  console.log("motivo da seleção:", "Score de relevância por intenção, tom e relacionamento");
  
  console.log("[FINAL_PROMPT]");
  console.log("resumo:", `Dados: ${data.name} (${data.relationship}), Ocasião: ${data.occasion}. Base autoral: ${seeds.length} seeds de ${[...new Set(seeds.map(s => s.sourceBook))].join(", ")}.`);

  const prompt = `
Você é o escritor do Alma Escrita, inspirado na voz autoral de Jefferson Rodrigues da Silva. Use os trechos e ensinamentos abaixo como inspiração emocional e espiritual, mas escreva uma mensagem nova, humana, específica e natural para a pessoa informada.

DADOS DO PEDIDO:
- Quem envia: ${data.senderName || "Alguém que te quer bem"}
- Quem recebe: ${data.name || data.recipient}
- Relação: ${data.relationship || data.recipient}
- Ocasião: ${data.occasion || data.intention}
- Detalhe/Memória especial: ${data.sharedMemory || "Foque na essência e nos detalhes concretos da relação."}
- Tom escolhido: ${data.tone}
- Tamanho escolhido: ${data.length} (${lengthGuidance[data.length]})

CONTEXTO AUTORAL (INSPIRAÇÃO, NÃO PARA COPIAR):
${authorContext}

REGRAS ABSOLUTAS DE ESCRITA:
1. ESCREVA DO ZERO: Não use templates, fórmulas ou estruturas fixas. Cada mensagem deve ser única e fluida.
2. NÃO COPIE TRECHOS: Use os temas, vocabulário e ensinamentos acima apenas como inspiração. Nunca cole frases de impacto ou reflexão literalmente.
3. INTEGRE O DETALHE: Se houver um detalhe ou memória, funde-o naturalmente na narrativa. Não o cole de forma bruta ou isolada.
4. DOMÍNIO DA OCASIÃO: Se a ocasião for "Pedido de desculpas" ou similar, a mensagem DEVE conter explicitamente: reconhecimento do erro, arrependimento sincero, pedido de perdão e responsabilidade. É ESTRITAMENTE PROIBIDO transformar um pedido de desculpas em declaração de amor romântico ou mensagem genérica de carinho.
5. TOM E VOZ: Escreva em primeira pessoa (eu) falando diretamente com a pessoa (você). Use a linguagem poética, profunda e acolhedora dos livros, adaptada à relação (ex: pai para filho = proteção e legado; esposa = intimidade e presença).
6. PROIBIÇÕES: Não use palavras como "escrevo", "escrita", "mensagem", "palavras", "texto", "narrativa", "tom", "carta", "oração", "receba isso", "entrego esta mensagem". Não cite "base", "seed", "livro", "poema", "IA", "Gemini" ou "prompt".
7. FORMATO: Entregue SOMENTE o texto final, em parágrafos fluidos. Nada de títulos, listas ou comentários antes/depois.

Mensagens anteriores que NÃO devem ser repetidas nem parafraseadas:
${previousMessages || "- nenhuma nesta sessão"}

Frases e clichês proibidos (bloqueio rigoroso):
${blockedPhrases}
`.trim();

  try {
    const aiText = cleanGeneratedText(await generateAIMsg(prompt));
    
    // VALIDAÇÃO DE NEGÓCIO: Pedido de Desculpas (mantida conforme solicitado)
    const isApology = /pedido de desculpas|desculpa|perdão|erro|errei/i.test(data.occasion || "") || 
                      /pedido de desculpas|desculpa|perdão|erro|errei/i.test(data.intention || "");
    
    let finalText = aiText;

    if (isApology) {
      const lowerText = finalText.toLowerCase();
      const requiredTerms = ["desculpa", "perdão", "errei", "erro", "arrependimento", "responsabilidade"];
      const matchCount = requiredTerms.filter(term => lowerText.includes(term)).length;
      
      if (matchCount < 2) {
        console.log("[VALIDACAO_OCASIAO]");
        console.log("occasion:", data.occasion || data.intention);
        console.log("texto_final:", finalText);
        console.log("resultado: reprovado (usando fallback de segurança)");
        finalText = buildApologyFallback(data);
      } else {
        console.log("[VALIDACAO_OCASIAO]");
        console.log("occasion:", data.occasion || data.intention);
        console.log("texto_final:", finalText);
        console.log("resultado: aprovado");
      }
    }

    return rememberGeneratedMessage(finalText);
  } catch (error) {
    console.warn("IA indisponível, usando base autoral local (fallback):", error);
    const isApology = /pedido de desculpas|desculpa|perdão|erro|errei/i.test(data.occasion || "") || 
                      /pedido de desculpas|desculpa|perdão|erro|errei/i.test(data.intention || "");
    if (isApology) {
        return rememberGeneratedMessage(buildApologyFallback(data));
    }
    return rememberGeneratedMessage(buildFallback(data, seeds));
  }
}
