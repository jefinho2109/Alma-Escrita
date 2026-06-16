import type { AppUser } from "@/lib/firebase";

export const PREMIUM_TEST_ENABLED = import.meta.env.VITE_PREMIUM_TEST === "true";
export const PREMIUM_TEST_EMAIL = "jrsclarinetista@gmail.com";

function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function getPremiumUserName(user: AppUser): string {
  const name = user.name?.trim();
  if (name) return name;

  const emailName = normalizeEmail(user.email).split("@")[0]?.trim();
  return emailName || "Alma Escrita";
}

export function isPremiumUser(user: AppUser | null): boolean {
  if (!user) return false;
  return PREMIUM_TEST_ENABLED || normalizeEmail(user.email) === PREMIUM_TEST_EMAIL;
}

export function buildPremiumSignature(user: AppUser): string {
  return ["Com carinho,", getPremiumUserName(user)].join("\n");
}
