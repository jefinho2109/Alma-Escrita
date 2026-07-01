import "dotenv/config";
import {
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { chunkText, CHUNK_DEFAULTS, normalizeLibraryText } from "./chunkText.js";
import {
  gerarEmbeddings,
  getEmbeddingProviderInfo,
} from "../../providers/embeddingProvider.js";
import { describeError } from "../../logger/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

export const LIBRARY_DIR =
  process.env.ALMA_LIBRARY_DIR ||
  path.join(PROJECT_ROOT, "Biblioteca Alma");

export const INDEX_PATH =
  process.env.ALMA_LIBRARY_INDEX_PATH ||
  path.join(__dirname, "library.index.json");

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".md", ".txt"]);

async function writeJsonAtomically(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  try {
    await writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(tmpPath, filePath);
  } catch (error) {
    await unlink(tmpPath).catch(() => {});
    throw error;
  }
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function readPdf(filePath) {
  const data = await readFile(filePath);
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

async function readDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || "";
}

async function readLibraryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return readPdf(filePath);
  if (ext === ".docx") return readDocx(filePath);
  return readFile(filePath, "utf8");
}

function getMetadata(filePath, chunkIndex, totalChunks) {
  const relativePath = path.relative(LIBRARY_DIR, filePath);
  const parts = relativePath.split(path.sep);
  const category = parts.length > 1 ? parts[0] : "Biblioteca";
  const title = path.basename(filePath, path.extname(filePath));

  return {
    sourcePath: relativePath,
    category,
    title,
    chunkIndex,
    totalChunks,
  };
}

async function getSourceSnapshot(files) {
  return Promise.all(
    files.map(async (filePath) => {
      const info = await stat(filePath);
      return {
        path: path.relative(LIBRARY_DIR, filePath),
        size: info.size,
        mtimeMs: Math.round(info.mtimeMs),
      };
    }),
  );
}

function isSameSnapshot(a = [], b = []) {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x.path.localeCompare(y.path));
  const right = [...b].sort((x, y) => x.path.localeCompare(y.path));
  return left.every((item, index) => {
    const other = right[index];
    return (
      item.path === other.path &&
      item.size === other.size &&
      item.mtimeMs === other.mtimeMs
    );
  });
}

export async function carregarIndiceBiblioteca() {
  const raw = await readFile(INDEX_PATH, "utf8");
  return JSON.parse(raw);
}

export async function getLibraryIndexStatus() {
  try {
    const index = await carregarIndiceBiblioteca();
    const items = Array.isArray(index.items) ? index.items : [];
    const sources = Array.isArray(index.sources) ? index.sources : [];

    return {
      indexed: items.length > 0,
      documentCount: Number(index.sourceCount || sources.length || 0),
      chunkCount: Number(index.chunkCount || items.length || 0),
      embeddingProvider: index.embeddingProvider || null,
      embeddingModel: index.embeddingModel || null,
      createdAt: index.createdAt || null,
    };
  } catch (error) {
    return {
      indexed: false,
      documentCount: 0,
      chunkCount: 0,
      error: error?.code === "ENOENT" ? "missing_index" : "invalid_index",
    };
  }
}

export async function indexarBibliotecaAlma(options = {}) {
  const maxChars = Number(options.maxChars || CHUNK_DEFAULTS.maxChars);
  const overlapChars = Number(
    options.overlapChars || CHUNK_DEFAULTS.overlapChars,
  );
  const files = await walkFiles(LIBRARY_DIR);

  if (files.length === 0) {
    throw new Error(`Nenhum texto encontrado em ${LIBRARY_DIR}`);
  }

  const rawChunks = [];

  for (const filePath of files) {
    const rawText = await readLibraryFile(filePath);
    const text = normalizeLibraryText(rawText);
    if (!text) continue;

    const chunks = chunkText(text, { maxChars, overlapChars });
    chunks.forEach((chunk, chunkIndex) => {
      rawChunks.push({
        text: chunk,
        metadata: getMetadata(filePath, chunkIndex, chunks.length),
      });
    });
  }

  if (rawChunks.length === 0) {
    throw new Error("A Biblioteca Alma não gerou trechos indexáveis.");
  }

  const embeddingInfo = getEmbeddingProviderInfo();
  const embeddings = await gerarEmbeddings(rawChunks.map((chunk) => chunk.text));
  const sources = await getSourceSnapshot(files);

  const index = {
    version: 1,
    createdAt: new Date().toISOString(),
    libraryDir: LIBRARY_DIR,
    embeddingProvider: embeddingInfo.provider,
    embeddingModel: embeddingInfo.model,
    chunk: { maxChars, overlapChars },
    sourceCount: files.length,
    chunkCount: rawChunks.length,
    sources,
    items: rawChunks.map((chunk, index) => ({
      id: `alma-${String(index + 1).padStart(5, "0")}`,
      ...chunk,
      embedding: embeddings[index],
    })),
  };

  await writeJsonAtomically(INDEX_PATH, index);
  return index;
}

export async function ensureLibraryIndex(options = {}) {
  const files = await walkFiles(LIBRARY_DIR);
  const currentSnapshot = await getSourceSnapshot(files);
  const embeddingInfo = getEmbeddingProviderInfo();

  if (!options.force) {
    try {
      const existing = await carregarIndiceBiblioteca();
      if (
        existing.embeddingProvider === embeddingInfo.provider &&
        existing.embeddingModel === embeddingInfo.model &&
        isSameSnapshot(existing.sources, currentSnapshot)
      ) {
        return existing;
      }
    } catch {
      // O índice será criado abaixo quando ainda não existir ou estiver inválido.
    }
  }

  return indexarBibliotecaAlma(options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  indexarBibliotecaAlma({ force: true })
    .then((index) => {
      console.log(
        `Biblioteca Alma indexada: ${index.sourceCount} arquivos, ${index.chunkCount} trechos.`,
      );
      console.log(`Índice salvo em: ${INDEX_PATH}`);
    })
    .catch((error) => {
      if (error?.code === "ALMA_RAG_OLLAMA_MODEL_MISSING") {
        console.error("Nao foi possivel indexar a Biblioteca Alma.");
        console.error(error.message);
        console.error("Instale o modelo localmente:");
        console.error("ollama pull nomic-embed-text");
        console.error("Nenhum library.index.json incompleto foi criado.");
      } else if (error?.code === "ALMA_RAG_OLLAMA_UNAVAILABLE") {
        console.error("Nao foi possivel indexar a Biblioteca Alma.");
        console.error(error.message);
        console.error("Nenhum library.index.json incompleto foi criado.");
      } else {
        console.error("Falha ao indexar Biblioteca Alma:", describeError(error));
      }
      process.exitCode = 1;
    });
}
