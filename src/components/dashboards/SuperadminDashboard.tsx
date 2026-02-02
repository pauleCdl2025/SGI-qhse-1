import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Line } from 'recharts';
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { Incident, User, BiomedicalEquipment, Booking, PlannedTask, Visitor } from "@/types";
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ServiceAccessBanner } from './ServiceAccessBanner';

interface SuperadminDashboardProps {
  incidents: Incident[];
  users: { [username: string]: User };
  biomedicalEquipment: BiomedicalEquipment[];
  bookings: Booking[];
  plannedTasks: PlannedTask[];
  visitors: Visitor[];
  onResetData: () => void;
  setActiveTab: (tabId: string) => void;
}

export const SuperadminDashboard = ({ incidents, users, biomedicalEquipment, bookings, plannedTasks, visitors, onResetData, setActiveTab }: SuperadminDashboardProps) => {
  
  const incidentsByStatus = incidents.reduce((acc, incident) => {
    const statusLabel = incident.statut.charAt(0).toUpperCase() + incident.statut.slice(1);
    acc[statusLabel] = (acc[statusLabel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const statusData = Object.entries(incidentsByStatus).map(([name, value]) => ({ name, value }));
  const STATUS_COLORS: Record<string, string> = { 'Nouveau': '#0891B2', 'Cours': '#F59E0B', 'Traite': '#0D9488', 'Resolu': '#10B981', 'Attente': '#6B7280' };

  const incidentsByService = incidents.reduce((acc, incident) => {
    const serviceLabel = incident.service.charAt(0).toUpperCase() + incident.service.slice(1);
    acc[serviceLabel] = (acc[serviceLabel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const serviceData = Object.entries(incidentsByService).map(([name, value]) => ({ name, value }));
  const SERVICE_COLORS: Record<string, string> = { 'Securite': '#EF4444', 'Entretien': '#10B981', 'Technique': '#F97316' };

  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
  const dailyActivityData = last7Days.map(day => {
      const dayStart = startOfDay(day);
      return {
          name: format(day, 'eee', { locale: fr }),
          Incidents: incidents.filter(i => startOfDay(i.date_creation).getTime() === dayStart.getTime()).length,
          Visiteurs: visitors.filter(v => startOfDay(v.entry_time).getTime() === dayStart.getTime()).length,
      };
  });

  const visitorsToday = visitors.filter(v => new Date(v.entry_time).toDateString() === new Date().toDateString()).length;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800 flex items-center">
        <Icon name="Crown" className="text-amber-500 mr-3 h-8 w-8" />Dashboard Global Superadmin
      </h2>
      
      <ServiceAccessBanner setActiveTab={setActiveTab} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <DashboardCard title="Incidents Total" value={incidents.length} iconName="Ticket" colorClass="bg-blue-100 text-blue-600" onClick={() => setActiveTab('dashboardQHSE')} />
        <DashboardCard title="Utilisateurs Actifs" value={Object.keys(users).length} iconName="Users" colorClass="bg-green-100 text-green-600" onClick={() => setActiveTab('settings')} />
        <DashboardCard title="Équipements Suivis" value={biomedicalEquipment.length} iconName="HeartPulse" colorClass="bg-red-100 text-red-600" onClick={() => setActiveTab('biomedical')} />
        <DashboardCard title="Salles Réservées" value={bookings.length} iconName="Calendar" colorClass="bg-cyan-100 text-cyan-600" onClick={() => setActiveTab('planningSalles')} />
        <DashboardCard title="Tâches Planifiées" value={plannedTasks.length} iconName="CalendarPlus" colorClass="bg-cyan-100 text-cyan-600" onClick={() => setActiveTab('planningTasks')} />
        <DashboardCard title="Visiteurs Aujourd'hui" value={visitorsToday} iconName="BookUser" colorClass="bg-yellow-100 text-yellow-600" onClick={() => setActiveTab('visitorLog')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Activité des 7 Derniers Jours</CardTitle></CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Incidents" stroke="#0891B2" strokeWidth={2} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="Visiteurs" stroke="#0D9488" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Répartition des Incidents par Statut</CardTitle></CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} label>
                  {statusData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Indicateurs par Service</CardTitle></CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                  {serviceData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={SERVICE_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 pt-8 border-t-4 border-red-200">
        <Card className="border-red-500 bg-red-50">
          <CardHeader><CardTitle className="text-red-700">Zone Administrateur</CardTitle></CardHeader>
          <CardContent className="flex flex-col justify-center items-center h-48 space-y-4">
            <p className="text-center text-red-600">Actions irréversibles pour la gestion globale de l'application.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full max-w-xs">
                  <Icon name="AlertTriangle" className="mr-2 h-4 w-4" />
                  Réinitialiser les Données
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes les données transactionnelles (incidents, visiteurs, réservations, etc.) seront supprimées et l'application reviendra à son état initial.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onResetData}>Oui, réinitialiser</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};