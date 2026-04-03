import { User, UserRole, Incident, Visitor, PlannedTask, MaintenanceTask, Booking, BiomedicalEquipment } from '@/types';
import { Users } from '@/types';

/**
 * Détermine quels agents sont sous la supervision d'un superviseur
 */
const getSupervisedAgents = (supervisorRole: UserRole, users: Users): string[] => {
  const agentIds: string[] = [];
  
  switch (supervisorRole) {
    case 'superviseur_agent_securite':
      // Récupérer tous les agents de sécurité
      Object.values(users).forEach(user => {
        if (user.role === 'agent_securite') {
          agentIds.push(user.id);
        }
      });
      break;
    case 'superviseur_agent_entretien':
      // Récupérer tous les agents d'entretien
      Object.values(users).forEach(user => {
        if (user.role === 'agent_entretien') {
          agentIds.push(user.id);
        }
      });
      break;
    case 'superviseur_technicien':
      // Récupérer tous les techniciens
      Object.values(users).forEach(user => {
        if (user.role === 'technicien') {
          agentIds.push(user.id);
        }
      });
      break;
    case 'superviseur_qhse':
      // Le superviseur QHSE est le responsable des agents de sécurité, entretien et techniciens
      // Il supervise tous ces agents
      Object.values(users).forEach(user => {
        if (['agent_securite', 'agent_entretien', 'technicien'].includes(user.role)) {
          agentIds.push(user.id);
        }
      });
      break;
  }
  
  return agentIds;
};

/**
 * Filtre les incidents selon le rôle de l'utilisateur
 */
export const filterIncidentsByRole = (
  incidents: Incident[],
  currentUser: User,
  users: Users
): Incident[] => {
  if (currentUser.role === 'superadmin') {
    // L'admin voit tous les incidents
    return incidents;
  }

  // Pour les KPIs, on privilégie une vue "par service" (métier) afin que le dashboard
  // ne soit pas vide pour les rôles opérationnels qui ne créent/assignent pas eux-mêmes
  // tous les incidents.
  const roleServiceScope: Partial<Record<UserRole, Incident['service'][]>> = {
    agent_securite: ['securite'],
    superviseur_agent_securite: ['securite'],
    agent_entretien: ['entretien'],
    superviseur_agent_entretien: ['entretien'],
    technicien: ['technique', 'biomedical'],
    superviseur_technicien: ['technique', 'biomedical'],
    biomedical: ['biomedical'],
    technicien_polyvalent: ['technique', 'biomedical', 'entretien'],
    administrateur_reseau: ['technique'],
    secretaire: ['securite', 'technique', 'entretien', 'biomedical'],
    medecin: ['securite', 'technique', 'entretien', 'biomedical'],
    employe: ['securite', 'technique', 'entretien', 'biomedical'],
    dop: ['securite', 'technique', 'entretien', 'biomedical'],
    buandiere: ['securite', 'technique', 'entretien', 'biomedical'],
  };

  const scopedServices = roleServiceScope[currentUser.role];
  if (scopedServices && scopedServices.length > 0) {
    return incidents.filter(i => scopedServices.includes(i.service));
  }
  
  if (['superviseur_agent_securite', 'superviseur_agent_entretien', 'superviseur_technicien', 'superviseur_qhse'].includes(currentUser.role)) {
    // Les superviseurs voient les incidents de leurs agents + les leurs
    const supervisedAgentIds = getSupervisedAgents(currentUser.role, users);
    const allRelevantIds = [currentUser.id, ...supervisedAgentIds];
    
    return incidents.filter(incident => 
      allRelevantIds.includes(incident.reported_by) || 
      allRelevantIds.includes(incident.assigned_to || '')
    );
  }
  
  // Les autres utilisateurs voient uniquement leurs propres incidents
  return incidents.filter(incident => 
    incident.reported_by === currentUser.id || 
    incident.assigned_to === currentUser.id
  );
};

/**
 * Filtre les visiteurs selon le rôle de l'utilisateur
 */
export const filterVisitorsByRole = (
  visitors: Visitor[],
  currentUser: User,
  users: Users
): Visitor[] => {
  if (currentUser.role === 'superadmin') {
    return visitors;
  }
  
  if (['superviseur_agent_securite', 'superviseur_qhse', 'secretaire'].includes(currentUser.role)) {
    // Les superviseurs sécurité et secrétaires voient tous les visiteurs
    return visitors;
  }
  
  if (['superviseur_agent_entretien', 'superviseur_technicien'].includes(currentUser.role)) {
    // Ces superviseurs ne voient pas les visiteurs (pas dans leur domaine)
    return [];
  }
  
  // Les autres utilisateurs ne voient pas les visiteurs
  return [];
};

/**
 * Filtre les tâches planifiées selon le rôle de l'utilisateur
 */
export const filterPlannedTasksByRole = (
  plannedTasks: PlannedTask[],
  currentUser: User,
  users: Users
): PlannedTask[] => {
  if (currentUser.role === 'superadmin') {
    return plannedTasks;
  }
  
  if (['superviseur_agent_securite', 'superviseur_agent_entretien', 'superviseur_technicien', 'superviseur_qhse'].includes(currentUser.role)) {
    const supervisedAgentIds = getSupervisedAgents(currentUser.role, users);
    const allRelevantIds = [currentUser.id, ...supervisedAgentIds];
    
    return plannedTasks.filter(task => 
      allRelevantIds.includes(task.assigned_to || '') ||
      allRelevantIds.includes(task.created_by || '')
    );
  }
  
  return plannedTasks.filter(task => 
    task.assigned_to === currentUser.id || 
    task.created_by === currentUser.id
  );
};

/**
 * Filtre les tâches de maintenance selon le rôle de l'utilisateur
 */
export const filterMaintenanceTasksByRole = (
  maintenanceTasks: MaintenanceTask[],
  currentUser: User,
  users: Users
): MaintenanceTask[] => {
  if (currentUser.role === 'superadmin') {
    return maintenanceTasks;
  }
  
  if (['superviseur_technicien', 'superviseur_qhse', 'biomedical', 'technicien'].includes(currentUser.role)) {
    // Ces rôles voient toutes les tâches de maintenance
    return maintenanceTasks;
  }
  
  // Les autres utilisateurs ne voient pas les tâches de maintenance
  return [];
};

/**
 * Filtre les réservations selon le rôle de l'utilisateur
 */
export const filterBookingsByRole = (
  bookings: Booking[],
  currentUser: User
): Booking[] => {
  if (currentUser.role === 'superadmin') {
    return bookings;
  }
  
  if (['secretaire', 'superviseur_qhse'].includes(currentUser.role)) {
    // Les secrétaires et superviseurs QHSE voient toutes les réservations
    return bookings;
  }
  
  if (['medecin'].includes(currentUser.role)) {
    // Les médecins voient leurs propres réservations
    return bookings.filter(booking => booking.doctor_id === currentUser.id);
  }
  
  // Les autres utilisateurs ne voient pas les réservations
  return [];
};

/**
 * Filtre les équipements biomédicaux selon le rôle de l'utilisateur
 */
export const filterBiomedicalEquipmentByRole = (
  equipment: BiomedicalEquipment[],
  currentUser: User
): BiomedicalEquipment[] => {
  if (currentUser.role === 'superadmin') {
    return equipment;
  }
  
  if (['biomedical', 'technicien', 'superviseur_technicien', 'superviseur_qhse'].includes(currentUser.role)) {
    // Ces rôles voient tous les équipements
    return equipment;
  }
  
  // Les autres utilisateurs ne voient pas les équipements
  return [];
};



