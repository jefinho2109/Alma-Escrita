function normalize(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function getFinalSlice(text) {
  const finalStart = Math.max(0, text.length - 420);
  return text.slice(finalStart);
}

const PRIMEIRA_PESSOA_PATTERNS = [
  /\beu\b/,
  /\bmeu\b/,
  /\bminha\b/,
  /\bmeus\b/,
  /\bminhas\b/,
  /\bcomigo\b/,
  /\bacredito\b/,
  /\bpenso\b/,
  /\bquero\b/,
  /\bestou\b/,
  /\bescrevo\b/,
  /\bcompartilho\b/,
  /\bvivi\b/,
  /\blembro\b/,
  /\bestou escrevendo\b/,
  /\bquero compartilhar\b/,
  /\bminha historia\b/,
  /\bminha caminhada\b/,
  /\bobrigado por compartilhar\b/,
  /\bhoje quero refletir\b/,
  /\bmeu conselho\b/,
];

const TITULOS_ESTRUTURAIS_PATTERNS = [
  /^\s*reflexao\s*:/im,
  /^\s*direcao espiritual\s*:/im,
  /^\s*encerramento(?: com esperanca)?\s*:/im,
  /^\s*acolhimento\s*:/im,
  /^\s*aponto para deus\s*:/im,
];

const ASSINATURA_INDEVIDA_PATTERNS = [
  /\[\s*seu nome\s*\]/,
  /\[\s*a alma escrita\s*\]/,
  /\bjefferson poeta sonhador\b/,
  /^\s*com carinho\b/im,
  /^\s*em esperanca\b/im,
];

const AUTOR_OU_OBRA_PATTERNS = [
  /\bjefferson\b/,
  /\bjefferson rodrigues\b/,
  /\brodrigues da silva\b/,
  /\bbiblioteca\b/,
  /\bbiblioteca alma\b/,
  /\bautor(?:a|es)?\b/,
  /\blivro(?:s)?\b/,
  /\bobra(?:s)?\b/,
  /\bverso(?:s)?\b/,
  /\btrecho(?:s)?\b/,
];

const CITACAO_TRECHOS_PATTERNS = [
  /\bfrase nos mostra\b/,
  /\bessa frase\b/,
  /\bcomo foi escrito\b/,
  /\bcomo lemos\b/,
  /\bcitacao\b/,
  /\bcitar\b/,
  /\bno trecho\b/,
  /\bna obra\b/,
  /\bnesses versos\b/,
  /\bouvi-o dizer\b/,
];

const PLACEHOLDER_PATTERNS = [
  /\[[^\]]+\]/,
  /\[\s*seu nome\s*\]/,
];

const CLICHE_PATTERNS = [
  /\btudo vai dar certo\b/,
  /\bacredite em voce\b/,
  /\bvoce e capaz\b/,
  /\bnunca desista\b/,
  /\bpense positivo\b/,
  /\bbasta acreditar\b/,
  /\bforca foco e fe\b/,
];

const IA_PATTERNS = [
  /\bsegue uma mensagem\b/,
  /\bconforme solicitado\b/,
  /\baqui esta\b/,
  /\bespero que esta mensagem\b/,
  /\bcomo uma ia\b/,
  /\bmodelo de mensagem\b/,
  /\btexto gerado\b/,
];

const ADJETIVOS_COMUNS = new Set([
  "lindo",
  "linda",
  "forte",
  "especial",
  "incrivel",
  "maravilhoso",
  "maravilhosa",
  "profundo",
  "profunda",
  "precioso",
  "preciosa",
  "extraordinario",
  "extraordinaria",
  "grandioso",
  "grandiosa",
]);

const STOP_WORDS = new Set([
  "para",
  "como",
  "essa",
  "esse",
  "esta",
  "este",
  "voce",
  "porque",
  "quando",
  "onde",
  "deus",
  "mais",
  "menos",
  "pela",
  "pelo",
  "com",
  "sem",
  "que",
  "uma",
  "por",
  "seu",
  "sua",
]);

function hasLongQuotedText(raw) {
  const quoted = String(raw || "").match(/["“]([^"”]{80,})["”]/g);
  return Boolean(quoted?.length);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contarOcorrenciasNome(texto, nomeDestinatario) {
  const name = normalize(nomeDestinatario).replace(/\s+/g, " ").trim();

  if (!name || name === "nao informado") {
    return 0;
  }

  const normalizedText = normalize(texto).replace(/\s+/g, " ");
  const firstName = name.split(" ")[0];
  const candidates = [name, firstName]
    .filter((candidate) => candidate.length >= 2)
    .filter((candidate, index, list) => list.indexOf(candidate) === index);

  if (candidates.length === 0) {
    return 0;
  }

  return Math.max(
    ...candidates.map((candidate) => {
      const pattern = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(candidate)}(?=$|[^a-z0-9_])`, "g");
      return Array.from(normalizedText.matchAll(pattern)).length;
    }),
  );
}

function getWords(text) {
  return normalize(text)
    .split(/[^a-z0-9_]+/)
    .filter((word) => word.length >= 4);
}

function hasRepeatedWords(texto) {
  const counts = new Map();

  for (const word of getWords(texto)) {
    if (STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return Array.from(counts.values()).some((count) => count >= 5);
}

function hasLongSentences(texto) {
  return String(texto || "")
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .some((sentence) => {
      const wordCount = sentence.split(/\s+/).filter(Boolean).length;
      return sentence.length > 240 || wordCount > 45;
    });
}

function hasExcessiveAdjectives(texto) {
  const adjectives = getWords(texto).filter((word) => ADJETIVOS_COMUNS.has(word));
  return adjectives.length >= 7;
}

export function avaliarMensagemAlma(texto, options = {}) {
  const raw = String(texto || "").trim();
  const text = normalize(raw);
  const finalText = getFinalSlice(text);
  const nomeDestinatario =
    typeof options === "string" ? options : options.nomeDestinatario;

  const temAcolhimento = hasAny(text, [
    /\beu sei\b/,
    /\beu entendo\b/,
    /\bentendo\b/,
    /\bacolh/,
    /\brespira\b/,
    /\bcalma\b/,
    /\bvoce nao esta so\b/,
    /\bsei que\b/,
  ]);

  const temReflexao = hasAny(text, [
    /\breflet/,
    /\baprend/,
    /\bperceber\b/,
    /\bcompreender\b/,
    /\bpor dentro\b/,
    /\bno fundo\b/,
    /\bsentido\b/,
    /\bprocesso\b/,
  ]);

  const apontaParaDeus = hasAny(text, [
    /\bdeus\b/,
    /\bsenhor\b/,
    /\bcristo\b/,
    /\bjesus\b/,
    /\bfe\b/,
    /\boracao\b/,
    /\bgraca\b/,
    /\bmisericordia\b/,
  ]);

  const terminaComEsperanca = hasAny(finalText, [
    /\besperanca\b/,
    /\brecomeco\b/,
    /\bamanha\b/,
    /\bnova historia\b/,
    /\bnovo tempo\b/,
    /\bDeus ainda\b/i,
    /\bnao acabou\b/,
    /\blevant/,
    /\bcontinuar\b/,
  ]);

  const genericSignals = [
    /\btudo vai dar certo\b/,
    /\bacredite em voce\b/,
    /\bvoce e capaz\b/,
    /\bnunca desista\b/,
    /\bo importante e\b/,
    /\bpense positivo\b/,
  ].filter((pattern) => pattern.test(text)).length;

  const pareceGenerica =
    genericSignals >= 2 ||
    raw.length < 280 ||
    (!temReflexao && !apontaParaDeus);

  const usaPrimeiraPessoa = hasAny(text, PRIMEIRA_PESSOA_PATTERNS);
  const usaTitulosEstruturais = hasAny(text, TITULOS_ESTRUTURAIS_PATTERNS);
  const usaAssinaturaIndevida = hasAny(text, ASSINATURA_INDEVIDA_PATTERNS);
  const mencionaAutorOuObra = hasAny(text, AUTOR_OU_OBRA_PATTERNS);
  const citaTrechos = hasAny(text, CITACAO_TRECHOS_PATTERNS) || hasLongQuotedText(raw);
  const usaPlaceholder = hasAny(text, PLACEHOLDER_PATTERNS);
  const usaNomeEmExcesso = contarOcorrenciasNome(raw, nomeDestinatario) > 2;
  const repetePalavras = hasRepeatedWords(raw);
  const usaFrasesMuitoLongas = hasLongSentences(raw);
  const usaExcessoAdjetivos = hasExcessiveAdjectives(raw);
  const usaCliches = hasAny(text, CLICHE_PATTERNS);
  const usaFrasesDeIA = hasAny(text, IA_PATTERNS);

  return {
    temAcolhimento,
    temReflexao,
    apontaParaDeus,
    terminaComEsperanca,
    pareceGenerica,
    usaPrimeiraPessoa,
    usaTitulosEstruturais,
    usaAssinaturaIndevida,
    mencionaAutorOuObra,
    citaTrechos,
    usaPlaceholder,
    usaNomeEmExcesso,
    repetePalavras,
    usaFrasesMuitoLongas,
    usaExcessoAdjetivos,
    usaCliches,
    usaFrasesDeIA,
    tamanhoCaracteres: raw.length,
  };
}
