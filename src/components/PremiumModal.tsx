import { Check, Crown, Lock, Sparkles, X } from "lucide-react";

interface PremiumModalProps {
  open: boolean;
  testMode: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onActivate: () => void;
}

const benefits = [
  "Assinar mensagens com seu nome",
  "Completar suas próprias mensagens",
  "Mensagens mais longas e emocionantes",
  "Histórico e favoritos ilimitados",
  "Em breve: imagem para status e redes sociais",
];

const plans = [
  {
    name: "Plano 7 dias",
    price: "R$ 9,90",
    description: "Ideal para testar e enviar mensagens especiais.",
  },
  {
    name: "Plano 30 dias",
    price: "R$ 19,90",
    description: "Melhor escolha para usar o Alma Escrita todos os dias.",
  },
];

export function PremiumModal({
  open,
  testMode,
  isLoggedIn,
  onClose,
  onActivate,
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

      <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto mx-auto sm:m-6 rounded-t-3xl sm:rounded-3xl bg-[hsl(var(--background))] shadow-2xl border border-[hsl(var(--border))]">
        <div className="px-5 sm:px-7 py-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center shrink-0">
                <Crown className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))] font-semibold">
                  Premium
                </p>
                <h2
                  id="premium-title"
                  className="font-serif text-2xl sm:text-3xl text-[hsl(var(--foreground))] leading-tight"
                >
                  Alma Escrita Premium
                </h2>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar Premium"
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] flex items-center justify-center transition"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <p className="mt-4 text-sm sm:text-base text-[hsl(var(--muted-foreground))] leading-relaxed">
            Crie mensagens mais profundas, assine com seu nome e transforme suas palavras em algo inesquecível.
          </p>

          {testMode && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
              <Sparkles className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
              <span>
                Modo teste ativo. {isLoggedIn ? "Seu usuário logado já está Premium." : "Entre na conta para simular Premium."}
              </span>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-7 py-6 grid gap-6">
          <div className="grid gap-3">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 text-sm text-[hsl(var(--foreground))]"
              >
                <span className="h-6 w-6 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4" aria-hidden />
                </span>
                {benefit}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                  <Lock className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden />
                  {plan.name}
                </div>
                <p className="mt-3 text-3xl font-bold text-[hsl(var(--foreground))]">
                  {plan.price}
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {plan.description}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onActivate}
            className="btn-grad w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base"
          >
            <Crown className="h-5 w-5" aria-hidden />
            Ativar Premium
          </button>
        </div>
      </div>
    </div>
  );
}

export default PremiumModal;
