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

function compactConcreteSignal(
  request: RequestLike,
  universeKey: EmotionalUniverseKey,
): string {
  const raw = [
    request.sharedMemory,
    request.messageStart,
    request.intention,
  ].find((value) => {
    const normalized = normalizeUniverseText(value || "");
    return (
      normalized.length > 3 &&
      !/^uma mensagem especial$/.test(normalized) &&
      !/^nao informado$/.test(normalized)
    );
  });

  if (!raw) return "";

  const cleaned = raw
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?;:]+$/g, "")
    .trim();

  if (!cleaned || detectForbiddenTerms(cleaned, EMOTIONAL_UNIVERSES[universeKey]).length > 0) {
    return "";
  }

  const words = cleaned.match(/[A-Za-zÀ-ÿ0-9]+(?:[-'][A-Za-zÀ-ÿ0-9]+)*/g) || [];
  return words.slice(0, 10).join(" ").toLocaleLowerCase("pt-BR");
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

export function buildPremiumEmotionalUniverseFallback(request: RequestLike): string {
  const name = fallbackName(request);
  const universe = resolveEmotionalUniverse(request);
  const concreteSignal = compactConcreteSignal(request, universe.key);
  const memoryByUniverse: Record<EmotionalUniverseKey, string> = {
    amor: concreteSignal || "seu jeito de chegar perto de mim",
    fe: concreteSignal || "o que ainda tenho colocado em oração",
    amizade: concreteSignal || "os momentos em que sua parceria me sustentou",
    pedido_desculpas: concreteSignal || "o que eu fiz e preciso reparar",
    gratidao: concreteSignal || "o cuidado que recebi de você",
    reflexao: concreteSignal || "o que este tempo tem me mostrado",
    motivacao: concreteSignal || "o esforço que ninguém vê por inteiro",
    aniversario: concreteSignal || "a alegria de celebrar sua vida",
  };
  const memory = memoryByUniverse[universe.key];

  const messages: Record<EmotionalUniverseKey, string> = {
    amor: `${name}, quando penso em ${memory}, meu peito fica mais honesto do que eu consigo disfarçar. Eu sinto carinho, saudade e um desejo respeitoso de estar perto, não por costume, mas porque sua presença mudou o lugar das coisas dentro de mim. Gosto da sua forma de me alcançar nos detalhes, da admiração que cresce quando lembro do seu sorriso e da escolha que faço quando penso em nós. Esse romance aparece no cuidado, no companheirismo e na verdade do que eu sinto. Eu queria que você soubesse, sem rodeio, que meu amor por você é presença que fica.`,
    fe: `${name}, quando penso em ${memory}, eu levo tudo a Deus com menos pressa e mais confiança. Há dias em que minha oração não vem perfeita, mas vem sincera, porque eu ainda acredito que a esperança encontra caminho mesmo quando a resposta demora. Peço que Deus fortaleça seu propósito, guarde sua espiritualidade e renove sua confiança nos detalhes que ninguém vê. Eu também aprendo a descansar, a respirar e a não soltar a fé quando o coração cansa. Que você se sinta amparada por dentro, como quem descobre que a paz pode chegar devagar e ainda assim chegar inteira.`,
    amizade: `${name}, quando lembro de ${memory}, eu reconheço o quanto sua amizade tem sido apoio de verdade. Você não aparece apenas nos dias leves; sua parceria também se mostra quando a vida pede escuta, lealdade e presença sem espetáculo. Isso me toca mais do que talvez eu consiga dizer, porque companheirismo assim não se encontra em qualquer lugar. Eu valorizo sua forma de permanecer, de acolher e de fazer a caminhada parecer menos pesada. Que você saiba que pode contar comigo também, com a mesma sinceridade. Nossa amizade é um desses vínculos que dão coragem para continuar sendo quem a gente é.`,
    pedido_desculpas: `${name}, quando encaro ${memory}, eu não quero fugir da responsabilidade que me cabe. Eu errei, e reconhecer isso dói porque sei que minhas atitudes tocaram um lugar que merecia cuidado. Sinto arrependimento sincero, com a consciência clara do que preciso mudar em mim. Peço perdão com respeito, sem exigir que você esqueça depressa ou finja que nada aconteceu. Quero reconstrução com atitudes, paciência e coerência, mesmo que leve tempo. Se ainda houver espaço, desejo reparar o que ficou ferido e provar, no cotidiano, que aprendi com essa falha.`,
    gratidao: `${name}, quando lembro de ${memory}, minha gratidão deixa de ser ideia e vira reconhecimento vivo. Seu cuidado teve impacto real em mim; não foi apenas uma gentileza passando pelo dia, foi apoio que ficou guardado e me fez sentir visto de um jeito importante. Eu reconheço sua importância na minha história, nos gestos pequenos, na presença que sustentou e na lembrança que ainda aquece por dentro. Talvez você nem tenha percebido o quanto fez diferença, mas eu percebi. Por isso agradeço com sinceridade: o que veio de você me alcançou, me marcou e merece ser lembrado com carinho.`,
    reflexao: `${name}, quando penso em ${memory}, percebo que o aprendizado não chegou como resposta pronta. Ele veio me pedindo maturidade, tempo e coragem para olhar com mais verdade para o que eu sinto. Algumas coisas só amadurecem quando a gente para de fugir do próprio silêncio e aceita crescer por dentro. Quero reconhecer o que mudou em mim, o que ainda precisa de cuidado e o que já não posso carregar do mesmo jeito. Se existe crescimento aqui, ele começa nessa honestidade simples: aprender também é admitir que certas fases nos tornam mais humanos.`,
    motivacao: `${name}, quando penso em ${memory}, eu vejo uma força que talvez você mesma nem consiga medir. Há coragem no jeito como você continua, mesmo quando o recomeço parece pequeno e ninguém enxerga o esforço por trás do seu silêncio. Sua perseverança não precisa fazer barulho para ter valor; ela aparece no passo que você dá cansada, na decisão de tentar de novo e na vontade de não desistir de si. Eu queria que você se lembrasse disso nos dias difíceis: ainda existe vida esperando sua firmeza. Continue. O que você está construindo por dentro também é vitória.`,
    aniversario: `${name}, quando penso em ${memory}, celebrar sua vida ganha um sentido mais bonito. Hoje não é só uma data; é a alegria de reconhecer sua presença, sua história e o bem que você deixa nos lugares por onde passa. Desejo que este novo ciclo venha com bênçãos, saúde, encontros sinceros e lembranças que façam seu coração sorrir sem esforço. Que você receba carinho de quem conhece seu valor e alegria de quem torce por você de verdade. Minha vontade é que este dia abrace sua vida com leveza e permaneça como uma lembrança feliz, simples e inteira.`,
  };

  return messages[universe.key];
}
