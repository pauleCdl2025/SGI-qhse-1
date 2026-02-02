import { UserRole } from '@/types';

export const allPermissions = [
  { id: 'portalSuperadmin', name: 'Mon Portail', icon: 'Home' },
  { id: 'portalAgentSecurite', name: 'Mon Portail', icon: 'Home' },
  { id: 'portalAgentEntretien', name: 'Mon Portail', icon: 'Home' },
  { id: 'portalSuperviseurQHSE', name: 'Mon Portail', icon: 'Home' },
  { id: 'portalSuperviseurSecurite', name: 'Mon Portail', icon: 'Home' },
  { id: 'portalUser', name: 'Mon Portail', icon: 'Home' },
  { id: 'portalBiomedical', name: 'Portail Biomédical', icon: 'HeartPulse' },
  { id: 'portalMedecin', name: 'Mon Portail', icon: 'Home' },
  { id: 'portalSecretaire', name: 'Mon Portail', icon: 'Home' },
  { id: 'portalBuanderie', name: 'Portail Buanderie', icon: 'Shirt' },
  { id: 'portalTechnicienPolyvalent', name: 'Portail Technicien Polyvalent', icon: 'Wrench' },
  { id: 'dashboardSuperadmin', name: 'Dashboard Superadmin', icon: 'Crown' },
  { id: 'dashboardSecurite', name: 'Dashboard Sécurité', icon: 'Shield' },
  { id: 'dashboardEntretien', name: 'Dashboard Entretien', icon: 'SprayCan' },
  { id: 'dashboardTechnicien', name: 'Dashboard Technicien', icon: 'Wrench' },
  { id: 'dashboardQHSE', name: 'Dashboard QHSE', icon: 'UserCog' },
  { id: 'qhseTickets', name: 'Gestion Tickets', icon: 'Ticket' },
  { id: 'reportIncident', name: 'Signaler Incident', icon: 'AlertCircle' },
  { id: 'reportSecurityIncident', name: 'Signaler un Incident de Sécurité', icon: 'Shield' },
  { id: 'reportMaintenanceIncident', name: 'Signaler un Incident d\'Entretien', icon: 'SprayCan' },
  { id: 'reportBiomedicalIncident', name: 'Déclarer Équipement HS', icon: 'Stethoscope' },
  { id: 'visitorLog', name: 'Registre Visiteurs', icon: 'BookUser' },
  { id: 'biomedical', name: 'Biomédical', icon: 'HeartPulse' },
  { id: 'planningSalles', name: 'Planning Salles', icon: 'Calendar' },
  { id: 'doctors', name: 'Annuaire Médecins', icon: 'Stethoscope' },
  { id: 'settings', name: 'Gestion Utilisateurs', icon: 'Settings' },
  { id: 'securityIncidents', name: 'Liste Incidents Sécurité', icon: 'ListChecks' },
  { id: 'maintenanceHistory', name: 'Historique Entretien', icon: 'History' },
  { id: 'myTasks', name: 'Mes Tâches', icon: 'ClipboardList' },
  { id: 'planningTasks', name: 'Planning Tâches', icon: 'CalendarPlus' },
  { id: 'personalInfo', name: 'Mes Infos', icon: 'User' },
  { id: 'kpiDashboard', name: 'KPIs', icon: 'BarChart' },
  { id: 'globalRoomOverview', name: 'Vue Globale Salles', icon: 'MapPin' },
  // Modules QHSE
  { id: 'qhseAudits', name: 'Audits & Inspections', icon: 'ClipboardCheck' },
  { id: 'qhseTrainings', name: 'Formations & Compétences', icon: 'GraduationCap' },
  { id: 'qhseWaste', name: 'Déchets Médicaux', icon: 'Trash2' },
  { id: 'qhseSterilization', name: 'Stérilisation & Linge', icon: 'Droplet' },
  { id: 'qhseSterilizationRegister', name: 'Registre Stérilisation', icon: 'FileCheck' },
  { id: 'qhseLaundry', name: 'Suivi Buanderie', icon: 'Shirt' },
  { id: 'qhseRisks', name: 'Gestion des Risques', icon: 'AlertTriangle' },
  { id: 'qhseReports', name: 'Reporting & Exportation', icon: 'FileBarChart' },
  { id: 'dailyRoundsBiomedical', name: 'Rondes Quotidiennes Biomédical', icon: 'ClipboardCheck' },
  { id: 'dailyRoundsPolyvalent', name: 'Rondes Quotidiennes Polyvalent', icon: 'ClipboardCheck' },
  { id: 'dailyRoundsView', name: 'Consultation des Rondes', icon: 'ClipboardCheck' },
];

const findPerms = (ids: string[]) => allPermissions.filter(p => ids.includes(p.id));

export const roleConfig: Record<UserRole, { id: string; name: string; icon: string; }[]> = {
  superadmin: [
    { id: 'portalSuperadmin', name: 'Mon Portail', icon: 'Home' },
    { id: 'portalBiomedical', name: 'Portail Biomédical', icon: 'HeartPulse' },
    ...allPermissions.filter(p => !p.id.startsWith('portal'))
  ],
  superviseur_qhse: [
    { id: 'portalSuperviseurQHSE', name: 'Mon Portail', icon: 'Home' },
    ...findPerms(['dashboardQHSE', 'qhseTickets', 'planningSalles', 'doctors', 'planningTasks', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident', 'kpiDashboard', 'personalInfo', 'globalRoomOverview', 'qhseAudits', 'qhseTrainings', 'qhseWaste', 'qhseSterilization', 'qhseSterilizationRegister', 'qhseLaundry', 'qhseRisks', 'qhseReports', 'dailyRoundsView'])
  ],
  secretaire: [{ id: 'portalSecretaire', name: 'Mon Portail', icon: 'Home' }, ...findPerms(['planningSalles', 'visitorLog', 'doctors', 'personalInfo', 'globalRoomOverview', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident'])],
  medecin: [{ id: 'portalMedecin', name: 'Mon Portail', icon: 'Home' }, ...findPerms(['planningSalles', 'personalInfo', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident'])],
  superviseur_agent_securite: [{ id: 'portalSuperviseurSecurite', name: 'Mon Portail', icon: 'Home' }, ...findPerms(['dashboardSecurite', 'securityIncidents', 'visitorLog', 'planningTasks', 'personalInfo', 'reportIncident', 'reportSecurityIncident', 'reportMaintenanceIncident', 'reportBiomedicalIncident'])],
  agent_securite: [{ id: 'portalAgentSecurite', name: 'Mon Portail', icon: 'Home' }, ...findPerms(['dashboardSecurite', 'reportSecurityIncident', 'reportMaintenanceIncident', 'reportBiomedicalIncident', 'securityIncidents', 'visitorLog', 'myTasks', 'personalInfo'])],
  // Superviseur agent entretien utilise désormais le portail superviseur QHSE
  superviseur_agent_entretien: [{ id: 'portalSuperviseurQHSE', name: 'Mon Portail', icon: 'Home' }, ...findPerms(['dashboardEntretien', 'dashboardQHSE', 'qhseTickets', 'maintenanceHistory', 'planningTasks', 'personalInfo', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident'])],
  agent_entretien: [{ id: 'portalAgentEntretien', name: 'Mon Portail', icon: 'Home' }, ...findPerms(['dashboardEntretien', 'dashboardQHSE', 'qhseTickets', 'maintenanceHistory', 'myTasks', 'personalInfo', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident'])],
  // Superviseur technicien utilise également le portail superviseur QHSE
  superviseur_technicien: [
    { id: 'portalSuperviseurQHSE', name: 'Mon Portail', icon: 'Home' },
    ...findPerms(['dashboardTechnicien', 'dashboardQHSE', 'qhseTickets', 'biomedical', 'planningTasks', 'personalInfo', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident'])
  ],
  technicien: [
    // Le portail Technicien dédié n'existe plus, le technicien utilise le portail Biomédical
    { id: 'portalBiomedical', name: 'Portail Biomédical', icon: 'HeartPulse' },
    ...findPerms(['dashboardTechnicien', 'dashboardQHSE', 'qhseTickets', 'biomedical', 'myTasks', 'personalInfo', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident'])
  ],
  biomedical: [
    { id: 'portalBiomedical', name: 'Portail Biomédical', icon: 'HeartPulse' },
    ...findPerms(['biomedical', 'maintenanceHistory', 'planningTasks', 'kpiDashboard', 'personalInfo', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident', 'dailyRoundsBiomedical'])
  ],
  dop: [
    ...findPerms(['dashboardQHSE', 'personalInfo', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident'])
  ],
  // Nouveau rôle employé pour déclarer des incidents et consulter ses informations
  employe: [
    { id: 'portalUser', name: 'Mon Portail', icon: 'Home' },
    ...findPerms(['reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident', 'myTasks', 'personalInfo'])
  ],
  // Rôle buandière pour gérer le suivi du linge
  buandiere: [
    { id: 'portalBuanderie', name: 'Portail Buanderie', icon: 'Shirt' },
    ...findPerms(['qhseLaundry', 'personalInfo', 'reportIncident', 'reportSecurityIncident', 'reportBiomedicalIncident'])
  ],
  // Rôle technicien polyvalent (homme à tout faire)
  technicien_polyvalent: [
    { id: 'portalTechnicienPolyvalent', name: 'Portail Technicien Polyvalent', icon: 'Wrench' },
    ...findPerms(['maintenanceHistory', 'myTasks', 'planningTasks', 'personalInfo', 'qhseTickets', 'dailyRoundsPolyvalent'])
  ],
};

export const visitorDestinations = [
    { label: "Accueil & Services Généraux", options: ["Accueil", "Administration", "Direction"] },
    { label: "Consultations", options: ["Consultation Générale", "Consultation Spécialisée", "Pédiatrie", "Gynécologie"] },
    { label: "Services Techniques", options: ["Imagerie Médicale", "Laboratoire", "Bloc Opératoire"] },
    { label: "Hospitalisation", options: ["Hospitalisation 1er étage", "Hospitalisation 2e étage", "Maternité"] },
];

export const visitReasons = [
    "Consultation",
    "Visite à un patient",
    "Livraison",
    "Rendez-vous professionnel",
    "Maintenance",
    "Autre",
];

export const bookingReasons = [
    "Consultation",
    "Réunion d'équipe",
    "Formation",
    "Intervention",
    "Entretien",
    "Autre",
];