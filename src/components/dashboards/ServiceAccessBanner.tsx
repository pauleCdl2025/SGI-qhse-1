import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { allPermissions } from "@/lib/data";

interface ServiceAccessBannerProps {
  setActiveTab: (tabId: string) => void;
}

export const ServiceAccessBanner = ({ setActiveTab }: ServiceAccessBannerProps) => {
  return (
    <Card className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 text-white shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Icon name="LayoutGrid" className="mr-2 h-6 w-6" />
          Accès Rapide aux Services
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {allPermissions.map(permission => (
            <Button 
              key={permission.id} 
              variant="secondary" 
              className="bg-white/20 hover:bg-white/30 text-white flex flex-col h-auto py-3 px-2 text-center"
              onClick={() => setActiveTab(permission.id)}
            >
              <Icon name={permission.icon} className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">{permission.name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};