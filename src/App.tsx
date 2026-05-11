import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  IMPACT_QUOTES,
  MESSAGES,
  MOODS,
  SIGNATURE,
  type Category,
  type Message,
  type Mood,
} from "@/data/messages";
import { AuthModal, type MockUser } from "@/components/AuthModal";
import { ProfileModal } from "@/components/ProfileModal";
import {
  GEN_MOODS,
  GEN_RECIPIENTS,
  generateMessage,
  type GenMood,
  type GenRecipient,
} from "@/data/generator";

const ALMA_SONORA_URL =
  "https://alma-sonora-2kt8xmo83-jefinho2109s-projects.vercel.app";
const SHARE_SIGNATURE = "— Alma Escrita";

const FAVORITES_KEY = "alma-escrita:favorites";
const COPIED_KEY = "alma-escrita:last-copied";
const FILTER_KEY = "alma-escrita:last-filter";
const CUSTOM_FAVORITES_KEY = "alma-escrita:custom-favorites";
const LAST_GENERATED_KEY = "alma-escrita:last-generated";
const GEN_FORM_KEY = "alma-escrita:gen-form";
const RECENT_KEY = "alma-escrita:recent";
const RECENT_LIMIT = 5;
const DAILY_KEY = "alma-escrita:daily";
const THEME_KEY = "alma-escrita:theme";

type Theme = "light" | "dark";

type Filter =
  | { kind: "none" }
  | { kind: "category"; value: Category }
  | { kind: "mood"; value: Mood };

interface GeneratedMessage {
  id: string;
  name: string;
  mood: GenMood;
  recipient: GenRecipient;
  text: string;
  createdAt: number;
}

interface GenForm {
  name: string;
  mood: GenMood;
  recipient: GenRecipient;
}

type RecentItem =
  | {
      kind: "curated";
      key: string;
      messageId: string;
      text: string;
      label: string;
      addedAt: number;
    }
  | {
      kind: "generated";
      key: string;
      text: string;
      label: string;
      addedAt: number;
    };

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

function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function msUntilNextMidnight(d = new Date()): number {
  const next = new Date(d);
  next.setHours(24, 0, 0, 50);
  return next.getTime() - d.getTime();
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function greetingForHour(h: number): "Bom dia" | "Boa tarde" | "Boa noite" {
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function currentGreeting(d = new Date()): "Bom dia" | "Boa tarde" | "Boa noite" {
  return greetingForHour(d.getHours());
}

function stripLeadingGreeting(text: string): string {
  const re = /^(bom dia|boa tarde|boa noite)[\s,!.\-—:]+/i;
  return text.replace(re, "");
}

function applyGreeting(greeting: string, text: string): string {
  const cleaned = stripLeadingGreeting(text);
  return `${greeting}, ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
}

function pickDaily(dateKey: string): Message {
  const idx = hashString(dateKey) % MESSAGES.length;
  return MESSAGES[idx];
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
    case "Gratidão": return "✺";
    case "Recomeço": return "❖";
    case "Impacto": return "🔑";
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
  const [genForm, setGenForm] = useLocalStorageState<GenForm>(GEN_FORM_KEY, {
    name: "",
    mood: "feliz",
    recipient: "amor",
  });
  const [lastGenerated, setLastGenerated] =
    useLocalStorageState<GeneratedMessage | null>(LAST_GENERATED_KEY, null);
  const [customFavorites, setCustomFavorites] = useLocalStorageState<
    GeneratedMessage[]
  >(CUSTOM_FAVORITES_KEY, []);
  const [recent, setRecent] = useLocalStorageState<RecentItem[]>(
    RECENT_KEY,
    [],
  );
  const [daily, setDaily] = useLocalStorageState<{
    dateKey: string;
    messageId: string;
  } | null>(DAILY_KEY, null);
  const [todayStr, setTodayStr] = useState<string>(() => todayKey());
  const [greeting, setGreeting] = useState<"Bom dia" | "Boa tarde" | "Boa noite">(
    () => currentGreeting()
  );
  const [theme, setTheme] = useLocalStorageState<Theme>(THEME_KEY, "light");
  const [toast, setToast] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("home");
  const [viewerItem, setViewerItem] = useState<RecentItem | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [mockUser, setMockUser] = useState<MockUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const generatedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    function schedule(): number {
      return window.setTimeout(() => {
        setTodayStr(todayKey());
        timer = schedule();
      }, msUntilNextMidnight());
    }
    let timer = schedule();
    function onVisible() {
      if (document.visibilityState === "visible") {
        const now = todayKey();
        setTodayStr((prev) => (prev === now ? prev : now));
        const g = currentGreeting();
        setGreeting((prev) => (prev === g ? prev : g));
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const g = currentGreeting();
      setGreeting((prev) => (prev === g ? prev : g));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const dailyMessage: Message = useMemo(() => {
    if (daily && daily.dateKey === todayStr) {
      const found = MESSAGES.find((m) => m.id === daily.messageId);
      if (found) return found;
    }
    return pickDaily(todayStr);
  }, [daily, todayStr]);

  useEffect(() => {
    if (!daily || daily.dateKey !== todayStr || daily.messageId !== dailyMessage.id) {
      setDaily({ dateKey: todayStr, messageId: dailyMessage.id });
    }
  }, [todayStr, dailyMessage.id, daily, setDaily]);

  useEffect(() => {
    if (!creatorOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCreatorOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [creatorOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    const ids = ["section-daily", "section-impact", "section-categories"];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    function onScroll() {
      const y = window.scrollY;
      if (y < 80) {
        setActiveSection("home");
        return;
      }
      let current = "home";
      const offset = 120;
      for (const sec of sections) {
        const top = sec.getBoundingClientRect().top + window.scrollY;
        if (y + offset >= top) current = sec.id;
      }
      setActiveSection(current);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filtered: Message[] = useMemo(() => {
    if (showFavorites) {
      const favSet = new Set(favorites);
      const all = [...MESSAGES, ...IMPACT_QUOTES];
      return all.filter((m) => favSet.has(m.id));
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

  function pushRecent(item: RecentItem) {
    setRecent((prev) => {
      const filtered = prev.filter((r) => r.key !== item.key);
      return [item, ...filtered].slice(0, RECENT_LIMIT);
    });
  }

  function copyText(text: string, okMsg = "Mensagem copiada com carinho ✦") {
    navigator.clipboard
      .writeText(text)
      .then(() => setToast(okMsg))
      .catch(() => setToast("Não consegui copiar. Tente novamente."));
  }

  function handleCopy(m: Message) {
    const full = `${m.text}\n\n${SIGNATURE}`;
    navigator.clipboard
      .writeText(full)
      .then(() => {
        setLastCopied(m.id);
        setToast("Mensagem copiada com carinho ✦");
        pushRecent({
          kind: "curated",
          key: `c:${m.id}`,
          messageId: m.id,
          text: m.text,
          label: m.category,
          addedAt: Date.now(),
        });
      })
      .catch(() => setToast("Não consegui copiar. Tente novamente."));
  }

  async function handleShare(m: Message) {
    const full = `${m.text}\n\n${SHARE_SIGNATURE}`;
    await shareText(full);
  }

  async function shareText(text: string) {
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({ title: "Alma Escrita", text });
        return;
      } catch {
        /* fall back to whatsapp */
      }
    }
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareWhatsApp(text: string) {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
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

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const text = generateMessage(genForm.name, genForm.mood, genForm.recipient);
    const generated: GeneratedMessage = {
      id: `gen-${Date.now()}`,
      name: genForm.name.trim(),
      mood: genForm.mood,
      recipient: genForm.recipient,
      text,
      createdAt: Date.now(),
    };
    setLastGenerated(generated);
    setToast("Mensagem criada com carinho ✨");
    pushRecent({
      kind: "generated",
      key: `g:${generated.id}`,
      text,
      label: `Personalizada · ${generated.mood}`,
      addedAt: Date.now(),
    });
    requestAnimationFrame(() => {
      generatedRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function regenerate() {
    if (!lastGenerated) return;
    const text = generateMessage(
      lastGenerated.name,
      lastGenerated.mood,
      lastGenerated.recipient,
    );
    const updated = { ...lastGenerated, text, createdAt: Date.now() };
    setLastGenerated(updated);
    pushRecent({
      kind: "generated",
      key: `g:${updated.id}-${updated.createdAt}`,
      text,
      label: `Personalizada · ${updated.mood}`,
      addedAt: Date.now(),
    });
  }

  const isCustomFavorited =
    !!lastGenerated &&
    customFavorites.some(
      (g) =>
        g.text === lastGenerated.text &&
        g.name === lastGenerated.name &&
        g.mood === lastGenerated.mood &&
        g.recipient === lastGenerated.recipient,
    );

  function toggleCustomFavorite() {
    if (!lastGenerated) return;
    if (isCustomFavorited) {
      setCustomFavorites((prev) =>
        prev.filter(
          (g) =>
            !(
              g.text === lastGenerated.text &&
              g.name === lastGenerated.name &&
              g.mood === lastGenerated.mood &&
              g.recipient === lastGenerated.recipient
            ),
        ),
      );
      setToast("Removida dos favoritos");
    } else {
      setCustomFavorites((prev) => [lastGenerated, ...prev].slice(0, 50));
      setToast("Salva nos seus favoritos ♥");
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Hamburger menu trigger */}
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={menuOpen}
        aria-controls="side-menu"
        title="Menu"
        className="fixed top-4 left-4 sm:top-5 sm:left-5 z-40 h-10 w-10 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.85)] backdrop-blur hover:bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-md flex items-center justify-center transition"
      >
        <span aria-hidden className="text-lg leading-none">☰</span>
      </button>

      {/* Top-right controls: auth + theme toggle */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-40 flex items-center gap-2">
        {mockUser ? (
          <>
            {/* "Olá, nome" pill — clickable to open profile (desktop only) */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Ver perfil"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.85)] backdrop-blur hover:bg-[hsl(var(--card))] text-xs font-medium text-[hsl(var(--foreground))] shadow-md max-w-[160px] truncate transition"
            >
              <span aria-hidden className="shrink-0 h-5 w-5 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-[10px] font-bold">
                {mockUser.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">Olá, {mockUser.name.split(" ")[0]}</span>
            </button>
            {/* Avatar button — opens profile on mobile */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Ver perfil"
              className="sm:hidden h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-sm font-bold shadow-md hover:opacity-90 transition"
            >
              {mockUser.name.charAt(0).toUpperCase()}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            aria-label="Entrar ou criar conta"
            className="h-10 px-4 rounded-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.88)] text-[hsl(var(--primary-foreground))] shadow-md flex items-center gap-1.5 text-sm font-semibold transition"
          >
            <span aria-hidden className="text-base leading-none">👤</span>
            Entrar
          </button>
        )}

        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          className="h-10 w-10 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.85)] backdrop-blur hover:bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-md flex items-center justify-center transition"
        >
          <span aria-hidden className="text-lg leading-none">
            {theme === "dark" ? "☀" : "☾"}
          </span>
        </button>
      </div>

      {/* Side menu (drawer) */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!menuOpen}
      >
        <div
          className="absolute inset-0 bg-[hsl(220_40%_8%/0.55)] backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
        <aside
          id="side-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
          className={`absolute left-0 top-0 h-full w-[82%] max-w-xs bg-[hsl(var(--card))] shadow-2xl shadow-[hsl(215_70%_15%/0.35)] border-r border-[hsl(var(--border))] flex flex-col transform transition-transform duration-300 ease-out ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
                Menu
              </p>
              <p className="font-serif text-xl text-[hsl(var(--primary))] leading-tight">
                Alma Escrita
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
              className="h-9 w-9 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] flex items-center justify-center transition"
            >
              <span aria-hidden className="text-lg leading-none">✕</span>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3">
            {(() => {
              type MenuItem = {
                key: string;
                label: string;
                icon: string;
                onClick: () => void;
                active?: boolean;
              };
              function go(id: string) {
                setMenuOpen(false);
                requestAnimationFrame(() => {
                  if (id === "home") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    document
                      .getElementById(id)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                });
              }
              const items: MenuItem[] = [
                {
                  key: "home",
                  label: "Home",
                  icon: "⌂",
                  active: activeSection === "home",
                  onClick: () => go("home"),
                },
                {
                  key: "section-categories",
                  label: "Categorias",
                  icon: "▦",
                  active: activeSection === "section-categories",
                  onClick: () => go("section-categories"),
                },
                {
                  key: "section-daily",
                  label: "Mensagem para este momento",
                  icon: "✦",
                  active: activeSection === "section-daily",
                  onClick: () => go("section-daily"),
                },
                {
                  key: "section-impact",
                  label: "Frases de Impacto",
                  icon: "🔑",
                  active: activeSection === "section-impact",
                  onClick: () => go("section-impact"),
                },
                {
                  key: "favorites",
                  label: "Favoritas",
                  icon: "♥",
                  onClick: () => {
                    setShowFavorites(true);
                    setFilter({ kind: "none" });
                    setMenuOpen(false);
                    requestAnimationFrame(() => {
                      document
                        .getElementById("section-messages")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  },
                },
                {
                  key: "creator",
                  label: "Criar mensagem personalizada",
                  icon: "✨",
                  onClick: () => {
                    setMenuOpen(false);
                    setCreatorOpen(true);
                  },
                },
                {
                  key: "alma-sonora",
                  label: "Acessar Alma Sonora",
                  icon: "🎧",
                  onClick: () => {
                    setMenuOpen(false);
                    window.open(ALMA_SONORA_URL, "_blank", "noopener,noreferrer");
                  },
                },
                ...(!mockUser
                  ? [
                      {
                        key: "auth",
                        label: "Entrar / Criar conta",
                        icon: "👤",
                        onClick: () => {
                          setMenuOpen(false);
                          setAuthOpen(true);
                        },
                      } satisfies MenuItem,
                    ]
                  : []),
              ];
              return (
                <ul className="px-2">
                  {items.map((it) => (
                    <li key={it.key}>
                      <button
                        type="button"
                        onClick={it.onClick}
                        className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition ${
                          it.active
                            ? "bg-gradient-to-r from-[hsl(var(--primary)/0.12)] to-[hsl(var(--accent)/0.10)] text-[hsl(var(--primary))] font-semibold"
                            : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-sm ${
                            it.active
                              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                              : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                          }`}
                        >
                          {it.icon}
                        </span>
                        <span className="font-serif text-base sm:text-[1.05rem] leading-snug">
                          {it.label}
                        </span>
                        {it.active && (
                          <span
                            aria-hidden
                            className="ml-auto h-2 w-2 rounded-full bg-[hsl(var(--accent))]"
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </nav>

          {/* User area */}
          {mockUser ? (
            <div className="px-5 py-4 border-t border-[hsl(var(--border))]">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {mockUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                    {mockUser.name}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                    {mockUser.email}
                  </p>
                </div>
              </div>
              <div className="grid gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowFavorites(true);
                    setFilter({ kind: "none" });
                    setMenuOpen(false);
                    requestAnimationFrame(() => {
                      document
                        .getElementById("section-messages")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[hsl(var(--muted))] transition text-[hsl(var(--foreground))]"
                >
                  <span aria-hidden>♥</span> Minhas favoritas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMockUser(null);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[hsl(var(--muted))] transition text-[hsl(var(--muted-foreground))]"
                >
                  <span aria-hidden>↩</span> Sair
                </button>
              </div>
            </div>
          ) : null}

          <div className="px-5 py-4 border-t border-[hsl(var(--border))] text-center">
            <p className="font-serif italic text-sm text-[hsl(var(--muted-foreground))]">
              — Jefferson Poeta Sonhador
            </p>
          </div>
        </aside>
      </div>

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
            className="btn-grad inline-flex items-center gap-2 px-5 py-3 rounded-full font-medium"
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
                : "bg-[hsl(var(--card)/0.7)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))]"
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
        {/* Daily message */}
        <section id="section-daily" className="mt-2 mb-6 scroll-mt-24" aria-labelledby="daily-title">
          <article className="feature-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2
                id="daily-title"
                className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.25em] feature-fg font-semibold"
              >
                <span className="h-px w-5 feature-divider" />
                Mensagem para este momento
                <span className="h-px w-5 feature-divider" />
              </h2>
              <span className="text-[10px] uppercase tracking-wider feature-fg-soft">
                {dailyMessage.category}
              </span>
            </div>
            <p className="font-serif text-base sm:text-lg leading-relaxed feature-fg text-center text-balance">
              “{applyGreeting(greeting, dailyMessage.text)}”
            </p>
            <p className="font-serif italic text-sm feature-fg-soft mt-3 text-center">
              {SIGNATURE}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCopy({
                    ...dailyMessage,
                    text: applyGreeting(greeting, dailyMessage.text),
                  })
                }
                className="btn-soft inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-4 py-2 rounded-full"
              >
                <span aria-hidden>⧉</span>
                Copiar
              </button>
              <button
                type="button"
                onClick={() =>
                  handleShare({
                    ...dailyMessage,
                    text: applyGreeting(greeting, dailyMessage.text),
                  })
                }
                className="btn-soft inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-4 py-2 rounded-full"
              >
                <span aria-hidden>↗</span>
                Compartilhar
              </button>
            </div>
          </article>
        </section>

        {/* Personalized message — small entry card */}
        <section className="mt-2">
          <button
            type="button"
            onClick={() => setCreatorOpen(true)}
            className="group w-full text-left rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] glass p-4 sm:p-5 flex items-center gap-4 hover:bg-[hsl(var(--card))] hover:shadow-md transition"
          >
            <div className="shrink-0 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-lg shadow-md shadow-[hsl(var(--primary)/0.25)]">
              <span aria-hidden>✨</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-lg sm:text-xl text-[hsl(var(--foreground))] leading-tight">
                Criar mensagem personalizada
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                Receba uma mensagem exclusiva para o seu momento
              </p>
            </div>
            <span className="btn-grad shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium">
              Criar agora
              <span aria-hidden>→</span>
            </span>
          </button>
        </section>

        {/* Frases de Impacto do Poeta Sonhador */}
        <section id="section-impact" className="mt-8 scroll-mt-24" aria-labelledby="impact-title">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] impact-section-title font-semibold mb-1">
                Seção especial
              </p>
              <h2
                id="impact-title"
                className="font-serif text-2xl sm:text-3xl text-[hsl(var(--foreground))] leading-tight"
              >
                <span aria-hidden>🔑</span>{" "}
                Frases de Impacto do{" "}
                <span className="impact-section-title font-semibold">
                  Poeta Sonhador
                </span>
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-prose">
                Pensamentos curtos, profundos e marcantes — para guardar no peito.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {IMPACT_QUOTES.map((q) => {
              const fav = favorites.includes(q.id);
              return (
                <article
                  key={q.id}
                  className="impact-card fade-in relative rounded-2xl p-6 sm:p-7 transition hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] impact-accent font-semibold">
                      <span aria-hidden>🔑</span>
                      Frase de Impacto
                    </span>
                    <button
                      type="button"
                      aria-label={
                        fav
                          ? "Remover dos favoritos"
                          : "Adicionar aos favoritos"
                      }
                      onClick={() => toggleFavorite(q.id)}
                      className={`text-xl leading-none transition ${
                        fav ? "impact-accent" : "impact-fg-soft hover:impact-accent"
                      }`}
                    >
                      {fav ? "♥" : "♡"}
                    </button>
                  </div>

                  <p className="font-serif text-[1.2rem] sm:text-[1.3rem] leading-relaxed impact-fg text-balance relative z-10">
                    <span className="impact-accent text-2xl leading-none mr-1" aria-hidden>“</span>
                    {q.text}
                    <span className="impact-accent text-2xl leading-none ml-1" aria-hidden>”</span>
                  </p>

                  <p className="font-serif italic impact-fg-soft mt-4 relative z-10">
                    {SIGNATURE}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => handleCopy(q)}
                      className="btn-soft inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full"
                    >
                      <span aria-hidden>⧉</span>
                      Copiar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare(q)}
                      className="btn-soft inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full"
                    >
                      <span aria-hidden>↗</span>
                      Compartilhar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Recent messages */}
        {recent.length > 0 && (
          <section className="mt-6" aria-labelledby="recent-title">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2
                id="recent-title"
                className="font-serif text-base sm:text-lg text-[hsl(var(--foreground))] flex items-center gap-2"
              >
                <span aria-hidden>✨</span>
                Suas últimas mensagens
              </h2>
              <button
                type="button"
                onClick={() => {
                  setRecent([]);
                  setToast("Histórico limpo");
                }}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition"
              >
                Limpar
              </button>
            </div>
            <ul className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]">
              {recent.map((r) => (
                <li
                  key={r.key}
                  className="snap-start shrink-0 w-[78%] sm:w-64 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] glass p-4 flex flex-col gap-2 hover:shadow-md transition"
                >
                  <button
                    type="button"
                    onClick={() => setViewerItem(r)}
                    className="text-left flex-1 group"
                    aria-label="Ver mensagem novamente"
                  >
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))] font-semibold">
                      {r.label}
                    </span>
                    <p
                      className="font-serif text-sm leading-snug text-[hsl(var(--foreground))] mt-1.5"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      “{r.text}”
                    </p>
                  </button>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[hsl(var(--border))]">
                    <button
                      type="button"
                      onClick={() => setViewerItem(r)}
                      className="text-xs font-medium text-[hsl(var(--primary))] hover:underline"
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(`${r.text}\n\n${SIGNATURE}`)
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition"
                    >
                      <span aria-hidden>⧉</span>
                      Copiar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Categories */}
        <section id="section-categories" className="mt-10 scroll-mt-24">
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
                      : "bg-[hsl(var(--card)/0.7)] hover:bg-[hsl(var(--card))] border-[hsl(var(--border))]"
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
                      : "bg-[hsl(var(--card)/0.7)] hover:bg-[hsl(var(--card))] border-[hsl(var(--border))]"
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
        <section id="section-messages" className="mt-6 scroll-mt-24">
          <h3 className="font-serif text-xl text-[hsl(var(--foreground))] mb-4">
            {heading}
          </h3>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/0.5)] p-10 text-center">
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
                    className="feature-card fade-in relative rounded-2xl p-6 sm:p-7 transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] feature-fg-soft font-semibold">
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
                            ? "feature-fg"
                            : "feature-fg-soft hover:feature-fg"
                        }`}
                      >
                        {fav ? "♥" : "♡"}
                      </button>
                    </div>

                    <p className="font-serif text-[1.15rem] sm:text-[1.2rem] leading-relaxed feature-fg text-balance">
                      “{m.text}”
                    </p>

                    <p className="font-serif italic feature-fg-soft mt-4">
                      {SIGNATURE}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(m)}
                        className="btn-soft inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full"
                      >
                        <span aria-hidden>⧉</span>
                        Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShare(m)}
                        className="btn-soft inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full"
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

      {/* Creator Modal */}
      {creatorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="creator-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center fade-in"
        >
          <div
            className="absolute inset-0 bg-[hsl(var(--foreground)/0.45)] backdrop-blur-sm"
            onClick={() => setCreatorOpen(false)}
          />
          <div className="relative w-full sm:max-w-xl mx-auto sm:m-6 max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[hsl(var(--background))] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-7 py-4 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-sm">
                  <span aria-hidden>✨</span>
                </div>
                <h2
                  id="creator-title"
                  className="font-serif text-xl sm:text-2xl text-[hsl(var(--primary))] truncate"
                >
                  Criar mensagem personalizada
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setCreatorOpen(false)}
                className="shrink-0 h-9 w-9 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-lg leading-none flex items-center justify-center"
              >
                ×
              </button>
            </div>

            <div className="px-5 sm:px-7 py-6">
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
                Conte um pouco sobre você — eu escrevo uma mensagem feita só
                pra esse momento.
              </p>

              <form onSubmit={handleGenerate} className="grid gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Nome da pessoa
                  </span>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="Ex.: GT"
                    value={genForm.name}
                    onChange={(e) =>
                      setGenForm({ ...genForm, name: e.target.value })
                    }
                    className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Como você está se sentindo?
                  </span>
                  <select
                    value={genForm.mood}
                    onChange={(e) =>
                      setGenForm({
                        ...genForm,
                        mood: e.target.value as GenMood,
                      })
                    }
                    className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition"
                  >
                    {GEN_MOODS.map((m) => (
                      <option key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Para quem é a mensagem?
                  </span>
                  <select
                    value={genForm.recipient}
                    onChange={(e) =>
                      setGenForm({
                        ...genForm,
                        recipient: e.target.value as GenRecipient,
                      })
                    }
                    className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition"
                  >
                    {GEN_RECIPIENTS.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="btn-grad mt-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium"
                >
                  <span aria-hidden>✦</span>
                  Gerar mensagem
                </button>
              </form>

              {lastGenerated && (
                <div
                  ref={generatedRef}
                  className="fade-in mt-7 rounded-2xl bg-gradient-to-br from-[hsl(var(--secondary))] to-[hsl(var(--card))] border border-[hsl(var(--border))] p-6 sm:p-7 text-center"
                >
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[hsl(var(--accent))] font-semibold mb-3">
                    <span className="h-px w-6 bg-[hsl(var(--accent))]" />
                    Sua mensagem
                    <span className="h-px w-6 bg-[hsl(var(--accent))]" />
                  </div>
                  <p className="font-serif text-lg sm:text-xl leading-relaxed text-[hsl(var(--foreground))] text-balance">
                    “{lastGenerated.text}”
                  </p>
                  <p className="font-serif italic text-[hsl(var(--muted-foreground))] mt-4">
                    {SIGNATURE}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyText(`${lastGenerated.text}\n\n${SIGNATURE}`)
                      }
                      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition"
                    >
                      <span aria-hidden>⧉</span>
                      Copiar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        shareText(`${lastGenerated.text}\n\n${SHARE_SIGNATURE}`)
                      }
                      className="btn-grad inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full"
                    >
                      <span aria-hidden>↗</span>
                      Compartilhar
                    </button>
                    <button
                      type="button"
                      onClick={toggleCustomFavorite}
                      className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition ${
                        isCustomFavorited
                          ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] border-transparent"
                          : "bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                      }`}
                    >
                      <span aria-hidden>{isCustomFavorited ? "♥" : "♡"}</span>
                      {isCustomFavorited ? "Favoritada" : "Favoritar"}
                    </button>
                    <button
                      type="button"
                      onClick={regenerate}
                      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition"
                      title="Gerar outra variação com os mesmos dados"
                    >
                      <span aria-hidden>↻</span>
                      Outra
                    </button>
                  </div>
                </div>
              )}

              {customFavorites.length > 0 && (
                <details className="mt-6 group">
                  <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-medium text-[hsl(var(--primary))] hover:underline">
                    <span>
                      Suas mensagens personalizadas salvas (
                      {customFavorites.length})
                    </span>
                    <span aria-hidden className="transition group-open:rotate-180">
                      ⌄
                    </span>
                  </summary>
                  <ul className="mt-4 grid gap-3">
                    {customFavorites.map((g) => (
                      <li
                        key={g.id}
                        className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left"
                      >
                        <p className="font-serif text-base text-[hsl(var(--foreground))]">
                          “{g.text}”
                        </p>
                        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                          <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                            {g.mood} · {g.recipient}
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                copyText(`${g.text}\n\n${SIGNATURE}`)
                              }
                              className="text-xs font-medium px-3 py-1.5 rounded-full border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                            >
                              Copiar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                shareText(`${g.text}\n\n${SHARE_SIGNATURE}`)
                              }
                              className="btn-grad text-xs font-medium px-3 py-1.5 rounded-full"
                            >
                              Compartilhar
                            </button>
                            <button
                              type="button"
                              aria-label="Remover dos favoritos"
                              onClick={() =>
                                setCustomFavorites((prev) =>
                                  prev.filter((x) => x.id !== g.id),
                                )
                              }
                              className="text-xs font-medium px-3 py-1.5 rounded-full border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="mt-7 flex justify-center">
                <button
                  type="button"
                  onClick={() => setCreatorOpen(false)}
                  className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition"
                >
                  <span aria-hidden>←</span>
                  Voltar para a home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent message viewer */}
      {viewerItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="viewer-title"
          className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center fade-in"
        >
          <div
            className="absolute inset-0 bg-[hsl(var(--foreground)/0.45)] backdrop-blur-sm"
            onClick={() => setViewerItem(null)}
          />
          <div className="relative w-full sm:max-w-md mx-auto sm:m-6 max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[hsl(var(--background))] shadow-2xl">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[hsl(var(--border))]">
              <h2
                id="viewer-title"
                className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))] font-semibold truncate"
              >
                {viewerItem.label}
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setViewerItem(null)}
                className="shrink-0 h-9 w-9 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-lg leading-none flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <div className="px-6 sm:px-8 py-7 text-center">
              <p className="font-serif text-lg sm:text-xl leading-relaxed text-[hsl(var(--foreground))] text-balance">
                “{viewerItem.text}”
              </p>
              <p className="font-serif italic text-[hsl(var(--muted-foreground))] mt-4">
                {SIGNATURE}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyText(`${viewerItem.text}\n\n${SIGNATURE}`)
                  }
                  className="btn-grad inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full"
                >
                  <span aria-hidden>⧉</span>
                  Copiar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    shareText(`${viewerItem.text}\n\n${SHARE_SIGNATURE}`)
                  }
                  className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition"
                >
                  <span aria-hidden>↗</span>
                  Compartilhar
                </button>
                <button
                  type="button"
                  onClick={() => setViewerItem(null)}
                  className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={(user) => setMockUser(user)}
      />

      {/* Profile Modal */}
      {mockUser && (
        <ProfileModal
          open={profileOpen}
          user={mockUser}
          favoritesCount={favorites.length + customFavorites.length}
          onClose={() => setProfileOpen(false)}
          onLogout={() => setMockUser(null)}
          onShowFavorites={() => {
            setShowFavorites(true);
            setFilter({ kind: "none" });
            requestAnimationFrame(() => {
              document
                .getElementById("section-messages")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-xl text-sm fade-in z-[60]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
