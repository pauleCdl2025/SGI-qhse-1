-- Base de données MySQL pour remplacer Supabase
-- Exécutez ce script dans votre base de données WAMP

CREATE DATABASE IF NOT EXISTS hospital_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospital_management;

-- Table des utilisateurs/profils
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(191) UNIQUE NOT NULL,
    email VARCHAR(191) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    civility ENUM('M.', 'Mme', 'Mlle'),
    service VARCHAR(255),
    role ENUM(
        'agent_securite', 
        'agent_entretien', 
        'technicien', 
        'superviseur_qhse', 
        'superadmin',
        'secretaire', 
        'superviseur_agent_securite', 
        'superviseur_agent_entretien',
        'superviseur_technicien', 
        'medecin',
        'dop',
        'biomedical',
        'Infirmier',
        'buandiere',
        'employe',
        'technicien_polyvalent'
    ) NOT NULL,
    pin VARCHAR(255) NULL,
    added_permissions JSON DEFAULT NULL,
    removed_permissions JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des incidents
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    description TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reported_by VARCHAR(36),
    statut ENUM('nouveau', 'attente', 'cours', 'traite', 'resolu') DEFAULT 'nouveau',
    priorite ENUM('faible', 'moyenne', 'haute', 'critique') DEFAULT 'moyenne',
    service VARCHAR(255),
    lieu VARCHAR(255),
    photo_urls JSON DEFAULT NULL,
    assigned_to VARCHAR(36),
    assigned_to_name VARCHAR(255) NULL,
    deadline TIMESTAMP NULL,
    report JSON DEFAULT NULL,
    FOREIGN KEY (reported_by) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Table des visiteurs
CREATE TABLE IF NOT EXISTS visitors (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    id_document VARCHAR(255) NOT NULL,
    reason TEXT,
    destination VARCHAR(255),
    person_to_see VARCHAR(255),
    company VARCHAR(255) NULL COMMENT 'Société / Organisme',
    visit_type VARCHAR(100) NULL COMMENT 'Type (visiteur, prestataire, etc.)',
    id_verified TINYINT(1) DEFAULT 0 COMMENT 'Pièce d''identité vérifiée ?',
    badge_code VARCHAR(50) NULL COMMENT 'Code du badge remis',
    entry_signature TEXT NULL COMMENT 'Signature entrée',
    exit_signature TEXT NULL COMMENT 'Signature sortie',
    access_observations TEXT NULL COMMENT 'Observations',
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP NULL,
    registered_by VARCHAR(36),
    FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Table des équipements biomédicaux
CREATE TABLE IF NOT EXISTS biomedical_equipment (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    location VARCHAR(255) NOT NULL,
    status ENUM('opérationnel', 'en_maintenance', 'hors_service') DEFAULT 'opérationnel',
    last_maintenance TIMESTAMP NULL,
    next_maintenance TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tâches de maintenance
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id VARCHAR(36) PRIMARY KEY,
    equipment_id VARCHAR(36) NOT NULL,
    type VARCHAR(255) NOT NULL,
    description TEXT,
    technician_id VARCHAR(36),
    scheduled_date TIMESTAMP NOT NULL,
    supplier_name VARCHAR(255) NULL,
    supplier_phone VARCHAR(50) NULL,
    comments TEXT NULL,
    status ENUM('planifiée', 'en_cours', 'terminée', 'annulée') DEFAULT 'planifiée',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES biomedical_equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Table des déchets médicaux
CREATE TABLE IF NOT EXISTS medical_waste (
    id VARCHAR(36) PRIMARY KEY,
    waste_type ENUM('DASRI', 'médicamenteux', 'chimique', 'radioactif', 'autre') NOT NULL,
    category VARCHAR(255) NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit ENUM('kg', 'litre', 'unité') NOT NULL,
    collection_date DATE NOT NULL,
    collection_location VARCHAR(255) NOT NULL,
    producer_service VARCHAR(255) NULL,
    waste_code VARCHAR(255) NULL,
    treatment_method VARCHAR(255) NULL,
    treatment_company VARCHAR(255) NULL,
    treatment_date DATE NULL,
    tracking_number VARCHAR(255) NULL,
    certificate_number VARCHAR(255) NULL,
    status ENUM('collecté', 'stocké', 'traité', 'éliminé') DEFAULT 'collecté',
    handled_by VARCHAR(36) NULL,
    registered_by VARCHAR(36) NOT NULL,
    notes TEXT NULL,
    photo_urls JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (handled_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Table des salles
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    capacity INT,
    location VARCHAR(255) NOT NULL,
    doctor_in_charge VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des médecins
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    status ENUM('disponible', 'occupé', 'absent') DEFAULT 'disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des réservations
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    booked_by VARCHAR(36),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    doctor_id VARCHAR(36),
    status ENUM('réservé', 'en_cours', 'terminé', 'annulé') DEFAULT 'réservé',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (booked_by) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

-- Table des tâches planifiées
CREATE TABLE IF NOT EXISTS planned_tasks (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(36),
    assignee_name VARCHAR(255) NULL,
    created_by VARCHAR(36),
    due_date DATE NOT NULL,
    status ENUM('à faire', 'en_cours', 'terminée', 'annulée') DEFAULT 'à faire',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Table des formations
CREATE TABLE IF NOT EXISTS trainings (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    description TEXT NULL,
    trainer VARCHAR(255) NULL,
    training_type ENUM('interne', 'externe', 'en_ligne', 'présentiel') NOT NULL,
    duration_hours DECIMAL(5, 2) NULL,
    location VARCHAR(255) NULL,
    planned_date DATE NULL,
    actual_date DATE NULL,
    status ENUM('planifiée', 'en_cours', 'terminée', 'annulée') DEFAULT 'planifiée',
    max_participants INT NULL,
    certificate_required BOOLEAN DEFAULT FALSE,
    validity_months INT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS training_participations (
    id VARCHAR(36) PRIMARY KEY,
    training_id VARCHAR(36) NOT NULL,
    participant_id VARCHAR(36) NOT NULL,
    registration_status ENUM('inscrit', 'présent', 'absent', 'excused') DEFAULT 'inscrit',
    attendance_date DATE NULL,
    score DECIMAL(5,2) NULL,
    passed BOOLEAN DEFAULT FALSE,
    certificate_number VARCHAR(255) NULL,
    certificate_issued_date DATE NULL,
    certificate_expiry_date DATE NULL,
    comments TEXT,
    registered_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE KEY unique_training_participant (training_id, participant_id),
    INDEX idx_participant_id (participant_id),
    INDEX idx_certificate_expiry (certificate_expiry_date)
);

CREATE TABLE IF NOT EXISTS competencies (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    skill_name VARCHAR(255) NOT NULL,
    skill_category VARCHAR(255),
    level ENUM('débutant', 'intermédiaire', 'avancé', 'expert') DEFAULT 'débutant',
    certification_number VARCHAR(255),
    issued_date DATE,
    expiry_date DATE NULL,
    issuing_authority VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(36),
    verification_date DATE NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES profiles(id) ON DELETE SET NULL,
    INDEX idx_employee_id (employee_id),
    INDEX idx_expiry_date (expiry_date)
);

-- Table des audits
CREATE TABLE IF NOT EXISTS audits (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    audit_type ENUM('interne', 'externe', 'certification', 'inspection') NOT NULL,
    scope TEXT NOT NULL,
    planned_date DATE NOT NULL,
    actual_date DATE NULL,
    auditor_id VARCHAR(36) NULL,
    audited_department VARCHAR(255) NULL,
    status ENUM('planifié', 'en_cours', 'terminé', 'annulé') DEFAULT 'planifié',
    findings JSON NULL,
    non_conformities_count INT DEFAULT 0,
    conformities_count INT DEFAULT 0,
    opportunities_count INT DEFAULT 0,
    report_path VARCHAR(255) NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (auditor_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    recipient_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    `read` BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_recipient_read (recipient_id, `read`),
    INDEX idx_created_at (created_at)
);

-- Table des anomalies QHSE
CREATE TABLE IF NOT EXISTS qhse_anomalies (
    id VARCHAR(36) PRIMARY KEY,
    date_anomalie DATE NOT NULL,
    lieu VARCHAR(255) NOT NULL,
    source VARCHAR(255) NULL,
    description TEXT NOT NULL,
    thematique VARCHAR(255) NULL,
    sous_thematique VARCHAR(255) NULL,
    responsable_action VARCHAR(255) NULL,
    message_prise_en_compte TEXT NULL,
    actions_a_mettre_en_oeuvre TEXT NULL,
    devis_a_faire BOOLEAN DEFAULT FALSE,
    montant_devis DECIMAL(10,2) NULL,
    commentaires TEXT NULL,
    impact_patient VARCHAR(255) NULL,
    impact_structure VARCHAR(255) NULL,
    niveau_priorite ENUM('faible', 'moyenne', 'haute', 'critique') DEFAULT 'moyenne',
    date_limite DATE NULL,
    etat_avancement VARCHAR(255) NULL,
    date_resolution DATE NULL,
    date_verification DATE NULL,
    commentaire_verification TEXT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
    INDEX idx_qhse_anomalies_date (date_anomalie),
    INDEX idx_qhse_anomalies_priorite (niveau_priorite),
    INDEX idx_qhse_anomalies_responsable (responsable_action)
);

-- Créer un utilisateur superadmin par défaut (password: admin123)
-- L'ID sera généré avec UUID() lors de l'insertion
INSERT INTO profiles (
    id, 
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    civility, 
    role,
    service
) VALUES (
    UUID(),
    'superadmin',
    'admin@hospital.com',
    '$2a$10$1o50rXzUgFgMwHEpx1FUUOX9jfyEvgzR7rhtyVFbcicvvPYqmfBUC', -- bcrypt hash de 'admin123'
    'Super',
    'Admin',
    'M.',
    'superadmin',
    'Administration'
) ON DUPLICATE KEY UPDATE username=username;


