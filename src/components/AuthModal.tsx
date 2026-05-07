import { useState } from "react";

export interface MockUser {
  name: string;
  email: string;
}

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (user: MockUser) => void;
}

type Tab = "login" | "cadastro";
type View = "form" | "recover" | "recover-sent";

export function AuthModal({ open, onClose, onLogin }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>("login");
  const [view, setView] = useState<View>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoverEmail, setRecoverEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  function handleSubmit(e: React.FormEvent) {
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

    // TODO: conectar Firebase Authentication aqui
    // Login com e-mail:
    //   import { signInWithEmailAndPassword } from "firebase/auth";
    //   await signInWithEmailAndPassword(auth, email, password);
    // Cadastro:
    //   import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
    //   const cred = await createUserWithEmailAndPassword(auth, email, password);
    //   await updateProfile(cred.user, { displayName: name });

    const displayName =
      tab === "cadastro" ? name.trim() : email.split("@")[0];
    onLogin({ name: displayName, email: email.trim() });
    handleClose();
  }

  function handleGoogle() {
    // TODO: conectar Firebase Authentication com Google
    //   import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
    //   const provider = new GoogleAuthProvider();
    //   const result = await signInWithPopup(auth, provider);
    //   onLogin({ name: result.user.displayName ?? "Usuário", email: result.user.email ?? "" });

    onLogin({ name: "Usuário Google", email: "usuario@gmail.com" });
    handleClose();
  }

  function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!recoverEmail.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    // TODO: conectar Firebase Authentication aqui
    //   import { sendPasswordResetEmail } from "firebase/auth";
    //   await sendPasswordResetEmail(auth, recoverEmail);

    setView("recover-sent");
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
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[hsl(var(--foreground)/0.45)] backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full sm:max-w-sm mx-auto sm:m-6 rounded-t-3xl sm:rounded-3xl bg-[hsl(var(--background))] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {view !== "form" && (
              <button
                type="button"
                aria-label="Voltar"
                onClick={resetToForm}
                className="h-8 w-8 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] flex items-center justify-center text-sm transition"
              >
                ←
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
            onClick={handleClose}
            className="h-9 w-9 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] flex items-center justify-center text-lg leading-none transition"
          >
            ✕
          </button>
        </div>

        {/* ── VIEW: form (login / cadastro) ── */}
        {view === "form" && (
          <>
            {/* Tabs */}
            <div className="flex mx-6 mb-5 rounded-xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
              {(["login", "cadastro"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-sm font-medium transition ${
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
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-sm font-medium transition"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
                Entrar com Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-[hsl(var(--border))]" />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">ou</span>
                <span className="flex-1 h-px bg-[hsl(var(--border))]" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="grid gap-3">
                {tab === "cadastro" && (
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition"
                  />
                )}
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition"
                />
                <div className="grid gap-1">
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                    className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition"
                  />
                  {tab === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoverEmail(email);
                          setError(null);
                          setView("recover");
                        }}
                        className="text-xs text-[hsl(var(--primary))] hover:underline underline-offset-2 py-0.5"
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
                  className="btn-grad w-full py-3 rounded-xl text-sm font-semibold mt-1"
                >
                  {tab === "login" ? "Entrar com e-mail" : "Criar minha conta"}
                </button>
              </form>

              <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                {tab === "login" ? (
                  <>
                    Ainda não tem conta?{" "}
                    <button
                      type="button"
                      onClick={() => { setTab("cadastro"); setError(null); }}
                      className="text-[hsl(var(--primary))] underline underline-offset-2 hover:opacity-80"
                    >
                      Criar conta
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?{" "}
                    <button
                      type="button"
                      onClick={() => { setTab("login"); setError(null); }}
                      className="text-[hsl(var(--primary))] underline underline-offset-2 hover:opacity-80"
                    >
                      Entrar
                    </button>
                  </>
                )}
              </p>
            </div>
          </>
        )}

        {/* ── VIEW: recover (pede e-mail) ── */}
        {view === "recover" && (
          <div className="px-6 pb-8 grid gap-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed -mt-1">
              Informe o e-mail da sua conta e enviaremos as instruções para redefinir sua senha.
            </p>

            <form onSubmit={handleRecover} className="grid gap-3">
              <input
                type="email"
                placeholder="Seu e-mail"
                value={recoverEmail}
                onChange={(e) => setRecoverEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className="px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition"
              />

              {error && (
                <p className="text-xs text-red-500 text-center">{error}</p>
              )}

              <button
                type="submit"
                className="btn-grad w-full py-3 rounded-xl text-sm font-semibold"
              >
                Enviar recuperação
              </button>
            </form>

            <button
              type="button"
              onClick={resetToForm}
              className="text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
            >
              ← Voltar para o login
            </button>
          </div>
        )}

        {/* ── VIEW: recover-sent (confirmação fake) ── */}
        {view === "recover-sent" && (
          <div className="px-6 pb-8 grid gap-6">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="h-14 w-14 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-2xl">
                ✉️
              </div>
              <p className="text-sm text-[hsl(var(--foreground))] leading-relaxed font-medium">
                Se este e-mail estiver cadastrado, enviaremos as instruções para recuperar sua senha.
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
              ← Voltar para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
