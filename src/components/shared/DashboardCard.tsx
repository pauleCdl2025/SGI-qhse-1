import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  iconName: string;
  colorClass: string;
  onClick?: () => void;
}

export const DashboardCard = ({ title, value, iconName, colorClass, onClick }: DashboardCardProps) => {
  const isClickable = !!onClick;
  const CardComponent = isClickable ? 'button' : 'div';

  return (
    <Card
      className={cn(
        "card-hover border bg-white",
        isClickable && "cursor-pointer hover:border-cyan-200/80",
      )}
    >
      <CardComponent onClick={onClick} className="w-full text-left">
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {title}
              </p>
              <p className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                {value}
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl md:h-14 md:w-14",
                colorClass,
              )}
            >
              <Icon name={iconName} className="text-xl md:text-2xl" />
            </div>
          </div>
          {isClickable && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <span className="flex items-center text-xs font-medium text-cyan-700">
                Voir le détail <Icon name="ArrowRight" className="ml-1 h-3 w-3" />
              </span>
            </div>
          )}
        </CardContent>
      </CardComponent>
    </Card>
  );
};
