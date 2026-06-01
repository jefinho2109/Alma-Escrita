import { useEffect, useState } from "react";

interface MessageSpeakerProps {
  text: string;
}

interface NativeSpeechBridge {
  isAvailable?: () => boolean;
  speak?: (text: string) => boolean;
  stop?: () => boolean;
}

declare global {
  interface Window {
    AlmaSpeech?: NativeSpeechBridge;
  }
}

export default function MessageSpeaker({ text }: MessageSpeakerProps) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    function handleNativeState(event: Event) {
      const detail = (event as CustomEvent<{ speaking?: boolean }>).detail;
      if (typeof detail?.speaking === "boolean") {
        setSpeaking(detail.speaking);
      }
    }

    window.addEventListener("alma-speech-state", handleNativeState);
    return () => {
      window.removeEventListener("alma-speech-state", handleNativeState);
      window.AlmaSpeech?.stop?.();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleSpeak = () => {
    const nativeSpeech = window.AlmaSpeech;

    if (speaking) {
      nativeSpeech?.stop?.();
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }

    if (nativeSpeech?.speak && nativeSpeech.isAvailable?.() !== false) {
      const started = nativeSpeech.speak(text);
      if (started) {
        setSpeaking(true);
        return;
      }
    }

    if (!window.speechSynthesis) {
      alert("Sintese de voz indisponivel neste dispositivo.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleSpeak}
      className={`btn-soft inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full ${
        speaking ? "bg-[hsl(var(--primary))] text-white" : ""
      }`}
    >
      <span aria-hidden>{speaking ? "🔊" : "🔈"}</span>
      {speaking ? "Falando..." : "Ouvir"}
    </button>
  );
}
