import OpenAI from "openai";
import { logger, summarizeErrorReason } from "../logger/index.js";

let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao configurada no .env");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
}

export function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

export async function gerarTexto(prompt, options = {}) {
  const {
    requestId,
    systemPrompt,
    temperature = 0.85,
    maxOutputTokens = 700,
  } = options;

  const model = getModel();
  const openAiStartedAt = Date.now();
  let response;

  try {
    response = await getClient().responses.create({
      model,
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      max_output_tokens: maxOutputTokens,
    });

    logger.info("openai.responses.success", {
      requestId,
      model,
      durationMs: Date.now() - openAiStartedAt,
      success: true,
      httpStatus: 200,
    });
  } catch (error) {
    logger.error("openai.responses.error", {
      requestId,
      model,
      durationMs: Date.now() - openAiStartedAt,
      success: false,
      httpStatus: error?.status || error?.response?.status,
      reason: summarizeErrorReason(error),
    });
    throw error;
  }

  const texto = response.output_text?.trim();

  if (!texto) {
    logger.error("openai.responses.empty", {
      requestId,
      model,
      success: false,
      reason: "empty_output",
    });
    throw new Error("Resposta vazia da OpenAI");
  }

  return texto;
}
