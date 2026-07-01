import type { AppUser } from "@/lib/firebase";

interface ProfileModalProps {
  open: boolean;
  user: AppUser;
  favoritesCount: number;
  onClose: () => void;
  onLogout: () => void;
  onShowFavorites: () => void;
}

export function ProfileModal({
  open,
  user,
  favoritesCount,
  onClose,
  onLogout,
  onShowFavorites,
}: ProfileModalProps) {
  if (!open) return null;

  const displayName = user.name?.trim() || user.email.split("@")[0] || "Alma Escrita";
  const displayEmail = user.email || "E-mail nao informado";
  const initial = displayName.charAt(0).toUpperCase();

  const parts = displayName.split(" ");
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : initial;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : "Nao informado";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center fade-in"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[hsl(var(--foreground)/0.45)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-sm mx-auto sm:m-6 rounded-t-3xl sm:rounded-3xl bg-[hsl(var(--background))] shadow-2xl overflow-hidden">

        {/* Banner + close */}
        <div className="relative h-24 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))]">
          <button
            type="button"
            aria-label="Fechar perfil"
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white text-sm transition"
          >
            ✕
          </button>
          {/* Decorative circles */}
          <span aria-hidden className="absolute -bottom-1 -left-6 h-20 w-20 rounded-full bg-white/10" />
          <span aria-hidden className="absolute -top-4 right-16 h-16 w-16 rounded-full bg-white/10" />
        </div>

        {/* Avatar — overlaps banner */}
        <div className="px-6 -mt-10 pb-6">
          <div className="flex items-end justify-between mb-4">
            <div
              aria-hidden
              className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-[hsl(var(--background))]"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-full w-full rounded-[0.85rem] object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={() => { onLogout(); onClose(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-xs font-medium text-[hsl(var(--foreground))] transition"
            >
              <span aria-hidden>↩</span>
              Sair
            </button>
          </div>

          {/* Name + email */}
          <h2
            id="profile-title"
            className="font-serif text-2xl text-[hsl(var(--foreground))] leading-tight"
          >
            {displayName}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5 mb-5">
            {displayEmail}
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => { onShowFavorites(); onClose(); }}
              className="flex flex-col items-center gap-1 py-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition group"
            >
              <span className="text-2xl font-bold text-[hsl(var(--primary))] leading-none group-hover:scale-110 transition-transform">
                {favoritesCount}
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {favoritesCount === 1 ? "Favorita" : "Favoritas"}
              </span>
            </button>

            <div className="flex flex-col items-center gap-1 py-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <span className="text-2xl font-bold text-[hsl(var(--primary))] leading-none">
                ∞
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Mensagens
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="grid gap-2 mb-6">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              <span aria-hidden className="text-base shrink-0">📅</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Membro desde
                </p>
                <p className="text-sm font-medium text-[hsl(var(--foreground))] capitalize">
                  {memberSince}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              <span aria-hidden className="text-base shrink-0">✨</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Plano
                </p>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Gratuito
                </p>
              </div>
            </div>
          </div>

          {/* CTA — view favorites */}
          <button
            type="button"
            onClick={() => { onShowFavorites(); onClose(); }}
            className="btn-grad w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <span aria-hidden>♥</span>
            Ver minhas favoritas
          </button>
        </div>
      </div>
    </div>
  );
}
