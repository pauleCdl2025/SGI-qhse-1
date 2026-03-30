export type UserRole =
  | 'agent_securite'
  | 'agent_entretien'
  | 'technicien'
  | 'superviseur_qhse'
  | 'assistante_qhse'
  | 'superadmin'
  | 'secretaire'
  | 'superviseur_agent_securite'
  | 'superviseur_agent_entretien'
  | 'superviseur_technicien'
  | 'administrateur_reseau'
  | 'medecin'
  | 'biomedical'
  | 'dop'
  | 'employe'
  | 'buandiere'
  | 'technicien_polyvalent';

export type Civility = 'M.' | 'Mme' | 'Mlle';

export interface User {
  id: string; // Supabase auth.users ID
  username: string;
  first_name: string; // From Supabase profiles
  last_name: string; // From Supabase profiles
  name: string; // Derived from first_name and last_name for display
  civility: Civility;
  email: string;
  position: string; // Maps to 'service' in Supabase profiles
  role: UserRole;
  pin?: string;
  password?: string; // Added for user creation, not stored in profile
  added_permissions?: string[]; // Stored as JSONB in DB if needed
  removed_permissions?: string[]; // Stored as JSONB in DB if needed
}

export interface Users {
  [username: string]: User;
}

export type IncidentType = 'agression' | 'vol' | 'intrusion' | 'technique' | 'autre' | 'nettoyage' | 'sanitaire' | 'dechets' | 'hygiene' | 'materiel' | 'electrique' | 'plomberie' | 'climatisation' | 'equipement-medical' | 'informatique' | 'maintenance-preventive';
export type IncidentStatus = 'nouveau' | 'cours' | 'traite' | 'resolu' | 'attente';
export type IncidentPriority = 'faible' | 'moyenne' | 'haute' | 'critique';
export type IncidentService = 'securite' | 'entretien' | 'technique' | 'biomedical';

export interface InterventionReport {
  time_spent: number;
  actions_taken: string;
  materials_used?: string;
  recommendations?: string;
  report_date: Date;
  technician_name: string;
}

export interface IncidentComment {
  id: string;
  incident_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  created_at: Date;
  updated_at?: Date;
}

export interface Incident {
  id: string;
  type: IncidentType;
  description: string;
  date_creation: Date;
  reported_by: string; // User ID of the reporter
  statut: IncidentStatus;
  priorite: IncidentPriority;
  service: IncidentService;
  lieu: string;
  photo_urls?: string[]; // Storing URLs instead of File objects
  assigned_to?: string; // User ID of the assignee
  assigned_to_name?: string;
  prestataire?: string; // Nom du prestataire (pour technicien polyvalent)
  deadline?: Date;
  report?: InterventionReport; // Stored as JSONB in DB
  comments?: IncidentComment[]; // Commentaires/réponses sur le ticket
}

export interface Visitor {
  id: string;
  full_name: string;
  id_document: string;
  reason: string;
  destination: string; // Renamed from 'room' to 'destination' to match DB schema
  person_to_see?: string;
  entry_time: Date;
  exit_time?: Date;
  registered_by: string; // User ID of the registrar
  // Champs complémentaires pour la gestion des accès
  company?: string;              // Société / Organisme
  visit_type?: string;           // Type (visiteur, prestataire, etc.)
  id_verified?: boolean;         // Pièce d'identité vérifiée ?
  badge_code?: string;           // Code du badge remis
  entry_signature?: string;      // Signature entrée
  exit_signature?: string;       // Signature sortie
  access_observations?: string;  // Observations
}

export type BiomedicalEquipmentStatus = 'opérationnel' | 'en_maintenance' | 'hors_service';

export interface BiomedicalEquipment {
  id: string;
  name: string;
  model?: string;
  serial_number: string;
  department?: string;
  location: string;
  status: BiomedicalEquipmentStatus;
  last_maintenance?: Date;
  next_maintenance?: Date;
  notes?: string | null;
  created_at: Date;
}

export type MaintenanceTaskStatus = 'planifiée' | 'en_cours' | 'terminée' | 'annulée';
export type MaintenanceTaskType = 'préventive' | 'curative';

export interface MaintenanceTask {
  id: string;
  equipment_id: string;
  type: MaintenanceTaskType;
  description: string;
  technician_id: string | null;
  scheduled_date: Date;
  supplier_name?: string | null;
  supplier_phone?: string | null;
  comments?: string | null;
  status: MaintenanceTaskStatus;
  created_at: Date;
}

export interface Notification {
  id: string;
  recipient_id: string; // User ID of the recipient
  message: string;
  read: boolean;
  created_at: Date;
  link?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  location: string;
  doctor_in_charge?: string;
  created_at: Date;
}

export type BookingStatus = 'réservé' | 'en_cours' | 'terminé';

export interface Booking {
  id: string;
  room_id: string;
  title: string;
  booked_by: string; // User ID of the booker
  start_time: Date;
  end_time: Date;
  doctor_id?: string;
  status: BookingStatus;
  created_at: Date;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  status: 'Résident' | 'Garde' | 'Vacataire' | 'Interne';
  created_at: Date;
}

export type PlannedTaskStatus = 'à faire' | 'en_cours' | 'terminée' | 'annulée';

export interface PlannedTask {
  id: string;
  title: string;
  description: string;
  assigned_to: string; // User ID of agent
  assignee_name?: string;
  created_by: string; // User ID of supervisor/admin
  due_date: Date;
  status: PlannedTaskStatus;
  created_at: Date;
}

export interface Checkpoint {
  id: string;
  name: string;
  location: string;
  barcode_data: string;
  created_at: Date;
}

export interface RoundLog {
  id: string;
  agent_id: string;
  checkpoint_id: string;
  scanned_at: Date;
}

// =====================================================
// NOUVEAUX TYPES POUR LES MODULES QHSE
// =====================================================

// 1. GESTION DOCUMENTAIRE (GED QHSE)
export type DocumentType = 'procedure' | 'instruction' | 'registre' | 'rapport' | 'audit' | 'formation' | 'autre' | 'POL' | 'PROC' | 'PROT' | 'FP' | 'FT' | 'FORM' | 'ANN';
export type DocumentStatus = 'brouillon' | 'en_validation' | 'validé' | 'obsolète' | 'archivé';
export type AccessLevel = 'public' | 'interne' | 'confidentiel';

export interface QHSEDocument {
  id: string;
  title: string;
  code?: string;
  document_type: DocumentType;
  processus?: string;
  sous_processus?: string;
  category: string;
  version: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  status: DocumentStatus;
  created_by: string;
  validated_by?: string;
  revision_responsible?: string;
  validation_date?: Date;
  effective_date?: Date;
  review_date?: Date;
  validity_date?: Date;
  archived_at?: Date;
  access_level: AccessLevel;
  is_displayed?: boolean;
  display_location?: string;
  lifecycle_note?: string;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface DocumentRevision {
  id: string;
  document_id: string;
  version: string;
  change_description?: string;
  file_path?: string;
  revised_by: string;
  revision_date: Date;
}

// 2. AUDITS & INSPECTIONS
export type AuditType = 'interne' | 'externe' | 'certification' | 'inspection';
export type AuditStatus = 'planifié' | 'en_cours' | 'terminé' | 'annulé';
export type ComplianceStatus = 'conforme' | 'non_conforme' | 'non_applicable' | 'non_évalué';
export type NonConformitySeverity = 'mineure' | 'majeure' | 'critique';
export type NonConformityStatus = 'ouvert' | 'en_cours' | 'fermé' | 'verifié';

export interface Audit {
  id: string;
  title: string;
  audit_type: AuditType;
  scope: string;
  planned_date: Date;
  actual_date?: Date;
  auditor_id?: string;
  audited_department?: string;
  status: AuditStatus;
  findings?: any;
  non_conformities_count: number;
  conformities_count: number;
  opportunities_count: number;
  report_path?: string;
  recurrence_type?: 'aucune' | 'quotidienne' | 'hebdomadaire' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';
  recurrence_interval?: number;
  next_audit_date?: Date;
  reminder_days_before?: number;
  auto_generate_report?: boolean;
  report_generation_date?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface NonConformity {
  id: string;
  audit_id?: string;
  incident_id?: string;
  title: string;
  description: string;
  severity: NonConformitySeverity;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  assigned_to?: string;
  due_date?: Date;
  status: NonConformityStatus;
  verification_date?: Date;
  verified_by?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuditChecklist {
  id: string;
  audit_id: string;
  question: string;
  requirement?: string;
  compliance_status: ComplianceStatus;
  observation?: string;
  photo_urls?: string[];
  checked_by?: string;
  checked_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface AuditActionPlan {
  id: string;
  audit_id: string;
  finding_id?: string;
  title: string;
  description: string;
  action_type: 'corrective' | 'preventive' | 'amelioration';
  priority: 'faible' | 'moyenne' | 'haute' | 'critique';
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: Date;
  status: 'planifié' | 'en_cours' | 'terminé' | 'verifié' | 'annulé';
  completion_date?: Date;
  verification_date?: Date;
  verified_by?: string;
  verified_by_name?: string;
  notes?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// GESTION DES TRAVAUX
export type WorkType = 'maintenance' | 'reparation' | 'renovation' | 'construction' | 'amelioration' | 'autre';
export type WorkStatus = 'planifié' | 'en_cours' | 'en_pause' | 'terminé' | 'annulé';

export interface Work {
  id: string;
  title: string;
  description: string;
  work_type: WorkType;
  location?: string;
  priority: 'faible' | 'moyenne' | 'haute' | 'critique';
  status: WorkStatus;
  assigned_to?: string;
  assigned_to_name?: string;
  planned_start_date?: Date;
  planned_end_date?: Date;
  actual_start_date?: Date;
  actual_end_date?: Date;
  estimated_cost?: number;
  actual_cost?: number;
  supplier_name?: string;
  supplier_contact?: string;
  notes?: string;
  photo_urls?: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// 3. FORMATIONS & COMPÉTENCES
export type TrainingType = 'interne' | 'externe' | 'en_ligne' | 'présentiel';
export type TrainingStatus = 'planifiée' | 'en_cours' | 'terminée' | 'annulée';
export type RegistrationStatus = 'inscrit' | 'présent' | 'absent' | 'excused';
export type SkillLevel = 'débutant' | 'intermédiaire' | 'avancé' | 'expert';

export interface Training {
  id: string;
  title: string;
  category: string;
  description?: string;
  trainer?: string;
  training_type: TrainingType;
  duration_hours?: number;
  location?: string;
  planned_date?: Date;
  actual_date?: Date;
  status: TrainingStatus;
  max_participants?: number;
  certificate_required: boolean;
  validity_months?: number;
  prestataire?: string; // Nom du prestataire
  prestataire_evaluation?: string; // Évaluation du prestataire (commentaire)
  prestataire_note?: number; // Note du prestataire (sur 5 ou 10)
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface TrainingParticipation {
  id: string;
  training_id: string;
  participant_id?: string;
  participant_name?: string;
  participant_display_name?: string;
  registration_status: RegistrationStatus;
  attendance_date?: Date;
  score?: number;
  passed: boolean;
  certificate_number?: string;
  certificate_issued_date?: Date;
  certificate_expiry_date?: Date;
  comments?: string;
  registered_by: string;
  created_at: Date;
  updated_at: Date;
  training_title?: string;
  training_category?: string;
  participant_first_name?: string;
  participant_last_name?: string;
  participant_role?: UserRole;
}

export interface Competency {
  id: string;
  employee_id: string;
  skill_name: string;
  skill_category?: string;
  level: SkillLevel;
  certification_number?: string;
  issued_date?: Date;
  expiry_date?: Date;
  issuing_authority?: string;
  verified: boolean;
  verified_by?: string;
  verification_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  employee_first_name?: string;
  employee_last_name?: string;
  employee_role?: UserRole;
}

// 4. SUIVI DES DÉCHETS MÉDICAUX
export type WasteType = 'DASRI' | 'médicamenteux' | 'chimique' | 'radioactif' | 'autre';
export type WasteUnit = 'kg' | 'litre' | 'unité';
export type WasteStatus = 'collecté' | 'stocké' | 'traité' | 'éliminé';
export type WasteStep = 'collecte' | 'transport' | 'traitement' | 'élimination';

export interface MedicalWaste {
  id: string;
  waste_type: WasteType;
  category?: string;
  quantity: number;
  unit: WasteUnit;
  collection_date: Date;
  collection_location: string;
  producer_service?: string;
  waste_code?: string;
  treatment_method?: string;
  treatment_company?: string;
  treatment_date?: Date;
  tracking_number?: string;
  certificate_number?: string;
  status: WasteStatus;
  handled_by?: string;
  registered_by: string;
  notes?: string;
  photo_urls?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface WasteTracking {
  id: string;
  waste_id: string;
  step: WasteStep;
  location?: string;
  handler_name?: string;
  handler_signature?: string;
  timestamp: Date;
  notes?: string;
}

// 5. SUIVI STÉRILISATION & LINGE
export type SterilizerType = 'autoclave' | 'ETO' | 'plasma' | 'peroxyde';
export type CycleType = 'stérilisation' | 'désinfection' | 'préventif';
export type CycleStatus = 'en_cours' | 'terminé' | 'échoué' | 'annulé';
export type CycleResult = 'conforme' | 'non_conforme' | 'en_attente';
export type IndicatorResult = 'conforme' | 'non_conforme' | 'non_testé';
export type LaundryType = 'blouse' | 'drap' | 'champ_operatoire' | 'autre';
export type LaundryStatus = 'collecté' | 'en_lavage' | 'stérilisé' | 'distribué' | 'rejeté';
export type ItemStatus = 'stérilisé' | 'utilisé' | 'expiré' | 'rejeté';

export interface SterilizationCycle {
  id: string;
  cycle_number: string;
  sterilizer_id: string;
  sterilizer_type: SterilizerType;
  cycle_type: CycleType;
  program_name?: string;
  start_time: Date;
  end_time?: Date;
  duration_minutes?: number;
  temperature?: number;
  pressure?: number;
  operator_id: string;
  status: CycleStatus;
  result: CycleResult;
  biological_indicator_result: IndicatorResult;
  chemical_indicator_result: IndicatorResult;
  non_conformity_reason?: string;
  batch_number?: string;
  items_count: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SterilizedItem {
  id: string;
  cycle_id: string;
  item_name: string;
  item_code?: string;
  lot_number?: string;
  quantity: number;
  location?: string;
  expiry_date?: Date;
  used_date?: Date;
  used_by?: string;
  status: ItemStatus;
  created_at: Date;
}

export interface LaundryTracking {
  id: string;
  batch_number: string;
  laundry_type: LaundryType;
  quantity: number;
  collection_date: Date;
  collection_location?: string;
  washing_date?: Date;
  washing_method?: string;
  sterilization_date?: Date;
  sterilization_cycle_id?: string;
  distribution_date?: Date;
  distribution_location?: string;
  status: LaundryStatus;
  handler_id?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// 6. GESTION DES RISQUES
export type RiskCategory = 'biologique' | 'chimique' | 'physique' | 'ergonomique' | 'psychosocial' | 'sécurité' | 'environnemental' | 'autre';
export type ProbabilityLevel = 'très_faible' | 'faible' | 'moyenne' | 'élevée' | 'très_élevée';
export type SeverityLevel = 'négligeable' | 'faible' | 'modérée' | 'importante' | 'critique';
export type RiskLevel = 'très_faible' | 'faible' | 'moyen' | 'élevé' | 'très_élevé';
export type RiskStatus = 'identifié' | 'évalué' | 'en_traitement' | 'traité' | 'surveillé';
export type ActionType = 'prévention' | 'mitigation' | 'transfert' | 'acceptation';
export type ActionStatus = 'planifiée' | 'en_cours' | 'terminée' | 'annulée';
export type EffectivenessLevel = 'très_élevée' | 'élevée' | 'moyenne' | 'faible';

export interface Risk {
  id: string;
  title: string;
  description: string;
  risk_category: RiskCategory;
  poste?: string; // Poste/service concerné par le risque
  risk_source?: string;
  probability: ProbabilityLevel;
  severity: SeverityLevel;
  risk_level: RiskLevel;
  current_controls?: string;
  residual_probability?: ProbabilityLevel;
  residual_severity?: SeverityLevel;
  residual_risk_level?: RiskLevel;
  treatment_plan?: string;
  action_plan?: string;
  responsible_person?: string;
  due_date?: Date;
  status: RiskStatus;
  review_date?: Date;
  last_review_date?: Date;
  reviewed_by?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface RiskAction {
  id: string;
  risk_id: string;
  action_title: string;
  action_description?: string;
  action_type: ActionType;
  action_status: ActionStatus;
  responsible_person?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: Date;
  completion_date?: Date;
  effectiveness_level?: EffectivenessLevel;
  notes?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// 7. AMÉLIORATION DES INCIDENTS (CAPA)
export type CAPAStatus = 'non_défini' | 'en_cours' | 'terminé' | 'vérifié';

// Extension de l'interface Incident existante
export interface EnhancedIncident extends Incident {
  corrective_action?: string;
  preventive_action?: string;
  root_cause?: string;
  capa_status?: CAPAStatus;
  capa_due_date?: Date;
  capa_completed_date?: Date;
  recurrence_count?: number;
}

// 8. REPORTING & EXPORTATION
export type ReportType = 'incidents' | 'audits' | 'formations' | 'déchets' | 'stérilisation' | 'risques' | 'conformité' | 'personnalisé';
export type PeriodType = 'quotidien' | 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'annuel' | 'personnalisé';
export type ReportFormat = 'pdf' | 'excel' | 'word';
export type ReportStatus = 'en_cours' | 'terminé' | 'échoué';

export interface Report {
  id: string;
  title: string;
  report_type: ReportType;
  period_type: PeriodType;
  start_date: Date;
  end_date: Date;
  filters?: any;
  generated_by: string;
  file_path?: string;
  file_format: ReportFormat;
  status: ReportStatus;
  generated_at: Date;
}

// 9. RONDES QUOTIDIENNES
export type RoundType = 'biomedical' | 'technicien_polyvalent' | 'reseau';
export type RoundStatus = 'en_cours' | 'terminée' | 'annulée';
export type ChecklistItemType = 'checkbox' | 'text' | 'number' | 'select';

// Types pour les Accidents d'Exposition au Sang (AES)
export type AgentStatut = 'Personnel' | 'Stagiaire' | 'Prestataire';
export type TypeExposition = 'Piqure' | 'Coupure' | 'Projection muqueuse' | 'Contact peau lésée';

export interface AES {
  id: string;
  // A. Identification de l'agent exposé
  agent_nom: string;
  agent_prenom: string;
  agent_matricule?: string;
  agent_fonction?: string;
  agent_service?: string;
  agent_telephone?: string;
  agent_statut: AgentStatut;
  
  // B. Informations sur l'accident
  date_aes: Date;
  heure_aes: string; // Format HH:mm
  lieu_precis?: string;
  type_exposition: TypeExposition;
  description_circonstances?: string;
  
  // C. Matériel ou produit en cause
  type_dispositif?: string;
  usage_unique?: boolean;
  souille_sang?: boolean;
  dans_sac_dasri?: boolean;
  
  // D. Patient source
  patient_source_identifiee?: boolean;
  patient_code_identifiant?: string;
  consentement_prelevement?: boolean;
  
  // E. Gestes immédiats
  lavage_eau_savon?: boolean;
  desinfection?: boolean;
  rinçage_muqueuse?: boolean;
  heure_premiers_soins?: string; // Format HH:mm
  
  // F. Prise en charge médicale
  medecin_referent_aes?: string;
  examen_vih?: boolean;
  examen_vhb?: boolean;
  examen_vhc?: boolean;
  traitement_arv_initie?: boolean;
  date_debut_traitement?: Date;
  
  // G. Résultats biologiques
  resultat_agent_vih?: boolean;
  resultat_agent_vhb?: boolean;
  resultat_agent_vhc?: boolean;
  resultat_patient_vih?: boolean;
  resultat_patient_vhb?: boolean;
  resultat_patient_vhc?: boolean;
  conduite_tenir?: string;
  
  // H. Suivi et accompagnement
  orientation_infectiologue?: boolean;
  orientation_psychologue?: boolean;
  dates_suivi_prevues?: string; // JSON array ou texte
  
  // I. Suivi médical
  suivi_m1_date?: Date;
  suivi_m1_vih?: boolean;
  suivi_m1_vhb?: boolean;
  suivi_m1_vhc?: boolean;
  suivi_m6_date?: Date;
  suivi_m6_vih?: boolean;
  suivi_m6_vhb?: boolean;
  suivi_m6_vhc?: boolean;
  suivi_m9_date?: Date;
  suivi_m9_vih?: boolean;
  suivi_m9_vhb?: boolean;
  suivi_m9_vhc?: boolean;
  
  // J. Clôture QHSE
  dossier_cloture: boolean;
  date_cloture?: Date;
  nom_signature_qhse?: string;
  
  // K. Colonnes supplémentaires pour le tableau de suivi
  numero_aes?: number;
  port_epi?: boolean;
  declaration_immediate?: boolean;
  date_declaration?: Date;
  prise_charge_immediate?: boolean;
  inscription_sentimed?: boolean;
  bon_examen_prescrit?: boolean;
  matricule_sentimed?: string;
  date_prise_resultat?: Date;
  suivi_m3_date?: Date;
  suivi_m3_vhb?: boolean;
  suivi_m3_vhc?: boolean;
  observations?: string;
  
  // Métadonnées
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface RoundChecklistTemplate {
  id: string;
  round_type: RoundType;
  title: string;
  description?: string;
  item_order: number;
  is_required: boolean;
  item_type: ChecklistItemType;
  options?: string[]; // Pour les items de type select
  created_at?: Date;
  updated_at?: Date;
}

export interface DailyRound {
  id: string;
  technician_id: string;
  technician_name?: string;
  round_type: RoundType;
  round_date: Date;
  start_time?: Date;
  end_time?: Date;
  status: RoundStatus;
  notes?: string;
  photo_urls?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export type EquipmentStatus = 'bon_état' | 'défectueux';

export interface RoundChecklistResponse {
  id: string;
  round_id: string;
  template_id: string;
  template?: RoundChecklistTemplate;
  response_value?: string; // Pour les réponses textuelles ou numériques
  is_checked: boolean; // Pour les checkboxes
  equipment_status?: EquipmentStatus; // État de l'équipement (bon_état / défectueux) - pour les rondes biomédicales
  equipment_name?: string; // Nom/identification de l'équipement - pour les rondes biomédicales
  service_name?: string; // Service/location de l'équipement - pour les rondes biomédicales
  observation?: string;
  photo_urls?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface DailyRoundWithResponses extends DailyRound {
  responses?: RoundChecklistResponse[];
}

export type CameraAccessRequestStatus = 'en_attente' | 'approuve' | 'refuse' | 'annule';

export interface CameraAccessRequest {
  id: string;
  requester_id: string;
  requester_name?: string;
  requester_service?: string;
  requester_position?: string;
  request_date: Date;
  access_reason: string;
  access_start_date: Date;
  access_end_date: Date;
  access_start_time?: string;
  access_end_time?: string;
  camera_zones?: string; // Zones/caméras concernées
  hierarchical_authorization?: string; // Nom du responsable qui autorise
  hierarchical_authorization_date?: Date;
  status: CameraAccessRequestStatus;
  notes?: string;
  qhse_validation?: string; // Nom du responsable QHSE qui valide
  qhse_validation_date?: Date; // Date de validation QHSE
  requester_signature?: string; // Signature du demandeur
  created_at?: Date;
  updated_at?: Date;
}