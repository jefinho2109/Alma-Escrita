import { randomUUID } from "node:crypto";

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
};

const SENSITIVE_KEYS = new Set([
  "apikey",
  "api_key",
  "authorization",
  "content",
  "password",
  "prompt",
  "rawText",
  "secret",
  "text",
  "token",
  "trecho",
  "trechos",
]);

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|authorization|password|secret|token)/i;

function normalizeLogLevel(value) {
  const level = String(value || "info").toLowerCase();
  return Object.prototype.hasOwnProperty.call(LOG_LEVELS, level) ? level : "info";
}

function sanitizeString(value) {
  return value.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-openai-key]");
}

function sanitizeValue(key, value) {
  const normalizedKey = String(key).toLowerCase();
  if (SENSITIVE_KEYS.has(normalizedKey) || SENSITIVE_KEY_PATTERN.test(normalizedKey)) {
    return "[redacted]";
  }
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(key, item));
  }
  if (value && typeof value === "object") {
    return sanitizeMeta(value);
  }
  return value;
}

function sanitizeMeta(meta = {}) {
  return Object.entries(meta).reduce((safe, [key, value]) => {
    safe[key] = sanitizeValue(key, value);
    return safe;
  }, {});
}

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

export const MOTOR_VERSION = process.env.MOTOR_VERSION || "0.1.0";
export const LOG_LEVEL = normalizeLogLevel(process.env.LOG_LEVEL);
export const RAG_ENABLED = String(process.env.RAG_ENABLED || "true").toLowerCase() !== "false";

export function createRequestId() {
  return randomUUID();
}

export function estimateTokens(input) {
  return Math.ceil(String(input || "").length / 4);
}

export function summarizeErrorReason(error) {
  const reason =
    error?.code ||
    error?.type ||
    error?.error?.code ||
    error?.error?.type ||
    error?.message ||
    "unknown_error";

  return sanitizeString(String(reason).replace(/\s+/g, " ").trim()).slice(0, 180);
}

export function describeError(error) {
  return {
    name: error?.name || "Error",
    message: summarizeErrorReason(error),
    status: error?.status || error?.response?.status,
    code: error?.code || error?.error?.code,
    type: error?.type || error?.error?.type,
  };
}

export function log(level, event, meta = {}) {
  const normalizedLevel = normalizeLogLevel(level);
  if (!shouldLog(normalizedLevel)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level: normalizedLevel,
    event,
    ...sanitizeMeta(meta),
  };

  const line = JSON.stringify(entry);
  if (normalizedLevel === "error") {
    console.error(line);
  } else if (normalizedLevel === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (event, meta) => log("debug", event, meta),
  info: (event, meta) => log("info", event, meta),
  warn: (event, meta) => log("warn", event, meta),
  error: (event, meta) => log("error", event, meta),
};
