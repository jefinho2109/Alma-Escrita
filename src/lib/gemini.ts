export async function generateAIMsg(prompt: string): Promise<string> {
  const response = await fetch("/api/gemini-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Erro ao gerar mensagem com Gemini");
  }

  const data = await response.json();
  return data?.text?.trim() || "Nao consegui gerar uma mensagem agora.";
}
