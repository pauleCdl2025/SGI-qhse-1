import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { IncidentHistoryCard } from "@/components/shared/IncidentHistoryCard";
import { User, Incident, Visitor, PlannedTask, Booking, Notification, Users, UserRole } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { PortalExcelActions } from "@/components/shared/PortalExcelActions";

interface PortalProps {
  user: User;
  incidents: Incident[];
  visitors: Visitor[];
  plannedTasks: PlannedTask[];
  bookings: Booking[];
  notifications: Notification[];
  onNavigate: (tabId: string) => void;
  onDeleteIncident?: (incidentId: string) => void;
  users?: Users;
}

const priorityClasses = {
  faible: "bg-green-500",
  moyenne: "bg-yellow-500",
  haute: "bg-orange-600",
  critique: "bg-red-600",
};

const statusClasses = {
  nouveau: "bg-blue-500",
  attente: "bg-gray-500",
  cours: "bg-amber-500",
  traite: "bg-teal-500",
  resolu: "bg-green-600",
};

const roleLabels: Partial<Record<UserRole, string>> = {
  superadmin: 'Super Admin',
  superviseur_qhse: 'Service QHSE',
  secretaire: 'Secrétariat',
  medecin: 'Médecin',
  superviseur_agent_securite: 'Superviseur Sécurité',
  agent_securite: 'Agent Sécurité',
  superviseur_agent_entretien: 'Superviseur Entretien',
  agent_entretien: 'Agent Entretien',
  superviseur_technicien: 'Superviseur Technique',
  technicien: 'Technicien',
  biomedical: 'Service Biomédical',
  dop: 'Direction Opérationnelle',
};

const formatUserName = (users: Users | undefined, userId?: string) => {
  if (!users || !userId) return 'Non assigné';
  const entry = Object.values(users).find(user => user.id === userId);
  if (!entry) return 'Non assigné';
  const parts = [entry.first_name, entry.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (entry.name) return entry.name;
  return entry.username;
};

const getReporterLabel = (users: Users | undefined, incident: Incident) => {
  if (!users) return incident.service;
  const reporter = Object.values(users).find(user => user.id === incident.reported_by);
  if (!reporter) return incident.service;
  return roleLabels[reporter.role] ?? incident.service;
};

// Fonction pour obtenir le préfixe du service
const getServicePrefix = (service: IncidentService): string => {
  switch (service) {
    case 'securite':
      return 'secu';
    case 'entretien':
      return 'ent';
    case 'biomedical':
      return 'bio';
    case 'technique':
      return 'tech';
    default:
      return 'inc';
  }
};

// Fonction pour formater le numéro de ticket de manière séquentielle
const formatTicketNumber = (incident: Incident, allIncidents: Incident[] = []): string => {
  if (!allIncidents || allIncidents.length === 0) {
    // Fallback si allIncidents n'est pas disponible
    const cleanId = incident.id.replace(/-/g, '').toUpperCase();
    return `${getServicePrefix(incident.service)}-${cleanId.slice(-6)}`;
  }
  
  const prefix = getServicePrefix(incident.service);
  // Trier tous les incidents du même service par date de création
  const serviceIncidents = allIncidents
    .filter(i => i.service === incident.service)
    .sort((a, b) => {
      const dateA = typeof a.date_creation === 'string' ? new Date(a.date_creation) : a.date_creation;
      const dateB = typeof b.date_creation === 'string' ? new Date(b.date_creation) : b.date_creation;
      return dateA.getTime() - dateB.getTime();
    });
  
  // Trouver l'index de l'incident actuel + 1 (pour commencer à 1)
  const index = serviceIncidents.findIndex(i => i.id === incident.id) + 1;
  
  return `${prefix}-${index}`;
};

// Portail Agent d'Entretien
export const AgentEntretienPortal = ({ user, incidents, plannedTasks, notifications, onNavigate, onDeleteIncident, users }: PortalProps) => {
  const today = new Date();
  const todayStr = today.toDateString();
  
  const maintenanceIncidents = incidents.filter(i => i.service === 'entretien');
  const qhseIncidents = incidents.filter(i => i.service === 'entretien' || i.service === 'technique');
  const unreadNotifications = notifications.filter(n => !n.read);
  const assignedIncidents = incidents.filter(i => i.assigned_to === user.id);
  
  const stats = {
    todayIncidents: maintenanceIncidents.filter(i => new Date(i.date_creation).toDateString() === todayStr).length,
    assigned: maintenanceIncidents.filter(i => i.assigned_to === user.id && i.statut !== 'resolu').length,
    completed: maintenanceIncidents.filter(i => i.assigned_to === user.id && i.statut === 'resolu').length,
    urgent: maintenanceIncidents.filter(i => (i.priorite === 'haute' || i.priorite === 'critique') && i.assigned_to === user.id).length,
    myTasks: plannedTasks.filter(t => t.assigned_to === user.id && t.status === 'à faire').length,
    qhseTickets: qhseIncidents.filter(i => i.statut === 'nouveau' || i.statut === 'attente').length,
  };
  const myReportedIncidents = incidents.filter(i => i.reported_by === user.id && i.service !== 'biomedical');
  const myEquipmentDeclarations = incidents.filter(i => i.reported_by === user.id && i.service === 'biomedical');

  return (
    <div className="space-y-8 fade-in">
      {/* En-tête personnalisé */}
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 text-white p-8 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-3">
              <Icon name="SprayCan" className="text-4xl mr-3" />
              <h1 className="text-4xl font-bold">Portail Entretien QHSE</h1>
            </div>
            <p className="text-cyan-100 text-xl">
              {user.civility} {user.first_name} {user.last_name}
            </p>
            <p className="text-cyan-200 mt-2">
              {format(today, "EEEE d MMMM yyyy", { locale: fr })} - {format(today, "HH:mm")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadNotifications.length > 0 && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                <Icon name="Bell" className="text-3xl mb-2 mx-auto" />
                <div className="text-3xl font-bold">{unreadNotifications.length}</div>
                <div className="text-sm text-cyan-100">Notification{unreadNotifications.length > 1 ? 's' : ''}</div>
              </div>
            )}
            <PortalExcelActions
              portalType="agent_entretien"
              data={{
                incidents: assignedIncidents,
                plannedTasks,
              }}
            />
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Tâches Assignées" 
          value={stats.assigned} 
          iconName="ClipboardList" 
          colorClass="bg-cyan-100 text-cyan-600"
          onClick={() => onNavigate('dashboardEntretien')}
        />
        <DashboardCard 
          title="Terminées Aujourd'hui" 
          value={stats.completed} 
          iconName="CheckCircle2" 
          colorClass="bg-green-100 text-green-600"
          onClick={() => onNavigate('maintenanceHistory')}
        />
        <DashboardCard 
          title="Tickets QHSE" 
          value={stats.qhseTickets} 
          iconName="Ticket" 
          colorClass="bg-cyan-100 text-cyan-600"
          onClick={() => onNavigate('qhseTickets')}
        />
        <DashboardCard 
          title="Tâches Planifiées" 
          value={stats.myTasks} 
          iconName="Calendar" 
          colorClass="bg-teal-100 text-teal-600"
          onClick={() => onNavigate('myTasks')}
        />
      </div>

      {/* Accès rapide */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon name="Zap" className="text-cyan-600 mr-2" />
            Accès Rapide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportIncident')}>
              <CardContent className="p-6">
                <Icon name="AlertCircle" className="text-red-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Signaler Problème</h3>
                <p className="text-sm text-gray-600">Déclarer un problème</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportBiomedicalIncident')}>
              <CardContent className="p-6">
                <Icon name="Stethoscope" className="text-teal-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Matériel Biomédical</h3>
                <p className="text-sm text-gray-600">Signaler une panne au service biomédical</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportSecurityIncident')}>
              <CardContent className="p-6">
                <Icon name="Shield" className="text-indigo-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Incident de Sécurité</h3>
                <p className="text-sm text-gray-600">Signaler un incident de sécurité</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('dashboardEntretien')}>
              <CardContent className="p-6">
                <Icon name="ListChecks" className="text-cyan-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Mes Tâches</h3>
                <p className="text-sm text-gray-600">Tâches assignées</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('dashboardQHSE')}>
              <CardContent className="p-6">
                <Icon name="UserCog" className="text-blue-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Dashboard QHSE</h3>
                <p className="text-sm text-gray-600">Vue d'ensemble</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseTickets')}>
              <CardContent className="p-6">
                <Icon name="Ticket" className="text-cyan-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Tickets QHSE</h3>
                <p className="text-sm text-gray-600">Voir tous les tickets</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('maintenanceHistory')}>
              <CardContent className="p-6">
                <Icon name="History" className="text-green-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Historique</h3>
                <p className="text-sm text-gray-600">Tâches terminées</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('myTasks')}>
              <CardContent className="p-6">
                <Icon name="Calendar" className="text-teal-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Tâches Planifiées</h3>
                <p className="text-sm text-gray-600">Mes tâches récurrentes</p>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer" onClick={() => onNavigate('personalInfo')}>
              <CardContent className="p-6">
                <Icon name="User" className="text-gray-600 mb-3 text-3xl" />
                <h3 className="font-semibold mb-2">Mon Profil</h3>
                <p className="text-sm text-gray-600">Mes informations</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Mon Activité */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon name="Info" className="text-cyan-600 mr-2" />
            Mon Activité QHSE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.urgent > 0 && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <div className="flex items-center">
                  <Icon name="AlertTriangle" className="text-red-600 mr-2 text-2xl" />
                  <div>
                    <div className="font-semibold text-red-900">{stats.urgent} tâche(s) urgente(s)</div>
                    <div className="text-sm text-red-700">À traiter en priorité</div>
                  </div>
                </div>
              </div>
            )}
            {stats.qhseTickets > 0 && (
              <div className="p-4 bg-cyan-50 border-l-4 border-cyan-500 rounded-lg">
                <div className="flex items-center">
                  <Icon name="Ticket" className="text-cyan-600 mr-2 text-2xl" />
                  <div>
                    <div className="font-semibold text-cyan-900">{stats.qhseTickets} ticket(s) QHSE</div>
                    <div className="text-sm text-cyan-700">En attente de traitement</div>
                  </div>
                </div>
              </div>
            )}
            {stats.assigned > 0 && (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                <div className="flex items-center">
                  <Icon name="Clock" className="text-blue-600 mr-2 text-2xl" />
                  <div>
                    <div className="font-semibold text-blue-900">{stats.assigned} tâche(s) assignée(s)</div>
                    <div className="text-sm text-blue-700">En cours de traitement</div>
                  </div>
                </div>
              </div>
            )}
            {stats.completed > 0 && (
              <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                <div className="flex items-center">
                  <Icon name="CheckCircle2" className="text-green-600 mr-2 text-2xl" />
                  <div>
                    <div className="font-semibold text-green-900">{stats.completed} tâche(s) terminée(s)</div>
                    <div className="text-sm text-green-700">Aujourd'hui</div>
                  </div>
                </div>
              </div>
            )}
            {stats.assigned === 0 && stats.qhseTickets === 0 && stats.urgent === 0 && (
              <div className="p-4 bg-gray-50 border-l-4 border-gray-300 rounded-lg col-span-2">
                <div className="flex items-center">
                  <Icon name="CheckCircle2" className="text-gray-400 mr-2 text-2xl" />
                  <div className="text-gray-600">Aucune tâche en attente. Excellent travail !</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tickets qui me sont assignés */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon name="Ticket" className="text-blue-600 mr-2" />
            Tickets qui me sont assignés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedIncidents.length === 0 ? (
            <div className="text-sm text-gray-500">Aucun ticket ne vous est assigné pour le moment.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Délai</TableHead>
                    <TableHead>Assigné à</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedIncidents.map(incident => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-mono text-sm font-semibold">
                        <Link to={`/incident/${incident.id}`} className="text-blue-600 hover:underline">
                          {formatTicketNumber(incident, incidents)}
                        </Link>
                      </TableCell>
                      <TableCell>{getReporterLabel(users, incident)}</TableCell>
                      <TableCell>
                        <Badge className={priorityClasses[incident.priorite]}> {incident.priorite}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusClasses[incident.statut] || 'bg-gray-400'}>
                          {incident.statut}
                        </Badge>
                      </TableCell>
                      <TableCell>{incident.deadline ? format(incident.deadline, 'dd/MM HH:mm') : '-'}</TableCell>
                      <TableCell>{incident.assigned_to_name || formatUserName(users, incident.assigned_to)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={incident.description}>
                        {incident.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <IncidentHistoryCard
        title="Suivi de mes incidents déclarés"
        subtitle="Incidents d'entretien soumis avec votre compte"
        incidents={myReportedIncidents}
        allIncidents={incidents}
        onDelete={onDeleteIncident}
        emptyMessage="Vous n'avez pas encore signalé d'incident."
      />

      <IncidentHistoryCard
        title="Suivi de mes déclarations d'équipement"
        subtitle="Déclarations biomédicales envoyées par vos soins"
        incidents={myEquipmentDeclarations}
        allIncidents={incidents}
        onDelete={onDeleteIncident}
        emptyMessage="Aucune déclaration d'équipement effectuée pour le moment."
      />
    </div>
  );
};

