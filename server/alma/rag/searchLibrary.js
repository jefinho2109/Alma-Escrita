import { gerarEmbedding, cosineSimilarity } from "./embeddings.js";
import { carregarIndiceBiblioteca, INDEX_PATH } from "./indexLibrary.js";
import { describeError, logger, RAG_ENABLED } from "../../logger/index.js";

function sanitizeQuery(query) {
  return String(query || "")
    .replace(/\s+/g, " ")
    .trim();
}

function createEmptyMetrics() {
  return {
    ragEnabled: RAG_ENABLED,
    indexAvailable: false,
    documentsFound: 0,
    chunksAvailable: 0,
    chunksSent: 0,
    searchMs: 0,
  };
}

export async function buscarTrechosRelevantesComMetricas(consulta, options = {}) {
  const startedAt = Date.now();
  const requestId = options.requestId;
  const metrics = createEmptyMetrics();

  try {
    const query = sanitizeQuery(consulta);

    if (!RAG_ENABLED) {
      metrics.searchMs = Date.now() - startedAt;
      logger.info("rag.search.skipped", {
        requestId,
        reason: "rag_disabled",
        ...metrics,
      });
      return { trechos: [], metrics };
    }

    if (!query) {
      metrics.searchMs = Date.now() - startedAt;
      logger.info("rag.search.skipped", {
        requestId,
        reason: "empty_query",
        ...metrics,
      });
      return { trechos: [], metrics };
    }

    const limit = Number(options.limit || 5);
    const minScore = Number(options.minScore || 0.12);
    const index = await carregarIndiceBiblioteca();
    const items = Array.isArray(index.items) ? index.items : [];

    metrics.indexAvailable = true;
    metrics.documentsFound = Number(index.sourceCount || index.sources?.length || 0);
    metrics.chunksAvailable = items.length;

    const queryEmbedding = await gerarEmbedding(query);

    const trechos = items
      .map((item) => ({
        id: item.id,
        score: cosineSimilarity(queryEmbedding, item.embedding),
        text: item.text,
        sourcePath: item.metadata?.sourcePath,
        category: item.metadata?.category,
        title: item.metadata?.title,
        chunkIndex: item.metadata?.chunkIndex,
      }))
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    metrics.chunksSent = trechos.length;
    metrics.searchMs = Date.now() - startedAt;

    logger.info("rag.search.complete", {
      requestId,
      ...metrics,
    });

    return { trechos, metrics };
  } catch (error) {
    metrics.searchMs = Date.now() - startedAt;

    if (error?.code === "ENOENT") {
      logger.warn("rag.index.missing", {
        requestId,
        reason: "missing_index",
        indexFile: INDEX_PATH.split(/[\\/]/).pop(),
        ...metrics,
      });
      return { trechos: [], metrics };
    }

    logger.warn("rag.search.error", {
      requestId,
      ...metrics,
      ...describeError(error),
    });
    return { trechos: [], metrics };
  }
}

export async function buscarTrechosRelevantes(consulta, options = {}) {
  const result = await buscarTrechosRelevantesComMetricas(consulta, options);
  return result.trechos;
}
