import { generateAIMsg } from "@/lib/gemini";
import {
  AUTHOR_VOICE_SEEDS,
  AUTHOR_VOICE_STATS,
  GENERIC_PHRASE_BLOCKLIST,
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
    "que estas palavras cheguem sem pressa, mas com presença inteira.",
    "eu transformo este sentimento em cuidado, porque palavra sincera também é abrigo.",
    "há sentimentos que ficam maiores quando são escritos com alma.",
    "eu escrevo com a delicadeza de quem quer tocar sem invadir e permanecer sem pesar.",
  ],
};

const bridgeSentences = [
  "O que sinto não cabe em frase pronta; precisa respirar com ternura, verdade e um pouco de silêncio.",
  "Dentro desse sentimento existe cuidado, existe escolha e existe uma forma bonita de permanecer.",
  "A vida me ensinou que o que é profundo não precisa repetir caminhos: encontra uma forma nova de chegar.",
  "Entre o que a alma sente e o que a boca consegue dizer, escolho te entregar presença.",
  "Que cada palavra carregue mais do que som: carregue intenção, memória boa e carinho vivo.",
];

const closingSentences = [
  "Que fique em você o essencial: meu carinho é presença, não aparência.",
  "Receba isso como quem recebe uma oração mansa: com verdade, cuidado e paz.",
  "E que o seu coração entenda o que minhas palavras só conseguem começar.",
  "Fica aqui meu afeto, simples por fora e profundo por dentro.",
  "Que esta mensagem encontre em você um lugar bonito para permanecer.",
];

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
  };
}

function destinationFor(data: GenRequest): string {
  if (data.recipient === "mim") return "a própria pessoa que está escrevendo";
  if (data.name) return `${data.recipient} chamada ${data.name}`;
  return data.recipient;
}

function selectAuthorSeeds(data: GenRequest): AuthorVoiceSeed[] {
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
  const tail = shuffle(relevant.slice(8)).slice(0, 8);
  return shuffle([...head, ...tail]).slice(0, 10);
}

function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
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

function buildOpening(data: GenRequest): string {
  if (data.recipient === "mim") return pick(fallbackOpenings.self);

  const address = buildAddress(data);
  const feeling = summarizeIntention(data);
  const variants = [
    `${address}, ${pick(fallbackOpenings.named)}`,
    `${address}, quando penso em ${feeling}, eu encontro uma forma mais bonita de dizer presença.`,
    `${address}, não escrevo para impressionar; escrevo para que você sinta o cuidado que existe aqui.`,
    `${address}, o que trago no peito pede uma palavra nova, dessas que abraçam sem fazer barulho.`,
  ];
  return pick(variants);
}

function pickSeedImage(seed: AuthorVoiceSeed): string {
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
  );
}

function buildSeedSentence(seed: AuthorVoiceSeed | undefined, data: GenRequest, index: number): string {
  const feeling = summarizeIntention(data);
  if (!seed) return pick(bridgeSentences);

  const theme = pick(seed.themes.length > 0 ? seed.themes : [inferCategory(data.intention, data.tone)]);
  const emotion = pick(seed.emotions.length > 0 ? seed.emotions : [data.tone]);
  const image = pickSeedImage(seed);
  const reflection = stripFinalPunctuation(seed.reflection);
  const impact = stripFinalPunctuation(seed.impact);

  const variants = [
    `A imagem de ${image} me lembra que ${lowerFirst(reflection)}, mas hoje isso ganha o tamanho de ${feeling}.`,
    `Entre ${theme} e ${emotion}, eu escolho uma presença que cuida, permanece e não transforma sentimento em frase vazia.`,
    `Fica uma certeza serena: ${lowerFirst(impact)}, e é com essa delicadeza que eu te escrevo.`,
    `O tom que nasce aqui é de ${seed.tone}; por isso cada palavra procura chegar com alma, verdade e ternura.`,
    `${sentenceCase(theme)} não aparece aqui como ideia distante; aparece como gesto, como cuidado e como caminho possível.`,
  ];

  return variants[index % variants.length];
}

function buildClosing(seed: AuthorVoiceSeed | undefined, data: GenRequest): string {
  const theme = seed?.themes[0] || inferCategory(data.intention, data.tone);
  const shouldUseFfp = /fé|motivacional|reflexão|perdão/.test(data.tone) || /f[eé]|luta|cansa|recome/i.test(data.intention);
  const variants = [
    pick(closingSentences),
    `Que ${theme} não seja só palavra, mas uma forma de você sentir cuidado no lugar certo.`,
    shouldUseFfp
      ? "Fé, força e paciência: que essas três palavras sustentem o que ainda precisa florescer."
      : "Que o amor continue dizendo, em silêncio, aquilo que nenhuma pressa consegue explicar.",
    data.name
      ? `${data.name}, que você receba isso como verdade simples, dessas que não precisam se repetir para permanecer.`
      : "Que a alma receba esta mensagem como quem encontra descanso depois de um dia longo.",
  ];

  return pick(variants);
}

function buildFallback(request: GenRequest, seeds: AuthorVoiceSeed[]): string {
  const data = prepareRequest(request);
  const selected = seeds.length > 0 ? seeds : selectAuthorSeeds(data);
  if (selected.length === 0) {
    console.warn(
      "[Alma Escrita] Não encontrei sinais de livros carregados para esta geração; fallback temporário variado ativado.",
    );
  }

  const sentences = [
    buildOpening(data),
    buildSeedSentence(selected[0], data, Math.floor(Math.random() * 5)),
    buildSeedSentence(selected[1], data, Math.floor(Math.random() * 5) + 1),
    pick(bridgeSentences),
    buildClosing(selected[2], data),
  ];

  const count = data.length === "curta" ? 2 : data.length === "média" ? 4 : 5;
  const middle = shuffle(sentences.slice(1, -1));
  const selectedSentences =
    count === 2
      ? [sentences[0]!, middle[0] || sentences[1]!]
      : [sentences[0]!, ...middle.slice(0, count - 2), sentences[sentences.length - 1]!];
  const text = cleanGeneratedText(selectedSentences.join(" "));

  return containsGenericPhrase(text)
    ? cleanGeneratedText(
        [
          buildOpening(data),
          pick(bridgeSentences),
          buildSeedSentence(selected[3], data, Math.floor(Math.random() * 5) + 2),
          buildClosing(selected[4], data),
        ]
          .slice(0, count)
          .join(" "),
      )
    : text;
}

export async function generateBookBasedMessage(
  request: GenRequest,
): Promise<string> {
  const data = prepareRequest(request);
  const category = inferCategory(data.intention, data.tone);
  const seeds = selectAuthorSeeds(data);
  const authorContext = buildAuthorVoiceContext(seeds);
  const blockedPhrases = BLOCKED_PHRASES.map(
    (phrase) => `- "${phrase}"`,
  ).join("\n");

  const prompt = `
Você é a voz autoral do app Alma Escrita Oficial, inspirado nos livros de Jefferson Poeta Sonhador.

Gere UMA mensagem personalizada, original, profunda, emocional e pronta para compartilhar.

Dados do pedido:
- Esta mensagem é para: ${destinationFor(data)}
- Nome da pessoa: ${data.name || "não informado"}
- O que o usuário quer dizer: ${data.intention || "transformar um sentimento simples em uma mensagem bonita e verdadeira"}
- Tom escolhido: ${data.tone}
- Tamanho escolhido: ${data.length} (${lengthGuidance[data.length]})
- Categoria emocional inferida: ${category}

Base autoral ampliada extraída dos livros e poemas do projeto:
- Total de sinais autorais disponíveis no app: ${AUTHOR_VOICE_STATS.totalSeeds}
- Use os sinais abaixo como identidade literária, não como texto para copiar.

${authorContext}

Método autoral obrigatório:
- Use FFP quando houver luta, espera, fé, recomeço ou cansaço: Fé, Força e Paciência.
- Comece por uma verdade emocional concreta, como quem escreve carta, desabafo ou reflexão íntima.
- Aprofunde dor, fé, identidade, silêncio, recomeço, propósito ou saudade conforme o pedido.
- Traga imagem de alma, hoje, caminho, queda, cicatriz, oração, silêncio, presença ou reconstrução quando fizer sentido.
- Termine com uma frase marcante, madura e humana.

Regras de escrita:
- Escreva em português do Brasil.
- Escreva em primeira pessoa quando for mensagem personalizada.
- Fale diretamente com a pessoa quando houver destinatário.
- Não use tom de autoajuda genérica.
- Não use slogans motivacionais.
- Não copie trechos longos literalmente dos livros.
- Não cite "base", "seed", "livro", "poema", "IA", "Gemini" ou "prompt".
- Não use título.
- Não use lista.
- Não invente fatos concretos que o usuário não informou.
- Entregue somente o texto final.

Frases proibidas:
${blockedPhrases}
`.trim();

  try {
    const aiText = cleanGeneratedText(await generateAIMsg(prompt));
    return containsGenericPhrase(aiText) ? buildFallback(data, seeds) : aiText;
  } catch (error) {
    console.warn("IA indisponível, usando base autoral local:", error);
    return buildFallback(data, seeds);
  }
}
