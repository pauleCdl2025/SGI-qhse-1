import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { IncidentHistoryCard } from "@/components/shared/IncidentHistoryCard";
import { User, Incident, Visitor, PlannedTask, Booking, Notification, Users } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generatePortalReportPDF } from "@/utils/portalReportsGenerator";
import { showSuccess, showError } from "@/utils/toast";
import { PortalExcelActions } from "@/components/shared/PortalExcelActions";
import { roleConfig } from "@/lib/data";

interface PortalProps {
  user: User;
  incidents: Incident[];
  visitors: Visitor[];
  plannedTasks: PlannedTask[];
  bookings: Booking[];
  notifications: Notification[];
  users?: Users;
  onNavigate: (tabId: string) => void;
  onDeleteIncident?: (incidentId: string) => void;
}

// Portail Superviseur QHSE
export const SuperviseurQHSEPortal = ({ user, incidents, visitors, plannedTasks, bookings, notifications, users, onNavigate, onDeleteIncident }: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();
  const todayStr = today.toDateString();
  
  // Obtenir les permissions de l'utilisateur
  const userPermissions = roleConfig[user.role] || [];
  const permissionIds = new Set(userPermissions.map(p => p.id));
  
  // Fonction pour vérifier si l'utilisateur a une permission
  const hasPermission = (permissionId: string) => permissionIds.has(permissionId);
  
  const stats = {
    totalIncidents: incidents.length,
    newIncidents: incidents.filter(i => i.statut === 'nouveau').length,
    inProgress: incidents.filter(i => i.statut === 'cours').length,
    resolved: incidents.filter(i => i.statut === 'resolu').length,
    todayVisitors: visitors.filter(v => new Date(v.entry_time).toDateString() === todayStr).length,
    activeBookings: bookings.filter(b => b.status === 'réservé' || b.status === 'en_cours').length,
    pendingTasks: plannedTasks.filter(t => t.status === 'à faire').length,
  };

  // Filtrer les incidents déclarés par l'utilisateur
  const myReportedIncidents = incidents.filter(i => i.reported_by === user.id && i.service !== 'biomedical');
  const myEquipmentDeclarations = incidents.filter(i => i.reported_by === user.id && i.service === 'biomedical');

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('superviseur_qhse', {
        user,
        incidents,
        visitors,
        plannedTasks,
        bookings,
        users,
      });
      showSuccess('Rapport PDF généré avec succès !');
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      showError('Erreur lors de la génération du rapport PDF.');
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
              <Icon name="UserCog" className="text-4xl mr-3" />
              <h1 className="text-4xl font-bold">Portail QHSE</h1>
            </div>
            <p className="text-cyan-100 text-xl">
              {user.civility} {user.first_name} {user.last_name} - {user.role === 'assistante_qhse' ? 'Assistante Qualité, Hygiène, Sécurité et Environnement' : 'Superviseur Qualité, Hygiène, Sécurité et Environnement'}
            </p>
            <p className="text-cyan-200 mt-2">
              {format(today, "EEEE d MMMM yyyy", { locale: fr })} - {format(today, "HH:mm")}
            </p>
          </div>
          <div className="flex gap-2">
            <PortalExcelActions
              portalType="superviseur_qhse"
              data={{
                incidents,
                visitors,
                plannedTasks,
                bookings,
                users,
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

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Tickets Total" 
          value={stats.totalIncidents} 
          iconName="Ticket" 
          colorClass="bg-blue-100 text-blue-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Nouveaux Tickets" 
          value={stats.newIncidents} 
          iconName="AlertCircle" 
          colorClass="bg-red-100 text-red-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="En Cours" 
          value={stats.inProgress} 
          iconName="Clock" 
          colorClass="bg-yellow-100 text-yellow-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Résolus" 
          value={stats.resolved} 
          iconName="CheckCircle2" 
          colorClass="bg-green-100 text-green-600"
          onClick={() => onNavigate('qhseTickets')}
        />
      </div>

      {/* Statistiques secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {hasPermission('visitorLog') && (
          <DashboardCard 
            title="Visiteurs Aujourd'hui" 
            value={stats.todayVisitors} 
            iconName="Users" 
            colorClass="bg-teal-100 text-teal-600"
            onClick={() => onNavigate('visitorLog')}
          />
        )}
        {hasPermission('planningSalles') && (
          <DashboardCard 
            title="Réservations Actives" 
            value={stats.activeBookings} 
            iconName="Calendar" 
            colorClass="bg-cyan-100 text-cyan-600"
            onClick={() => onNavigate('planningSalles')}
          />
        )}
        {hasPermission('planningTasks') && (
          <DashboardCard 
            title="Tâches à Planifier" 
            value={stats.pendingTasks} 
            iconName="ClipboardList" 
            colorClass="bg-indigo-100 text-indigo-600"
            onClick={() => onNavigate('planningTasks')}
          />
        )}
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {hasPermission('qhseTickets') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseTickets')}>
            <CardContent className="p-6">
              <Icon name="Ticket" className="text-cyan-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Gestion Tickets</h3>
              <p className="text-sm text-gray-600">Assigner et suivre les tickets</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('qhseAudits') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseAudits')}>
            <CardContent className="p-6">
              <Icon name="ClipboardCheck" className="text-blue-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Audits & Inspections</h3>
              <p className="text-sm text-gray-600">Programmer et suivre</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('qhseTrainings') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseTrainings')}>
            <CardContent className="p-6">
              <Icon name="GraduationCap" className="text-green-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Formations</h3>
              <p className="text-sm text-gray-600">Gérer les formations</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('qhseWaste') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseWaste')}>
            <CardContent className="p-6">
              <Icon name="Trash2" className="text-orange-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Déchets Médicaux</h3>
              <p className="text-sm text-gray-600">Suivi et traçabilité</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('qhseSterilization') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseSterilization')}>
            <CardContent className="p-6">
              <Icon name="Droplet" className="text-blue-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Stérilisation</h3>
              <p className="text-sm text-gray-600">Cycles et traçabilité</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('qhseRisks') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseRisks')}>
            <CardContent className="p-6">
              <Icon name="AlertTriangle" className="text-red-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Gestion des Risques</h3>
              <p className="text-sm text-gray-600">Identifier et traiter</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('dailyRoundsView') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('dailyRoundsView')}>
            <CardContent className="p-6">
              <Icon name="ClipboardCheck" className="text-purple-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Rondes Quotidiennes</h3>
              <p className="text-sm text-gray-600">Consulter les rondes effectuées</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('qhseAES') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseAES')}>
            <CardContent className="p-6">
              <Icon name="Droplet" className="text-red-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Gestion des AES</h3>
              <p className="text-sm text-gray-600">Accidents d'Exposition au Sang</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('planningSalles') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('planningSalles')}>
            <CardContent className="p-6">
              <Icon name="Calendar" className="text-blue-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Planning Salles</h3>
              <p className="text-sm text-gray-600">Gérer les réservations</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('reportSecurityIncident') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportSecurityIncident')}>
            <CardContent className="p-6">
              <Icon name="Shield" className="text-indigo-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Incident de Sécurité</h3>
              <p className="text-sm text-gray-600">Signaler un incident</p>
            </CardContent>
          </Card>
        )}
        {hasPermission('settings') && (
          <Card className="card-hover cursor-pointer" onClick={() => onNavigate('settings')}>
            <CardContent className="p-6">
              <Icon name="Settings" className="text-gray-600 mb-3 text-3xl" />
              <h3 className="font-semibold mb-2">Utilisateurs</h3>
              <p className="text-sm text-gray-600">Gérer les utilisateurs</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Historique des incidents et déclarations */}
      <IncidentHistoryCard
        title="Mes incidents déclarés"
        subtitle="Historique des incidents que j'ai signalés"
        incidents={myReportedIncidents}
        allIncidents={incidents}
        onDelete={onDeleteIncident}
        emptyMessage="Aucun incident signalé depuis votre compte pour l'instant."
      />

      <IncidentHistoryCard
        title="Mes déclarations d'équipement"
        subtitle="Historique des équipements biomédicaux signalés en panne"
        incidents={myEquipmentDeclarations}
        allIncidents={incidents}
        onDelete={onDeleteIncident}
        emptyMessage="Aucune déclaration d'équipement effectuée pour le moment."
      />
    </div>
  );
};

