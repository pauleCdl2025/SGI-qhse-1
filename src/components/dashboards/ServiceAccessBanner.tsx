import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { allPermissions } from "@/lib/data";

interface ServiceAccessBannerProps {
  setActiveTab: (tabId: string) => void;
}

export const ServiceAccessBanner = ({ setActiveTab }: ServiceAccessBannerProps) => {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-cyan-50/80 via-white to-teal-50/50 pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-lg text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 via-blue-600 to-teal-600 text-white shadow-sm">
            <Icon name="LayoutGrid" className="h-4 w-4" />
          </span>
          Accès rapide aux services
        </CardTitle>
        <p className="text-sm text-slate-500">
          Naviguez vers les modules disponibles sur la plateforme.
        </p>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {allPermissions.map((permission) => (
            <Button
              key={permission.id}
              variant="outline"
              className="flex h-auto flex-col gap-1.5 px-2 py-3 text-center"
              onClick={() => setActiveTab(permission.id)}
            >
              <Icon name={permission.icon} className="h-5 w-5 text-cyan-700" />
              <span className="text-[11px] font-medium leading-tight text-slate-700">
                {permission.name}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
