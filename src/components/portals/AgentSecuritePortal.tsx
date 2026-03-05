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

// Portail Agent de Sécurité
export const AgentSecuritePortal = ({ user, incidents, visitors, plannedTasks, notifications, onNavigate, onDeleteIncident }: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();
  const todayStr = today.toDateString();
  
  const securityIncidents = incidents.filter(i => i.service === 'securite');
  const stats = {
    todayIncidents: securityIncidents.filter(i => new Date(i.date_creation).toDateString() === todayStr).length,
    inProgress: securityIncidents.filter(i => i.statut === 'cours').length,
    resolved: securityIncidents.filter(i => i.statut === 'resolu').length,
    urgent: securityIncidents.filter(i => i.priorite === 'haute' || i.priorite === 'critique').length,
    todayVisitors: visitors.filter(v => new Date(v.entry_time).toDateString() === todayStr).length,
    myTasks: plannedTasks.filter(t => t.assigned_to === user.id && t.status === 'à faire').length,
  };
  const myReportedIncidents = incidents.filter(i => i.reported_by === user.id && i.service !== 'biomedical');
  const myEquipmentDeclarations = incidents.filter(i => i.reported_by === user.id && i.service === 'biomedical');

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('agent_securite', {
        user,
        incidents: securityIncidents,
        visitors,
        plannedTasks,
        bookings,
      });
      showSuccess('Rapport PDF généré avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de la génération du rapport sécurité:', error);
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
              <Icon name="Shield" className="text-4xl mr-3" />
              <h1 className="text-4xl font-bold">Portail Sécurité</h1>
            </div>
            <p className="text-cyan-100 text-xl">
              {user.civility} {user.first_name} {user.last_name}
            </p>
            <p className="text-cyan-200 mt-2">
              {format(today, "EEEE d MMMM yyyy", { locale: fr })} - {format(today, "HH:mm")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm text-cyan-100">Poste de Garde</div>
              <div className="text-2xl font-bold">Actif</div>
            </div>
            <div className="flex gap-2">
              <PortalExcelActions
                portalType="agent_securite"
                data={{
                  incidents: securityIncidents,
                  visitors,
                  plannedTasks,
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
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Incidents Aujourd'hui" 
          value={stats.todayIncidents} 
          iconName="AlertCircle" 
          colorClass="bg-red-100 text-red-600"
          onClick={() => onNavigate('securityIncidents')}
        />
        <DashboardCard 
          title="En Cours" 
          value={stats.inProgress} 
          iconName="Clock" 
          colorClass="bg-yellow-100 text-yellow-600"
          onClick={() => onNavigate('securityIncidents')}
        />
        <DashboardCard 
          title="Visiteurs Aujourd'hui" 
          value={stats.todayVisitors} 
          iconName="Users" 
          colorClass="bg-green-100 text-green-600"
          onClick={() => onNavigate('visitorLog')}
        />
        <DashboardCard 
          title="Mes Tâches" 
          value={stats.myTasks} 
          iconName="ClipboardList" 
          colorClass="bg-cyan-100 text-cyan-600"
          onClick={() => onNavigate('myTasks')}
        />
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Zap" className="text-blue-600 mr-2" />
              Actions Rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button
                onClick={() => onNavigate('reportIncident')}
                className="w-full p-4 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition-all text-left flex items-center"
              >
                <Icon name="AlertCircle" className="text-red-600 mr-3" />
                <div>
                  <div className="font-semibold text-gray-900">Signaler un Incident</div>
                  <div className="text-sm text-gray-600">Déclarer un incident de sécurité</div>
                </div>
              </button>
              <button
                onClick={() => onNavigate('reportSecurityIncident')}
                className="w-full p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all text-left flex items-center"
              >
                <Icon name="Shield" className="text-indigo-600 mr-3" />
                <div>
                  <div className="font-semibold text-gray-900">Incident de Sécurité</div>
                  <div className="text-sm text-gray-600">Signaler un incident de sécurité</div>
                </div>
              </button>
              <button
                onClick={() => onNavigate('reportMaintenanceIncident')}
                className="w-full p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-all text-left flex items-center"
              >
                <Icon name="SprayCan" className="text-green-600 mr-3" />
                <div>
                  <div className="font-semibold text-gray-900">Incident d'Entretien</div>
                  <div className="text-sm text-gray-600">Signaler un problème d'entretien</div>
                </div>
              </button>
              <button
                onClick={() => onNavigate('visitorLog')}
                className="w-full p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-all text-left flex items-center"
              >
                <Icon name="BookUser" className="text-blue-600 mr-3" />
                <div>
                  <div className="font-semibold text-gray-900">Registre Visiteurs</div>
                  <div className="text-sm text-gray-600">Enregistrer entrée/sortie</div>
                </div>
              </button>
              <button
                onClick={() => onNavigate('securityIncidents')}
                className="w-full p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg hover:bg-yellow-100 transition-all text-left flex items-center"
              >
                <Icon name="ListChecks" className="text-yellow-600 mr-3" />
                <div>
                  <div className="font-semibold text-gray-900">Liste des Incidents</div>
                  <div className="text-sm text-gray-600">Consulter tous les incidents</div>
                </div>
              </button>
              <button
                onClick={() => onNavigate('cameraAccessRequest')}
                className="w-full p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-all text-left flex items-center"
              >
                <Icon name="Video" className="text-purple-600 mr-3" />
                <div>
                  <div className="font-semibold text-gray-900">Demande d'Accès aux Caméras</div>
                  <div className="text-sm text-gray-600">Formulaire de demande d'accès</div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Info" className="text-cyan-600 mr-2" />
              Informations Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.urgent > 0 && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex items-center">
                    <Icon name="AlertTriangle" className="text-red-600 mr-2" />
                    <span className="font-semibold text-red-900">{stats.urgent} incident(s) urgent(s)</span>
                  </div>
                </div>
              )}
              {stats.inProgress > 0 && (
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <div className="flex items-center">
                    <Icon name="Clock" className="text-yellow-600 mr-2" />
                    <span className="font-semibold text-yellow-900">{stats.inProgress} incident(s) en cours</span>
                  </div>
                </div>
              )}
              {stats.myTasks > 0 && (
                <div className="p-3 bg-cyan-50 border-l-4 border-cyan-500 rounded">
                  <div className="flex items-center">
                    <Icon name="ClipboardList" className="text-cyan-600 mr-2" />
                    <span className="font-semibold text-cyan-900">{stats.myTasks} tâche(s) assignée(s)</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <IncidentHistoryCard
        title="Mes incidents de sécurité déclarés"
        subtitle="Historique des tickets soumis avec votre compte"
        incidents={myReportedIncidents}
        allIncidents={incidents}
        emptyMessage="Vous n'avez pas encore signalé d'incident de sécurité."
        onDelete={onDeleteIncident}
      />

      <IncidentHistoryCard
        title="Mes déclarations d'équipement"
        subtitle="Signalements d'équipements biomédicaux envoyés par vos soins"
        incidents={myEquipmentDeclarations}
        allIncidents={incidents}
        emptyMessage="Aucune déclaration d'équipement pour le moment."
        onDelete={onDeleteIncident}
      />
    </div>
  );
};






