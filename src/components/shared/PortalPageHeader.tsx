import { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

interface PortalPageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  iconName?: string;
  actions?: ReactNode;
  className?: string;
}

/** En-tête de portail style SaaS moderne (accent logo cyan/bleu/teal) */
export function PortalPageHeader({
  title,
  subtitle,
  meta,
  iconName,
  actions,
  className,
}: PortalPageHeaderProps) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-6 py-7 shadow-sm md:px-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-600 via-blue-600 to-teal-600"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-24 h-24 w-24 rounded-full bg-teal-50/60"
      />

      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 pl-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Espace de travail
          </p>
          <div className="flex items-start gap-3">
            {iconName && (
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 via-blue-600 to-teal-600 text-white shadow-md shadow-cyan-600/20">
                <Icon name={iconName} className="h-5 w-5" />
              </span>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1.5 text-base text-slate-600">{subtitle}</p>
              )}
              {meta && (
                <p className="mt-1 text-sm font-medium text-slate-400">{meta}</p>
              )}
            </div>
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 pl-2 md:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
