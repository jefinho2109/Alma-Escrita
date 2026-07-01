import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { avaliarMensagemAlma } from "./styleChecklist.js";

function normalize(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DNA_DIR = path.resolve(__dirname, "../dna");

function readDnaJson(fileName, fallback) {
  try {
    return JSON.parse(readFileSync(path.join(DNA_DIR, fileName), "utf8"));
  } catch {
    return fallback;
  }
}

function normalizeList(values = []) {
  return values
    .map((value) => normalize(value).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const DNA_PROIBIDAS = readDnaJson("proibidas.json", { termos: [] });
const DNA_ANTI_IA = readDnaJson("antiIA.json", { frases: [] });
const DNA_METAFORAS = readDnaJson("metaforas.json", { proibidas: [] });
const DNA_ABERTURAS = readDnaJson("aberturas.json", { proibidas: [] });
const PALAVRAS_PROIBIDAS_DNA = normalizeList(DNA_PROIBIDAS.termos);
const FRASES_IA_DNA = normalizeList(DNA_ANTI_IA.frases);
const METAFORAS_PROIBIDAS_DNA = normalizeList(DNA_METAFORAS.proibidas);
const ABERTURAS_PROIBIDAS_DNA = normalizeList(DNA_ABERTURAS.proibidas);

function clean(value) {
  return String(value || "").trim();
}

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

const COMENTARIO_DE_TRECHO_PATTERNS = [
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

const DETALHES_INVENTADOS_PATTERNS = [
  /\bdesde crianca\b/,
  /\bna sua infancia\b/,
  /\bquando voce era crianca\b/,
  /\bsua familia\b/,
  /\bseus filhos\b/,
  /\bsuas filhas\b/,
  /\bseu marido\b/,
  /\bsua esposa\b/,
  /\bsua mae\b/,
  /\bseu pai\b/,
  /\bno hospital\b/,
  /\bnaquela noite\b/,
  /\bnaquele dia\b/,
  /\bno seu trabalho\b/,
  /\bna sua casa\b/,
  /\bseus amigos\b/,
];

const IMPERATIVE_PATTERNS = [
  /\bpermita-se\b/,
  /\blembre-se\b/,
  /\breflita\b/,
  /\breflitamos\b/,
  /\bconfie\b/,
  /\baceite\b/,
  /\bentenda\b/,
  /\bpare\b/,
  /\bfaca\b/,
  /\bnao desista\b/,
  /\bvoce deve\b/,
  /\bvoce precisa\b/,
  /\btem que\b/,
];

function hasLongQuotedText(raw) {
  const quoted = String(raw || "").match(/["“]([^"”]{80,})["”]/g);
  return Boolean(quoted?.length);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function contarOcorrenciasNome(texto, nomeDestinatario) {
  const name = normalize(nomeDestinatario).replace(/\s+/g, " ").trim();

  if (!name || name === "nao informado") {
    return 0;
  }

  const text = normalize(texto).replace(/\s+/g, " ");
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
      return Array.from(text.matchAll(pattern)).length;
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

function includesNormalizedPhrase(text, phrase) {
  if (!phrase) return false;
  if (/^[a-z0-9_]+$/.test(phrase)) {
    return new RegExp(`(^|[^a-z0-9_])${escapeRegExp(phrase)}(?=$|[^a-z0-9_])`).test(text);
  }

  return text.includes(phrase);
}

function hasDnaPhrase(text, phrases) {
  return phrases.some((phrase) => includesNormalizedPhrase(text, phrase));
}

function hasForbiddenOpening(raw, openings) {
  const start = normalize(raw).replace(/\s+/g, " ").trim().slice(0, 180);
  return openings.some((opening) => start.startsWith(opening));
}

function countPatternMatches(text, patterns) {
  return patterns.reduce((total, pattern) => {
    const source = pattern.source;
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    return total + (text.match(new RegExp(source, flags))?.length || 0);
  }, 0);
}

function countWords(texto) {
  return normalize(texto)
    .split(/[^a-z0-9_]+/)
    .filter((word) => word.length >= 2).length;
}

function getOptionValue(options, key) {
  if (!options || typeof options !== "object") return undefined;
  return options[key] ?? options.plano?.[key] ?? options.dados?.[key];
}

function getAssinaturaPersonalizada(options = {}) {
  return clean(
    getOptionValue(options, "assinaturaPersonalizada") ||
      getOptionValue(options, "assinatura") ||
      getOptionValue(options, "signature") ||
      getOptionValue(options, "nomeRemetente") ||
      getOptionValue(options, "remetente") ||
      getOptionValue(options, "senderName") ||
      getOptionValue(options, "fromName"),
  );
}

function hasPersonalSignature(raw, assinatura) {
  const signature = normalize(assinatura).replace(/\s+/g, " ").trim();
  if (!signature || signature.length < 2) return false;

  const finalText = normalize(String(raw || "").slice(-320)).replace(/\s+/g, " ").trim();
  if (!finalText) return false;

  return (
    finalText.endsWith(signature) ||
    finalText.includes(`com carinho ${signature}`) ||
    finalText.includes(`de ${signature}`) ||
    finalText.includes(`assinado por ${signature}`)
  );
}

export function avaliarSaidaFinal(texto, options = {}) {
  const raw = String(texto || "").trim();
  const text = normalize(raw);
  const optionObject = typeof options === "object" ? options : {};
  const plano = optionObject.plano || {};
  const isPremium = Boolean(optionObject.isPremium || plano.isPremium);
  const assinaturaPermitida = Boolean(
    optionObject.assinaturaPermitida || plano.assinaturaPermitida,
  );
  const nomeDestinatario =
    typeof options === "string" ? options : options.nomeDestinatario;
  const primeiraPessoaPermitida = Boolean(
    optionObject.primeiraPessoaPermitida ||
      plano.primeiraPessoaPermitida ||
      plano.primeiraPessoa,
  );
  const assinaturaPersonalizada = getAssinaturaPersonalizada(optionObject);
  const totalPalavras = countWords(raw);
  const checklist = avaliarMensagemAlma(raw, { nomeDestinatario });
  const ocorrenciasNomeDestinatario = contarOcorrenciasNome(raw, nomeDestinatario);
  const problemas = [];

  if (hasAny(text, AUTOR_OU_OBRA_PATTERNS)) {
    problemas.push("mencao_autor_obra_biblioteca");
  }

  if (hasAny(text, COMENTARIO_DE_TRECHO_PATTERNS) || hasLongQuotedText(raw)) {
    problemas.push("citacao_ou_comentario_de_trecho");
  }

  if (checklist.usaPrimeiraPessoa && !primeiraPessoaPermitida) {
    problemas.push("primeira_pessoa");
  }

  if (checklist.usaTitulosEstruturais) {
    problemas.push("titulos_estruturais");
  }

  if (checklist.usaAssinaturaIndevida && !assinaturaPermitida) {
    problemas.push("assinatura_indevida");
  }

  if (!assinaturaPermitida && hasPersonalSignature(raw, assinaturaPersonalizada)) {
    problemas.push("assinatura_personalizada_nao_permitida");
  }

  if (hasAny(text, PLACEHOLDER_PATTERNS)) {
    problemas.push("placeholder");
  }

  if (ocorrenciasNomeDestinatario > 2) {
    problemas.push("repeticaoNomeDestinatario");
  }

  if (hasRepeatedWords(raw)) {
    problemas.push("repeticao_palavras");
  }

  if (hasLongSentences(raw)) {
    problemas.push("frases_muito_longas");
  }

  if (hasExcessiveAdjectives(raw)) {
    problemas.push("excesso_adjetivos");
  }

  if (hasAny(text, CLICHE_PATTERNS)) {
    problemas.push("cliches");
  }

  if (hasAny(text, IA_PATTERNS)) {
    problemas.push("frases_de_ia");
  }

  if (hasDnaPhrase(text, PALAVRAS_PROIBIDAS_DNA)) {
    problemas.push("palavra_proibida");
  }

  if (hasDnaPhrase(text, FRASES_IA_DNA)) {
    problemas.push("frase_ia");
  }

  if (hasDnaPhrase(text, METAFORAS_PROIBIDAS_DNA)) {
    problemas.push("metafora_proibida");
  }

  if (hasForbiddenOpening(raw, ABERTURAS_PROIBIDAS_DNA)) {
    problemas.push("abertura_proibida");
  }

  if (hasAny(text, DETALHES_INVENTADOS_PATTERNS)) {
    problemas.push("detalhes_inventados");
  }

  if (countPatternMatches(text, IMPERATIVE_PATTERNS) >= 3) {
    problemas.push("imperativos_excessivos");
  }

  if (!isPremium && totalPalavras > 90) {
    problemas.push("mensagem_gratuita_longa");
  }

  if (plano.tamanhoAlvo === "100-120 palavras" && (totalPalavras < 90 || totalPalavras > 130)) {
    problemas.push("fora_tamanho_premium");
  }

  return {
    aprovado: problemas.length === 0,
    problemas,
  };
}
