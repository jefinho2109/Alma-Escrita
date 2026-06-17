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

export function buildPremiumEmotionalUniverseFallback(request: RequestLike): string {
  const name = fallbackName(request);
  const universe = resolveEmotionalUniverse(request);

  const messages: Record<EmotionalUniverseKey, string> = {
    amor: `${name}, o que sinto por você nasce do carinho e ganha presença nos detalhes. Há saudade no modo como penso no seu sorriso, no desejo respeitoso de estar perto e na admiração que cresce quando percebo sua forma de existir. Não é só romance bonito; é escolha diária, afeto cuidado e companheirismo que me fazem querer ser melhor ao seu lado. Eu gosto da calma que você desperta, da lembrança que fica depois de cada encontro e desse sentimento que não precisa correr para ser inteiro. Que você sinta, com ternura, o quanto é especial para mim, hoje e sempre.`,
    fe: `${name}, entrego este momento a Deus com confiança, porque nem sempre a caminhada revela tudo de uma vez. Há dias em que a oração sustenta o que a pressa não resolve e a esperança renova por dentro aquilo que parecia cansado. Que seu coração encontre propósito mesmo nas esperas, serenidade nos processos e espiritualidade para seguir sem perder a paz. Eu creio que Deus cuida dos detalhes, fortalece a fé no silêncio e abre caminhos quando chega a hora certa. Que você continue firme, amparada e confiante, lembrando que nenhuma estação difícil precisa ser atravessada sem luz e segura por dentro.`,
    amizade: `${name}, sua amizade tem um valor que eu reconheço com respeito e alegria. Em muitos momentos, seu apoio chegou sem precisar de grandes explicações, como parceria sincera de quem sabe permanecer por perto. A lealdade que existe entre nós me lembra que amizade verdadeira não vive de aparência, mas de presença, escuta e companheirismo nos dias bons e nos difíceis. Eu agradeço por poder contar com você, pela confiança que nasceu com o tempo e pela leveza que sua presença traz. Que esse vínculo continue firme, cuidado e bonito, porque amizades assim tornam a caminhada mais humana e mais possível.`,
    pedido_desculpas: `${name}, eu quero reconhecer meu erro com responsabilidade, sem tentar diminuir o que aconteceu ou justificar o que feriu você. Sinto arrependimento sincero e entendo que perdão não se exige; ele se pede com respeito, paciência e atitudes coerentes. Se minhas escolhas causaram dor, eu assumo a parte que me cabe e desejo reparar com mais cuidado daqui para frente. Sei que reconstrução não acontece em um instante, mas começa quando alguém decide agir com verdade. Por isso, peço desculpas de coração e quero demonstrar, no tempo certo, que aprendi com essa falha e posso cuidar melhor do que ficou abalado.`,
    gratidao: `${name}, eu guardo uma gratidão sincera por tudo o que você representa na minha vida. Seu cuidado não passou por mim como algo pequeno; ele deixou lembrança, reconhecimento e uma sensação bonita de ter sido visto com atenção. Há gestos seus que talvez pareçam simples, mas me sustentaram em momentos importantes e me ensinaram a valorizar ainda mais sua presença. Reconheço a importância que você tem na minha história e o impacto emocional do apoio que recebi de você. Por isso, hoje quero agradecer com verdade: sua forma de cuidar fez diferença, permaneceu comigo e merece ser lembrada com carinho.`,
    reflexao: `${name}, há momentos em que a vida pede aprendizado sem pressa e maturidade para olhar com mais calma para tudo que sentimos. O tempo nem sempre responde depressa, mas revela o que precisa crescer, mudar ou permanecer com mais verdade. Talvez este seja um daqueles períodos em que o coração aprende a escutar melhor, a escolher com consciência e a transformar experiências em crescimento. Nem tudo precisa ser resolvido no mesmo dia; algumas compreensões amadurecem em silêncio. Que essa fase traga clareza, equilíbrio e uma forma mais inteira de seguir, porque amadurecer também é aprender a caminhar com mais presença.`,
    motivacao: `${name}, continue com coragem, mesmo quando o recomeço parecer pequeno demais para ser celebrado. A força nem sempre aparece como grande vitória; muitas vezes ela mora no gesto discreto de levantar, respirar e tentar outra vez. Sua perseverança tem valor, principalmente nos dias em que ninguém vê o esforço que você faz para continuar. Não permita que uma fase difícil defina tudo o que ainda pode nascer. Organize o coração, dê o próximo passo e confie no processo que está construindo por dentro. Cada atitude firme aproxima você de uma versão mais preparada, mais livre e mais consciente da própria força.`,
    aniversario: `${name}, hoje é dia de celebrar sua vida com alegria e reconhecimento. Que este novo ciclo chegue trazendo bênçãos, saúde, boas lembranças e motivos sinceros para sorrir. Sua presença importa para quem caminha ao seu lado, e este dia merece ser vivido com leveza, carinho e gratidão pelo caminho já percorrido. Que cada fase nova traga encontros bonitos, sonhos possíveis e momentos que aqueçam o coração. Desejo que você receba afeto verdadeiro, abraços cheios de presença e a certeza de que sua vida tem valor. Que a celebração de hoje permaneça como lembrança feliz dentro de você, com amor e alegria.`,
  };

  return messages[universe.key];
}
