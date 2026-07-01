import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BASELINE_DIR = path.join(__dirname, "baseline");
export const LATEST_BASELINE_PATH = path.join(BASELINE_DIR, "baseline-latest.json");

const IDENTITY_KEYS = [
  "acolhimento",
  "profundidade",
  "espiritualidade",
  "esperanca",
  "poeticidade",
  "originalidade",
  "naturalidade",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function roundMetric(value) {
  return Math.round(value * 100) / 100;
}

function average(values) {
  if (!values.length) return 0;
  return roundMetric(values.reduce((total, value) => total + value, 0) / values.length);
}

function createBaselineTimestamp(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function getScoredResults(results) {
  return results.filter((result) => result.identityScore);
}

function calculateCriteriaAverages(scoredResults) {
  return IDENTITY_KEYS.reduce((averages, key) => {
    averages[key] = average(scoredResults.map((result) => result.identityScore[key]));
    return averages;
  }, {});
}

function createSafeTestMetrics(result) {
  return {
    promptId: result.promptId,
    status: result.status,
    identidadeFinal: result.identityScore?.identidadeFinal ?? null,
    ranking: result.identityRanking || null,
    criterios: result.identityScore
      ? IDENTITY_KEYS.reduce((scores, key) => {
          scores[key] = result.identityScore[key];
          return scores;
        }, {})
      : null,
  };
}

export function createBaselineReport({
  results,
  passCount,
  reviewCount,
  errorCount,
  totalDurationMs,
  generatedAt = new Date(),
}) {
  const scoredResults = getScoredResults(results);
  const timestamp = createBaselineTimestamp(generatedAt);

  return {
    generatedAt: generatedAt.toISOString(),
    baselineName: `baseline-${timestamp}.json`,
    motorVersion: process.env.MOTOR_VERSION || "0.1.0",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    testsExecuted: results.length,
    scoredTests: scoredResults.length,
    identityAverage: average(
      scoredResults.map((result) => result.identityScore.identidadeFinal),
    ),
    criteriaAverages: calculateCriteriaAverages(scoredResults),
    counts: {
      pass: passCount,
      review: reviewCount,
      error: errorCount,
    },
    totalDurationMs,
    tests: results.map(createSafeTestMetrics),
  };
}

export async function saveBaselineReport(report) {
  const baselinePath = path.join(BASELINE_DIR, report.baselineName);
  const payload = `${JSON.stringify(report, null, 2)}\n`;

  await writeFile(baselinePath, payload, "utf8");
  await writeFile(LATEST_BASELINE_PATH, payload, "utf8");

  return {
    baselinePath,
    latestPath: LATEST_BASELINE_PATH,
  };
}

export async function listBaselineFiles() {
  const entries = await readdir(BASELINE_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^baseline-\d{8}-\d{6}\.json$/.test(name))
    .sort()
    .map((name) => path.join(BASELINE_DIR, name));
}

export async function readBaseline(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export { IDENTITY_KEYS };
