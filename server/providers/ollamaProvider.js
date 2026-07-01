import { logger, summarizeErrorReason } from "../logger/index.js";

export function getModel() {
  return process.env.OLLAMA_MODEL || "qwen2.5:3b";
}

function getOllamaUrl() {
  return String(process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, "");
}

async function readError(response) {
  try {
    const payload = await response.json();
    return payload?.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function gerarTexto(prompt, options = {}) {
  const {
    requestId,
    systemPrompt,
  } = options;

  const model = getModel();
  const temperature = 0.75;
  const maxOutputTokens = 350;
  const topP = 0.9;
  const startedAt = Date.now();
  let payload;
  let httpStatus;

  try {
    const response = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature,
          top_p: topP,
          num_predict: maxOutputTokens,
        },
      }),
    });
    httpStatus = response.status;

    if (!response.ok) {
      const reason = await readError(response);
      const error = new Error(`Ollama HTTP ${response.status}: ${reason}`);
      error.status = response.status;
      throw error;
    }

    payload = await response.json();
  } catch (error) {
    logger.error("ollama.generate.error", {
      requestId,
      model,
      durationMs: Date.now() - startedAt,
      success: false,
      httpStatus: error?.status || httpStatus,
      reason: summarizeErrorReason(error),
    });
    throw error;
  }

  const texto = payload?.response?.trim();

  if (!texto) {
    logger.error("ollama.generate.empty", {
      requestId,
      model,
      success: false,
      reason: "empty_output",
    });
    throw new Error("Resposta vazia do Ollama");
  }

  logger.info("ollama.generate.success", {
    requestId,
    model,
    durationMs: Date.now() - startedAt,
    success: true,
    httpStatus,
  });

  return texto;
}
