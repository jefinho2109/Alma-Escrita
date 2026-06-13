/// <reference types="node" />

import crypto from "node:crypto";

type GenRecipient =
  | "mim"
  | "mãe"
  | "pai"
  | "irmão"
  | "irmã"
  | "amigo"
  | "amiga"
  | "esposa"
  | "esposo"
  | "namorado"
  | "namorada"
  | "filho"
  | "filha"
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
  "mãe",
  "pai",
  "irmão",
  "irmã",
  "amigo",
  "amiga",
  "esposa",
  "esposo",
  "namorado",
  "namorada",
  "filho",
  "filha",
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

function normalizeGenRequest(request: GenRequest): GenRequest {
  return {
    recipient: GEN_RECIPIENTS.includes(request.recipient)
      ? request.recipient
      : "mim",
    name: request.name.trim(),
    intention: request.intention.trim(),
    tone: GEN_TONES.includes(request.tone) ? request.tone : "emocionante",
    length: GEN_LENGTHS.includes(request.length) ? request.length : "média",
  };
}

function buildLocalFallbackMessage(request: GenRequest): string {
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

  const sentences = [
    firstSentence,
    secondSentence,
    "Escrevo como quem confessa o que a alma não consegue guardar em silêncio.",
    "Que estas palavras cheguem como abraço, presença e luz no ponto exato onde o coração precisa sentir.",
    "Nem tudo que é profundo precisa ser complicado; às vezes, basta uma palavra sincera para tocar uma vida inteira.",
    "E que fique o essencial: quando a alma fala com amor, até o silêncio entende.",
  ];

  return sentences.slice(0, LENGTH_SENTENCES[data.length]).join(" ");
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

function scoreBookSource(source: BookSource, prompt: string): number {
  const searchable = normalizeForSearch(
    `${source.title} ${source.category} ${source.tags.join(" ")} ${source.tone} ${source.content}`,
  );
  const promptText = normalizeForSearch(prompt);
  const keywords = [
    "romance",
    "amor",
    "saudade",
    "fe",
    "reflexao",
    "superacao",
    "amizade",
    "mae",
    "familia",
    "gratidao",
    "distancia",
    "perdao",
    "casal",
  ];

  return keywords.reduce((score, keyword) => {
    return promptText.includes(keyword) && searchable.includes(keyword)
      ? score + 3
      : score;
  }, 0);
}

async function fetchBookSources(prompt: string): Promise<BookSource[]> {
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
    .sort((a: BookSource, b: BookSource) => scoreBookSource(b, prompt) - scoreBookSource(a, prompt))
    .slice(0, 6);
}

async function enrichPromptWithBookSources(prompt: string): Promise<string> {
  try {
    const sources = await fetchBookSources(prompt);
    if (sources.length === 0) return prompt;

    let used = 0;
    const context = sources
      .map((source, index) => {
        const snippet = source.content.slice(0, 520).trim();
        used += snippet.length;
        if (used > MAX_BOOK_CONTEXT_CHARS) return "";

        return [
          `${index + 1}. Titulo: ${source.title}`,
          `Categoria: ${source.category}`,
          `Tags: ${source.tags.join(", ") || "geral"}`,
          `Tom: ${source.tone}`,
          `Trecho: ${snippet}`,
        ].join("\n");
      })
      .filter(Boolean)
      .join("\n\n");

    if (!context) return prompt;

    const enriched = `
Base dinâmica do Firestore (coleção book_sources).
Use estes trechos apenas como inspiração de tema, tom e sensibilidade.
Não copie frases integralmente, não cite livros, Firestore, base, prompt ou IA.

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

  if (!prompt) {
    return res.status(400).json({ error: "Prompt obrigatorio." });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(413).json({ error: "Prompt muito grande." });
  }

  if (!GEMINI_API_KEY) {
    const structured = parseStructuredPrompt(prompt);
    return res.status(200).json({
      text: buildLocalFallbackMessage(structured),
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
    const finalPrompt = await enrichPromptWithBookSources(prompt);
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
            maxOutputTokens: 420,
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
