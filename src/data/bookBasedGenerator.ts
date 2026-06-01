import { generateAIMsg } from "@/lib/gemini";
import {
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

  return GENERIC_PHRASE_BLOCKLIST.some((phrase) =>
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

function destinationFor(data: GenRequest): string {
  if (data.recipient === "mim") return "a própria pessoa que está escrevendo";
  if (data.name) return `${data.recipient} chamada ${data.name}`;
  return data.recipient;
}

function selectAuthorSeeds(data: GenRequest): AuthorVoiceSeed[] {
  return findAuthorVoiceSeeds({
    intention: `${data.intention} ${inferCategory(data.intention, data.tone)}`,
    tone: data.tone,
    recipient: data.recipient,
    limit: 10,
  });
}

function sentenceFromSeed(seed: AuthorVoiceSeed, index: number): string {
  const reflection = seed.reflection
    .replace(/[.!?]+$/g, "")
    .replace(/^./, (char) => char.toLowerCase());
  const impact = seed.impact
    .replace(/[.!?]+$/g, "")
    .replace(/^./, (char) => char.toLowerCase());

  if (index % 3 === 0) {
    return `Existe uma verdade por trás disso: ${reflection}.`;
  }
  if (index % 3 === 1) {
    return `Eu aprendi a não apressar o processo, porque ${impact}.`;
  }
  return "Eu não quero enfeitar a dor nem diminuir o que é profundo; quero que isso chegue como presença, cuidado e verdade.";
}

function buildFallback(request: GenRequest, seeds: AuthorVoiceSeed[]): string {
  const data = normalizeGenRequest(request);
  const selected = seeds.length > 0 ? seeds : selectAuthorSeeds(data);
  const primary = selected[0];
  const secondary = selected[1] || primary;
  const third = selected[2] || secondary;
  const nameOrRecipient =
    data.recipient === "mim"
      ? "Hoje"
      : data.name
        ? data.name
        : data.recipient.charAt(0).toUpperCase() + data.recipient.slice(1);

  const intentionLine = data.intention
    ? `eu guardei com cuidado o que você queria dizer: ${data.intention}.`
    : "Eu precisava transformar em palavra aquilo que a alma sente antes da boca conseguir explicar.";

  const opener =
    data.recipient === "mim"
      ? `${nameOrRecipient}, eu volto para mim sem pressa, porque algumas curas começam quando a gente para de fugir da própria verdade.`
      : `${nameOrRecipient}, ${intentionLine}`;

  const sentences = [
    opener,
    primary ? sentenceFromSeed(primary, 0) : "Eu escrevo com fé, força e paciência, sem pressa de parecer bem.",
    secondary ? sentenceFromSeed(secondary, 1) : "A alma também precisa de tempo para aprender a respirar de novo.",
    third ? sentenceFromSeed(third, 2) : "O que é profundo não precisa gritar para permanecer.",
    primary?.impact || "Fé, força e paciência: três passos para não entregar a alma ao cansaço.",
  ];

  const count = data.length === "curta" ? 2 : data.length === "média" ? 4 : 5;
  return cleanGeneratedText(sentences.slice(0, count).join(" "));
}

export async function generateBookBasedMessage(
  request: GenRequest,
): Promise<string> {
  const data = normalizeGenRequest(request);
  const category = inferCategory(data.intention, data.tone);
  const seeds = selectAuthorSeeds(data);
  const authorContext = buildAuthorVoiceContext(seeds);
  const blockedPhrases = GENERIC_PHRASE_BLOCKLIST.map(
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
