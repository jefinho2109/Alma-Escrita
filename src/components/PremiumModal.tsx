import { Crown, Download, Image, Infinity, Layers, Lock, X } from "lucide-react";
import {
  PREMIUM_FEATURES,
  PREMIUM_TEST_ENABLED,
  type PremiumFeature,
} from "@/lib/premium";

interface PremiumModalProps {
  open: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const featureIcons: Record<PremiumFeature, typeof Image> = {
  image_creator: Image,
  visual_backgrounds: Layers,
  advanced_visual_styles: Crown,
  story_images: Image,
  high_quality_export: Download,
  remove_watermark: Lock,
  special_templates: Layers,
  unlimited_history: Infinity,
};

export function PremiumModal({
  open,
  isLoggedIn,
  onClose,
  onLogin,
}: PremiumModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-title"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center fade-in"
    >
      <div
        className="absolute inset-0 bg-[hsl(var(--foreground)/0.45)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-md mx-auto sm:m-6 rounded-t-3xl sm:rounded-3xl bg-[hsl(var(--background))] shadow-2xl overflow-hidden border border-[hsl(var(--border))]">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center">
              <Crown className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))] mb-0.5">
                Premium
              </p>
              <h2
                id="premium-title"
                className="font-serif text-2xl text-[hsl(var(--primary))]"
              >
                Alma Escrita Premium
              </h2>
            </div>
          </div>

          <button
            type="button"
            aria-label="Fechar Premium"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] flex items-center justify-center transition"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="px-6 pb-7 grid gap-5">
          <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
            As mensagens em texto continuam gratuitas. O Premium fica reservado
            para recursos visuais avançados e histórico ilimitado. A imagem
            simples também continua gratuita.
          </p>

          <div className="grid gap-3">
            {(Object.keys(PREMIUM_FEATURES) as PremiumFeature[]).map(
              (feature) => {
                const Icon = featureIcons[feature];
                return (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3"
                  >
                    <span className="h-8 w-8 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {PREMIUM_FEATURES[feature]}
                    </span>
                  </div>
                );
              },
            )}
          </div>

          {PREMIUM_TEST_ENABLED && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
              Modo teste Premium ativo neste ambiente.
            </div>
          )}

          <button
            type="button"
            onClick={isLoggedIn ? onClose : onLogin}
            className="btn-grad w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            {isLoggedIn ? (
              <>
                <Lock className="h-4 w-4" aria-hidden />
                Entendi
              </>
            ) : (
              <>
                <Crown className="h-4 w-4" aria-hidden />
                Entrar para continuar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PremiumModal;
