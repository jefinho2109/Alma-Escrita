export type VisualBackground = "aurora" | "sunrise" | "midnight";

const backgroundNames: Record<VisualBackground, string> = {
  aurora: "Aurora",
  sunrise: "Amanhecer",
  midnight: "Noite",
};

const backgrounds: Record<VisualBackground, [string, string, string]> = {
  aurora: ["#243b55", "#6f7fd8", "#f3d7c3"],
  sunrise: ["#5d4157", "#e7b980", "#fff2d6"],
  midnight: ["#0f172a", "#334155", "#d6bc7d"],
};

interface ExportOptions {
  text: string;
  signature: string;
  background: VisualBackground;
  format: "story" | "square";
}

interface SimpleExportOptions {
  text: string;
  signature: string;
}

export function getVisualBackgroundName(background: VisualBackground): string {
  return backgroundNames[background];
}

export function nextVisualBackground(
  background: VisualBackground,
): VisualBackground {
  const order: VisualBackground[] = ["aurora", "sunrise", "midnight"];
  const current = order.indexOf(background);
  return order[(current + 1) % order.length];
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (context.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function normalizeMessageText(text: string): string {
  const normalized = typeof text === "string" ? text.trim() : "";
  if (!normalized) {
    throw new Error("Mensagem vazia para imagem.");
  }
  return normalized;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Nao foi possivel criar a imagem."));
      }
    }, "image/png");
  });
}

function buildSimpleImageCanvas({
  text,
  signature,
}: SimpleExportOptions): HTMLCanvasElement {
  const message = normalizeMessageText(text);
  const canvas = createCanvas(1080, 1080);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Nao foi possivel criar a imagem.");
  }

  context.fillStyle = "#fbf7ef";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e9dcc8";
  context.fillRect(0, 0, canvas.width, 18);
  context.fillRect(0, canvas.height - 18, canvas.width, 18);

  context.strokeStyle = "rgba(112, 82, 55, 0.18)";
  context.lineWidth = 3;
  context.strokeRect(70, 70, canvas.width - 140, canvas.height - 140);

  const padding = 128;
  const maxWidth = canvas.width - padding * 2;
  let quoteFontSize = 48;
  let lineHeight = Math.round(quoteFontSize * 1.38);
  const maxTextHeight = 650;
  let lines: string[] = [];
  let blockHeight = 0;

  context.textAlign = "center";
  context.fillStyle = "#34251d";

  do {
    context.font = `600 ${quoteFontSize}px Georgia, serif`;
    lineHeight = Math.round(quoteFontSize * 1.38);
    lines = wrapText(context, message, maxWidth);
    blockHeight = lines.length * lineHeight;
    if (blockHeight <= maxTextHeight) break;
    quoteFontSize -= 2;
  } while (quoteFontSize >= 28);

  let y = Math.round((canvas.height - blockHeight) / 2 - 28);
  for (const line of lines) {
    context.fillText(line, canvas.width / 2, y);
    y += lineHeight;
  }

  context.font = "32px Georgia, serif";
  context.fillStyle = "rgba(52, 37, 29, 0.72)";
  context.fillText(signature || "— Alma Escrita", canvas.width / 2, y + 62);

  context.font = "22px Arial, sans-serif";
  context.fillStyle = "rgba(52, 37, 29, 0.34)";
  context.fillText("alma escrita • imagem gratuita", canvas.width / 2, 1000);

  return canvas;
}

export function downloadSimpleMessageImage(options: SimpleExportOptions): void {
  const canvas = buildSimpleImageCanvas(options);
  downloadCanvas(canvas, `alma-escrita-simples-${Date.now()}.png`);
}

export async function shareSimpleMessageImage(
  options: SimpleExportOptions,
): Promise<"shared" | "downloaded"> {
  const canvas = buildSimpleImageCanvas(options);
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], `alma-escrita-simples-${Date.now()}.png`, {
    type: "image/png",
  });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    await nav.share({
      title: "Alma Escrita",
      text: "Mensagem criada no Alma Escrita",
      files: [file],
    });
    return "shared";
  }

  downloadCanvas(canvas, file.name);
  return "downloaded";
}

export function exportMessageImage({
  text,
  signature,
  background,
  format,
}: ExportOptions): void {
  const message = normalizeMessageText(text);
  const isStory = format === "story";
  const canvas = createCanvas(1080, isStory ? 1920 : 1080);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Nao foi possivel criar a imagem.");
  }

  const [start, middle, end] = backgrounds[background];
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, start);
  gradient.addColorStop(0.58, middle);
  gradient.addColorStop(1, end);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(255,255,255,0.12)";
  context.beginPath();
  context.arc(150, 180, 220, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(canvas.width - 120, canvas.height - 180, 300, 0, Math.PI * 2);
  context.fill();

  const padding = isStory ? 110 : 86;
  const maxWidth = canvas.width - padding * 2;
  let quoteFontSize = isStory ? 58 : 44;
  let lineHeight = Math.round(quoteFontSize * 1.38);

  context.textAlign = "center";
  context.fillStyle = "#fffaf2";
  let lines: string[] = [];
  let blockHeight = 0;
  const maxTextHeight = canvas.height - padding * (isStory ? 3.2 : 3.4);

  do {
    context.font = `600 ${quoteFontSize}px Georgia, serif`;
    lineHeight = Math.round(quoteFontSize * 1.38);
    lines = wrapText(context, message, maxWidth);
    blockHeight = lines.length * lineHeight;
    if (blockHeight <= maxTextHeight) break;
    quoteFontSize -= 2;
  } while (quoteFontSize >= (isStory ? 36 : 24));

  let y = (canvas.height - blockHeight) / 2;

  for (const line of lines) {
    context.fillText(line, canvas.width / 2, y);
    y += lineHeight;
  }

  context.font = `${isStory ? 34 : 28}px Georgia, serif`;
  context.fillStyle = "rgba(255,250,242,0.82)";
  context.fillText(signature, canvas.width / 2, y + (isStory ? 80 : 56));

  context.font = `${isStory ? 30 : 24}px Arial, sans-serif`;
  context.fillStyle = "rgba(255,250,242,0.68)";
  context.fillText("Alma Escrita", canvas.width / 2, canvas.height - padding);

  downloadCanvas(canvas, `alma-escrita-${format}-${Date.now()}.png`);
}
