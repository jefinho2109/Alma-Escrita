import { useEffect, useState } from "react";
import {
  getFriendlyAuthError,
  loginWithEmail,
  loginWithGoogle,
  requestPasswordReset,
  signUpWithEmail,
  type AppUser,
} from "@/lib/firebase";

export type MockUser = AppUser;
export type AuthTab = "login" | "cadastro";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (user: MockUser) => void;
  initialTab?: AuthTab;
}

type View = "form" | "recover" | "recover-sent";

export function AuthModal({
  open,
  onClose,
  onLogin,
  initialTab = "login",
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [view, setView] = useState<View>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoverEmail, setRecoverEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setView("form");
    setError(null);
    setSubmitting(false);
  }, [initialTab, open]);

  if (!open) return null;

  function resetToForm() {
    setView("form");
    setError(null);
  }

  function handleClose() {
    setView("form");
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }
    if (tab === "cadastro" && !name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (!password.trim()) {
      setError("Informe sua senha.");
      return;
    }
    if (tab === "cadastro" && password.length < 6) {
      setError("Use uma senha com pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const user =
        tab === "login"
          ? await loginWithEmail(email, password)
          : await signUpWithEmail(name, email, password);
      onLogin(user);
      handleClose();
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!recoverEmail.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset(recoverEmail);
      setView("recover-sent");
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const titles: Record<View, string> = {
    form: tab === "login" ? "Entrar" : "Criar conta",
    recover: "Recuperar senha",
    "recover-sent": "E-mail enviado",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center fade-in"
    >
      <div
        className="absolute inset-0 bg-[hsl(var(--foreground)/0.45)] backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full sm:max-w-sm mx-auto sm:m-6 rounded-t-3xl sm:rounded-3xl bg-[hsl(var(--background))] shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {view !== "form" && (
              <button
                type="button"
                aria-label="Voltar"
                disabled={submitting}
                onClick={resetToForm}
                className="h-8 w-8 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] flex items-center justify-center text-sm transition disabled:opacity-60"
              >
                {"<"}
              </button>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))] mb-0.5">
                Alma Escrita
              </p>
              <h2
                id="auth-modal-title"
                className="font-serif text-2xl text-[hsl(var(--primary))]"
              >
                {titles[view]}
              </h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            disabled={submitting}
            onClick={handleClose}
            className="h-9 w-9 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] flex items-center justify-center text-lg leading-none transition disabled:opacity-60"
          >
            x
          </button>
        </div>

        {view === "form" && (
          <>
            <div className="flex mx-6 mb-5 rounded-xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
              {(["login", "cadastro"] as AuthTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setTab(t);
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-sm font-medium transition disabled:opacity-60 ${
                    tab === t
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                  }`}
                >
                  {t === "login" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>

            <div className="px-6 pb-8 grid gap-4">
              <form onSubmit={handleSubmit} className="grid gap-3">
                {tab === "cadastro" && (
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    disabled={submitting}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition disabled:opacity-60"
                  />
                )}
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  disabled={submitting}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition disabled:opacity-60"
                />
                <div className="grid gap-1">
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    disabled={submitting}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                    className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition disabled:opacity-60"
                  />
                  {tab === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setRecoverEmail(email);
                          setError(null);
                          setView("recover");
                        }}
                        className="text-xs text-[hsl(var(--primary))] hover:underline underline-offset-2 py-0.5 disabled:opacity-60"
                      >
                        Esqueci minha senha?
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-xs text-red-500 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-grad w-full py-3 rounded-xl text-sm font-semibold mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Aguarde..."
                    : tab === "login"
                      ? "Entrar com e-mail"
                      : "Criar minha conta"}
                </button>

                {tab === "login" && (
                  <>
                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">ou</span>
                      <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                    </div>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={async () => {
                        setSubmitting(true);
                        setError(null);
                        try {
                          const user = await loginWithGoogle();
                          onLogin(user);
                          handleClose();
                        } catch (err) {
                          setError(getFriendlyAuthError(err));
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="w-full py-3 rounded-xl text-sm font-semibold border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Entrar com Google
                    </button>
                  </>
                )}
              </form>

              <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                {tab === "login" ? (
                  <>
                    Ainda não tem conta?{" "}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setTab("cadastro");
                        setError(null);
                      }}
                      className="text-[hsl(var(--primary))] underline underline-offset-2 hover:opacity-80 disabled:opacity-60"
                    >
                      Criar conta
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?{" "}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setTab("login");
                        setError(null);
                      }}
                      className="text-[hsl(var(--primary))] underline underline-offset-2 hover:opacity-80 disabled:opacity-60"
                    >
                      Entrar
                    </button>
                  </>
                )}
              </p>
            </div>
          </>
        )}

        {view === "recover" && (
          <div className="px-6 pb-8 grid gap-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed -mt-1">
              Informe o e-mail da sua conta e enviaremos as instruções para
              redefinir sua senha.
            </p>

            <form onSubmit={handleRecover} className="grid gap-3">
              <input
                type="email"
                placeholder="Seu e-mail"
                value={recoverEmail}
                disabled={submitting}
                onChange={(e) => setRecoverEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition disabled:opacity-60"
              />

              {error && (
                <p className="text-xs text-red-500 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-grad w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Enviando..." : "Enviar recuperação"}
              </button>
            </form>

            <button
              type="button"
              disabled={submitting}
              onClick={resetToForm}
              className="text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition disabled:opacity-60"
            >
              Voltar para o login
            </button>
          </div>
        )}

        {view === "recover-sent" && (
          <div className="px-6 pb-8 grid gap-6">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="h-14 w-14 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-2xl">
                @
              </div>
              <p className="text-sm text-[hsl(var(--foreground))] leading-relaxed font-medium">
                Se este e-mail estiver cadastrado, enviaremos as instruções para
                recuperar sua senha.
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Verifique também a caixa de spam.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="btn-grad w-full py-3 rounded-xl text-sm font-semibold"
            >
              Entendi
            </button>

            <button
              type="button"
              onClick={resetToForm}
              className="text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition -mt-3"
            >
              Voltar para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
