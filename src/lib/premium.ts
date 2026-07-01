import type { AppUser } from "@/lib/firebase";

export type PremiumFeature =
  | "image_creator"
  | "visual_backgrounds"
  | "advanced_visual_styles"
  | "story_images"
  | "high_quality_export"
  | "remove_watermark"
  | "special_templates"
  | "unlimited_history";

export const PREMIUM_FEATURES: Record<PremiumFeature, string> = {
  image_creator: "Imagens personalizadas",
  visual_backgrounds: "Fundos visuais personalizados",
  advanced_visual_styles: "Estilos visuais avançados",
  story_images: "Imagem para Status/Stories",
  high_quality_export: "Exportação em alta qualidade",
  remove_watermark: "Remover marca d'água",
  special_templates: "Templates especiais",
  unlimited_history: "Histórico ilimitado",
};

export const PREMIUM_TEST_ENABLED =
  import.meta.env.VITE_PREMIUM_TEST === "true";

const premiumEmails = String(import.meta.env.VITE_PREMIUM_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function getPremiumPlan(user: AppUser | null): "Gratuito" | "Premium" {
  return isPremiumUser(user) ? "Premium" : "Gratuito";
}

export function isPremiumUser(user: AppUser | null): boolean {
  if (!user) return false;
  if (PREMIUM_TEST_ENABLED) return true;
  return premiumEmails.includes(normalizeEmail(user.email));
}

export function getHistoryLimit(user: AppUser | null): number | null {
  return isPremiumUser(user) ? null : 5;
}
