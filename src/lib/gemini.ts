export async function generateAIMsg(prompt: string): Promise<string> {
  const response = await fetch("/api/gemini-message", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    body: JSON.stringify({
      prompt,
      requestNonce:
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Erro ao gerar mensagem com Gemini");
  }

  const data = await response.json();
  if (data?.fallback) {
    throw new Error("Gemini indisponível; usando fallback autoral local");
  }

  return data?.text?.trim() || "Nao consegui gerar uma mensagem agora.";
}
