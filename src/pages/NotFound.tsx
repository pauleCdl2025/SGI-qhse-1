import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/40 to-teal-50/30 px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-100/50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-teal-100/40"
      />
      <div className="relative max-w-lg text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
          Erreur 404
        </p>
        <h1 className="font-display text-7xl font-bold tracking-tight text-slate-900 md:text-8xl">
          404
        </h1>
        <p className="mt-4 text-xl text-slate-600">
          Oups ! Cette page n&apos;existe pas.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          La page demandée est introuvable ou a été déplacée.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 px-6 py-3 font-semibold text-white shadow-md shadow-cyan-600/20 transition hover:opacity-95"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
