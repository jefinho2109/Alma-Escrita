import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";

interface ImageCreatorProps {
  text: string;
}

interface NativeImageBridge {
  isAvailable?: () => boolean;
  savePng?: (dataUrl: string, fileName: string) => boolean;
  sharePng?: (dataUrl: string, fileName: string) => boolean;
  openPng?: (dataUrl: string, fileName: string) => boolean;
}

declare global {
  interface Window {
    AlmaImage?: NativeImageBridge;
  }
}

const IMAGE_FILE_NAME = "mensagem-alma-escrita.png";

type TemplateKind = "short" | "medium" | "long" | "extended";

interface ImageTemplate {
  kind: TemplateKind;
  minHeight: number;
  fontSize: number;
  minFontSize: number;
  lineHeight: number;
  padding: number;
  maxTextWidth: number;
  signatureSize: number;
  signatureAreaHeight: number;
}

interface ImageLayout extends ImageTemplate {
  contentHeight: number;
  textAreaHeight: number;
  footerGap: number;
}

function splitMessage(rawText: string): { message: string; signature: string } {
  const cleaned = rawText.trim();
  const signatureMatch = cleaned.match(/\n+\s*(?:[—-]\s*)?(Alma Escrita)\s*$/i);

  if (!signatureMatch) {
    return { message: cleaned, signature: "" };
  }

  return {
    message: cleaned.slice(0, signatureMatch.index).trim(),
    signature: signatureMatch[1]!.trim(),
  };
}

function getTemplate(message: string): ImageTemplate {
  const length = message.replace(/\s+/g, " ").trim().length;
  const lines = Math.max(1, message.split(/\n+/).length);
  const weight = length + lines * 24;

  if (weight <= 150) {
    return {
      kind: "short",
      minHeight: 640,
      fontSize: 30,
      minFontSize: 20,
      lineHeight: 1.18,
      padding: 34,
      maxTextWidth: 292,
      signatureSize: 20,
      signatureAreaHeight: 76,
    };
  }

  if (weight <= 300) {
    return {
      kind: "medium",
      minHeight: 720,
      fontSize: 25,
      minFontSize: 17,
      lineHeight: 1.22,
      padding: 32,
      maxTextWidth: 300,
      signatureSize: 18,
      signatureAreaHeight: 72,
    };
  }

  if (weight <= 520) {
    return {
      kind: "long",
      minHeight: 860,
      fontSize: 20,
      minFontSize: 14,
      lineHeight: 1.27,
      padding: 30,
      maxTextWidth: 304,
      signatureSize: 17,
      signatureAreaHeight: 68,
    };
  }

  return {
    kind: "extended",
    minHeight: Math.min(1320, 920 + Math.ceil((weight - 520) / 3)),
    fontSize: weight > 820 ? 15 : 17,
    minFontSize: 12,
    lineHeight: 1.32,
    padding: 28,
    maxTextWidth: 304,
    signatureSize: 16,
    signatureAreaHeight: 66,
  };
}

function getLayout(message: string, hasSignature: boolean): ImageLayout {
  const template = getTemplate(message);
  const contentHeight = template.minHeight - template.padding * 2;
  const signatureAreaHeight = hasSignature ? template.signatureAreaHeight : 0;
  const footerGap = hasSignature ? (template.kind === "short" ? 24 : 20) : 0;
  const textAreaHeight = contentHeight - signatureAreaHeight - footerGap;

  return {
    ...template,
    contentHeight,
    signatureAreaHeight,
    textAreaHeight,
    footerGap,
  };
}

function getNativeImageBridge(): NativeImageBridge | null {
  const bridge = window.AlmaImage;
  if (!bridge) return null;

  try {
    if (bridge.isAvailable?.() === false) return null;
  } catch {
    return null;
  }

  return bridge;
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function isShareAbort(error: unknown): boolean {
  return error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "NotAllowedError");
}

export default function ImageCreator({ text }: ImageCreatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textFrameRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgBlob, setImgBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(24);
  const [textClamped, setTextClamped] = useState(false);

  const getBackgroundStyle = () => {
    const lower = text.toLowerCase();
    if (lower.includes("bom dia")) return "linear-gradient(180deg, #FFD57E, #FFB347)";
    if (lower.includes("boa tarde")) return "linear-gradient(180deg, #FFA17F, #00223E)";
    if (lower.includes("boa noite")) return "linear-gradient(180deg, #2C3E50, #4CA1AF)";
    if (lower.includes("amor")) return "linear-gradient(180deg, #FF6B6B, #FFD6D6)";
    if (lower.includes("fé") || lower.includes("deus") || lower.includes("oração")) {
      return "linear-gradient(180deg, #6A11CB, #2575FC)";
    }
    if (lower.includes("motivação") || lower.includes("força") || lower.includes("vencer")) {
      return "linear-gradient(180deg, #F7971E, #FFD200)";
    }
    return "linear-gradient(180deg, #E0EAFC, #CFDEF3)";
  };

  const { message, signature } = splitMessage(text);
  const template = useMemo(
    () => getLayout(message, Boolean(signature)),
    [message, signature],
  );
  const maxVisibleLines = Math.max(
    1,
    Math.floor(template.textAreaHeight / (fontSize * template.lineHeight)),
  );

  useLayoutEffect(() => {
    setFontSize(template.fontSize);
    setTextClamped(false);

    let cancelled = false;
    let frameId = 0;

    const fitText = () => {
      const frame = textFrameRef.current;
      const paragraph = textRef.current;
      if (!frame || !paragraph) return;

      const availableHeight = frame.clientHeight || template.textAreaHeight;
      let nextSize = template.fontSize;

      paragraph.style.fontSize = `${nextSize}px`;
      paragraph.style.maxHeight = `${availableHeight}px`;
      paragraph.style.overflow = "hidden";
      paragraph.style.display = "block";
      paragraph.style.removeProperty("-webkit-line-clamp");

      while (
        nextSize > template.minFontSize &&
        paragraph.scrollHeight > availableHeight + 1
      ) {
        nextSize -= 1;
        paragraph.style.fontSize = `${nextSize}px`;
      }

      if (cancelled) return;
      setFontSize(nextSize);
      setTextClamped(paragraph.scrollHeight > availableHeight + 1);
    };

    const scheduleFit = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(fitText);
    };

    scheduleFit();
    void document.fonts?.ready.then(scheduleFit).catch(() => undefined);
    window.addEventListener("resize", scheduleFit);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleFit);
    };
  }, [
    message,
    template.fontSize,
    template.minFontSize,
    template.textAreaHeight,
    template.lineHeight,
  ]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    setImgUrl(null);
    setImgBlob(null);
    setObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setStatus("Preparando imagem...");

    const timer = window.setTimeout(() => {
      void generateImage("Imagem pronta para baixar ou compartilhar.");
    }, 250);

    return () => window.clearTimeout(timer);
    // text changes only when the modal is opened with a new message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const generateImage = async (
    successMessage?: string,
  ): Promise<{ dataUrl: string; blob: Blob; url: string } | null> => {
    if (!containerRef.current) return null;

    setLoading(true);
    try {
      await waitForNextPaint();
      const dataUrl = await htmlToImage.toPng(containerRef.current, {
        cacheBust: true,
        skipFonts: true,
        pixelRatio: 3,
        backgroundColor: "#0F172A",
        width: containerRef.current.scrollWidth,
        height: containerRef.current.scrollHeight,
        style: {
          transform: "none",
        },
      });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImgUrl(dataUrl);
      setImgBlob(blob);
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      if (successMessage) setStatus(successMessage);
      return { dataUrl, blob, url };
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      setStatus("Não consegui gerar a imagem agora. Tente novamente.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    await generateImage("Imagem gerada com sucesso.");
  };

  const downloadImage = async (image: { dataUrl: string; blob: Blob }) => {
    const nativeImage = getNativeImageBridge();
    if (nativeImage?.savePng) {
      try {
        if (nativeImage.savePng(image.dataUrl, IMAGE_FILE_NAME)) {
          return true;
        }
      } catch (error) {
        console.warn("Salvar imagem via Android falhou, usando fallback web:", error);
      }
    }

    const picker = window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{
          description: string;
          accept: Record<string, string[]>;
        }>;
      }) => Promise<{
        createWritable: () => Promise<{
          write: (data: Blob) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    };

    if (picker.showSaveFilePicker) {
      try {
        const handle = await picker.showSaveFilePicker({
          suggestedName: IMAGE_FILE_NAME,
          types: [
            {
              description: "Imagem PNG",
              accept: { "image/png": [".png"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(image.blob);
        await writable.close();
        return true;
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        if (name === "AbortError" || name === "NotAllowedError") {
          console.info("Salvar arquivo cancelado pelo usuário.");
          return false;
        }
        console.warn("Salvar arquivo via diálogo falhou, usando fallback por link:", error);
      }
    }

    const url = URL.createObjectURL(image.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = IMAGE_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  };

  const handleDownload = async () => {
    const generated = imgBlob && imgUrl
      ? { blob: imgBlob, dataUrl: imgUrl }
      : await generateImage("Imagem pronta.");
    if (!generated?.blob || !generated.dataUrl) return;

    const saved = await downloadImage(generated);
    if (saved) setStatus("Imagem baixada.");
  };

  const handleShare = async () => {
    const generated = imgBlob
      ? { blob: imgBlob, dataUrl: imgUrl, url: objectUrl }
      : await generateImage("Imagem pronta.");
    if (!generated?.blob) return;

    const nativeImage = getNativeImageBridge();
    if (generated.dataUrl && nativeImage?.sharePng) {
      try {
        if (nativeImage.sharePng(generated.dataUrl, IMAGE_FILE_NAME)) {
          setStatus("Imagem compartilhada.");
          return;
        }
      } catch (error) {
        console.warn("Compartilhamento via Android falhou, usando fallback web:", error);
      }
    }

    const file = new File([generated.blob], "mensagem-alma-escrita.png", {
      type: "image/png",
    });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    const canShareFile =
      Boolean(nav.share) && (!nav.canShare || nav.canShare({ files: [file] }));

    if (canShareFile) {
      try {
        await nav.share({
          title: "Alma Escrita",
          text: "Mensagem criada no Alma Escrita",
          files: [file],
        });
        setStatus("Imagem compartilhada.");
        return;
      } catch (error) {
        console.warn("Compartilhamento cancelado ou indisponível:", error);
        if (isShareAbort(error)) {
          setStatus("Compartilhamento cancelado.");
          return;
        }
      }
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    try {
      await navigator.clipboard.writeText(text);
      setStatus(
        opened
          ? "Texto copiado e WhatsApp Web aberto. No computador, baixe a imagem e anexe manualmente se quiser enviar a arte."
          : "Texto copiado. O navegador bloqueou o WhatsApp Web; abra o WhatsApp e cole a mensagem. Para enviar a arte, use Baixar e anexe manualmente.",
      );
      return;
    } catch (error) {
      console.warn("Clipboard indisponível:", error);
    }

    setStatus(
      opened
        ? "WhatsApp Web aberto. No computador, use Baixar para salvar a imagem e anexar manualmente."
        : "Compartilhamento de imagem indisponível neste navegador. Use Abrir imagem ou Baixar.",
    );
  };

  const handleOpenImage = async () => {
    const generated = objectUrl && imgUrl
      ? { url: objectUrl, dataUrl: imgUrl }
      : await generateImage("Imagem pronta.");
    if (!generated?.url) return;

    const nativeImage = getNativeImageBridge();
    if (generated.dataUrl && nativeImage?.openPng) {
      try {
        if (nativeImage.openPng(generated.dataUrl, IMAGE_FILE_NAME)) {
          setStatus("Imagem aberta.");
          return;
        }
      } catch (error) {
        console.warn("Abrir imagem via Android falhou, usando fallback web:", error);
      }
    }

    const opened = window.open(generated.url, "_blank", "noopener,noreferrer");
    if (!opened) {
      setStatus("O navegador bloqueou a nova aba. Use Baixar para salvar a imagem.");
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="w-full max-w-[360px] flex items-center justify-center rounded-2xl shadow-feature"
        style={{
          background: getBackgroundStyle(),
          color: "#fff",
          fontFamily: "Georgia, 'Times New Roman', serif",
          textAlign: "center",
          height: `${template.minHeight}px`,
          padding: `${template.padding}px`,
          boxSizing: "border-box",
        }}
      >
        <div
          className="w-full"
          style={{
            height: `${template.contentHeight}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            ref={textFrameRef}
            style={{
              width: "100%",
              height: `${template.textAreaHeight}px`,
              flex: `0 0 ${template.textAreaHeight}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <p
              ref={textRef}
              className="font-semibold"
              style={{
                width: "100%",
                maxWidth: `${template.maxTextWidth}px`,
                margin: 0,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                wordBreak: "normal",
                hyphens: "auto",
                fontSize: `${fontSize}px`,
                lineHeight: template.lineHeight,
                maxHeight: `${template.textAreaHeight}px`,
                overflow: "hidden",
                display: textClamped ? "-webkit-box" : "block",
                WebkitBoxOrient: textClamped ? "vertical" : undefined,
                WebkitLineClamp: textClamped ? maxVisibleLines : undefined,
                textShadow: "0 2px 18px rgba(0,0,0,0.22)",
              }}
            >
              {message}
            </p>
          </div>

          {signature && (
            <div
              className="flex flex-col items-center"
              style={{
                gap: "10px",
                opacity: 0.92,
                height: `${template.signatureAreaHeight}px`,
                marginTop: `${template.footerGap}px`,
                justifyContent: "center",
                flex: "0 0 auto",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: template.kind === "short" ? "92px" : "72px",
                  height: "1px",
                  background: "rgba(255,255,255,0.55)",
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: `${template.signatureSize}px`,
                  lineHeight: 1.1,
                  fontStyle: "italic",
                  letterSpacing: "0",
                  textShadow: "0 2px 12px rgba(0,0,0,0.2)",
                }}
              >
                {signature}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-1 flex-wrap justify-center">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="btn-grad px-5 py-2.5 rounded-full font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Gerando..." : "Gerar imagem"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading || !imgBlob}
          className="btn-soft px-5 py-2.5 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Baixar
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={loading || !imgBlob}
          className="btn-soft px-5 py-2.5 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Compartilhar
        </button>
        <button
          type="button"
          onClick={handleOpenImage}
          disabled={loading || !imgBlob}
          className="btn-soft px-5 py-2.5 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Abrir imagem
        </button>
      </div>

      {status && (
        <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
          {status}
        </p>
      )}

      {imgUrl && (
        <img
          src={imgUrl}
          alt="Preview da mensagem"
          className="mt-2 w-full max-w-[220px] rounded-lg border border-[hsl(var(--border))]"
        />
      )}
    </div>
  );
}
