import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { User, MaintenanceTask, Incident, Notification, PlannedTask } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generatePortalReportPDF } from "@/utils/portalReportsGenerator";
import { showSuccess, showError } from "@/utils/toast";
import { PortalExcelActions } from "@/components/shared/PortalExcelActions";
import { roleConfig } from "@/lib/data";

interface PortalProps {
  user: User;
  maintenanceTasks: MaintenanceTask[];
  incidents: Incident[];
  notifications: Notification[];
  plannedTasks?: PlannedTask[];
  onNavigate: (tabId: string) => void;
}

// Portail Administrateur Réseau
export const AdministrateurReseauPortal = ({ 
  user, 
  maintenanceTasks, 
  incidents, 
  notifications,
  plannedTasks = [],
  onNavigate 
}: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();
  const todayStr = today.toDateString();

  // Obtenir les permissions de l'utilisateur
  const userPermissions = roleConfig[user.role] || [];
  const permissionIds = new Set(userPermissions.map(p => p.id));
  const hasPermission = (permissionId: string) => permissionIds.has(permissionId);

  // Filtrer les incidents réseau/informatique
  const networkIncidents = incidents.filter(i => 
    i.service === 'technique' && 
    (i.type === 'informatique' || i.type === 'technique' || i.description?.toLowerCase().includes('réseau') || i.description?.toLowerCase().includes('reseau'))
  );
  
  const myIncidents = networkIncidents.filter(i => i.assigned_to === user.id);
  const myTasks = plannedTasks.filter(t => t.assigned_to === user.id);

  const stats = {
    pendingMaintenance: maintenanceTasks.filter(t => t.status === 'planifiée' || t.status === 'en_cours').length,
    allIncidents: networkIncidents.length,
    pendingIncidents: networkIncidents.filter(i => i.statut === 'nouveau' || i.statut === 'cours' || i.statut === 'attente').length,
    myIncidents: myIncidents.filter(i => i.statut !== 'resolu' && i.statut !== 'traite').length,
    myTasks: myTasks.filter(t => t.status === 'à faire' || t.status === 'en_cours').length,
    urgent: myIncidents.filter(i => (i.priorite === 'haute' || i.priorite === 'critique') && i.statut !== 'resolu').length,
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('administrateur_reseau', {
        user,
        maintenanceTasks,
        incidents: networkIncidents,
        plannedTasks: myTasks,
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

  const recentIncidents = networkIncidents
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
              <Icon name="Network" className="text-4xl mr-3" />
              <h1 className="text-4xl font-bold">Portail Administrateur Réseau</h1>
            </div>
            <p className="text-cyan-100 text-xl">
              {user.civility} {user.first_name} {user.last_name}
            </p>
            <p className="text-cyan-200 mt-2">
              Gestion du matériel réseau, abonnements, inventaire et interventions
            </p>
            <p className="text-cyan-200 mt-1">
              {format(today, "EEEE d MMMM yyyy", { locale: fr })} - {format(today, "HH:mm")}
            </p>
          </div>
          <div className="flex gap-2">
            <PortalExcelActions
              portalType="administrateur_reseau"
              data={{
                incidents: networkIncidents,
                maintenanceTasks,
                plannedTasks: myTasks,
              }}
            />
            <Button
              variant="outline"
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
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
          title="Incidents Réseau" 
          value={stats.allIncidents} 
          iconName="AlertCircle" 
          colorClass="bg-red-100 text-red-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Incidents en Cours" 
          value={stats.pendingIncidents} 
          iconName="Clock" 
          colorClass="bg-yellow-100 text-yellow-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Mes Interventions" 
          value={stats.myIncidents} 
          iconName="Wrench" 
          colorClass="bg-blue-100 text-blue-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Mes Tâches" 
          value={stats.myTasks} 
          iconName="ClipboardList" 
          colorClass="bg-purple-100 text-purple-600"
          onClick={() => onNavigate('myTasks')}
        />
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hasPermission('networkEquipment') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('networkEquipment')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon name="Server" className="text-cyan-600 mr-2" />
                Matériel Réseau
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Gérer le matériel réseau et équipements</p>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-cyan-600 mr-2" />
                  Inventaire du matériel
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-cyan-600 mr-2" />
                  Suivi des équipements
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-cyan-600 mr-2" />
                  Maintenance préventive
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('networkSubscriptions') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('networkSubscriptions')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon name="CreditCard" className="text-green-600 mr-2" />
                Abonnements Réseau
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Gérer les abonnements et services</p>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-green-600 mr-2" />
                  Suivi des abonnements
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-green-600 mr-2" />
                  Dates de renouvellement
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-green-600 mr-2" />
                  Coûts et facturation
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {hasPermission('dailyRoundsReseau') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('dailyRoundsReseau')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon name="ClipboardCheck" className="text-purple-600 mr-2" />
                Rondes Réseau
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Effectuer les rondes de vérification réseau</p>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-purple-600 mr-2" />
                  Vérification des équipements
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-purple-600 mr-2" />
                  Contrôles quotidiens
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-purple-600 mr-2" />
                  Rapport de ronde
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('planningTasks') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('planningTasks')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon name="CalendarPlus" className="text-cyan-600 mr-2" />
                Planning des Tâches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Établir et gérer votre planning de tâches</p>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-cyan-600 mr-2" />
                  Créer des tâches planifiées
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-cyan-600 mr-2" />
                  Organiser votre planning
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-cyan-600 mr-2" />
                  Suivre les échéances
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasPermission('qhseTickets') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseTickets')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon name="Ticket" className="text-cyan-600 mr-2" />
                Incidents Réseau
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Gérer les incidents réseau et informatiques</p>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-cyan-600 mr-2" />
                  Voir les incidents réseau
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-cyan-600 mr-2" />
                  Traiter les interventions
                </div>
                <div className="flex items-center text-sm">
                  <Icon name="Check" className="text-cyan-600 mr-2" />
                  Suivre les priorités
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {hasPermission('myTasks') && (
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
                  Organiser votre travail
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tâches à venir */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Calendar" className="text-cyan-600 mr-2" />
              Maintenances à Venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{task.type}</p>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(task.scheduled_date), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      task.status === 'planifiée' ? 'bg-blue-100 text-blue-700' :
                      task.status === 'en_cours' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
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
              Incidents Réseau Récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{incident.type}</p>
                    <p className="text-sm text-gray-600">{incident.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(incident.date_creation), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      incident.priorite === 'critique' ? 'bg-red-100 text-red-700' :
                      incident.priorite === 'haute' ? 'bg-orange-100 text-orange-700' :
                      incident.priorite === 'moyenne' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {incident.priorite}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      incident.statut === 'nouveau' ? 'bg-blue-100 text-blue-700' :
                      incident.statut === 'cours' ? 'bg-yellow-100 text-yellow-700' :
                      incident.statut === 'resolu' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {incident.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations importantes */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center text-cyan-800">
            <Icon name="Info" className="mr-2" />
            Informations Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-cyan-700">
          <div className="flex items-start">
            <Icon name="CheckCircle" className="text-cyan-600 mr-2 mt-0.5" />
            <div>
              <strong>Rôle :</strong> Administrateur Réseau - Gestion du matériel réseau, abonnements, inventaire et interventions
            </div>
          </div>
          <div className="flex items-start">
            <Icon name="CheckCircle" className="text-indigo-600 mr-2 mt-0.5" />
            <div>
              <strong>Matériel :</strong> Gestion complète du matériel réseau et équipements informatiques
            </div>
          </div>
          <div className="flex items-start">
            <Icon name="CheckCircle" className="text-indigo-600 mr-2 mt-0.5" />
            <div>
              <strong>Abonnements :</strong> Suivi des abonnements réseau, internet et services télécoms
            </div>
          </div>
          <div className="flex items-start">
            <Icon name="CheckCircle" className="text-indigo-600 mr-2 mt-0.5" />
            <div>
              <strong>Rondes :</strong> Effectuer les rondes de vérification des équipements réseau
            </div>
          </div>
          <div className="flex items-start">
            <Icon name="CheckCircle" className="text-indigo-600 mr-2 mt-0.5" />
            <div>
              <strong>Tâches :</strong> Gérer vos tâches planifiées et interventions réseau
            </div>
          </div>
          <div className="flex items-start">
            <Icon name="CheckCircle" className="text-indigo-600 mr-2 mt-0.5" />
            <div>
              <strong>Incidents :</strong> Traiter les incidents réseau et informatiques qui vous sont assignés
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
