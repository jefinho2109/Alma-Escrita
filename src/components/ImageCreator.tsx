import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { Download, Share2, Image as ImageIcon, Instagram } from "lucide-react";

interface ImageCreatorProps {
  text: string;
}

type ImageTheme = "claro" | "escuro" | "papel" | "romantico" | "fe" | "minimalista";
type ImageFormat = "stories" | "feed";

interface ImageTemplate {
  kind: "short" | "medium" | "long" | "extended";
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

const THEMES: Record<ImageTheme, { bg: string; text: string; font: string; shadow: string; label: string }> = {
  claro: { bg: "bg-stone-50", text: "text-stone-800", font: "font-sans", shadow: "shadow-none", label: "Claro Elegante" },
  escuro: { bg: "bg-stone-900", text: "text-stone-100", font: "font-sans", shadow: "shadow-none", label: "Escuro Elegante" },
  papel: { bg: "bg-[#F9F7F2]", text: "text-stone-800", font: "font-serif", shadow: "shadow-sm", label: "Papel / Poesia" },
  romantico: { bg: "bg-gradient-to-br from-rose-50 to-orange-50", text: "text-rose-900", font: "font-serif", shadow: "shadow-sm", label: "Romântico" },
  fe: { bg: "bg-gradient-to-br from-slate-800 to-slate-900", text: "text-amber-50", font: "font-serif", shadow: "shadow-lg", label: "Fé / Superação" },
  minimalista: { bg: "bg-white", text: "text-black", font: "font-sans", shadow: "shadow-none", label: "Minimalista" },
};

const FORMATS: Record<ImageFormat, { label: string; isStories: boolean }> = {
  stories: { label: "Status / Stories (9:16)", isStories: true },
  feed: { label: "Quadrado / Feed (1:1)", isStories: false },
};

const IMAGE_FILE_NAME = "mensagem-alma-escrita.png";

function splitMessage(rawText: string): { message: string; signature: string } {
  const cleaned = rawText.trim();
  const signatureMatch = cleaned.match(/\n+\s*(?:[—-]\s*)?(Alma Escrita)\s*$/i);

  if (!signatureMatch) {
    return { message: cleaned, signature: "Alma Escrita" };
  }

  return {
    message: cleaned.slice(0, signatureMatch.index).trim(),
    signature: signatureMatch[1]!.trim(),
  };
}

function getTemplate(message: string, format: ImageFormat): ImageTemplate {
  const length = message.replace(/\s+/g, " ").trim().length;
  const lines = Math.max(1, message.split(/\n+/).length);
  const weight = length + lines * 24;
  const isStories = format === "stories";

  const baseMinHeight = isStories ? 720 : 600;
  const maxWidth = isStories ? 340 : 420;
  const baseFontSize = isStories ? 28 : 24;
  const baseMinFontSize = isStories ? 18 : 16;

  if (weight <= 150) {
    return {
      kind: "short",
      minHeight: baseMinHeight,
      fontSize: baseFontSize + 4,
      minFontSize: baseMinFontSize + 4,
      lineHeight: 1.2,
      padding: 36,
      maxTextWidth: maxWidth,
      signatureSize: 18,
      signatureAreaHeight: 70,
    };
  }

  if (weight <= 300) {
    return {
      kind: "medium",
      minHeight: baseMinHeight + 40,
      fontSize: baseFontSize,
      minFontSize: baseMinFontSize,
      lineHeight: 1.25,
      padding: 34,
      maxTextWidth: maxWidth,
      signatureSize: 17,
      signatureAreaHeight: 68,
    };
  }

  if (weight <= 520) {
    return {
      kind: "long",
      minHeight: baseMinHeight + 120,
      fontSize: baseFontSize - 4,
      minFontSize: baseMinFontSize - 2,
      lineHeight: 1.3,
      padding: 32,
      maxTextWidth: maxWidth,
      signatureSize: 16,
      signatureAreaHeight: 64,
    };
  }

  return {
    kind: "extended",
    minHeight: Math.min(isStories ? 1200 : 900, baseMinHeight + 200 + Math.ceil((weight - 520) / 3)),
    fontSize: weight > 820 ? baseMinFontSize - 4 : baseFontSize - 6,
    minFontSize: 12,
    lineHeight: 1.35,
    padding: 30,
    maxTextWidth: maxWidth,
    signatureSize: 15,
    signatureAreaHeight: 60,
  };
}

function getLayout(message: string, hasSignature: boolean, format: ImageFormat): ImageLayout {
  const template = getTemplate(message, format);
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
  
  const [imgBlob, setImgBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(24);
  const [textClamped, setTextClamped] = useState(false);
  
  const [format, setFormat] = useState<ImageFormat>("stories");
  const [theme, setTheme] = useState<ImageTheme>("papel");

  const { message, signature } = splitMessage(text);
  const template = useMemo(
    () => getLayout(message, Boolean(signature), format),
    [message, signature, format],
  );
  
  const themeStyles = THEMES[theme];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, format, theme]);

  const generateImage = async (
    successMessage?: string,
  ): Promise<{ blob: Blob; url: string } | null> => {
    if (!containerRef.current) return null;

    setLoading(true);
    try {
      await waitForNextPaint();
      
      // Force high resolution for the target format
      const targetWidth = format === "stories" ? 1080 : 1080;
      const targetHeight = format === "stories" ? 1920 : 1080;
      
      const dataUrl = await htmlToImage.toPng(containerRef.current, {
        cacheBust: true,
        skipFonts: false, // Allow fonts to render correctly
        pixelRatio: 1, // We set explicit width/height, so pixelRatio 1 is fine for exact dimensions
        backgroundColor: theme === "escuro" || theme === "fe" ? "#1c1917" : "#ffffff",
        width: targetWidth,
        height: targetHeight,
        style: {
          transform: "none",
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
        },
      });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setImgBlob(blob);
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      
      if (successMessage) setStatus(successMessage);
      return { blob, url };
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      setStatus("Não consegui gerar a imagem agora. Tente novamente.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
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
    const generated = imgBlob && objectUrl
      ? { blob: imgBlob, url: objectUrl }
      : await generateImage("Imagem pronta.");
      
    if (!generated?.blob) return;

    await downloadImage(generated.blob);
    setStatus("Imagem baixada com sucesso.");
  };

  const handleShare = async () => {
    const generated = imgBlob && objectUrl
      ? { blob: imgBlob, url: objectUrl }
      : await generateImage("Imagem pronta.");
      
    if (!generated?.blob) return;

    const file = new File([generated.blob], IMAGE_FILE_NAME, { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    
    const canShareFile = Boolean(nav.share) && (!nav.canShare || nav.canShare({ files: [file] }));

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
        if (isShareAbort(error)) {
          setStatus("Compartilhamento cancelado.");
          return;
        }
        console.warn("Compartilhamento falhou, usando fallback de download:", error);
      }
    }

    // Fallback: if share fails or is not supported, download automatically
    await downloadImage(generated.blob);
    setStatus("Compartilhamento não suportado. Imagem baixada para você postar manualmente.");
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Controls */}
      <div className="w-full max-w-md space-y-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
            Formato
          </label>
          <div className="flex gap-2">
            {(Object.keys(FORMATS) as ImageFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  format === f
                    ? "bg-stone-800 text-white"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {FORMATS[f].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
            Estilo Visual
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(THEMES) as ImageTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  theme === t
                    ? "ring-2 ring-stone-800 bg-stone-200 text-stone-900"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                }`}
              >
                {THEMES[t].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Container */}
      <div className="relative w-full max-w-sm mx-auto">
        <div
          ref={containerRef}
          className={`w-full flex items-center justify-center rounded-2xl ${themeStyles.bg} ${themeStyles.text} ${themeStyles.font} ${themeStyles.shadow}`}
          style={{
            textAlign: "center",
            height: `${template.minHeight}px`,
            padding: `${template.padding}px`,
            boxSizing: "border-box",
            aspectRatio: format === "stories" ? "9/16" : "1/1",
          }}
        >
          <div
            className="w-full flex flex-col items-center"
            style={{
              height: `${template.contentHeight}px`,
            }}
          >
            <div
              ref={textFrameRef}
              className="w-full flex items-center justify-center overflow-hidden"
              style={{
                height: `${template.textAreaHeight}px`,
                flex: `0 0 ${template.textAreaHeight}px`,
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
                }}
              >
                {message}
              </p>
            </div>

            {signature && (
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  gap: "10px",
                  opacity: 0.8,
                  height: `${template.signatureAreaHeight}px`,
                  marginTop: `${template.footerGap}px`,
                  flex: "0 0 auto",
                }}
              >
                <span
                  aria-hidden
                  className="bg-current"
                  style={{
                    width: template.kind === "short" ? "80px" : "60px",
                    height: "1px",
                    opacity: 0.4,
                  }}
                />
                <p
                  className="italic tracking-wide"
                  style={{
                    margin: 0,
                    fontSize: `${template.signatureSize}px`,
                    lineHeight: 1.1,
                  }}
                >
                  {signature}
                  {/* Espaço reservado para assinatura personalizada Premium */}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center w-full max-w-md">
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading || !imgBlob}
          className="flex items-center gap-2 px-5 py-3 rounded-full font-medium bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={18} />
          Baixar Imagem
        </button>
        
        <button
          type="button"
          onClick={handleShare}
          disabled={loading || !imgBlob}
          className="flex items-center gap-2 px-5 py-3 rounded-full font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Share2 size={18} />
          Compartilhar
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={loading || !imgBlob}
          className="flex items-center gap-2 px-5 py-3 rounded-full font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Instagram size={18} />
          Baixar p/ Instagram
        </button>
      </div>

      {status && (
        <p className="text-center text-xs text-stone-500 max-w-xs">
          {status}
        </p>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
            <span className="text-sm font-medium text-stone-600">Gerando imagem...</span>
          </div>
        </div>
      )}
    </div>
  );
}
