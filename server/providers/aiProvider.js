import * as ollamaProvider from "./ollamaProvider.js";
import * as openaiProvider from "./openaiProvider.js";

const PROVIDERS = {
  ollama: ollamaProvider,
  openai: openaiProvider,
};

export function getAiProviderName() {
  const provider = String(process.env.AI_PROVIDER || "openai").trim().toLowerCase();

  if (provider === "ollama" || provider === "openai") {
    return provider;
  }

  throw new Error("AI_PROVIDER invalido. Use \"ollama\" ou \"openai\".");
}

function getProvider() {
  return PROVIDERS[getAiProviderName()];
}

export function getAiProviderInfo() {
  const provider = getAiProviderName();

  return {
    provider,
    model: PROVIDERS[provider].getModel(),
  };
}

export async function gerarTexto(prompt, options = {}) {
  return getProvider().gerarTexto(prompt, options);
}
