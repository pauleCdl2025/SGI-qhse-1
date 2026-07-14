import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { User, Incident, Visitor, PlannedTask, Booking, Notification, Users } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PortalExcelActions } from "@/components/shared/PortalExcelActions";
import { generatePortalReportPDF } from "@/utils/portalReportsGenerator";
import { showSuccess, showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { PortalPageHeader } from "@/components/shared/PortalPageHeader";

interface PortalProps {
  user: User;
  incidents: Incident[];
  visitors: Visitor[];
  plannedTasks: PlannedTask[];
  bookings: Booking[];
  notifications: Notification[];
  users?: Users;
  onNavigate: (tabId: string) => void;
}

// Portail Superviseur Agent de Sécurité
export const SuperviseurSecuritePortal = ({ user, incidents, visitors, plannedTasks, notifications, users, onNavigate }: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();
  const todayStr = today.toDateString();
  
  const securityIncidents = incidents.filter(i => i.service === 'securite');
  const myAgents = users ? Object.values(users).filter(u => u.role === 'agent_securite') : [];
  const stats = {
    totalIncidents: securityIncidents.length,
    newIncidents: securityIncidents.filter(i => i.statut === 'nouveau').length,
    inProgress: securityIncidents.filter(i => i.statut === 'cours').length,
    todayVisitors: visitors.filter(v => new Date(v.entry_time).toDateString() === todayStr).length,
    myAgents: myAgents.length,
    pendingTasks: plannedTasks.filter(t => t.status === 'à faire').length,
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('superviseur_securite', {
        user,
        incidents: securityIncidents,
        visitors,
        plannedTasks,
      });
      showSuccess('Rapport PDF généré avec succès !');
    } catch (error: any) {
      console.error("Erreur lors de la génération du rapport superviseur sécurité:", error);
      showError("Erreur lors de la génération du rapport PDF.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <PortalPageHeader
        iconName="ShieldCheck"
        title="Portail Superviseur Sécurité"
        subtitle={`${user.civility} ${user.first_name} ${user.last_name}`}
        meta={format(today, "EEEE d MMMM yyyy", { locale: fr }) + " - " + format(today, "HH:mm")}
        actions={
          <>
            <PortalExcelActions
              portalType="superviseur_securite"
              data={{
                incidents: securityIncidents,
                visitors,
                plannedTasks,
                users,
              }}
            />
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              size="sm"
              className="border border-slate-200 bg-white text-slate-700 hover:bg-cyan-50 hover:text-cyan-800"
            >
              <Icon
                name={isGeneratingReport ? "Clock" : "Download"}
                className={`mr-2 h-4 w-4 ${isGeneratingReport ? "animate-spin" : ""}`}
              />
              {isGeneratingReport ? "Génération..." : "Rapport PDF"}
            </Button>
          </>
        }
      />

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Total Incidents" 
          value={stats.totalIncidents} 
          iconName="AlertCircle" 
          colorClass="bg-red-100 text-red-600"
          onClick={() => onNavigate('securityIncidents')}
        />
        <DashboardCard 
          title="Nouveaux" 
          value={stats.newIncidents} 
          iconName="Bell" 
          colorClass="bg-orange-100 text-orange-600"
          onClick={() => onNavigate('securityIncidents')}
        />
        <DashboardCard 
          title="Mes Agents" 
          value={stats.myAgents} 
          iconName="Users" 
          colorClass="bg-blue-100 text-blue-600"
        />
        <DashboardCard 
          title="Visiteurs Aujourd'hui" 
          value={stats.todayVisitors} 
          iconName="UserCheck" 
          colorClass="bg-green-100 text-green-600"
          onClick={() => onNavigate('visitorLog')}
        />
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('dashboardSecurite')}>
          <CardContent className="p-6">
            <Icon name="LayoutDashboard" className="text-blue-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Dashboard Sécurité</h3>
            <p className="text-sm text-gray-600">Vue d'ensemble sécurité</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('securityIncidents')}>
          <CardContent className="p-6">
            <Icon name="ListChecks" className="text-red-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Gestion Incidents</h3>
            <p className="text-sm text-gray-600">Assigner et suivre</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('planningTasks')}>
          <CardContent className="p-6">
            <Icon name="CalendarPlus" className="text-teal-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Planning Tâches</h3>
            <p className="text-sm text-gray-600">Créer des tâches</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportSecurityIncident')}>
          <CardContent className="p-6">
            <Icon name="Shield" className="text-indigo-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Incident de Sécurité</h3>
            <p className="text-sm text-gray-600">Signaler un incident</p>
          </CardContent>
        </Card>
        <Card className="card-hover opacity-75">
          <CardContent className="p-6">
            <Icon name="Settings" className="text-gray-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Gestion Agents</h3>
            <p className="text-sm text-gray-600">Réservé au Super Admin</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};





