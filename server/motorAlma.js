import { PROMPT_ALMA_ESCRITA } from "./promptAlma.js";
import { buscarTrechosRelevantesComMetricas } from "./alma/rag/searchLibrary.js";
import { revisarMensagem } from "./alma/editor/editorAlma.js";
import { avaliarMensagemAlma } from "./alma/evaluation/styleChecklist.js";
import { avaliarIdentidadeLiteraria } from "./alma/evaluation/identityScore.js";
import { planejarMensagem } from "./alma/planner/planner.js";
import {
  describeError,
  estimateTokens,
  logger,
  summarizeErrorReason,
} from "./logger/index.js";
import {
  montarConsultaBiblioteca,
  montarPromptFinalAlma,
} from "./alma/rag/almaPrompt.js";
import { gerarTexto } from "./providers/aiProvider.js";

function getMaxOutputTokens(plano = {}) {
  if (plano.tamanhoAlvo === "100-120 palavras") return 420;
  if (!plano.isPremium) return 350;
  return 700;
}

export async function gerarMensagemAlma(dados, options = {}) {
  const requestId = options.requestId;
  const nomeDestinatario = dados?.name;
  const plano = planejarMensagem(dados);

  logger.debug("alma.planner.result", {
    requestId,
    genero: plano.genero,
    emocaoPrincipal: plano.emocaoPrincipal,
    vozNarrativa: plano.vozNarrativa,
    isPremium: plano.isPremium,
    primeiraPessoaPermitida: plano.primeiraPessoaPermitida,
    assinaturaPermitida: plano.assinaturaPermitida,
    tamanhoAlvo: plano.tamanhoAlvo,
    nivelPersonalizacao: plano.nivelPersonalizacao,
  });

  const consultaBiblioteca = montarConsultaBiblioteca(dados);
  const ragStartedAt = Date.now();
  let ragDurationMs = 0;
  let trechosRelevantes = [];
  let ragMetrics = {
    documentsFound: 0,
    chunksAvailable: 0,
    chunksSent: 0,
    searchMs: 0,
    indexAvailable: false,
  };

  try {
    const ragResult = await buscarTrechosRelevantesComMetricas(consultaBiblioteca, {
      requestId,
    });
    trechosRelevantes = ragResult.trechos;
    ragMetrics = ragResult.metrics;
  } catch (error) {
    logger.warn("rag.search.unhandled_error", {
      requestId,
      ...describeError(error),
    });
  } finally {
    ragDurationMs = Date.now() - ragStartedAt;
  }

  if (trechosRelevantes.length === 0) {
    logger.warn("motor.rag.empty", {
      requestId,
      reason: "no_relevant_chunks",
      indexAvailable: ragMetrics.indexAvailable,
    });
  }

  const promptFinal = await montarPromptFinalAlma({
    dados,
    trechos: trechosRelevantes,
    plano,
  });

  const promptChars = PROMPT_ALMA_ESCRITA.length + promptFinal.length;
  const promptTokensEstimated = estimateTokens(
    `${PROMPT_ALMA_ESCRITA}\n${promptFinal}`,
  );

  logger.info("rag.metrics", {
    requestId,
    documentsFound: ragMetrics.documentsFound,
    chunksAvailable: ragMetrics.chunksAvailable,
    chunksSent: trechosRelevantes.length,
    searchMs: ragMetrics.searchMs,
    durationMs: ragDurationMs,
    promptChars,
    promptTokensEstimated,
  });

  let texto;
  let generationSucceeded = false;
  const generationStartedAt = Date.now();

  try {
    texto = await gerarTexto(promptFinal, {
      requestId,
      systemPrompt: PROMPT_ALMA_ESCRITA,
      temperature: 0.85,
      maxOutputTokens: getMaxOutputTokens(plano),
    });
    generationSucceeded = true;
  } finally {
    logger.info("alma.generation.duration", {
      requestId,
      durationMs: Date.now() - generationStartedAt,
      success: generationSucceeded,
    });
  }

  const editorStartedAt = Date.now();
  let revisaoAlma;

  try {
    revisaoAlma = await revisarMensagem(texto, {
      requestId,
      dados,
      plano,
      nomeDestinatario,
      gerarTexto,
      systemPrompt: PROMPT_ALMA_ESCRITA,
    });
    texto = revisaoAlma.texto;

    const rewriteDurationMs = revisaoAlma.historico
      .slice(1)
      .reduce((total, item) => total + (item.durationMs || 0), 0);

    logger.info("alma.editor.result", {
      requestId,
      aprovado: revisaoAlma.aprovado,
      problemas: revisaoAlma.problemas,
      reescritas: revisaoAlma.reescritas,
      durationMs: Date.now() - editorStartedAt,
    });

    if (revisaoAlma.reescritas > 0) {
      logger.info("alma.editor.rewrite.duration", {
        requestId,
        reescritas: revisaoAlma.reescritas,
        durationMs: rewriteDurationMs,
      });
    }

    if (!revisaoAlma.aprovado) {
      logger.warn("alma.output_guard.final_warning", {
        requestId,
        problemas: revisaoAlma.problemas,
      });
    }
  } catch (error) {
    logger.warn("alma.editor.error", {
      requestId,
      durationMs: Date.now() - editorStartedAt,
      reason: summarizeErrorReason(error),
    });
  }

  try {
    const identidadeLiteraria = avaliarIdentidadeLiteraria(texto, {
      nomeDestinatario,
      plano,
      primeiraPessoaPermitida: plano.primeiraPessoaPermitida,
      assinaturaPermitida: plano.assinaturaPermitida,
    });

    logger.debug("alma.style_checklist", {
      requestId,
      ...avaliarMensagemAlma(texto, { nomeDestinatario }),
    });

    logger.debug("alma.identity_score", {
      requestId,
      ...identidadeLiteraria,
    });
  } catch (error) {
    logger.debug("alma.evaluation.error", {
      requestId,
      reason: summarizeErrorReason(error),
    });
  }

  return texto;
}
