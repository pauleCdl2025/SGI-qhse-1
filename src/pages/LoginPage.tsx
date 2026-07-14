import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from '@/components/Icon';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { BRAND } from '@/lib/brand';
import { AppFooter } from '@/components/layout/AppFooter';

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const result = await onLogin(email, password);
      if (!result.success) {
        setError(result.error || 'Erreur de connexion');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Panneau marque — plan visuel dominant */}
        <aside className="relative hidden overflow-hidden bg-[#0B1F33] lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12 xl:px-16 xl:py-14">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="login-orb absolute -left-24 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-cyan-500/25 blur-3xl" />
            <div className="login-orb-delay absolute -right-16 bottom-[-5%] h-[22rem] w-[22rem] rounded-full bg-teal-400/20 blur-3xl" />
            <div className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-blue-500/15 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.35) 1px, transparent 0)",
                backgroundSize: "26px 26px",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#071624] to-transparent" />
          </div>

          <div className="relative z-10">
            <div className="login-reveal flex items-center gap-3">
              <img
                src={BRAND.logoUrl}
                alt=""
                className="h-12 w-12 rounded-2xl object-contain ring-1 ring-white/20 shadow-lg shadow-cyan-900/40"
              />
              <span className="font-display text-xl font-bold tracking-tight text-white">
                {BRAND.shortName}
              </span>
            </div>
          </div>

          <div className="relative z-10 max-w-lg">
            <p className="login-reveal login-reveal-delay-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
              {BRAND.tagline}
            </p>
            <h1 className="login-reveal login-reveal-delay-2 mt-5 font-display text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-[2.75rem]">
              {BRAND.name}
            </h1>
            <p className="login-reveal login-reveal-delay-3 mt-5 text-base leading-relaxed text-slate-300 xl:text-lg">
              Pilotez la qualité, la sécurité et les opérations hospitalières
              depuis un seul espace, conçu pour les équipes du CDL.
            </p>
          </div>

          <p className="login-reveal login-reveal-delay-4 relative z-10 text-sm text-slate-400">
            Accès réservé aux collaborateurs autorisés
          </p>
        </aside>

        {/* Formulaire */}
        <main className="relative flex flex-col bg-[#F7FAFC]">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
            <div className="absolute -right-20 -top-16 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />
            <div className="absolute -bottom-10 -left-16 h-48 w-48 rounded-full bg-teal-100/50 blur-3xl" />
          </div>

          {/* Bandeau mobile */}
          <div className="relative border-b border-slate-200/70 bg-[#0B1F33] px-5 py-5 lg:hidden">
            <div className="flex items-center gap-3">
              <img
                src={BRAND.logoUrl}
                alt={`Logo ${BRAND.shortName}`}
                className="h-10 w-10 rounded-xl object-contain ring-1 ring-white/15"
              />
              <div>
                <p className="font-display text-base font-bold text-white">{BRAND.shortName}</p>
                <p className="text-xs text-cyan-200/80">{BRAND.tagline}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 md:px-12 lg:px-14 xl:px-20">
            <div className="login-reveal mx-auto w-full max-w-[26rem]">
              <p className="section-label mb-3">Connexion sécurisée</p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
                Bienvenue
              </h2>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-500">
                Connectez-vous pour accéder à votre espace {BRAND.name}.
              </p>

              <form onSubmit={handleSubmit} className="mt-9 space-y-5">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 rounded-xl border-slate-200 bg-white px-4 shadow-sm shadow-slate-900/5 transition focus-visible:border-cyan-500/40 focus-visible:ring-cyan-500/25"
                    placeholder="votre@email.com"
                  />
                </div>

                <div className="relative space-y-2">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">
                    Mot de passe
                  </label>
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 rounded-xl border-slate-200 bg-white px-4 pr-12 shadow-sm shadow-slate-900/5 transition focus-visible:border-cyan-500/40 focus-visible:ring-cyan-500/25"
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-[2.15rem] h-9 w-9 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    <Icon name={showPassword ? 'EyeOff' : 'Eye'} className="h-4 w-4" />
                  </Button>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-600">
                    <Icon name="AlertCircle" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="brand-gradient btn-animate h-12 w-full rounded-xl text-base font-semibold text-white shadow-lg shadow-cyan-700/25 hover:opacity-[0.96]"
                >
                  {isSubmitting ? (
                    <>
                      <Icon name="Clock" className="mr-2 h-5 w-5 animate-spin" />
                      Connexion…
                    </>
                  ) : (
                    <>
                      <Icon name="LogIn" className="mr-2 h-5 w-5" />
                      Se connecter
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm font-medium text-cyan-700 hover:text-cyan-800"
                  onClick={() => setIsForgotPasswordOpen(true)}
                >
                  Mot de passe oublié ?
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <AppFooter variant="dark" />

      <ForgotPasswordDialog
        isOpen={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
      />
    </div>
  );
};

export default LoginPage;
