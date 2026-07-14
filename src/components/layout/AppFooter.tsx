import { Icon } from "@/components/Icon";
import { BRAND } from "@/lib/brand";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src={BRAND.logoUrl}
                alt={`Logo ${BRAND.shortName}`}
                className="h-11 w-11 rounded-xl object-contain shadow-sm ring-1 ring-slate-200/80"
              />
              <div>
                <p className="font-display text-base font-bold tracking-tight text-slate-900">
                  {BRAND.shortName}
                </p>
                <p className="text-xs font-medium text-cyan-700">{BRAND.tagline}</p>
              </div>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              Plateforme QHSE, sécurité, maintenance et planification pour le{" "}
              {BRAND.name}.
            </p>
          </div>

          <div>
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-slate-900">
              Modules
            </h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>Qualité & Hygiène</li>
              <li>Sécurité & Accueil</li>
              <li>Maintenance technique</li>
              <li>Biomédical</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-slate-900">
              Ressources
            </h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>Audits & formations</li>
              <li>Rapports & indicateurs</li>
              <li>Gestion des incidents</li>
              <li>Planification des salles</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-slate-900">
              Support
            </h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <Icon name="Mail" className="h-4 w-4" />
                </span>
                support@cdl.ga
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Icon name="MapPin" className="h-4 w-4" />
                </span>
                Libreville, Gabon
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-400">
            © {year} {BRAND.name}. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
              SGI-QHSE
            </span>
            <div className="flex gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 transition hover:text-cyan-600">
                <Icon name="Globe" className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 transition hover:text-cyan-600">
                <Icon name="Phone" className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
