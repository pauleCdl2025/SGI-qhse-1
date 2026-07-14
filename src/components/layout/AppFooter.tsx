import { Icon } from "@/components/Icon";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AppFooterProps = {
  variant?: "light" | "dark";
};

export function AppFooter({ variant = "light" }: AppFooterProps) {
  const year = new Date().getFullYear();
  const isDark = variant === "dark";

  return (
    <footer
      className={cn(
        "mt-auto border-t",
        isDark
          ? "border-white/10 bg-[#071624] text-slate-300"
          : "border-slate-200/80 bg-slate-50 text-slate-500"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src={BRAND.logoUrl}
                alt={`Logo ${BRAND.shortName}`}
                className={cn(
                  "h-11 w-11 rounded-xl object-contain shadow-sm",
                  isDark ? "ring-1 ring-white/15" : "ring-1 ring-slate-200/80"
                )}
              />
              <div>
                <p
                  className={cn(
                    "font-display text-base font-bold tracking-tight",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {BRAND.shortName}
                </p>
                <p className={cn("text-xs font-medium", isDark ? "text-cyan-300" : "text-cyan-700")}>
                  {BRAND.tagline}
                </p>
              </div>
            </div>
            <p
              className={cn(
                "max-w-xs text-sm leading-relaxed",
                isDark ? "text-slate-400" : "text-slate-500"
              )}
            >
              Plateforme QHSE, sécurité, maintenance et planification pour le{" "}
              {BRAND.name}.
            </p>
          </div>

          <div>
            <h3
              className={cn(
                "mb-3 font-display text-sm font-semibold uppercase tracking-wider",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              Application
            </h3>
            <ul className={cn("space-y-2 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              <li>Tableau de bord</li>
              <li>Incidents & tickets</li>
              <li>Planning des salles</li>
              <li>Équipements</li>
            </ul>
          </div>

          <div>
            <h3
              className={cn(
                "mb-3 font-display text-sm font-semibold uppercase tracking-wider",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              Services
            </h3>
            <ul className={cn("space-y-2 text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              <li>QHSE</li>
              <li>Sécurité</li>
              <li>Entretien</li>
              <li>Biomédical</li>
            </ul>
          </div>

          <div>
            <h3
              className={cn(
                "mb-3 font-display text-sm font-semibold uppercase tracking-wider",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              Support
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    isDark ? "bg-white/10 text-cyan-300" : "bg-cyan-50 text-cyan-700"
                  )}
                >
                  <Icon name="Mail" className="h-4 w-4" />
                </span>
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>support@cdl.ga</span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    isDark ? "bg-white/10 text-teal-300" : "bg-teal-50 text-teal-700"
                  )}
                >
                  <Icon name="MapPin" className="h-4 w-4" />
                </span>
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Libreville, Gabon</span>
              </li>
            </ul>
          </div>
        </div>

        <div
          className={cn(
            "mt-10 flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center",
            isDark ? "border-white/10" : "border-slate-200"
          )}
        >
          <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
            © {year} {BRAND.name}
          </p>
          <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
            Conçu pour les équipes soignantes et techniques
          </p>
        </div>
      </div>
    </footer>
  );
}
