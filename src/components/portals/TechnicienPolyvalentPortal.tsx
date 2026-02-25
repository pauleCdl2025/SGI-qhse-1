import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { User, MaintenanceTask, Incident, Notification } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generatePortalReportPDF } from "@/utils/portalReportsGenerator";
import { showSuccess, showError } from "@/utils/toast";
import { PortalExcelActions } from "@/components/shared/PortalExcelActions";

interface PortalProps {
  user: User;
  maintenanceTasks: MaintenanceTask[];
  incidents: Incident[];
  notifications: Notification[];
  onNavigate: (tabId: string) => void;
}

// Portail Technicien Polyvalent
export const TechnicienPolyvalentPortal = ({ 
  user, 
  maintenanceTasks, 
  incidents, 
  notifications,
  onNavigate 
}: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();

  const stats = {
    pendingMaintenance: maintenanceTasks.filter(t => t.status === 'planifiée' || t.status === 'en_cours').length,
    allIncidents: incidents.length,
    pendingIncidents: incidents.filter(i => i.statut === 'nouveau' || i.statut === 'cours' || i.statut === 'attente').length,
    myTasks: 0, // Sera calculé depuis les plannedTasks si disponible
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('technicien_polyvalent', {
        user,
        maintenanceTasks,
        incidents,
      });
      showSuccess('Rapport PDF généré avec succès !');
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      showError('Erreur lors de la génération du rapport PDF.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const upcomingTasks = maintenanceTasks
    .filter(task => {
      const scheduled = new Date(task.scheduled_date);
      return scheduled >= new Date(today.toDateString()) && task.status !== 'terminée' && task.status !== 'annulée';
    })
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 5);

  const recentIncidents = incidents
    .filter(i => i.statut === 'nouveau' || i.statut === 'cours' || i.statut === 'attente')
    .sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 fade-in">
      {/* En-tête personnalisé */}
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 text-white p-8 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-3">
              <Icon name="Wrench" className="text-4xl mr-3" />
              <h1 className="text-4xl font-bold">Portail Technicien Polyvalent</h1>
            </div>
            <p className="text-cyan-100 text-xl">
              {user.civility} {user.first_name} {user.last_name}
            </p>
            <p className="text-cyan-200 mt-2">
              {format(today, "EEEE d MMMM yyyy", { locale: fr })} - {format(today, "HH:mm")}
            </p>
            <p className="text-cyan-200 mt-1 text-sm">
              Homme à tout faire - Maintenance polyvalente
            </p>
          </div>
          <div className="flex gap-2">
            <PortalExcelActions
              portalType="technicien_polyvalent"
              data={{
                user,
                maintenanceTasks,
                incidents,
              }}
            />
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
              size="sm"
            >
              <Icon name={isGeneratingReport ? "Clock" : "Download"} className={`mr-2 h-4 w-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
              {isGeneratingReport ? 'Génération...' : 'Exporter PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Maintenances en Attente" 
          value={stats.pendingMaintenance} 
          iconName="Clock" 
          colorClass="bg-yellow-100 text-yellow-600"
        />
        <DashboardCard 
          title="Incidents en Cours" 
          value={stats.pendingIncidents} 
          iconName="AlertCircle" 
          colorClass="bg-red-100 text-red-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Total Incidents" 
          value={stats.allIncidents} 
          iconName="ListChecks" 
          colorClass="bg-blue-100 text-blue-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Mes Tâches" 
          value="-" 
          iconName="ClipboardList" 
          colorClass="bg-purple-100 text-purple-600"
          onClick={() => onNavigate('myTasks')}
        />
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('planningTasks')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="CalendarPlus" className="text-indigo-600 mr-2" />
              Planning des Tâches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Établir et gérer votre planning de tâches</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-indigo-600 mr-2" />
                Créer des tâches planifiées
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-indigo-600 mr-2" />
                Organiser votre planning
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-indigo-600 mr-2" />
                Suivre les échéances
              </div>
            </div>
          </CardContent>
        </Card>


        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseTickets')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Ticket" className="text-cyan-600 mr-2" />
              Mes Tickets Assignés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Consulter uniquement les tickets qui vous sont assignés</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Voir mes tickets assignés
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Consulter les détails
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Suivre les priorités
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('myTasks')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="ClipboardList" className="text-purple-600 mr-2" />
              Mes Tâches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Gérer vos tâches assignées</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-purple-600 mr-2" />
                Voir les tâches à faire
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-purple-600 mr-2" />
                Mettre à jour le statut
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-purple-600 mr-2" />
                Suivre les échéances
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('dailyRoundsPolyvalent')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="ClipboardCheck" className="text-indigo-600 mr-2" />
              Ronde Quotidienne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Effectuer votre ronde quotidienne</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-indigo-600 mr-2" />
                Checklist de ronde
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-indigo-600 mr-2" />
                Vérifications quotidiennes
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-indigo-600 mr-2" />
                Historique des rondes
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Maintenances à venir */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Clock" className="text-yellow-600 mr-2" />
              Maintenances à Venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {task.description || 'Maintenance'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(task.scheduled_date), 'dd/MM/yyyy')} - Type: {task.type || '-'}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                  >
                    Voir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incidents récents */}
      {recentIncidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="AlertCircle" className="text-red-600 mr-2" />
              Incidents en Cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-semibold text-gray-800 capitalize">
                      {incident.type.replace('-', ' ')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {incident.lieu} - {format(new Date(incident.date_creation), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onNavigate('qhseTickets')}
                  >
                    Voir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations importantes */}
      <Card className="bg-cyan-50 border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center text-cyan-800">
            <Icon name="Info" className="text-cyan-600 mr-2" />
            Informations Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Rôle :</strong> Technicien Polyvalent - Homme à tout faire, vous gérez vos tâches et maintenances planifiées.
            </p>
            <p>
              <strong>Planning :</strong> Vous pouvez établir et gérer votre propre planning de tâches pour organiser vos interventions.
            </p>
            <p>
              <strong>Incidents :</strong> Vous pouvez consulter uniquement les tickets QHSE qui vous ont été assignés. Vous ne pouvez pas déclarer d'incidents (sécurité, entretien, biomédical).
            </p>
            <p>
              <strong>Maintenances :</strong> Consultez l'historique des maintenances et suivez les interventions planifiées.
            </p>
            <p>
              <strong>Tâches :</strong> Consultez vos tâches assignées, mettez à jour leur statut et organisez votre planning.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

