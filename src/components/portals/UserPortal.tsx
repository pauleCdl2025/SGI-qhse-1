import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { IncidentHistoryCard } from "@/components/shared/IncidentHistoryCard";
import { User, Incident, Visitor, PlannedTask, Booking, Notification } from "@/types";
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
  onNavigate: (tabId: string) => void;
  onDeleteIncident?: (incidentId: string) => void;
}

// Composant générique pour les portails
export const UserPortal = ({ user, incidents, visitors, plannedTasks, bookings, notifications, onNavigate, onDeleteIncident }: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();
  const todayStr = today.toDateString();
  
  // Statistiques communes
  const todayIncidents = incidents.filter(i => new Date(i.date_creation).toDateString() === todayStr);
  const todayVisitors = visitors.filter(v => new Date(v.entry_time).toDateString() === todayStr);
  const myTasks = plannedTasks.filter(t => t.assigned_to === user.id && t.status === 'à faire');
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const myIncidentReports = incidents.filter(i => i.reported_by === user.id && i.service !== 'biomedical');
  const myEquipmentDeclarations = incidents.filter(i => i.reported_by === user.id && i.service === 'biomedical');

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('user', {
        user,
        incidents,
        visitors,
        plannedTasks,
        bookings,
      });
      showSuccess('Rapport PDF généré avec succès !');
    } catch (error: any) {
      console.error("Erreur lors de la génération du rapport utilisateur:", error);
      showError("Erreur lors de la génération du rapport PDF.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <PortalPageHeader
        iconName="User"
        title={`Bienvenue, ${user.civility} ${user.first_name} ${user.last_name}`}
        subtitle={`${format(today, "EEEE d MMMM yyyy", { locale: fr })} - ${user.service || "Centre Diagnostic Libreville"}`}
        meta={format(today, "HH:mm")}
        actions={
          <>
            {unreadNotifications > 0 && (
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-center">
                <div className="text-2xl font-bold text-slate-900">{unreadNotifications}</div>
                <div className="text-sm text-slate-500">notification(s)</div>
              </div>
            )}
            <PortalExcelActions
              portalType="user"
              data={{
                incidents,
                visitors,
                plannedTasks,
                bookings,
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

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Incidents Aujourd'hui" 
          value={todayIncidents.length} 
          iconName="AlertCircle" 
          colorClass="bg-blue-100 text-blue-600"
          onClick={() => onNavigate('securityIncidents')}
        />
        <DashboardCard 
          title="Visiteurs Aujourd'hui" 
          value={todayVisitors.length} 
          iconName="Users" 
          colorClass="bg-green-100 text-green-600"
          onClick={() => onNavigate('visitorLog')}
        />
        <DashboardCard 
          title="Mes Tâches" 
          value={myTasks.length} 
          iconName="ClipboardList" 
          colorClass="bg-cyan-100 text-cyan-600"
          onClick={() => onNavigate('myTasks')}
        />
        <DashboardCard 
          title="Notifications" 
          value={unreadNotifications} 
          iconName="Bell" 
          colorClass="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Accès rapides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon name="Zap" className="text-cyan-600 mr-2" />
            Accès Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button
              onClick={() => onNavigate('reportIncident')}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Icon name="AlertCircle" className="text-red-500 mb-2" />
              <div className="font-semibold">Signaler Incident</div>
            </button>
            <button
              onClick={() => onNavigate('reportSecurityIncident')}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Icon name="Shield" className="text-blue-600 mb-2" />
              <div className="font-semibold">Incident de Sécurité</div>
            </button>
            <button
              onClick={() => onNavigate('reportBiomedicalIncident')}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Icon name="Stethoscope" className="text-teal-600 mb-2" />
              <div className="font-semibold">Déclarer matériel HS</div>
            </button>
            <button
              onClick={() => onNavigate('visitorLog')}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Icon name="BookUser" className="text-blue-500 mb-2" />
              <div className="font-semibold">Visiteurs</div>
            </button>
            <button
              onClick={() => onNavigate('myTasks')}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Icon name="ClipboardList" className="text-cyan-600 mb-2" />
              <div className="font-semibold">Mes Tâches</div>
            </button>
            <button
              onClick={() => onNavigate('personalInfo')}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Icon name="User" className="text-gray-500 mb-2" />
              <div className="font-semibold">Mon Profil</div>
            </button>
          </div>
        </CardContent>
      </Card>

      <IncidentHistoryCard
        title="Mes incidents déclarés"
        subtitle="Suivi en temps réel des incidents que j'ai signalés"
        incidents={myIncidentReports}
        allIncidents={incidents}
        emptyMessage="Aucun incident signalé pour le moment."
        onDelete={onDeleteIncident}
      />

      <IncidentHistoryCard
        title="Mes déclarations d'équipement"
        subtitle="Historique de mes signalements d'équipements biomédicaux"
        incidents={myEquipmentDeclarations}
        allIncidents={incidents}
        emptyMessage="Aucune déclaration d'équipement pour le moment."
        onDelete={onDeleteIncident}
      />
    </div>
  );
};






