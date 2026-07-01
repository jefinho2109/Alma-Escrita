import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  IDENTITY_KEYS,
  listBaselineFiles,
  readBaseline,
} from "./baselineStorage.js";

const __filename = fileURLToPath(import.meta.url);
const STABLE_DELTA = 0.01;

function classifyDelta(delta) {
  if (delta > STABLE_DELTA) return "melhorou";
  if (delta < -STABLE_DELTA) return "piorou";
  return "permaneceu estavel";
}

function formatDelta(delta) {
  const rounded = Math.round(delta * 100) / 100;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function getMetricComparison(label, beforeValue, afterValue) {
  const before = Number(beforeValue || 0);
  const after = Number(afterValue || 0);
  const delta = after - before;

  return {
    label,
    before,
    after,
    delta,
    status: classifyDelta(delta),
  };
}

function printComparison(comparison) {
  console.log(
    `${comparison.label}: ${comparison.status} (${comparison.before} -> ${comparison.after}, ${formatDelta(comparison.delta)})`,
  );
}

export function compareBaselineReports(previous, current) {
  const comparisons = [
    getMetricComparison(
      "identidadeFinal",
      previous.identityAverage,
      current.identityAverage,
    ),
    ...IDENTITY_KEYS.map((key) =>
      getMetricComparison(
        key,
        previous.criteriaAverages?.[key],
        current.criteriaAverages?.[key],
      ),
    ),
  ];

  return {
    previous: previous.baselineName,
    current: current.baselineName,
    comparisons,
  };
}

export async function compareLatestBaselines() {
  const files = await listBaselineFiles();

  if (files.length < 2) {
    console.log("Ainda nao ha baselines suficientes para comparar.");
    console.log("Execute npm run alma:quality pelo menos duas vezes.");
    process.exitCode = 1;
    return null;
  }

  const previousPath = files[files.length - 2];
  const currentPath = files[files.length - 1];
  const previous = await readBaseline(previousPath);
  const current = await readBaseline(currentPath);
  const result = compareBaselineReports(previous, current);

  console.log("Comparacao de baselines do Motor Alma");
  console.log(`Anterior: ${path.basename(previousPath)} (${previous.generatedAt})`);
  console.log(`Atual: ${path.basename(currentPath)} (${current.generatedAt})`);
  console.log("");

  for (const comparison of result.comparisons) {
    printComparison(comparison);
  }

  return result;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCli) {
  compareLatestBaselines().catch((error) => {
    console.error("Falha ao comparar baselines:", error?.message || error);
    process.exitCode = 1;
  });
}
