import type { GenRequest, GenTone } from "@/data/generator";

export interface UserEmotionContext {
  tone?: GenTone;
  relationship?: string;
  occasion?: string;
  recipient?: string;
  source?: "importantDetail" | "messageStart" | "intention";
}

export interface UserEmotionInterpretation {
  intention: string;
  tags: string[];
}

const DEFAULT_INTENTION = "sentimento sincero de cuidado, presença e afeto humano";

function normalizeInput(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\bbb\b/g, "bebê")
    .replace(/\bvc\b/g, "você")
    .replace(/\bvoce\b/g, "você")
    .replace(/\bpra\b/g, "para")
    .replace(/\bnao\b/g, "não")
    .replace(/\bte amo mto\b/g, "te amo muito")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlankIntention(input: string): boolean {
  const normalized = normalizeInput(input);
  return (
    !normalized ||
    normalized === "uma mensagem especial" ||
    normalized === "não informado"
  );
}

export function humanizeInterpretedEmotion(input: string | undefined): string {
  const normalized = normalizeInput(input || "");

  if (!normalized) return "";
  if (/sentimento sincero de cuidado|presenca e afeto humano/.test(normalized)) {
    return "o cuidado que eu guardo por você";
  }
  if (/pedido de perdao|pedido de desculpas|reafirmacao de amor|arrependimento|reconstrucao/.test(normalized)) {
    return "o cuidado que eu preciso reconstruir com você";
  }
  if (/amor profundo|amor declarado|carinho intimo|desejo respeitoso|saudade/.test(normalized)) {
    return "o amor que sinto por você";
  }
  if (/importancia da pessoa|importante|reconhecimento afetivo/.test(normalized)) {
    return "o quanto você importa para mim";
  }
  if (/escolha marcante|escolha feliz|certeza afetiva/.test(normalized)) {
    return "a escolha feliz que fiz por você";
  }
  if (/encorajamento|perseveranca|coragem|forca/.test(normalized)) {
    return "a força que eu desejo ver crescer em você";
  }
  if (/gratidao sincera|cuidado recebido|impacto emocional do apoio|apoio/.test(normalized)) {
    return "o cuidado que recebi de você";
  }
  if (/confianca em deus|oracao|esperanca|fortalecimento espiritual/.test(normalized)) {
    return "a confiança que entrego a Deus";
  }
  if (/aprendizado emocional|maturidade|crescimento interior/.test(normalized)) {
    return "o que este tempo tem me mostrado por dentro";
  }
  if (/celebracao da vida|novo ciclo|alegria/.test(normalized)) {
    return "a alegria de celebrar sua vida";
  }

  return input?.replace(/\s+/g, " ").trim() || "";
}

function fromTone(tone?: GenTone): UserEmotionInterpretation {
  switch (tone) {
    case "romântica":
      return {
        intention: "amor declarado, carinho íntimo, saudade e desejo respeitoso de presença",
        tags: ["amor", "carinho", "presença"],
      };
    case "gratidão":
      return {
        intention: "gratidão sincera, reconhecimento da importância da pessoa e impacto do cuidado recebido",
        tags: ["gratidão", "reconhecimento", "importância"],
      };
    case "perdão":
      return {
        intention: "pedido de perdão com responsabilidade, arrependimento e desejo de reconstrução",
        tags: ["perdão", "responsabilidade", "reconstrução"],
      };
    case "motivacional":
      return {
        intention: "encorajamento com coragem, força e perseverança para continuar",
        tags: ["motivação", "coragem", "perseverança"],
      };
    case "fé":
      return {
        intention: "confiança em Deus, oração, esperança e fortalecimento espiritual",
        tags: ["fé", "Deus", "oração"],
      };
    case "reflexão":
      return {
        intention: "aprendizado emocional, maturidade, tempo e crescimento interior",
        tags: ["reflexão", "aprendizado", "maturidade"],
      };
    default:
      return {
        intention: DEFAULT_INTENTION,
        tags: ["afeto", "presença"],
      };
  }
}

export function interpretUserEmotion(
  input: string | undefined,
  context: UserEmotionContext = {},
): UserEmotionInterpretation {
  if (!input || isBlankIntention(input)) {
    return fromTone(context.tone);
  }

  const normalized = normalizeInput(input);

  if (/você pode pensar que não te amo|acha que eu não te amo|pensar que eu não te amo|duvida que eu te amo|duvidar do meu amor/.test(normalized)) {
    return {
      intention: "pedido de perdão com responsabilidade, cuidado pela dor causada e reafirmação de amor",
      tags: ["perdão", "responsabilidade", "amor"],
    };
  }

  if (/eu te amo|te amo|amo você|amo muito|amor da minha vida|meu amor|bebê|beijo|beijar|lábios|desejo/.test(normalized)) {
    return {
      intention: "amor profundo, carinho íntimo, saudade e desejo respeitoso de estar perto",
      tags: ["amor", "carinho", "desejo respeitoso"],
    };
  }

  if (/você é importante para mim|você e importante para mim|importante para mim|importância para mim|importa muito para mim|faz diferença na minha vida/.test(normalized)) {
    return {
      intention: "importância da pessoa na vida do remetente, reconhecimento afetivo e gratidão sincera",
      tags: ["importância", "reconhecimento", "gratidão"],
    };
  }

  if (/melhor escolha|minha melhor escolha|foi minha escolha|escolhi você|escolher você|escolha feliz|escolha marcante/.test(normalized)) {
    return {
      intention: "escolha marcante e feliz, admiração pela pessoa e certeza afetiva",
      tags: ["escolha", "admiração", "amor"],
    };
  }

  if (/não desista|nao desista|continue firme|continua firme|siga em frente|força|forca|você consegue|voce consegue|acredite em você|acredite em voce/.test(normalized)) {
    return {
      intention: "encorajamento com apoio, coragem e perseverança para continuar",
      tags: ["motivação", "coragem", "apoio"],
    };
  }

  if (/obrigad|agradec|gratidão|gratidao|reconheç|reconhec|cuidado|apoio|me ajudou|esteve comigo/.test(normalized)) {
    return {
      intention: "gratidão sincera pelo cuidado recebido, reconhecimento da importância da pessoa e impacto emocional do apoio",
      tags: ["gratidão", "cuidado", "reconhecimento"],
    };
  }

  if (/desculp|perdão|perdao|errei|erro|falhei|arrepend/.test(normalized)) {
    return {
      intention: "pedido de desculpas com reconhecimento do erro, responsabilidade, arrependimento e desejo de reconstrução",
      tags: ["perdão", "erro", "responsabilidade"],
    };
  }

  if (/saudade|sinto sua falta|falta de você|distância|distancia/.test(normalized)) {
    return {
      intention: "saudade afetiva, falta da presença da pessoa e desejo respeitoso de aproximação",
      tags: ["saudade", "presença", "afeto"],
    };
  }

  if (/parabéns|parabens|aniversário|aniversario|feliz vida|novo ciclo/.test(normalized)) {
    return {
      intention: "celebração da vida da pessoa, alegria pelo novo ciclo e carinho sincero",
      tags: ["aniversário", "celebração", "alegria"],
    };
  }

  if (/deus|fé|fe|oração|oracao|ore|esperança|esperanca|propósito|proposito/.test(normalized)) {
    return {
      intention: "confiança em Deus, oração, esperança e fortalecimento espiritual",
      tags: ["fé", "oração", "esperança"],
    };
  }

  return fromTone(context.tone);
}

export function interpretGenerationRequest(request: GenRequest): GenRequest {
  const baseContext: UserEmotionContext = {
    tone: request.tone,
    relationship: request.relationship,
    occasion: request.occasion,
    recipient: request.recipient,
  };
  const importantDetail = interpretUserEmotion(request.sharedMemory || request.intention, {
    ...baseContext,
    source: "importantDetail",
  });
  const messageStart = interpretUserEmotion(request.messageStart, {
    ...baseContext,
    source: "messageStart",
  });
  const primary = request.messageStart?.trim() ? messageStart : importantDetail;

  return {
    ...request,
    intention: primary.intention,
    sharedMemory: importantDetail.intention,
    messageStart: request.messageStart?.trim() ? messageStart.intention : undefined,
    previousMessages: request.previousMessages,
    generationId: request.generationId,
  };
}
