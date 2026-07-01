import "dotenv/config";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_PROMPTS_ALMA } from "./testPrompts.js";
import {
  avaliarIdentidadeLiteraria,
  classificarIdentidadeLiteraria,
} from "./identityScore.js";
import {
  createBaselineReport,
  saveBaselineReport,
} from "./baselineStorage.js";
import { avaliarMensagemAlma } from "./styleChecklist.js";

const __filename = fileURLToPath(import.meta.url);

const CRITERIA = [
  {
    key: "temAcolhimento",
    label: "acolhimento inicial",
    expected: true,
  },
  {
    key: "temReflexao",
    label: "reflexao profunda",
    expected: true,
  },
  {
    key: "apontaParaDeus",
    label: "aponta para Deus",
    expected: true,
  },
  {
    key: "terminaComEsperanca",
    label: "termina com esperanca",
    expected: true,
  },
  {
    key: "pareceGenerica",
    label: "nao parece generica",
    expected: false,
  },
];

const IDENTITY_CRITERIA = [
  ["acolhimento", "acolhimento"],
  ["profundidade", "profundidade"],
  ["espiritualidade", "espiritualidade"],
  ["esperanca", "esperanca"],
  ["poeticidade", "poeticidade"],
  ["originalidade", "originalidade"],
  ["naturalidade", "naturalidade"],
];

function configureQualityLogs() {
  process.env.LOG_LEVEL = process.env.ALMA_QUALITY_LOG_LEVEL || "error";
}

function shouldPrintMessages() {
  return String(process.env.ALMA_QUALITY_PRINT_MESSAGES || "false").toLowerCase() === "true";
}

function summarizeError(error) {
  const reason =
    error?.code ||
    error?.type ||
    error?.error?.code ||
    error?.error?.type ||
    error?.message ||
    "erro_desconhecido";

  return String(reason).replace(/\s+/g, " ").trim().slice(0, 180);
}

function avaliarCriterios(checklist) {
  return CRITERIA.map((criterion) => {
    const value = checklist[criterion.key];
    return {
      ...criterion,
      value,
      passed: value === criterion.expected,
    };
  });
}

function printCriteria(criteria) {
  for (const criterion of criteria) {
    const status = criterion.passed ? "PASS" : "FAIL";
    console.log(`  - ${status} ${criterion.label}: ${criterion.value}`);
  }
}

function printIdentityScore(identityScore) {
  const ranking = classificarIdentidadeLiteraria(identityScore.identidadeFinal);

  console.log(`Identidade Literaria: ${identityScore.identidadeFinal}/100 - ${ranking}`);
  for (const [key, label] of IDENTITY_CRITERIA) {
    console.log(`  - ${label}: ${identityScore[key]}/10`);
  }
}

function printHeader(total) {
  console.log("Motor Alma - quality check local");
  console.log(`Pedidos de teste: ${total}`);
  console.log("Mensagens completas nao sao impressas por padrao.");
  console.log("Para imprimir mensagens completas, use ALMA_QUALITY_PRINT_MESSAGES=true.");
}

async function runSinglePrompt({ prompt, gerarMensagemAlma, printMessages }) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  try {
    const texto = await gerarMensagemAlma(prompt.dados, { requestId });
    const checklist = avaliarMensagemAlma(texto);
    const identityScore = avaliarIdentidadeLiteraria(texto);
    const criteria = avaliarCriterios(checklist);
    const passedCount = criteria.filter((criterion) => criterion.passed).length;
    const status = passedCount === criteria.length ? "PASS" : "REVIEW";

    console.log("");
    console.log(`[${prompt.id}] ${prompt.titulo}`);
    console.log(`requestId: ${requestId}`);
    console.log(`status: ${status} (${passedCount}/${criteria.length})`);
    console.log(`duracaoMs: ${Date.now() - startedAt}`);
    console.log(`tamanhoCaracteres: ${checklist.tamanhoCaracteres}`);
    printCriteria(criteria);
    printIdentityScore(identityScore);

    if (printMessages) {
      console.log("mensagem:");
      console.log(texto);
    }

    return {
      status,
      promptId: prompt.id,
      promptTitle: prompt.titulo,
      requestId,
      checklist,
      identityScore,
      identityRanking: classificarIdentidadeLiteraria(identityScore.identidadeFinal),
      criteria,
    };
  } catch (error) {
    console.log("");
    console.log(`[${prompt.id}] ${prompt.titulo}`);
    console.log(`requestId: ${requestId}`);
    console.log("status: ERROR");
    console.log(`duracaoMs: ${Date.now() - startedAt}`);
    console.log(`motivo: ${summarizeError(error)}`);

    return {
      status: "ERROR",
      promptId: prompt.id,
      promptTitle: prompt.titulo,
      requestId,
      error,
    };
  }
}

export async function runQualityCheck(options = {}) {
  configureQualityLogs();

  const qualityStartedAt = Date.now();
  const prompts = options.prompts || TEST_PROMPTS_ALMA;
  const printMessages =
    typeof options.printMessages === "boolean"
      ? options.printMessages
      : shouldPrintMessages();

  const { gerarMensagemAlma } = await import("../../motorAlma.js");

  printHeader(prompts.length);

  const results = [];
  for (const prompt of prompts) {
    results.push(await runSinglePrompt({ prompt, gerarMensagemAlma, printMessages }));
  }

  const passCount = results.filter((result) => result.status === "PASS").length;
  const reviewCount = results.filter((result) => result.status === "REVIEW").length;
  const errorCount = results.filter((result) => result.status === "ERROR").length;
  const totalDurationMs = Date.now() - qualityStartedAt;
  const rankedResults = results
    .filter((result) => result.identityScore)
    .sort((a, b) => b.identityScore.identidadeFinal - a.identityScore.identidadeFinal);

  console.log("");
  console.log("Resumo final");
  console.log(`PASS: ${passCount}`);
  console.log(`REVIEW: ${reviewCount}`);
  console.log(`ERROR: ${errorCount}`);
  console.log(`duracaoTotalMs: ${totalDurationMs}`);

  if (rankedResults.length) {
    console.log("");
    console.log("Ranking final de identidade literaria");
    for (const result of rankedResults) {
      console.log(
        `${result.identityScore.identidadeFinal}/100 - ${result.identityRanking} - ${result.promptId} - ${result.requestId}`,
      );
    }
  }

  const baselineReport = createBaselineReport({
    results,
    passCount,
    reviewCount,
    errorCount,
    totalDurationMs,
  });
  const baselinePaths = await saveBaselineReport(baselineReport);

  console.log("");
  console.log("Baseline salvo");
  console.log(`arquivo: ${baselineReport.baselineName}`);
  console.log(`latest: ${baselinePaths.latestPath}`);

  if (errorCount > 0) {
    process.exitCode = 1;
  }

  return {
    passCount,
    reviewCount,
    errorCount,
    baselineReport,
    results,
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCli) {
  runQualityCheck().catch((error) => {
    console.error("Falha no quality check:", summarizeError(error));
    process.exitCode = 1;
  });
}
