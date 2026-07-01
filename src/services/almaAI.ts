import type { GenMood, GenRecipient } from "@/data/generator";

export interface AlmaMessageRequest {
  name: string;
  mood: GenMood;
  recipient: GenRecipient;
  tema?: string;
}

interface AlmaMessageResponse {
  mensagem?: string;
  error?: string;
}

const MOTOR_ALMA_URL =
  import.meta.env.VITE_MOTOR_ALMA_URL || "http://localhost:3333";

export async function gerarMensagemComMotorAlma(
  request: AlmaMessageRequest,
): Promise<string> {
  const response = await fetch(`${MOTOR_ALMA_URL}/api/gerar-mensagem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const data = (await response.json().catch(() => ({}))) as AlmaMessageResponse;

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel gerar a mensagem.");
  }

  const message =
    typeof data.mensagem === "string" ? data.mensagem.trim() : "";
  if (!message) {
    throw new Error("O Motor Alma retornou uma mensagem vazia.");
  }

  return message;
}
