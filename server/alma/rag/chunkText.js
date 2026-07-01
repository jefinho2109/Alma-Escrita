const DEFAULT_MAX_CHARS = 1800;
const DEFAULT_OVERLAP_CHARS = 260;

export function normalizeLibraryText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoParagraphs(text) {
  return normalizeLibraryText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitLongParagraph(paragraph, maxChars) {
  if (paragraph.length <= maxChars) return [paragraph];

  const sentences = paragraph
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    const chunks = [];
    for (let i = 0; i < paragraph.length; i += maxChars) {
      chunks.push(paragraph.slice(i, i + maxChars).trim());
    }
    return chunks.filter(Boolean);
  }

  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > maxChars && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function getOverlap(text, overlapChars) {
  if (!text || overlapChars <= 0) return "";
  if (text.length <= overlapChars) return text;
  const overlap = text.slice(-overlapChars);
  const firstSpace = overlap.indexOf(" ");
  return firstSpace > 0 ? overlap.slice(firstSpace + 1) : overlap;
}

export function chunkText(text, options = {}) {
  const maxChars = Number(options.maxChars || DEFAULT_MAX_CHARS);
  const overlapChars = Number(options.overlapChars || DEFAULT_OVERLAP_CHARS);
  const paragraphs = splitIntoParagraphs(text).flatMap((paragraph) =>
    splitLongParagraph(paragraph, maxChars),
  );

  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxChars && current) {
      chunks.push(current);
      const overlap = getOverlap(current, overlapChars);
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks
    .map((chunk) => normalizeLibraryText(chunk))
    .filter((chunk) => chunk.length >= 120);
}

export const CHUNK_DEFAULTS = {
  maxChars: DEFAULT_MAX_CHARS,
  overlapChars: DEFAULT_OVERLAP_CHARS,
};
