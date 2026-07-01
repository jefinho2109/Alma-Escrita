import { avaliarMensagemAlma } from "./styleChecklist.js";
import { avaliarSaidaFinal } from "./outputGuard.js";

const GENERIC_PATTERNS = [
  /\btudo vai dar certo\b/,
  /\bacredite em voce\b/,
  /\bvoce e capaz\b/,
  /\bnunca desista\b/,
  /\bpense positivo\b/,
  /\bo importante e\b/,
  /\bbasta acreditar\b/,
  /\bforca foco e fe\b/,
];

const ROBOTIC_PATTERNS = [
  /\bsegue uma mensagem\b/,
  /\bconforme solicitado\b/,
  /\baqui esta\b/,
  /\bespero que esta mensagem\b/,
  /\bcomo uma ia\b/,
  /\bmodelo de mensagem\b/,
];

const SIGNALS = {
  acolhimento: [
    /\beu sei\b/,
    /\beu entendo\b/,
    /\bentendo\b/,
    /\bacolh/,
    /\brespira\b/,
    /\bcalma\b/,
    /\bvoce nao esta so\b/,
    /\bsei que\b/,
    /\bteu coracao\b/,
    /\bsua dor\b/,
  ],
  profundidade: [
    /\breflet/,
    /\bprofund/,
    /\bsentido\b/,
    /\bprocesso\b/,
    /\bpor dentro\b/,
    /\bno fundo\b/,
    /\bcompreender\b/,
    /\bperceber\b/,
    /\bsilencio\b/,
    /\balma\b/,
    /\bcaminho\b/,
  ],
  espiritualidade: [
    /\bdeus\b/,
    /\bsenhor\b/,
    /\bjesus\b/,
    /\bcristo\b/,
    /\bfe\b/,
    /\boracao\b/,
    /\bgraca\b/,
    /\bmisericordia\b/,
    /\bproposito\b/,
    /\bpromessa\b/,
  ],
  esperanca: [
    /\besperanca\b/,
    /\brecomeco\b/,
    /\bamanha\b/,
    /\bnova historia\b/,
    /\bnovo tempo\b/,
    /\bnao acabou\b/,
    /\blevantar\b/,
    /\bcontinuar\b/,
    /\bflorir\b/,
    /\bamanhecer\b/,
  ],
  poeticidade: [
    /\balma\b/,
    /\bcoracao\b/,
    /\bsilencio\b/,
    /\bluz\b/,
    /\bchao\b/,
    /\btempo\b/,
    /\bcaminho\b/,
    /\bamanhecer\b/,
    /\bvento\b/,
    /\braiz\b/,
    /\bflor/,
  ],
  naturalidade: [
    /\bvoce\b/,
    /\bsua\b/,
    /\bseu\b/,
    /\bhoje\b/,
    /\bagora\b/,
    /\btalvez\b/,
    /\bdevagar\b/,
    /\bsem pressa\b/,
    /\bde verdade\b/,
  ],
};

function normalize(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clampScore(value) {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function countMatches(text, patterns) {
  return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
}

function countOccurrences(text, patterns) {
  return patterns.reduce((total, pattern) => {
    const matches = text.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`));
    return total + (matches?.length || 0);
  }, 0);
}

function countSentences(raw) {
  return String(raw || "")
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;
}

function averageWordsPerSentence(raw) {
  const sentences = String(raw || "")
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (!sentences.length) return 0;

  const words = sentences.reduce((total, sentence) => {
    return total + sentence.split(/\s+/).filter(Boolean).length;
  }, 0);

  return words / sentences.length;
}

function scoreBySignals({ text, patterns, base = 0, maxSignalBonus = 6 }) {
  const signalCount = countMatches(text, patterns);
  return base + Math.min(maxSignalBonus, signalCount * 1.5);
}

function getFinalSlice(text) {
  return text.slice(Math.max(0, text.length - 420));
}

export function classificarIdentidadeLiteraria(score) {
  if (score >= 90) return "EXCELENTE";
  if (score >= 80) return "MUITO BOM";
  if (score >= 70) return "BOM";
  if (score >= 60) return "REVISAR";
  return "FRACO";
}

export function avaliarIdentidadeLiteraria(texto, options = {}) {
  const raw = String(texto || "").trim();
  const text = normalize(raw);
  const finalText = getFinalSlice(text);
  const checklist = avaliarMensagemAlma(raw, options);
  const guard = avaliarSaidaFinal(raw, options);
  const primeiraPessoaPermitida = Boolean(
    options.primeiraPessoaPermitida ||
      options.plano?.primeiraPessoaPermitida ||
      options.plano?.primeiraPessoa,
  );
  const assinaturaPermitida = Boolean(
    options.assinaturaPermitida || options.plano?.assinaturaPermitida,
  );

  const genericCount = countOccurrences(text, GENERIC_PATTERNS);
  const roboticCount = countOccurrences(text, ROBOTIC_PATTERNS);
  const sentenceCount = countSentences(raw);
  const avgWords = averageWordsPerSentence(raw);
  const sizeScore = raw.length >= 700 && raw.length <= 1700 ? 1 : 0;
  const balancedSentenceScore = avgWords >= 10 && avgWords <= 34 ? 1 : 0;

  const acolhimento = clampScore(
    scoreBySignals({
      text,
      patterns: SIGNALS.acolhimento,
      base: checklist.temAcolhimento ? 5 : 2,
    }) - genericCount,
  );

  const profundidade = clampScore(
    scoreBySignals({
      text,
      patterns: SIGNALS.profundidade,
      base: checklist.temReflexao ? 5 : 2,
    }) +
      Math.min(2, sentenceCount / 4) +
      balancedSentenceScore -
      genericCount,
  );

  const espiritualidade = clampScore(
    scoreBySignals({
      text,
      patterns: SIGNALS.espiritualidade,
      base: checklist.apontaParaDeus ? 5 : 1,
    }) - Math.max(0, roboticCount - 1),
  );

  const esperanca = clampScore(
    scoreBySignals({
      text: finalText,
      patterns: SIGNALS.esperanca,
      base: checklist.terminaComEsperanca ? 5 : 2,
    }) +
      (checklist.terminaComEsperanca ? 1 : 0) -
      genericCount,
  );

  const poeticidade = clampScore(
    scoreBySignals({
      text,
      patterns: SIGNALS.poeticidade,
      base: 2,
      maxSignalBonus: 7,
    }) +
      (avgWords >= 12 ? 1 : 0) -
      Math.min(2, genericCount),
  );

  const originalidade = clampScore(
    8 -
      genericCount * 2 -
      roboticCount * 2 -
      (checklist.pareceGenerica ? 2 : 0) +
      sizeScore +
      (countMatches(text, SIGNALS.profundidade) >= 3 ? 1 : 0),
  );

  const naturalidade = clampScore(
    scoreBySignals({
      text,
      patterns: SIGNALS.naturalidade,
      base: 3,
      maxSignalBonus: 5,
    }) +
      balancedSentenceScore +
      sizeScore -
      roboticCount * 2,
  );

  const weightedScore =
    acolhimento * 1.2 +
    profundidade * 1.5 +
    espiritualidade * 1.4 +
    esperanca * 1.2 +
    poeticidade +
    originalidade * 1.4 +
    naturalidade * 1.3;

  const maxWeightedScore = 1.2 + 1.5 + 1.4 + 1.2 + 1 + 1.4 + 1.3;
  const identidadeBase = Math.round((weightedScore / maxWeightedScore) * 10);
  const hasGuardProblem = (problem) => guard.problemas.includes(problem);
  const usaPalavraProibida = hasGuardProblem("palavra_proibida");
  const usaFraseIA = hasGuardProblem("frase_ia");
  const usaMetaforaProibida = hasGuardProblem("metafora_proibida");
  const usaAberturaProibida = hasGuardProblem("abertura_proibida");
  const usaDetalhesInventados = hasGuardProblem("detalhes_inventados");
  const usaImperativosExcessivos = hasGuardProblem("imperativos_excessivos");
  const penalidadePrimeiraPessoa =
    checklist.usaPrimeiraPessoa && !primeiraPessoaPermitida ? 35 : 0;
  const penalidadeTitulosEstruturais = checklist.usaTitulosEstruturais ? 20 : 0;
  const penalidadeAssinaturaIndevida =
    checklist.usaAssinaturaIndevida && !assinaturaPermitida ? 30 : 0;
  const penalidadeAutorOuObra = checklist.mencionaAutorOuObra ? 35 : 0;
  const penalidadeCitacaoTrechos = checklist.citaTrechos ? 25 : 0;
  const penalidadePlaceholder = checklist.usaPlaceholder ? 20 : 0;
  const penalidadeNomeEmExcesso = checklist.usaNomeEmExcesso ? 15 : 0;
  const penalidadeRepeticaoPalavras = checklist.repetePalavras ? 10 : 0;
  const penalidadeFrasesLongas = checklist.usaFrasesMuitoLongas ? 10 : 0;
  const penalidadeExcessoAdjetivos = checklist.usaExcessoAdjetivos ? 10 : 0;
  const penalidadeCliches = checklist.usaCliches ? 15 : 0;
  const penalidadeFrasesDeIA = checklist.usaFrasesDeIA || usaFraseIA ? 30 : 0;
  const penalidadePalavraProibida = usaPalavraProibida ? 25 : 0;
  const penalidadeMetaforaProibida = usaMetaforaProibida ? 20 : 0;
  const penalidadeAberturaProibida = usaAberturaProibida ? 15 : 0;
  const penalidadeDetalhesInventados = usaDetalhesInventados ? 25 : 0;
  const penalidadeImperativosExcessivos = usaImperativosExcessivos ? 20 : 0;
  const penalidadeTotal =
    penalidadePrimeiraPessoa +
    penalidadeTitulosEstruturais +
    penalidadeAssinaturaIndevida +
    penalidadeAutorOuObra +
    penalidadeCitacaoTrechos +
    penalidadePlaceholder +
    penalidadeNomeEmExcesso +
    penalidadeRepeticaoPalavras +
    penalidadeFrasesLongas +
    penalidadeExcessoAdjetivos +
    penalidadeCliches +
    penalidadeFrasesDeIA +
    penalidadePalavraProibida +
    penalidadeMetaforaProibida +
    penalidadeAberturaProibida +
    penalidadeDetalhesInventados +
    penalidadeImperativosExcessivos;
  const identidadeFinal = identidadeBase - penalidadeTotal;

  return {
    acolhimento,
    profundidade,
    espiritualidade,
    esperanca,
    poeticidade,
    originalidade,
    naturalidade,
    usaPrimeiraPessoa: checklist.usaPrimeiraPessoa,
    usaTitulosEstruturais: checklist.usaTitulosEstruturais,
    usaAssinaturaIndevida: checklist.usaAssinaturaIndevida,
    mencionaAutorOuObra: checklist.mencionaAutorOuObra,
    citaTrechos: checklist.citaTrechos,
    usaPlaceholder: checklist.usaPlaceholder,
    usaNomeEmExcesso: checklist.usaNomeEmExcesso,
    repetePalavras: checklist.repetePalavras,
    usaFrasesMuitoLongas: checklist.usaFrasesMuitoLongas,
    usaExcessoAdjetivos: checklist.usaExcessoAdjetivos,
    usaCliches: checklist.usaCliches,
    usaFrasesDeIA: checklist.usaFrasesDeIA,
    usaPalavraProibida,
    usaFraseIA,
    usaMetaforaProibida,
    usaAberturaProibida,
    usaDetalhesInventados,
    usaImperativosExcessivos,
    identidadeFinal: Math.max(0, Math.min(100, identidadeFinal)),
  };
}
