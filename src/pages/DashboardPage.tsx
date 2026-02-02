import { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from '@/components/Icon';
import { Link } from 'react-router-dom';
import { User, Incident, IncidentStatus, InterventionReport, IncidentPriority, Visitor, BiomedicalEquipment, MaintenanceTask, MaintenanceTaskStatus, Notification, UserRole, Users, Room, Booking, Doctor, BiomedicalEquipmentStatus, PlannedTask, PlannedTaskStatus, Civility } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { roleConfig } from '@/lib/data';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { SuperAdminPortal, AgentSecuritePortal, AgentEntretienPortal, TechnicienPortal, SuperviseurQHSEPortal, MedecinPortal, SecretairePortal, SuperviseurSecuritePortal, BiomedicalPortal, UserPortal, BuanderiePortal, TechnicienPolyvalentPortal } from '@/components/portals';
// Import des nouveaux composants de tableau de bord
import { SuperadminDashboard } from '@/components/dashboards/SuperadminDashboard';
import { SecurityDashboard } from '@/components/dashboards/SecurityDashboard';
import ReportProblemForm from '@/components/maintenance/ReportProblemForm';
import AssignedTasksTable from '@/components/maintenance/AssignedTasksTable';
import { UserManagement } from '@/components/qhse/UserManagement';
import { TechnicianInterventionsTable } from '@/components/technician/TechnicianInterventionsTable';
import { TechnicianHistoryTable } from '@/components/technician/TechnicianHistoryTable';
import { InterventionReportDialog } from '@/components/technician/InterventionReportDialog';
import { QhseTicketsTable } from '@/components/qhse/QhseTicketsTable';
import { PlanInterventionForm } from '@/components/qhse/PlanInterventionForm';
import { ReportSecurityIncidentForm } from '@/components/security/ReportSecurityIncidentForm';
import { VisitorLog } from '@/components/shared/VisitorLog';
import { EquipmentList } from '@/components/biomedical/EquipmentList';
import { AddEquipmentDialog } from '@/components/biomedical/AddEquipmentDialog';
import { MaintenanceSchedule } from '@/components/biomedical/MaintenanceSchedule';
import { ScheduleMaintenanceDialog } from '@/components/biomedical/ScheduleMaintenanceDialog';
import { ReportBiomedicalIncidentForm } from '@/components/biomedical/ReportBiomedicalIncidentForm';
import { RoomSchedule } from '@/components/planning/RoomSchedule';
import { DoctorList } from '@/components/qhse/DoctorList';
import { DashboardCard } from '@/components/shared/DashboardCard';
import { SecurityIncidentsTable } from '@/components/security/SecurityIncidentsTable';
import { MaintenanceHistoryTable } from '@/components/maintenance/MaintenanceHistoryTable';
import { MyTasks } from '@/components/agent/MyTasks';
import { TaskPlanning } from '@/components/qhse/TaskPlanning';
import { PersonalInfo } from '@/components/shared/PersonalInfo';
import { KpiDashboard } from '@/components/dashboards/KpiDashboard';
import { GlobalRoomOverview } from '@/components/planning/GlobalRoomOverview'; // Import du nouveau composant
import { AuditsList, TrainingsList, MedicalWasteList, SterilizationCyclesList, SterilizationRegisterList, RisksList, LaundryTrackingList, QHSEReportsModule } from '@/components/qhse';
import { DailyRoundsList, DailyRoundsView } from '@/components/rounds';
import { 
  filterIncidentsByRole, 
  filterVisitorsByRole, 
  filterPlannedTasksByRole, 
  filterMaintenanceTasksByRole, 
  filterBookingsByRole, 
  filterBiomedicalEquipmentByRole 
} from '@/utils/kpiFilter';
import { apiClient } from '@/integrations/api/client';
import { showSuccess, showError } from '@/utils/toast';
import { IncidentType, IncidentService } from '@/types';

// Props de la page principale
interface DashboardPageProps {
  user: User;
  username: string;
  onLogout: () => void;
  onResetData: () => void;
  incidents: Incident[];
  addIncident: (incident: Omit<Incident, 'id' | 'date_creation' | 'reported_by' | 'photo_urls'>, files: File[]) => void;
  updateIncidentStatus: (incidentId: string, newStatus: IncidentStatus) => void;
  deleteIncident: (incidentId: string) => void;
  addInterventionReport: (incidentId: string, report: Omit<InterventionReport, 'report_date' | 'technician_name'>) => void;
  assignTicket: (incidentId: string, assignedTo: string, priority: IncidentPriority, deadline: Date, assigneeName?: string) => void;
  unassignTicket: (incidentId: string) => void;
  planIntervention: (intervention: Omit<Incident, 'id' | 'date_creation' | 'reported_by' | 'statut' | 'photo_urls'>) => void;
  visitors: Visitor[];
  addVisitor: (visitor: Omit<Visitor, 'id' | 'entry_time' | 'registered_by'>) => void;
  signOutVisitor: (visitorId: string) => void;
  deleteVisitor: (visitorId: string) => void;
  biomedicalEquipment: BiomedicalEquipment[];
  addBiomedicalEquipment: (equipment: Omit<BiomedicalEquipment, 'id' | 'status' | 'last_maintenance' | 'next_maintenance' | 'model' | 'department' | 'created_at'>) => void;
  updateBiomedicalEquipmentStatus: (equipmentId: string, status: BiomedicalEquipmentStatus) => void;
  maintenanceTasks: MaintenanceTask[];
  scheduleMaintenanceTask: (task: Omit<MaintenanceTask, 'id' | 'status' | 'created_at'>) => void;
  updateMaintenanceTaskStatus: (taskId: string, status: MaintenanceTaskStatus) => void;
  notifications: Notification[];
  markNotificationsAsRead: (userId: string) => void;
  markNotificationAsRead?: (notificationId: string) => void;
  users: Users;
  addUser: (username: string, user: { first_name: string; last_name: string; email: string; password?: string; role: UserRole; civility: Civility; position: string; pin?: string; }) => void; // Updated type
  deleteUser: (username: string) => void;
  updateUserPermissions: (username: string, permissions: { added: string[], removed: string[] }) => void;
  rooms: Room[];
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'booked_by' | 'status' | 'created_at'>) => void;
  updateBooking: (bookingId: string, updatedData: Omit<Booking, 'id' | 'booked_by' | 'created_at'>) => void;
  deleteBooking: (bookingId: string) => void;
  doctors: Doctor[];
  plannedTasks: PlannedTask[];
  addPlannedTask: (task: Omit<PlannedTask, 'id' | 'created_by' | 'status' | 'created_at'>) => void;
  updatePlannedTaskStatus: (taskId: string, status: PlannedTaskStatus) => void;
  deletePlannedTask: (taskId: string) => void;
  expiringBookingIds: Set<string>;
  preExpiringBookingIds: Set<string>;
  startBooking: (bookingId: string, pin: string) => Promise<boolean>; // Changed to Promise<boolean>
  endBooking: (bookingId: string) => void;
  onUpdatePassword: (newPassword: string) => Promise<boolean>;
}

// Définition des composants pour chaque vue
const MaintenanceDashboard = ({ incidents, allIncidents, addIncident, updateIncidentStatus, setActiveTab }: any) => {
    const maintenanceIncidents = incidents.filter((i: Incident) => i.service === 'entretien');
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
          <Icon name="SprayCan" className="text-green-600 mr-2" />Tableau de Bord Entretien
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard title="Tâches Aujourd'hui" value={maintenanceIncidents.filter((i: Incident) => new Date(i.date_creation).toDateString() === new Date().toDateString()).length} iconName="ListChecks" colorClass="bg-blue-100 text-blue-600" />
            <DashboardCard title="En Attente" value={maintenanceIncidents.filter((i: Incident) => i.statut === 'nouveau' || i.statut === 'attente').length} iconName="Hourglass" colorClass="bg-yellow-100 text-yellow-600" />
            <DashboardCard title="Terminées" value={maintenanceIncidents.filter((i: Incident) => i.statut === 'resolu').length} iconName="CheckCheck" colorClass="bg-green-100 text-green-600" onClick={() => setActiveTab('maintenanceHistory')} />
            <DashboardCard title="Urgentes" value={maintenanceIncidents.filter((i: Incident) => i.priorite === 'haute' || i.priorite === 'critique').length} iconName="AlertTriangle" colorClass="bg-red-100 text-red-600" />
        </div>
        <div className="space-y-6">
            <ReportProblemForm onAddIncident={addIncident} />
            <AssignedTasksTable incidents={incidents} allIncidents={allIncidents || incidents} onUpdateIncidentStatus={updateIncidentStatus} />
        </div>
      </div>
    );
};

const TechnicianDashboard = ({ incidents, allIncidents, updateIncidentStatus, addInterventionReport, username }: any) => {
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const technicalIncidents = incidents.filter((i: Incident) => i.service === 'technique' && i.assigned_to === username);
    const activeInterventions = technicalIncidents.filter((i: Incident) => i.statut === 'nouveau' || i.statut === 'cours' || i.statut === 'attente');
    const completedInterventions = technicalIncidents.filter((i: Incident) => i.statut === 'traite' || i.statut === 'resolu');

    const handleSubmitReport = (report: Omit<InterventionReport, 'report_date' | 'technician_name'>) => {
        if (selectedIncident) {
            addInterventionReport(selectedIncident.id, report);
            setSelectedIncident(null);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                <Icon name="Wrench" className="text-orange-600 mr-2" />Tableau de Bord Technicien
            </h2>
            <TechnicianInterventionsTable 
                interventions={activeInterventions}
                allIncidents={allIncidents || incidents}
                onUpdateStatus={updateIncidentStatus}
                onOpenReportDialog={setSelectedIncident}
            />
            <TechnicianHistoryTable interventions={completedInterventions} allIncidents={allIncidents || incidents} />
            {selectedIncident && (
                <InterventionReportDialog
                    incident={selectedIncident}
                    isOpen={!!selectedIncident}
                    onClose={() => setSelectedIncident(null)}
                    onSubmit={handleSubmitReport}
                />
            )}
        </div>
    );
};

const QHSEDashboard = ({ incidents, updateIncidentStatus, assignTicket, unassignTicket, planIntervention, user, users, createAndAssignTicket }: any) => {
  // Seul le superviseur QHSE peut planifier des interventions
  const canPlanIntervention = user.role === 'superviseur_qhse' || user.role === 'superadmin';
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        <Icon name="UserCog" className="text-cyan-600 mr-2" />Dashboard Superviseur QHSE
      </h2>
      <QhseTicketsTable incidents={incidents} onUpdateStatus={updateIncidentStatus} onAssignTicket={assignTicket} onUnassignTicket={unassignTicket} onCreateAndAssignTicket={createAndAssignTicket} users={users} currentUserRole={user.role} />
      {canPlanIntervention && (
        <PlanInterventionForm onPlanIntervention={planIntervention} currentUser={user} users={users} />
      )}
    </div>
  );
};

const BiomedicalDashboard = ({ biomedicalEquipment, addBiomedicalEquipment, updateBiomedicalEquipmentStatus, incidents, onUpdateStatus }: any) => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Icon name="HeartPulse" className="text-red-600 mr-2" />
          Gestion des Équipements Biomédicaux
        </h2>
        <div className="flex space-x-2">
          <AddEquipmentDialog onAddEquipment={addBiomedicalEquipment} />
        </div>
      </div>
      <EquipmentList equipment={biomedicalEquipment} onUpdateStatus={updateBiomedicalEquipmentStatus} />
      {incidents.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <Icon name="AlertCircle" className="text-orange-500 mr-2" />
            Déclarations en attente (Biomédical)
          </h3>
          <div className="bg-white rounded-xl border border-cyan-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Ticket</TableHead>
                  <TableHead>Incident</TableHead>
                  <TableHead>Équipement / Lieu</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident: Incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-mono text-sm">{incident.id.substring(0, 17)}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-gray-800 capitalize">{incident.type.replace('-', ' ')}</div>
                      <div className="text-sm text-gray-500 whitespace-pre-wrap">{incident.description}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-700">{incident.lieu}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        incident.priorite === 'critique'
                          ? 'bg-red-500'
                          : incident.priorite === 'haute'
                          ? 'bg-orange-500'
                          : incident.priorite === 'moyenne'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }>
                        {incident.priorite}
                      </Badge>
                    </TableCell>
                  <TableCell>
                    <Badge className={
                      incident.statut === 'nouveau'
                        ? 'bg-blue-500'
                        : incident.statut === 'attente'
                        ? 'bg-orange-500'
                        : incident.statut === 'cours'
                        ? 'bg-yellow-500'
                        : incident.statut === 'traite'
                        ? 'bg-teal-500'
                        : 'bg-green-500'
                    }>
                      {incident.statut}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/incident/${incident.id}`}
                      className="inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      <Icon name="ExternalLink" className="h-4 w-4" />
                      Voir
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 disabled:text-white/60"
                        onClick={() => onUpdateStatus(incident.id, 'cours')}
                        disabled={!(incident.statut === 'nouveau' || incident.statut === 'attente')}
                      >
                        <Icon name="Play" className="mr-1 h-4 w-4" />
                        Démarrer
                      </Button>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-200 disabled:text-white/60"
                        onClick={() => onUpdateStatus(incident.id, 'traite')}
                        disabled={incident.statut !== 'cours'}
                      >
                        <Icon name="CheckCircle2" className="mr-1 h-4 w-4" />
                        Traité
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 disabled:text-white/60"
                        onClick={() => onUpdateStatus(incident.id, 'resolu')}
                        disabled={incident.statut !== 'traite'}
                      >
                        <Icon name="CheckCheck" className="mr-1 h-4 w-4" />
                        Résolu
                      </Button>
                      {incident.statut === 'resolu' && (
                        <span className="text-xs text-gray-400">Ticket clôturé</span>
                      )}
                    </div>
                  </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-cyan-100 shadow-sm p-6 text-center text-gray-500">
          <Icon name="CheckCircle2" className="mx-auto h-12 w-12 text-cyan-400 mb-2" />
          Aucune déclaration biomédicale en attente.
        </div>
      )}

      {/* Carte détaillée supprimée pour éviter les doublons avec l'aperçu du portail */}
    </div>
);

const DashboardPage = (props: DashboardPageProps) => {
  const { user, username, onLogout, notifications, markNotificationsAsRead, markNotificationAsRead, onUpdatePassword } = props;
  
  const userTabs = roleConfig[user.role];
  
  // Déterminer le portail par défaut selon le rôle
  const getDefaultPortal = () => {
    // Protection : si le rôle est vide ou non défini
    if (!user.role || (typeof user.role === 'string' && user.role.trim() === '')) {
      console.error('Rôle utilisateur vide ou non défini:', {
        username: user.username,
        role: user.role,
        roleType: typeof user.role,
        fullUser: user
      });
      // Essayer de récupérer depuis userTabs si disponible
      if (userTabs && userTabs.length > 0) {
        return userTabs[0].id;
      }
      return 'portalBiomedical'; // Fallback par défaut
    }
    
    switch (user.role) {
      case 'superadmin':
        return 'portalSuperadmin';
      case 'agent_securite':
        return 'portalAgentSecurite';
      case 'agent_entretien':
        return 'portalAgentEntretien';
      case 'technicien':
        // Le portail Technicien n'existe plus, le technicien arrive sur le portail Biomédical
        return 'portalBiomedical';
      case 'superviseur_qhse':
        return 'portalSuperviseurQHSE';
      case 'superviseur_agent_securite':
        return 'portalSuperviseurSecurite';
      case 'superviseur_agent_entretien':
        // Utilise désormais le même portail que le superviseur QHSE
        return 'portalSuperviseurQHSE';
      case 'superviseur_technicien':
        // Utilise également le portail superviseur QHSE
        return 'portalSuperviseurQHSE';
      case 'employe':
        return 'portalUser';
      case 'medecin':
        return 'portalMedecin';
      case 'secretaire':
        return 'portalSecretaire';
      case 'biomedical':
        return 'portalBiomedical';
      case 'buandiere':
        return 'portalBuanderie';
      case 'technicien_polyvalent':
        return 'portalTechnicienPolyvalent';
      default:
        if (userTabs && userTabs.length > 0) {
          return userTabs[0].id;
        }
        // Si le rôle n'est pas reconnu, essayer de trouver le portail dans les tabs
        console.warn(`Rôle non reconnu: ${user.role}, fallback vers portalBiomedical`);
        return 'portalBiomedical';
    }
  };

  const homeTabId = useMemo(() => {
    if (userTabs && userTabs.length > 0) {
      return userTabs[0].id;
    }
    return getDefaultPortal();
  }, [userTabs, user.role]);
  
  const [activeTab, setActiveTab] = useState(getDefaultPortal());
  const resolvedActiveTab = useMemo(() => {
    if (user.role !== 'superadmin' && activeTab === 'dashboardSuperadmin') {
      return getDefaultPortal();
    }
    return activeTab;
  }, [activeTab, user.role, userTabs]);

  const isMobile = useIsMobile();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Fonction pour créer et assigner un ticket directement
  const createAndAssignTicket = async (ticket: {
    type: IncidentType;
    description: string;
    lieu: string;
    service: IncidentService;
    assignedTo: string;
    assigneeName?: string;
    priority: IncidentPriority;
    deadline: Date;
  }) => {
    try {
      const newIncident = {
        type: ticket.type,
        description: ticket.description,
        lieu: ticket.lieu,
        service: ticket.service,
        priorite: ticket.priority,
        reported_by: user.id,
      };

      const response = await apiClient.createIncident(newIncident) as { id?: string };
      if (response?.id) {
        await apiClient.updateIncident(response.id, {
          assigned_to: ticket.assignedTo,
          assigned_to_name: ticket.assigneeName,
          deadline: ticket.deadline.toISOString(),
          priorite: ticket.priority,
          statut: 'attente',
        });
      }
      showSuccess(`Ticket créé et assigné à ${ticket.assigneeName || "l'utilisateur"}.`);
      
      // Recharger les incidents
      window.location.reload();
    } catch (error: any) {
      console.error("Error creating and assigning ticket:", error);
      showError("Erreur lors de la création et de l'assignation du ticket.");
    }
  };

  // Filtrer les données selon le rôle de l'utilisateur
  const filteredData = useMemo(() => {
    // Pour l'admin, pas de filtrage (voit tout)
    if (user.role === 'superadmin') {
      return {
        incidents: props.incidents,
        visitors: props.visitors,
        plannedTasks: props.plannedTasks,
        maintenanceTasks: props.maintenanceTasks,
        bookings: props.bookings,
        biomedicalEquipment: props.biomedicalEquipment,
      };
    }

    // Pour les autres rôles, filtrer les données
    return {
      incidents: filterIncidentsByRole(props.incidents, user, props.users),
      visitors: filterVisitorsByRole(props.visitors, user, props.users),
      plannedTasks: filterPlannedTasksByRole(props.plannedTasks, user, props.users),
      maintenanceTasks: filterMaintenanceTasksByRole(props.maintenanceTasks, user, props.users),
      bookings: filterBookingsByRole(props.bookings, user),
      biomedicalEquipment: filterBiomedicalEquipmentByRole(props.biomedicalEquipment, user),
    };
  }, [user, props.incidents, props.visitors, props.plannedTasks, props.maintenanceTasks, props.bookings, props.biomedicalEquipment, props.users]);

  const NavLinks = () => (
    userTabs && userTabs.length > 0 ? userTabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => {
          setActiveTab(tab.id);
          if (isMobile) setIsMobileNavOpen(false);
        }}
        className={`
          relative px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out
          ${resolvedActiveTab === tab.id 
            ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 text-white shadow-lg transform scale-105' 
            : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
          }
          hover:scale-105 active:scale-95
          flex items-center space-x-2
        `}
      >
        <Icon name={tab.icon} className="h-4 w-4" />
        <span>{tab.name}</span>
        {resolvedActiveTab === tab.id && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/50 rounded-full"></span>
        )}
      </button>
    )) : null
  );

  const renderActiveTab = () => {
    switch (resolvedActiveTab) {
      // Portails personnalisés
      case 'portalSuperadmin':
        return <SuperAdminPortal 
          user={user}
          incidents={filteredData.incidents}
          visitors={filteredData.visitors}
          plannedTasks={filteredData.plannedTasks}
          bookings={filteredData.bookings}
          notifications={props.notifications}
          users={props.users}
          onNavigate={setActiveTab}
        />;
      case 'portalAgentSecurite':
        return <AgentSecuritePortal 
          user={user}
          incidents={filteredData.incidents}
          visitors={filteredData.visitors}
          plannedTasks={filteredData.plannedTasks}
          bookings={filteredData.bookings}
          notifications={props.notifications}
          onNavigate={setActiveTab}
          onDeleteIncident={props.deleteIncident}
        />;
      case 'portalAgentEntretien':
        return <AgentEntretienPortal 
          user={user}
          incidents={filteredData.incidents}
          visitors={filteredData.visitors}
          plannedTasks={filteredData.plannedTasks}
          bookings={filteredData.bookings}
          notifications={props.notifications}
          users={props.users}
          onNavigate={setActiveTab}
          onDeleteIncident={props.deleteIncident}
        />;
      case 'portalTechnicien':
        return <TechnicienPortal 
          user={user}
          incidents={filteredData.incidents}
          plannedTasks={filteredData.plannedTasks}
          notifications={props.notifications}
          onNavigate={setActiveTab}
          onDeleteIncident={props.deleteIncident}
        />;
      case 'portalSuperviseurQHSE':
        return <SuperviseurQHSEPortal 
          user={user}
          incidents={filteredData.incidents}
          visitors={filteredData.visitors}
          plannedTasks={filteredData.plannedTasks}
          bookings={filteredData.bookings}
          notifications={props.notifications}
          users={props.users}
          onNavigate={setActiveTab}
          onDeleteIncident={props.deleteIncident}
        />;
      case 'portalUser':
        return <UserPortal 
          user={user}
          incidents={filteredData.incidents}
          visitors={filteredData.visitors}
          plannedTasks={filteredData.plannedTasks}
          bookings={filteredData.bookings}
          notifications={props.notifications}
          onNavigate={setActiveTab}
          onDeleteIncident={props.deleteIncident}
        />;
      case 'portalMedecin':
        return <MedecinPortal 
          user={user}
          bookings={filteredData.bookings}
          notifications={props.notifications}
          incidents={filteredData.incidents}
          onNavigate={setActiveTab}
        />;
      case 'portalSecretaire':
        return <SecretairePortal 
          user={user}
          visitors={filteredData.visitors}
          bookings={filteredData.bookings}
          notifications={props.notifications}
          incidents={filteredData.incidents}
          onDeleteIncident={props.deleteIncident}
          onNavigate={setActiveTab}
        />;
      case 'portalSuperviseurSecurite':
        return <SuperviseurSecuritePortal 
          user={user}
          incidents={filteredData.incidents}
          visitors={filteredData.visitors}
          plannedTasks={filteredData.plannedTasks}
          bookings={filteredData.bookings}
          notifications={props.notifications}
          users={props.users}
          onNavigate={setActiveTab}
        />;
      case 'portalSuperviseurEntretien':
      case 'portalSuperviseurTechnicien':
        // Ces portails sont désormais regroupés sous le portail Superviseur QHSE
        return <SuperviseurQHSEPortal 
          user={user}
          incidents={filteredData.incidents}
          visitors={filteredData.visitors}
          plannedTasks={filteredData.plannedTasks}
          bookings={filteredData.bookings}
          notifications={props.notifications}
          users={props.users}
          onNavigate={setActiveTab}
        />;
      case 'portalBiomedical':
        return <BiomedicalPortal
          user={user}
          biomedicalEquipment={filteredData.biomedicalEquipment}
          maintenanceTasks={filteredData.maintenanceTasks}
          incidents={filteredData.incidents}
          onNavigate={setActiveTab}
        />;
      case 'portalBuanderie':
        return <BuanderiePortal
          user={user}
          notifications={props.notifications}
          onNavigate={setActiveTab}
        />;
      case 'portalTechnicienPolyvalent':
        return <TechnicienPolyvalentPortal
          user={user}
          maintenanceTasks={filteredData.maintenanceTasks}
          incidents={filteredData.incidents}
          notifications={props.notifications}
          onNavigate={setActiveTab}
        />;
      
      // Modules existants
      case 'dashboardSuperadmin':
        if (user.role !== 'superadmin') {
          return (
            <div className="p-6">
              <Alert variant="destructive" className="max-w-xl">
                <AlertTitle>Accès refusé</AlertTitle>
                <AlertDescription>
                  Seul le Super Admin peut consulter ce tableau de bord.
                </AlertDescription>
              </Alert>
            </div>
          );
        }
        return <SuperadminDashboard 
          incidents={props.incidents} 
          users={props.users} 
          biomedicalEquipment={props.biomedicalEquipment} 
          bookings={props.bookings} 
          plannedTasks={props.plannedTasks}
          visitors={props.visitors}
          onResetData={props.onResetData} 
          setActiveTab={setActiveTab} 
        />;
      case 'dashboardSecurite':
        return <SecurityDashboard incidents={props.incidents.filter(i => i.service === 'securite')} setActiveTab={setActiveTab} />;
      case 'dashboardEntretien':
        return <MaintenanceDashboard incidents={props.incidents.filter(i => i.service === 'entretien')} allIncidents={props.incidents} addIncident={props.addIncident} updateIncidentStatus={props.updateIncidentStatus} setActiveTab={setActiveTab} />;
      case 'dashboardTechnicien':
        return <TechnicianDashboard incidents={props.incidents} allIncidents={props.incidents} updateIncidentStatus={props.updateIncidentStatus} addInterventionReport={props.addInterventionReport} username={username} />;
      case 'dashboardQHSE':
        return <QHSEDashboard incidents={props.incidents} updateIncidentStatus={props.updateIncidentStatus} assignTicket={props.assignTicket} unassignTicket={props.unassignTicket} planIntervention={props.planIntervention} user={user} users={props.users} createAndAssignTicket={createAndAssignTicket} />;
      case 'qhseTickets':
        // Le technicien polyvalent ne voit que les tickets qui lui sont assignés
        if (user.role === 'technicien_polyvalent') {
          const filteredIncidents = props.incidents.filter(i => i.assigned_to === user.id);
          return <QhseTicketsTable incidents={filteredIncidents} onUpdateStatus={props.updateIncidentStatus} onAssignTicket={props.assignTicket} onUnassignTicket={props.unassignTicket} onCreateAndAssignTicket={createAndAssignTicket} users={props.users} currentUserRole={user.role} />;
        }
        const serviceFilter = user.role === 'superviseur_agent_securite' ? 'securite' :
                              user.role === 'superviseur_agent_entretien' ? 'entretien' :
                              user.role === 'superviseur_technicien' ? 'technique' : 'all';
        const filteredIncidents = serviceFilter === 'all'
          ? props.incidents.filter(i => i.service !== 'biomedical')
          : props.incidents.filter(i => i.service === serviceFilter);
        return <QhseTicketsTable incidents={filteredIncidents} onUpdateStatus={props.updateIncidentStatus} onAssignTicket={props.assignTicket} onUnassignTicket={props.unassignTicket} onCreateAndAssignTicket={createAndAssignTicket} users={props.users} currentUserRole={user.role} />;
      case 'reportIncident':
        return user.role === 'agent_securite' || user.role === 'superviseur_agent_securite' ? <ReportSecurityIncidentForm onAddIncident={props.addIncident} /> : <ReportProblemForm onAddIncident={props.addIncident} />;
      case 'reportSecurityIncident':
        return <ReportSecurityIncidentForm onAddIncident={props.addIncident} />;
      case 'reportMaintenanceIncident':
        return <ReportProblemForm onAddIncident={props.addIncident} />;
      case 'reportBiomedicalIncident':
        return <ReportBiomedicalIncidentForm onAddIncident={props.addIncident} />;
      case 'visitorLog':
        return (
          <VisitorLog
            visitors={props.visitors}
            onAddVisitor={props.addVisitor}
            onSignOutVisitor={props.signOutVisitor}
            onDeleteVisitor={props.deleteVisitor}
            users={props.users}
            doctors={props.doctors}
          />
        );
      case 'biomedical':
        const biomedicalIncidents = props.incidents.filter(i => i.service === 'biomedical');
        return (
          <BiomedicalDashboard
            biomedicalEquipment={props.biomedicalEquipment}
            addBiomedicalEquipment={props.addBiomedicalEquipment}
            updateBiomedicalEquipmentStatus={props.updateBiomedicalEquipmentStatus}
            incidents={biomedicalIncidents}
            onUpdateStatus={props.updateIncidentStatus}
            onViewAllDeclarations={() => setActiveTab('biomedicalDecl')}
          />
        );
      case 'planningSalles':
        return <RoomSchedule 
          rooms={props.rooms} 
          bookings={props.bookings} 
          users={props.users} 
          doctors={props.doctors} 
          onAddBooking={props.addBooking}
          updateBooking={props.updateBooking} 
          deleteBooking={props.deleteBooking} 
          currentUser={user}
          currentUserRole={user.role} 
          currentUsername={username}
          expiringBookingIds={props.expiringBookingIds} 
          preExpiringBookingIds={props.preExpiringBookingIds}
          onStartBooking={props.startBooking}
          onEndBooking={props.endBooking}
        />;
      case 'doctors':
        return <DoctorList doctors={props.doctors} rooms={props.rooms} onAddBooking={props.addBooking} />;
      case 'settings':
        if (user.role !== 'superadmin') {
          return (
            <div className="p-6">
              <Alert variant="destructive" className="max-w-xl">
                <AlertTitle>Accès refusé</AlertTitle>
                <AlertDescription>
                  La gestion des utilisateurs est réservée au Super Admin.
                </AlertDescription>
              </Alert>
            </div>
          );
        }
        return <UserManagement currentUserRole={user.role} users={props.users} addUser={props.addUser} deleteUser={props.deleteUser} updateUserPermissions={props.updateUserPermissions} />;
      case 'securityIncidents':
        return <SecurityIncidentsTable incidents={props.incidents.filter(i => i.service === 'securite')} allIncidents={props.incidents} />;
      case 'maintenanceHistory':
        const completedMaintenance = props.incidents.filter(i => i.service === 'entretien' && (i.statut === 'resolu' || i.statut === 'traite'));
        return <MaintenanceHistoryTable interventions={completedMaintenance} allIncidents={props.incidents} />;
      case 'myTasks':
        const myTasks = props.plannedTasks.filter(task => task.assigned_to === props.user.id); // Filter by user ID
        return <MyTasks tasks={myTasks} users={props.users} onUpdateStatus={props.updatePlannedTaskStatus} />;
      case 'planningTasks':
        const tasksForSupervisor = user.role === 'superviseur_agent_securite' ? props.plannedTasks.filter(t => props.users[Object.keys(props.users).find(key => props.users[key].id === t.assigned_to)!]?.role === 'agent_securite') :
                                   user.role === 'superviseur_agent_entretien' ? props.plannedTasks.filter(t => props.users[Object.keys(props.users).find(key => props.users[key].id === t.assigned_to)!]?.role === 'agent_entretien') :
                                   user.role === 'superviseur_technicien' ? props.plannedTasks.filter(t => props.users[Object.keys(props.users).find(key => props.users[key].id === t.assigned_to)!]?.role === 'technicien') :
                                   user.role === 'technicien_polyvalent' ? props.plannedTasks.filter(t => t.assigned_to === user.id || t.created_by === user.id) :
                                   props.plannedTasks;
        return <TaskPlanning tasks={tasksForSupervisor} users={props.users} onAddTask={props.addPlannedTask} onDeleteTask={props.deletePlannedTask} currentUserRole={user.role} />;
      case 'planningBiomedicalMaintenance':
        return (
          <Card className="m-6 border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-cyan-700">
                <Icon name="CalendarPlus" className="text-cyan-500" />
                Planification des maintenances biomédicales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-600">
                Utiliser le module ci-dessous pour programmer les maintenances préventives ou curatives des équipements biomédicaux.
              </p>
              <ScheduleMaintenanceDialog
                equipment={props.biomedicalEquipment}
                onScheduleTask={props.scheduleMaintenanceTask}
                users={props.users}
              />
              <MaintenanceSchedule
                tasks={props.maintenanceTasks}
                equipment={props.biomedicalEquipment}
                onUpdateStatus={props.updateMaintenanceTaskStatus}
              />
            </CardContent>
          </Card>
        );
      case 'personalInfo':
        return <PersonalInfo user={props.user} onUpdatePassword={onUpdatePassword} />;
      case 'kpiDashboard':
        return <KpiDashboard 
          incidents={props.incidents} 
          biomedicalEquipment={props.biomedicalEquipment} 
          plannedTasks={props.plannedTasks} 
          visitors={props.visitors} 
          bookings={props.bookings} 
          users={props.users}
          maintenanceTasks={props.maintenanceTasks}
          currentUser={props.user}
        />;
      case 'globalRoomOverview': // Nouveau cas pour la vue globale des salles
        return <GlobalRoomOverview 
          rooms={props.rooms} 
          bookings={props.bookings} 
          users={props.users} 
          doctors={props.doctors} 
        />;
      // Modules QHSE
      case 'qhseAudits':
        return <AuditsList />;
      case 'qhseTrainings':
        return <TrainingsList users={props.users} />;
      case 'qhseWaste':
        return <MedicalWasteList />;
      case 'qhseSterilization':
        return <SterilizationCyclesList />;
      case 'qhseSterilizationRegister':
        return <SterilizationRegisterList />;
      case 'qhseRisks':
        return <RisksList currentUser={user} />;
      case 'qhseAudits':
        return <AuditsList users={props.users} />;
      case 'qhseLaundry':
        return <LaundryTrackingList currentUser={user} />;
      case 'qhseReports':
        return <QHSEReportsModule />;
      case 'dailyRoundsBiomedical':
        return <DailyRoundsList user={user} roundType="biomedical" />;
      case 'dailyRoundsPolyvalent':
        return <DailyRoundsList user={user} roundType="technicien_polyvalent" />;
      case 'dailyRoundsView':
        return <DailyRoundsView users={props.users} />;
      default:
        return <SuperadminDashboard 
          incidents={props.incidents} 
          users={props.users} 
          biomedicalEquipment={props.biomedicalEquipment} 
          bookings={props.bookings} 
          plannedTasks={props.plannedTasks}
          visitors={props.visitors}
          onResetData={props.onResetData} 
          setActiveTab={setActiveTab} 
        />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/20 to-blue-50/30">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-4">
            {isMobile && (
              <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="btn-animate">
                    <Icon name="Menu" className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
                  <nav className="flex flex-col pt-6">
                    <NavLinks />
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            <div className="flex items-center space-x-3">
              <img src="https://page1.genspark.site/v1/base64_upload/85255e9e3f43d5940a170bdbd6d7b858" alt="Logo CDL" className="h-10 w-10 md:h-12 md:w-12 rounded-lg shadow-md" />
              {!isMobile && (
                <div>
                  <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
                    Centre Diagnostic Libreville
                  </h1>
                  <p className="text-xs md:text-sm text-gray-600 font-medium">
                    {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {userTabs && userTabs.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveTab(homeTabId)}
                className="hidden md:flex items-center text-gray-600 hover:text-cyan-600 btn-animate"
              >
                <Icon name="LayoutDashboard" className="mr-2 h-4 w-4" /> Tableau de Bord
              </Button>
            )}
            {resolvedActiveTab !== homeTabId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab(homeTabId)}
                className="hidden md:flex items-center text-gray-600 hover:text-cyan-600 border-cyan-100"
              >
                <Icon name="ArrowLeft" className="mr-2 h-4 w-4" /> Retour à mon portail
              </Button>
            )}
            <NotificationBell 
              userId={user.id}
              notifications={notifications} 
              onMarkAsRead={markNotificationsAsRead}
              onMarkNotificationAsRead={markNotificationAsRead}
              onNotificationClick={(link) => {
                console.log('Notification clicked, setting active tab to:', link);
                setActiveTab(link);
              }}
            />
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-100">
              <Icon name="User" className="h-4 w-4 text-cyan-600" />
              <span className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">{user.first_name} {user.last_name}</span>
              </span>
            </div>
            <Button onClick={onLogout} variant="destructive" className="btn-animate">
              <Icon name="LogOut" className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      {!isMobile && (
        <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-xl border-b border-gray-700/50">
          <div className="px-6 flex space-x-1 overflow-x-auto">
            <NavLinks />
          </div>
        </nav>
      )}

      <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto fade-in">
        {isMobile && resolvedActiveTab !== homeTabId && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab(homeTabId)}
              className="flex items-center gap-2 w-full justify-center bg-white/80 text-gray-700 border-cyan-100"
            >
              <Icon name="ArrowLeft" className="h-4 w-4" /> Retour à mon portail
            </Button>
          </div>
        )}
        {renderActiveTab()}
      </main>
    </div>
  );
};

export default DashboardPage;