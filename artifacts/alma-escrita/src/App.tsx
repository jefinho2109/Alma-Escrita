import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  MESSAGES,
  MOODS,
  SIGNATURE,
  type Category,
  type Message,
  type Mood,
} from "@/data/messages";

const ALMA_SONORA_URL =
  "https://copyright-music-hub--jeffersondesign.replit.app";

const FAVORITES_KEY = "alma-escrita:favorites";
const COPIED_KEY = "alma-escrita:last-copied";
const FILTER_KEY = "alma-escrita:last-filter";

type Filter =
  | { kind: "none" }
  | { kind: "category"; value: Category }
  | { kind: "mood"; value: Mood };

function useLocalStorageState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);

  return [state, setState] as const;
}

function categoryEmoji(c: Category): string {
  switch (c) {
    case "Amor": return "❤";
    case "Motivação": return "✦";
    case "Fé": return "✝";
    case "Superação": return "✷";
    case "Tristeza": return "☂";
    case "Amizade": return "✿";
    case "Bom dia": return "☀";
    case "Boa noite": return "☾";
  }
}

function App() {
  const [filter, setFilter] = useLocalStorageState<Filter>(FILTER_KEY, {
    kind: "none",
  });
  const [favorites, setFavorites] = useLocalStorageState<string[]>(
    FAVORITES_KEY,
    [],
  );
  const [, setLastCopied] = useLocalStorageState<string | null>(
    COPIED_KEY,
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered: Message[] = useMemo(() => {
    if (showFavorites) {
      return MESSAGES.filter((m) => favorites.includes(m.id));
    }
    if (filter.kind === "category") {
      return MESSAGES.filter((m) => m.category === filter.value);
    }
    if (filter.kind === "mood") {
      return MESSAGES.filter((m) => m.moods.includes(filter.value));
    }
    return MESSAGES;
  }, [filter, favorites, showFavorites]);

  const heading = showFavorites
    ? "Suas mensagens favoritas"
    : filter.kind === "category"
      ? `Mensagens de ${filter.value}`
      : filter.kind === "mood"
        ? `Para quem se sente ${filter.value.toLowerCase()}`
        : "Todas as mensagens";

  function handleCopy(m: Message) {
    const full = `${m.text}\n\n${SIGNATURE}`;
    navigator.clipboard
      .writeText(full)
      .then(() => {
        setLastCopied(m.id);
        setToast("Mensagem copiada com carinho ✦");
      })
      .catch(() => setToast("Não consegui copiar. Tente novamente."));
  }

  async function handleShare(m: Message) {
    const full = `${m.text}\n\n${SIGNATURE}`;
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({
          title: "Alma Escrita",
          text: full,
        });
        return;
      } catch {
        /* user cancelled or unsupported, fall back */
      }
    }
    const url = `https://wa.me/?text=${encodeURIComponent(full)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function clearFilter() {
    setFilter({ kind: "none" });
    setShowFavorites(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header / Hero */}
      <header className="px-5 sm:px-8 pt-10 sm:pt-16 pb-6 max-w-5xl w-full mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))] mb-5">
          <span className="h-px w-8 bg-[hsl(var(--border))]" />
          Poesia da alma
          <span className="h-px w-8 bg-[hsl(var(--border))]" />
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-medium text-[hsl(var(--primary))] tracking-tight">
          Alma Escrita
        </h1>
        <p className="font-serif italic text-lg sm:text-xl text-[hsl(var(--muted-foreground))] mt-3">
          Mensagens que tocam a alma
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href={ALMA_SONORA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium shadow-lg shadow-[hsl(var(--primary)/0.25)] hover:opacity-90 transition"
          >
            <span aria-hidden>🎧</span>
            <span>Acesse o Alma Sonora</span>
          </a>
          <button
            type="button"
            onClick={() => {
              setShowFavorites((v) => !v);
              setFilter({ kind: "none" });
            }}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[hsl(var(--border))] font-medium transition ${
              showFavorites
                ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] border-transparent"
                : "bg-white/70 text-[hsl(var(--foreground))] hover:bg-white"
            }`}
          >
            <span aria-hidden>♡</span>
            <span>
              Favoritas{favorites.length > 0 ? ` (${favorites.length})` : ""}
            </span>
          </button>
        </div>
      </header>

      <main className="px-5 sm:px-8 pb-16 max-w-5xl w-full mx-auto flex-1">
        {/* Categories */}
        <section className="mt-4">
          <h2 className="font-serif text-2xl text-[hsl(var(--foreground))] mb-4">
            Categorias
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {CATEGORIES.map((c) => {
              const active =
                !showFavorites &&
                filter.kind === "category" &&
                filter.value === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setShowFavorites(false);
                    setFilter({ kind: "category", value: c });
                  }}
                  className={`group relative rounded-2xl px-4 py-4 text-left border transition ${
                    active
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-transparent shadow-md shadow-[hsl(var(--primary)/0.25)]"
                      : "bg-white/70 hover:bg-white border-[hsl(var(--border))]"
                  }`}
                >
                  <div
                    className={`text-2xl mb-1 ${active ? "" : "text-[hsl(var(--accent))]"}`}
                    aria-hidden
                  >
                    {categoryEmoji(c)}
                  </div>
                  <div className="font-medium">{c}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mood selector */}
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-[hsl(var(--foreground))] mb-1">
            Como você está se sentindo hoje?
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Escolha um sentimento e receba uma palavra escrita pra ele.
          </p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const active =
                !showFavorites &&
                filter.kind === "mood" &&
                filter.value === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setShowFavorites(false);
                    setFilter({ kind: "mood", value: m });
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                    active
                      ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] border-transparent shadow-md shadow-[hsl(var(--accent)/0.3)]"
                      : "bg-white/70 hover:bg-white border-[hsl(var(--border))]"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </section>

        {/* Filter info bar */}
        {(filter.kind !== "none" || showFavorites) && (
          <div className="mt-8 flex items-center justify-between gap-3 fade-in">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Mostrando{" "}
              <span className="font-medium text-[hsl(var(--foreground))]">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? "mensagem" : "mensagens"}
            </p>
            <button
              type="button"
              onClick={clearFilter}
              className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
            >
              Ver todas
            </button>
          </div>
        )}

        {/* Messages */}
        <section className="mt-6">
          <h3 className="font-serif text-xl text-[hsl(var(--foreground))] mb-4">
            {heading}
          </h3>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white/50 p-10 text-center">
              <p className="font-serif text-xl text-[hsl(var(--muted-foreground))]">
                Você ainda não guardou nenhuma mensagem por aqui.
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
                Toque no coração ao lado de uma mensagem para salvá-la.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {filtered.map((m) => {
                const fav = favorites.includes(m.id);
                return (
                  <article
                    key={m.id}
                    className="fade-in relative rounded-2xl bg-white/80 glass border border-[hsl(var(--border))] p-6 sm:p-7 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[hsl(var(--primary))] font-semibold">
                        <span aria-hidden>{categoryEmoji(m.category)}</span>
                        {m.category}
                      </span>
                      <button
                        type="button"
                        aria-label={
                          fav ? "Remover dos favoritos" : "Adicionar aos favoritos"
                        }
                        onClick={() => toggleFavorite(m.id)}
                        className={`text-xl leading-none transition ${
                          fav
                            ? "text-[hsl(var(--accent))]"
                            : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))]"
                        }`}
                      >
                        {fav ? "♥" : "♡"}
                      </button>
                    </div>

                    <p className="font-serif text-[1.15rem] sm:text-[1.2rem] leading-relaxed text-[hsl(var(--foreground))] text-balance">
                      “{m.text}”
                    </p>

                    <p className="font-serif italic text-[hsl(var(--muted-foreground))] mt-4">
                      {SIGNATURE}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(m)}
                        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--muted))] transition"
                      >
                        <span aria-hidden>⧉</span>
                        Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShare(m)}
                        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition"
                      >
                        <span aria-hidden>↗</span>
                        Compartilhar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="px-5 sm:px-8 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
        <p className="font-serif italic">
          Feito com carinho · Jefferson Poeta Sonhador
        </p>
      </footer>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-xl text-sm fade-in"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
