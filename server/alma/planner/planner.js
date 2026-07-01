function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function isTruthy(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const text = normalize(value).trim();
  return ["true", "1", "sim", "yes", "premium"].includes(text);
}

function firstFilled(...values) {
  return values
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
}

function getAssinaturaFormulario(dados = {}) {
  return firstFilled(
    dados.assinatura,
    dados.signature,
    dados.assinaturaPersonalizada,
    dados.nomeRemetente,
    dados.remetente,
    dados.senderName,
    dados.fromName,
  );
}

const GENEROS = [
  {
    value: "romance",
    patterns: [/\bromance\b/, /\bromant/, /\bdeclaracao\b/, /\bdeclarar\b/, /\bnamor/, /\besposa\b/, /\bmarido\b/],
  },
  {
    value: "poesia",
    patterns: [/\bpoesia\b/, /\bpoema\b/, /\bverso\b/, /\bpoet/],
  },
  {
    value: "oracao",
    patterns: [/\boracao\b/, /\borar\b/, /\bprece\b/],
  },
  {
    value: "homenagem",
    patterns: [/\bhomenagem\b/, /\baniversario\b/, /\bparabens\b/, /\bmae\b/, /\bpai\b/],
  },
  {
    value: "carta",
    patterns: [/\bcarta\b/, /\bescreva em meu nome\b/, /\bescreva como se eu estivesse falando\b/],
  },
  {
    value: "reflexao",
    patterns: [/\breflexao\b/, /\breflet/, /\bmensagem espiritual\b/],
  },
  {
    value: "mensagem",
    patterns: [/\bmensagem\b/],
  },
];

const EMOCOES = [
  { value: "esperanca", patterns: [/\besperanca\b/, /\bconfi/, /\bcontinuar\b/] },
  { value: "dor", patterns: [/\bdor\b/, /\bferid/, /\bsofr/, /\btriste/] },
  { value: "gratidao", patterns: [/\bgratidao\b/, /\bagradec/, /\bobrigad/] },
  { value: "amor", patterns: [/\bamor\b/, /\bamo\b/, /\bamar\b/, /\bcarinho\b/] },
  { value: "saudade", patterns: [/\bsaudade\b/, /\bfalta\b/, /\bdistancia\b/] },
  { value: "ansiedade", patterns: [/\bansiedade\b/, /\bansios/, /\bmedo\b/, /\bpreocup/] },
  { value: "luto", patterns: [/\bluto\b/, /\bperda\b/, /\bmorte\b/, /\bpartiu\b/] },
  { value: "perdao", patterns: [/\bperdao\b/, /\bperdoar\b/, /\bculpa\b/] },
  { value: "fe", patterns: [/\bfe\b/, /\bdeus\b/, /\bjesus\b/, /\bsenhor\b/] },
  { value: "recomeco", patterns: [/\brecomeco\b/, /\brecomecar\b/, /\bnovo tempo\b/] },
];

const PRIMEIRA_PESSOA_EXPLICITA = [
  /\bescreva em meu nome\b/,
  /\bfaca uma carta\b/,
  /\bescreva como se eu estivesse falando\b/,
];

const SEGUNDA_PESSOA_EXPLICITA = [
  /\bpara voce\b/,
  /\bfale com\b/,
  /\bfale diretamente\b/,
  /\bescreva para\b/,
  /\bmensagem para\b/,
];

const TAMANHO_100_120_PATTERNS = [
  /\b100\s*(?:a|-|ate|e)\s*120\s*palavras\b/,
  /\bentre\s*100\s*e\s*120\s*palavras\b/,
  /\b100\s*palavras\b/,
  /\b120\s*palavras\b/,
];

function classify(text, rules, fallback) {
  const match = rules.find((rule) => hasAny(text, rule.patterns));
  return match?.value || fallback;
}

export function planejarMensagem(dados = {}) {
  const pedido = [
    dados.name,
    dados.mood,
    dados.recipient,
    dados.tema,
  ].join(" ");
  const text = normalize(pedido);
  const isPremium = isTruthy(
    dados.isPremium ?? dados.premium ?? dados.premiumUser ?? dados.isPremiumUser,
  );
  const assinaturaPersonalizada = getAssinaturaFormulario(dados);
  const pediuPrimeiraPessoa = hasAny(text, PRIMEIRA_PESSOA_EXPLICITA);
  const primeiraPessoaPermitida = isPremium && pediuPrimeiraPessoa;
  const assinaturaPermitida = isPremium && Boolean(assinaturaPersonalizada);
  const segundaPessoa =
    !primeiraPessoaPermitida && hasAny(text, SEGUNDA_PESSOA_EXPLICITA);
  const tamanhoAlvo = !isPremium
    ? "curto"
    : hasAny(text, TAMANHO_100_120_PATTERNS)
      ? "100-120 palavras"
      : "3-5 paragrafos curtos";
  const nivelPersonalizacao = isPremium
    ? assinaturaPermitida || primeiraPessoaPermitida
      ? "alto"
      : "personalizado"
    : "universal";

  return {
    isPremium,
    genero: classify(text, GENEROS, "mensagem"),
    emocaoPrincipal: classify(text, EMOCOES, "esperanca"),
    vozNarrativa: primeiraPessoaPermitida
      ? "primeira pessoa permitida"
      : segundaPessoa
        ? "segunda pessoa"
        : "impessoal",
    primeiraPessoa: primeiraPessoaPermitida,
    primeiraPessoaPermitida,
    assinatura: assinaturaPermitida,
    assinaturaPermitida,
    assinaturaPersonalizada,
    tamanhoAlvo,
    nivelPersonalizacao,
  };
}
