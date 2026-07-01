const OPENAI_DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const OLLAMA_DEFAULT_EMBEDDING_MODEL = "nomic-embed-text";

let openAiClient;

export function getEmbeddingProviderName() {
  const provider = String(process.env.AI_PROVIDER || "openai").trim().toLowerCase();

  if (provider === "ollama" || provider === "openai") {
    return provider;
  }

  throw new Error("AI_PROVIDER invalido. Use \"ollama\" ou \"openai\".");
}

export function getEmbeddingModel() {
  if (getEmbeddingProviderName() === "ollama") {
    return process.env.OLLAMA_EMBEDDING_MODEL || OLLAMA_DEFAULT_EMBEDDING_MODEL;
  }

  return process.env.OPENAI_EMBEDDING_MODEL || OPENAI_DEFAULT_EMBEDDING_MODEL;
}

export function getEmbeddingProviderInfo() {
  return {
    provider: getEmbeddingProviderName(),
    model: getEmbeddingModel(),
  };
}

function normalizeInputs(texts) {
  return texts
    .map((text) => String(text || "").trim())
    .filter(Boolean);
}

async function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao configurada no .env");
  }

  if (!openAiClient) {
    const { default: OpenAI } = await import("openai");
    openAiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openAiClient;
}

async function gerarOpenAiEmbeddings(input, options = {}) {
  const batchSize = Number(options.batchSize || 48);
  const results = [];
  const openai = await getOpenAiClient();

  for (let i = 0; i < input.length; i += batchSize) {
    const batch = input.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: getEmbeddingModel(),
      input: batch,
    });

    for (const item of response.data) {
      results[item.index + i] = item.embedding;
    }
  }

  return results;
}

function getOllamaUrl() {
  return String(process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, "");
}

function createOllamaModelError(model, cause) {
  const error = new Error(
    `Modelo de embeddings do Ollama nao encontrado: ${model}. Rode: ollama pull ${model}`,
  );
  error.code = "ALMA_RAG_OLLAMA_MODEL_MISSING";
  error.cause = cause;
  return error;
}

function createOllamaUnavailableError(model, cause) {
  const error = new Error(
    `Ollama nao respondeu em ${getOllamaUrl()}. Inicie o Ollama e confirme o modelo com: ollama pull ${model}`,
  );
  error.code = "ALMA_RAG_OLLAMA_UNAVAILABLE";
  error.cause = cause;
  return error;
}

function isMissingModelResponse(status, reason) {
  return (
    status === 404 ||
    /model.*not.*found/i.test(reason) ||
    /pull.*model/i.test(reason) ||
    /not found.*try pulling/i.test(reason)
  );
}

async function readOllamaError(response) {
  try {
    const payload = await response.json();
    return String(payload?.error || response.statusText || "erro desconhecido");
  } catch {
    return String(response.statusText || "erro desconhecido");
  }
}

async function gerarOllamaEmbedding(text, model) {
  let response;

  try {
    response = await fetch(`${getOllamaUrl()}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: text,
      }),
    });
  } catch (error) {
    throw createOllamaUnavailableError(model, error);
  }

  if (!response.ok) {
    const reason = await readOllamaError(response);
    if (isMissingModelResponse(response.status, reason)) {
      throw createOllamaModelError(model, new Error(reason));
    }

    const error = new Error(`Ollama embeddings HTTP ${response.status}: ${reason}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const embedding = payload?.embedding;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Resposta vazia de embeddings do Ollama");
  }

  return embedding;
}

async function gerarOllamaEmbeddings(input) {
  const model = getEmbeddingModel();
  const results = [];

  for (const text of input) {
    results.push(await gerarOllamaEmbedding(text, model));
  }

  return results;
}

export async function gerarEmbedding(text) {
  const [embedding] = await gerarEmbeddings([text]);
  return embedding;
}

export async function gerarEmbeddings(texts, options = {}) {
  const input = normalizeInputs(texts);
  if (input.length === 0) return [];

  if (getEmbeddingProviderName() === "ollama") {
    return gerarOllamaEmbeddings(input, options);
  }

  return gerarOpenAiEmbeddings(input, options);
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
