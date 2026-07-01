import { avaliarMensagemAlma } from "../evaluation/styleChecklist.js";
import { avaliarSaidaFinal } from "../evaluation/outputGuard.js";

const MAX_REESCRITAS = 2;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function firstIndex(text, patterns) {
  const indexes = patterns
    .map((pattern) => text.search(pattern))
    .filter((index) => index >= 0);

  return indexes.length ? Math.min(...indexes) : -1;
}

function addProblema(problemas, problema) {
  if (!problemas.includes(problema)) {
    problemas.push(problema);
  }
}

const CARTA_PATTERNS = [
  /^\s*(querido|querida|caro|cara)\b/i,
  /\bvenho por meio\b/,
  /\besta carta\b/,
  /\bnessa carta\b/,
];

const SERMAO_PATTERNS = [
  /\bvoce deve\b/,
  /\bvoce precisa\b/,
  /\btem que\b/,
  /\be necessario que\b/,
  /\barrependa-se\b/,
  /\bpecado\b/,
  /\bobediencia\b/,
];

const COACH_PATTERNS = [
  /\bvoce e capaz\b/,
  /\bacredite em voce\b/,
  /\bnunca desista\b/,
  /\bbasta acreditar\b/,
  /\bpense positivo\b/,
  /\bforca foco e fe\b/,
  /\bsaia da zona de conforto\b/,
];

const EXPLICA_DEMAIS_PATTERNS = [
  /\bou seja\b/,
  /\bisso significa\b/,
  /\bem outras palavras\b/,
  /\bportanto\b/,
  /\bdessa forma\b/,
  /\bconclui-se\b/,
];

const ACOLHIMENTO_PATTERNS = [
  /\bacolh/,
  /\bcalma\b/,
  /\brespira\b/,
  /\bvoce nao esta so\b/,
  /\bseu coracao\b/,
  /\bsua dor\b/,
  /\ba dor\b/,
  /\bo que voce sente\b/,
  /\bnem sempre e facil\b/,
  /\bha dias\b/,
];

const REFLEXAO_PATTERNS = [
  /\breflet/,
  /\bcompreender\b/,
  /\bperceber\b/,
  /\bsentido\b/,
  /\bprocesso\b/,
  /\bpor dentro\b/,
  /\bno fundo\b/,
];

const DEUS_PATTERNS = [
  /\bdeus\b/,
  /\bsenhor\b/,
  /\bcristo\b/,
  /\bjesus\b/,
  /\bfe\b/,
  /\bgraca\b/,
  /\bmisericordia\b/,
];

function getPedidoOriginal(contexto = {}) {
  const dados = contexto.dados || {};
  return [
    dados.name,
    dados.mood,
    dados.recipient,
    dados.tema,
  ].filter(Boolean).join(" ");
}

function avaliarCriterios(texto, contexto = {}) {
  const raw = String(texto || "").trim();
  const text = normalize(raw);
  const plano = contexto.plano || {};
  const nomeDestinatario = contexto.nomeDestinatario || contexto.dados?.name;
  const primeiraPessoaPermitida = Boolean(
    plano.primeiraPessoaPermitida || plano.primeiraPessoa,
  );
  const guard = avaliarSaidaFinal(raw, {
    nomeDestinatario,
    plano,
    primeiraPessoaPermitida,
    assinaturaPermitida: plano.assinaturaPermitida,
    assinaturaPersonalizada: plano.assinaturaPersonalizada,
  });
  const checklist = avaliarMensagemAlma(raw, { nomeDestinatario });
  const problemas = [...guard.problemas];
  const pedidoOriginal = normalize(getPedidoOriginal(contexto));

  const cartaPermitida = Boolean(plano.isPremium) && plano.genero === "carta";
  if (!cartaPermitida && hasAny(raw, CARTA_PATTERNS)) {
    addProblema(problemas, "parece_carta");
  }

  if (hasAny(text, SERMAO_PATTERNS)) {
    addProblema(problemas, "parece_sermao");
  }

  if (hasAny(text, COACH_PATTERNS)) {
    addProblema(problemas, "parece_coach");
  }

  const explicacoes = EXPLICA_DEMAIS_PATTERNS.filter((pattern) => pattern.test(text)).length;
  if (raw.length > 1500 || explicacoes >= 3) {
    addProblema(problemas, "explica_demais");
  }

  if (/\beu te amo\b/.test(text) && !/\beu te amo\b|\bte amo\b/.test(pedidoOriginal)) {
    addProblema(problemas, "eu_te_amo_nao_solicitado");
  }

  if (
    checklist.usaCliches ||
    checklist.usaFrasesDeIA ||
    (checklist.pareceGenerica && raw.length < 280)
  ) {
    addProblema(problemas, "emocionalmente_pouco_natural");
  }

  const acolhimentoIndex = firstIndex(text, ACOLHIMENTO_PATTERNS);
  const reflexaoIndex = firstIndex(text, REFLEXAO_PATTERNS);
  const deusIndex = firstIndex(text, DEUS_PATTERNS);

  if (acolhimentoIndex < 0 || (reflexaoIndex >= 0 && reflexaoIndex < acolhimentoIndex)) {
    addProblema(problemas, "nao_acolhe_antes_de_refletir");
  }

  if (!checklist.apontaParaDeus) {
    addProblema(problemas, "sem_direcao_espiritual");
  }

  if (deusIndex >= 0 && acolhimentoIndex >= 0 && deusIndex < acolhimentoIndex) {
    addProblema(problemas, "deus_antes_do_acolhimento");
  }

  if (!checklist.terminaComEsperanca) {
    addProblema(problemas, "sem_esperanca_final");
  }

  return {
    aprovado: problemas.length === 0,
    problemas,
    checklist,
  };
}

function montarPromptRevisao(texto, problemas, contexto = {}) {
  const plano = contexto.plano || {};
  const primeiraPessoa = plano.primeiraPessoaPermitida
    ? "A primeira pessoa foi permitida pelo pedido do usuario, mas sem fingir ser autor e respeitando a regra de assinatura."
    : "Nao use primeira pessoa: nao use eu, meu, minha, comigo, acredito, penso, quero, estou, escrevo, compartilho, vivi ou lembro.";
  const assinatura = plano.assinaturaPermitida
    ? `Assinatura personalizada permitida apenas se fizer sentido, usando somente: ${plano.assinaturaPersonalizada}.`
    : "Nao assine. Nao use Com carinho, nome do usuario como remetente, [Seu Nome] ou assinatura personalizada.";
  const tamanho = plano.tamanhoAlvo === "100-120 palavras"
    ? "Use entre 100 e 120 palavras."
    : plano.tamanhoAlvo === "curto"
      ? "Faca uma mensagem curta, universal e segura."
      : "Use 3 a 5 paragrafos curtos.";
  const personalizacao = plano.isPremium
    ? "Pode manter personalizacao Premium quando ela estiver dentro das permissoes do Planner."
    : "Mantenha o texto mais universal e seguro, sem carta longa e sem remetente.";

  return `
Reescreva a mensagem abaixo como Editor Alma.
Corrija estes problemas: ${problemas.join(", ")}.
Preserve a identidade literaria, o acolhimento, a delicadeza, a fe e a esperanca.
${primeiraPessoa}
${assinatura}
${personalizacao}
${tamanho}
Nao cite autor, Jefferson, livro, obra, trecho, versos, Biblioteca Alma, RAG, prompt ou IA.
Remova qualquer mencao a autor, livro, obra, trecho ou versos.
Remova assinatura indevida.
Remova primeira pessoa se ela nao estiver permitida.
Reduza repeticao do nome do destinatario.
Corte frases de IA.
Troque metaforas exageradas por imagens simples como coracao, silencio, amanhecer, caminho, luz e recomeco.
Remova detalhes concretos que o usuario nao informou.
Transforme ordens em convites delicados.
Deixe o texto mais humano, intimo e natural.
Nao use titulos estruturais como Reflexao:, Direcao espiritual:, Conclusao: ou Acolhimento:.
Nao escreva como coach, sermao, analise literaria ou explicacao.
Use o nome do destinatario apenas na saudacao inicial e, se fizer sentido, uma unica vez no encerramento.
Entregue apenas a mensagem final.

Mensagem:
${texto}
`.trim();
}

export async function revisarMensagem(texto, contexto = {}) {
  const gerarTexto = contexto.gerarTexto;
  let mensagem = String(texto || "").trim();
  let avaliacao = avaliarCriterios(mensagem, contexto);
  const historico = [
    {
      tentativa: 0,
      problemas: avaliacao.problemas,
      aprovado: avaliacao.aprovado,
      durationMs: 0,
    },
  ];

  if (avaliacao.aprovado || typeof gerarTexto !== "function") {
    return {
      texto: mensagem,
      aprovado: avaliacao.aprovado,
      problemas: avaliacao.problemas,
      reescritas: 0,
      historico,
    };
  }

  for (let tentativa = 1; tentativa <= MAX_REESCRITAS; tentativa += 1) {
    const startedAt = Date.now();
    mensagem = await gerarTexto(montarPromptRevisao(mensagem, avaliacao.problemas, contexto), {
      requestId: contexto.requestId,
      systemPrompt: contexto.systemPrompt,
      temperature: 0.65,
      maxOutputTokens: 700,
    });
    avaliacao = avaliarCriterios(mensagem, contexto);

    historico.push({
      tentativa,
      problemas: avaliacao.problemas,
      aprovado: avaliacao.aprovado,
      durationMs: Date.now() - startedAt,
    });

    if (avaliacao.aprovado) {
      break;
    }
  }

  return {
    texto: mensagem,
    aprovado: avaliacao.aprovado,
    problemas: avaliacao.problemas,
    reescritas: historico.length - 1,
    historico,
  };
}
