import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  createRequestId,
  describeError,
  logger,
  MOTOR_VERSION,
  RAG_ENABLED,
} from "./logger/index.js";
import { gerarMensagemAlma } from "./motorAlma.js";
import { getLibraryIndexStatus } from "./alma/rag/indexLibrary.js";
import { getAiProviderInfo } from "./providers/aiProvider.js";

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173"
}));

app.use(express.json({ limit: "1mb" }));

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const text = String(value || "").trim().toLowerCase();
  return ["true", "1", "sim", "yes", "premium"].includes(text);
}

function pickString(source, keys) {
  for (const key of keys) {
    const value = String(source?.[key] || "").trim();
    if (value) return value;
  }

  return "";
}

app.use((req, res, next) => {
  const requestId = createRequestId();
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  logger.info("request.start", {
    requestId,
    method: req.method,
    path: req.path,
  });

  res.on("finish", () => {
    logger.info("request.finish", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

app.get("/api/health", async (req, res) => {
  const library = await getLibraryIndexStatus();
  const aiProvider = getAiProviderInfo();

  res.json({
    ok: true,
    name: "Motor Alma",
    status: "online",
    requestId: req.requestId,
    version: MOTOR_VERSION,
    provider: aiProvider.provider,
    model: aiProvider.model,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    ragEnabled: RAG_ENABLED,
    libraryIndexed: library.indexed,
    indexedDocuments: library.documentCount,
    indexedChunks: library.chunkCount,
  });
});

app.post("/api/gerar-mensagem", async (req, res) => {
  try {
    const body = req.body || {};
    const { name, mood, recipient, tema } = body;

    const mensagem = await gerarMensagemAlma({
      name: String(name || "").trim(),
      mood: String(mood || "").trim(),
      recipient: String(recipient || "").trim(),
      tema: String(tema || "").trim(),
      isPremium: toBoolean(
        body.isPremium ?? body.premium ?? body.premiumUser ?? body.isPremiumUser,
      ),
      assinatura: pickString(body, ["assinatura", "signature", "assinaturaPersonalizada"]),
      nomeRemetente: pickString(body, ["nomeRemetente", "remetente", "senderName", "fromName"]),
    }, { requestId: req.requestId });

    res.json({ mensagem, requestId: req.requestId });
  } catch (error) {
    logger.error("motor.request.error", {
      requestId: req.requestId,
      ...describeError(error),
    });

    res.status(500).json({
      requestId: req.requestId,
      error: "Nao consegui gerar a mensagem agora. Tente novamente em alguns instantes."
    });
  }
});

const port = Number(process.env.MOTOR_ALMA_PORT || 3333);

app.listen(port, () => {
  logger.info("server.start", {
    port,
    version: MOTOR_VERSION,
    ragEnabled: RAG_ENABLED,
  });
});
