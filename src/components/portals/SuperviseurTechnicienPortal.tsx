import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { User, Incident, PlannedTask, Notification, Users } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PortalExcelActions } from "@/components/shared/PortalExcelActions";
import { generatePortalReportPDF } from "@/utils/portalReportsGenerator";
import { showSuccess, showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";

interface PortalProps {
  user: User;
  incidents: Incident[];
  plannedTasks: PlannedTask[];
  notifications: Notification[];
  users?: Users;
  onNavigate: (tabId: string) => void;
}

// Portail Superviseur Technicien
export const SuperviseurTechnicienPortal = ({ user, incidents, plannedTasks, notifications, users, onNavigate }: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();
  const todayStr = today.toDateString();
  
  const technicalIncidents = incidents.filter(i => i.service === 'technique');
  const myTechnicians = users ? Object.values(users).filter(u => u.role === 'technicien') : [];
  const stats = {
    totalIncidents: technicalIncidents.length,
    newIncidents: technicalIncidents.filter(i => i.statut === 'nouveau').length,
    inProgress: technicalIncidents.filter(i => i.statut === 'cours').length,
    resolved: technicalIncidents.filter(i => i.statut === 'resolu' || i.statut === 'traite').length,
    myTechnicians: myTechnicians.length,
    pendingTasks: plannedTasks.filter(t => t.status === 'à faire').length,
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('superviseur_technicien', {
        user,
        incidents: technicalIncidents,
        plannedTasks,
      });
      showSuccess('Rapport PDF généré avec succès !');
    } catch (error: any) {
      console.error("Erreur lors de la génération du rapport superviseur technicien:", error);
      showError("Erreur lors de la génération du rapport PDF.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      {/* En-tête personnalisé */}
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 text-white p-8 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-3">
              <Icon name="Wrench" className="text-4xl mr-3" />
              <h1 className="text-4xl font-bold">Portail Superviseur Technique QHSE</h1>
            </div>
            <p className="text-cyan-100 text-xl">
              {user.civility} {user.first_name} {user.last_name}
            </p>
            <p className="text-cyan-200 mt-2">
              {format(today, "EEEE d MMMM yyyy", { locale: fr })} - {format(today, "HH:mm")}
            </p>
          </div>
          <div className="flex gap-2">
            <PortalExcelActions
              portalType="superviseur_technicien"
              data={{
                incidents: technicalIncidents,
                plannedTasks,
                users,
              }}
            />
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
            >
              <Icon
                name={isGeneratingReport ? "Clock" : "Download"}
                className={`mr-2 h-4 w-4 ${isGeneratingReport ? "animate-spin" : ""}`}
              />
              {isGeneratingReport ? "Génération..." : "Rapport PDF"}
            </Button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Total Interventions" 
          value={stats.totalIncidents} 
          iconName="Wrench" 
          colorClass="bg-cyan-100 text-cyan-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Nouvelles" 
          value={stats.newIncidents} 
          iconName="Bell" 
          colorClass="bg-red-100 text-red-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Mes Techniciens" 
          value={stats.myTechnicians} 
          iconName="Users" 
          colorClass="bg-blue-100 text-blue-600"
        />
        <DashboardCard 
          title="Terminées" 
          value={stats.resolved} 
          iconName="CheckCircle2" 
          colorClass="bg-green-100 text-green-600"
          onClick={() => onNavigate('qhseTickets')}
        />
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('dashboardTechnicien')}>
          <CardContent className="p-6">
            <Icon name="LayoutDashboard" className="text-cyan-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Dashboard Technique</h3>
            <p className="text-sm text-gray-600">Vue d'ensemble</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseTickets')}>
          <CardContent className="p-6">
            <Icon name="Ticket" className="text-blue-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Gestion Interventions</h3>
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
        <Card className="card-hover opacity-75">
          <CardContent className="p-6">
            <Icon name="Settings" className="text-gray-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Gestion Techniciens</h3>
            <p className="text-sm text-gray-600">Réservé au Super Admin</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

