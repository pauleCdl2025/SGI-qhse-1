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
    <div className="relative flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Ambiance douce — formes organiques aux couleurs du logo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-cyan-100/50 blur-3xl" />
        <div className="absolute -right-24 top-20 h-[22rem] w-[22rem] rounded-full bg-teal-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-blue-100/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.35) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 md:py-16">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Colonne marque */}
          <div className="fade-in hidden text-left lg:block">
            <p className="section-label mb-4">Bienvenue</p>
            <img
              src={BRAND.logoUrl}
              alt={`Logo ${BRAND.name}`}
              className="mb-6 h-20 w-20 rounded-2xl object-contain shadow-lg shadow-cyan-600/10 ring-1 ring-slate-200/80"
            />
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-slate-900 xl:text-5xl">
              {BRAND.name}
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-500">
              Accédez à votre espace {BRAND.tagline.toLowerCase()} — qualité, sécurité,
              maintenance et planification en un seul endroit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["QHSE", "Sécurité", "Biomédical"].map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Carte connexion */}
          <div className="fade-in mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50 md:p-10">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 ring-1 ring-cyan-100 lg:mx-0">
                  <img
                    src={BRAND.logoUrl}
                    alt={`Logo ${BRAND.shortName}`}
                    className="h-11 w-11 rounded-xl object-contain"
                  />
                </div>
                <p className="section-label mb-2 lg:hidden">Connexion</p>
                <h2 className="font-display text-2xl font-bold text-slate-900 md:text-[1.65rem]">
                  Se connecter
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Entrez vos identifiants pour accéder à la plateforme CDL.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50 px-4 transition focus-visible:ring-cyan-500/30"
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
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50 px-4 pr-11 transition focus-visible:ring-cyan-500/30"
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-8 h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    <Icon name={showPassword ? 'EyeOff' : 'Eye'} className="h-4 w-4" />
                  </Button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-600">
                    <Icon name="AlertCircle" className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="brand-gradient h-12 w-full rounded-xl text-base font-semibold text-white shadow-lg shadow-cyan-600/20 transition hover:opacity-95"
                >
                  <Icon name="LogIn" className="mr-2 h-5 w-5" />
                  {isSubmitting ? 'Connexion…' : 'Se connecter'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  className="font-medium text-cyan-700 hover:text-cyan-800"
                  onClick={() => setIsForgotPasswordOpen(true)}
                >
                  Mot de passe oublié ?
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="relative z-10">
        <AppFooter />
      </div>

      <ForgotPasswordDialog
        isOpen={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
      />
    </div>
  );
};

export default LoginPage;
