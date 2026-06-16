import type { GenRequest, GenTone } from "@/data/generator";

export type EmotionalUniverseKey =
  | "amor"
  | "fe"
  | "amizade"
  | "pedido_desculpas"
  | "gratidao"
  | "reflexao"
  | "motivacao"
  | "aniversario";

type RequestLike = Pick<
  GenRequest,
  | "name"
  | "recipient"
  | "relationship"
  | "occasion"
  | "intention"
  | "sharedMemory"
  | "messageStart"
  | "tone"
  | "length"
>;

interface RequiredGroup {
  label: string;
  terms: string[];
}

interface EmotionalUniverse {
  key: EmotionalUniverseKey;
  label: string;
  allowed: string[];
  blocked: string[];
  required?: RequiredGroup[];
}

const SPIRITUAL_BLOCKS = [
  "Deus",
  "fé",
  "oração",
  "orar",
  "alma",
  "esperança espiritual",
  "espiritual",
  "espiritualidade",
  "Senhor",
  "milagre",
  "céu",
  "propósito divino",
];

const ROMANTIC_BLOCKS = [
  "romance",
  "romântico",
  "paixão",
  "apaixonado",
  "beijo",
  "beijar",
  "lábios",
  "desejo",
  "meu amor",
  "minha vida",
  "namorado",
  "namorada",
  "casal",
];

export const EMOTIONAL_UNIVERSES: Record<
  EmotionalUniverseKey,
  EmotionalUniverse
> = {
  amor: {
    key: "amor",
    label: "AMOR",
    allowed: [
      "carinho",
      "afeto",
      "presença",
      "saudade",
      "desejo respeitoso",
      "admiração",
      "companheirismo",
      "escolha",
      "romance",
    ],
    blocked: [...SPIRITUAL_BLOCKS, "esperança"],
    required: [
      {
        label: "amor/afeto",
        terms: [
          "amor",
          "amo",
          "carinho",
          "afeto",
          "saudade",
          "desejo",
          "admiração",
          "companheirismo",
          "escolha",
          "romance",
        ],
      },
    ],
  },
  fe: {
    key: "fe",
    label: "FÉ",
    allowed: [
      "Deus",
      "oração",
      "esperança",
      "propósito",
      "confiança",
      "espiritualidade",
    ],
    blocked: ROMANTIC_BLOCKS,
    required: [
      {
        label: "fé/espiritualidade",
        terms: ["Deus", "fé", "oração", "esperança", "propósito", "confiança", "espiritualidade"],
      },
    ],
  },
  amizade: {
    key: "amizade",
    label: "AMIZADE",
    allowed: ["apoio", "parceria", "lealdade", "companheirismo", "presença"],
    blocked: ROMANTIC_BLOCKS,
    required: [
      {
        label: "amizade/apoio",
        terms: [
          "amizade",
          "amigo",
          "amiga",
          "apoio",
          "parceria",
          "lealdade",
          "companheirismo",
          "presença",
        ],
      },
    ],
  },
  pedido_desculpas: {
    key: "pedido_desculpas",
    label: "PEDIDO DE DESCULPAS",
    allowed: ["erro", "responsabilidade", "arrependimento", "perdão", "reconstrução"],
    blocked: [...SPIRITUAL_BLOCKS, ...ROMANTIC_BLOCKS],
    required: [
      { label: "erro", terms: ["erro", "errei", "falha", "falhei"] },
      {
        label: "responsabilidade",
        terms: ["responsabilidade", "assumo", "assumir", "responsável"],
      },
      {
        label: "arrependimento",
        terms: ["arrependimento", "arrependido", "arrependida", "sinto muito"],
      },
      { label: "perdão", terms: ["perdão", "desculpa", "desculpas", "perdoe"] },
      {
        label: "reconstrução",
        terms: ["reconstrução", "reconstruir", "reconstruirmos", "reparar"],
      },
    ],
  },
  gratidao: {
    key: "gratidao",
    label: "GRATIDÃO",
    allowed: ["reconhecimento", "importância", "lembrança", "gratidão"],
    blocked: [...SPIRITUAL_BLOCKS, ...ROMANTIC_BLOCKS],
    required: [
      {
        label: "gratidão/reconhecimento",
        terms: ["gratidão", "agradeço", "agradecer", "obrigado", "obrigada", "reconhecimento", "importância"],
      },
    ],
  },
  reflexao: {
    key: "reflexao",
    label: "REFLEXÃO",
    allowed: ["aprendizado", "maturidade", "tempo", "crescimento"],
    blocked: [...SPIRITUAL_BLOCKS, ...ROMANTIC_BLOCKS],
    required: [
      {
        label: "reflexão/aprendizado",
        terms: ["aprendizado", "aprendi", "maturidade", "tempo", "crescimento", "reflexão"],
      },
    ],
  },
  motivacao: {
    key: "motivacao",
    label: "MOTIVAÇÃO",
    allowed: ["coragem", "recomeço", "força", "perseverança"],
    blocked: [...SPIRITUAL_BLOCKS, ...ROMANTIC_BLOCKS],
    required: [
      {
        label: "motivação/coragem",
        terms: ["coragem", "recomeço", "força", "perseverança", "seguir", "continuar"],
      },
    ],
  },
  aniversario: {
    key: "aniversario",
    label: "ANIVERSÁRIO",
    allowed: ["celebração", "alegria", "vida", "bênçãos"],
    blocked: [...SPIRITUAL_BLOCKS, ...ROMANTIC_BLOCKS],
    required: [
      {
        label: "aniversário/celebração",
        terms: ["aniversário", "parabéns", "celebração", "alegria", "vida", "bênçãos"],
      },
    ],
  },
};

const toneToUniverse: Partial<Record<GenTone, EmotionalUniverseKey>> = {
  romântica: "amor",
  fé: "fe",
  gratidão: "gratidao",
  perdão: "pedido_desculpas",
  motivacional: "motivacao",
  reflexão: "reflexao",
};

export function normalizeUniverseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function includesTerm(text: string, term: string): boolean {
  const normalizedText = ` ${normalizeUniverseText(text)} `;
  const normalizedTerm = normalizeUniverseText(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^a-z0-9])${normalizedTerm.replace(/\s+/g, "\\s+")}([^a-z0-9]|$)`);
  return pattern.test(normalizedText);
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => includesTerm(text, term));
}

export function resolveEmotionalUniverse(request: RequestLike): EmotionalUniverse {
  const joined = normalizeUniverseText(
    [
      request.tone,
      request.occasion,
      request.relationship,
      request.recipient,
      request.intention,
      request.sharedMemory,
      request.messageStart,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (
    request.tone === "perdão" ||
    /pedido de desculpas|desculpa|perdao|erro|errei|arrepend/.test(joined)
  ) {
    return EMOTIONAL_UNIVERSES.pedido_desculpas;
  }

  if (/aniversario|celebracao|parabens/.test(joined)) {
    return EMOTIONAL_UNIVERSES.aniversario;
  }

  const byTone = toneToUniverse[request.tone];
  if (byTone) return EMOTIONAL_UNIVERSES[byTone];

  if (/amig/.test(joined)) return EMOTIONAL_UNIVERSES.amizade;

  return EMOTIONAL_UNIVERSES.reflexao;
}

export function detectForbiddenTerms(
  text: string,
  universe: EmotionalUniverse,
): string[] {
  const found = new Set<string>();
  for (const term of universe.blocked) {
    if (includesTerm(text, term)) found.add(term);
  }
  return [...found];
}

export function missingRequiredGroups(
  text: string,
  universe: EmotionalUniverse,
): string[] {
  if (!universe.required) return [];
  return universe.required
    .filter((group) => !hasAny(text, group.terms))
    .map((group) => group.label);
}

export function validateEmotionalUniverseText(
  text: string,
  request: RequestLike,
): {
  ok: boolean;
  universe: EmotionalUniverse;
  forbiddenTerms: string[];
  missingRequired: string[];
} {
  const universe = resolveEmotionalUniverse(request);
  const forbiddenTerms = detectForbiddenTerms(text, universe);
  const missingRequired = missingRequiredGroups(text, universe);
  return {
    ok: forbiddenTerms.length === 0 && missingRequired.length === 0,
    universe,
    forbiddenTerms,
    missingRequired,
  };
}

export function isTextAllowedInUniverse(
  text: string,
  universeKey: EmotionalUniverseKey,
): boolean {
  return detectForbiddenTerms(text, EMOTIONAL_UNIVERSES[universeKey]).length === 0;
}

export function buildUniversePromptBlock(universe: EmotionalUniverse): string {
  const required = universe.required?.length
    ? `\nVocabulário obrigatório: ${universe.required.map((group) => group.label).join(", ")}.`
    : "";

  return [
    `UNIVERSO EMOCIONAL ATIVO: ${universe.label}.`,
    `Use preferencialmente este campo semântico: ${universe.allowed.join(", ")}.`,
    `Não misture com outros universos. Termos e imagens bloqueados para este tipo: ${universe.blocked.join(", ")}.${required}`,
  ].join("\n");
}

export function buildValidationRetryInstruction(
  validation: ReturnType<typeof validateEmotionalUniverseText>,
): string {
  const reasons = [
    validation.forbiddenTerms.length
      ? `remova totalmente: ${validation.forbiddenTerms.join(", ")}`
      : "",
    validation.missingRequired.length
      ? `inclua obrigatoriamente: ${validation.missingRequired.join(", ")}`
      : "",
  ].filter(Boolean);

  return [
    "A versão anterior foi rejeitada pela validação automática de universo emocional.",
    `Tipo correto: ${validation.universe.label}.`,
    reasons.join("; "),
    "Gere uma nova versão do zero, sem explicar a correção.",
  ]
    .filter(Boolean)
    .join("\n");
}

function fallbackName(request: RequestLike): string {
  return request.name?.trim() || "você";
}

export function buildEmotionalUniverseFallback(request: RequestLike): string {
  const name = fallbackName(request);
  const universe = resolveEmotionalUniverse(request);

  const messages: Record<EmotionalUniverseKey, string> = {
    amor: `${name}, eu sinto carinho por você de um jeito que pede presença, afeto e cuidado. A saudade aumenta meu desejo respeitoso de estar perto, admirando seus detalhes e escolhendo esse romance com companheirismo.`,
    fe: `${name}, sigo confiando em Deus e levando em oração o que ainda precisa amadurecer. Que a esperança fortaleça seu propósito e renove sua confiança com serenidade espiritual.`,
    amizade: `${name}, sua presença tem valor de parceria verdadeira. Obrigado pelo apoio, pela lealdade e pelo companheirismo que tornam nossa amizade um lugar de cuidado sincero.`,
    pedido_desculpas: `${name}, reconheço meu erro e assumo a responsabilidade pelo que aconteceu. Sinto arrependimento sincero, peço perdão de coração e quero reconstruir a confiança com atitudes melhores.`,
    gratidao: `${name}, guardo reconhecimento pela sua importância na minha vida. Cada lembrança do seu cuidado aumenta minha gratidão e me faz valorizar ainda mais o que você representa.`,
    reflexao: `${name}, este momento me chama para aprendizado e maturidade. O tempo mostra caminhos de crescimento, e eu quero acolher essa fase com calma e consciência.`,
    motivacao: `${name}, respire e siga com coragem. Todo recomeço pede força, mas a perseverança transforma passos pequenos em uma caminhada firme.`,
    aniversario: `${name}, hoje é dia de celebração, alegria e vida. Que este novo ciclo chegue com bênçãos, boas lembranças e motivos bonitos para sorrir.`,
  };

  return messages[universe.key];
}
