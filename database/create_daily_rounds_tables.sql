-- Script de création des tables pour les rondes quotidiennes
-- Exécutez ce script dans votre base de données MySQL (hospital_management)

USE hospital_management;

-- Table des templates de checklist pour les rondes
CREATE TABLE IF NOT EXISTS round_checklist_templates (
    id VARCHAR(36) PRIMARY KEY,
    round_type ENUM('biomedical', 'technicien_polyvalent') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    item_order INT NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    item_type ENUM('checkbox', 'text', 'number', 'select') DEFAULT 'checkbox',
    options JSON NULL, -- Pour les items de type select
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_round_type (round_type),
    INDEX idx_item_order (round_type, item_order)
);

-- Table des rondes quotidiennes
CREATE TABLE IF NOT EXISTS daily_rounds (
    id VARCHAR(36) PRIMARY KEY,
    technician_id VARCHAR(36) NOT NULL,
    round_type ENUM('biomedical', 'technicien_polyvalent') NOT NULL,
    round_date DATE NOT NULL,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    status ENUM('en_cours', 'terminée', 'annulée') DEFAULT 'en_cours',
    notes TEXT NULL,
    photo_urls JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (technician_id) REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_round (technician_id, round_type, round_date),
    INDEX idx_technician_date (technician_id, round_date),
    INDEX idx_round_type_date (round_type, round_date),
    INDEX idx_status (status)
);

-- Table des réponses aux items de checklist
CREATE TABLE IF NOT EXISTS round_checklist_responses (
    id VARCHAR(36) PRIMARY KEY,
    round_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    response_value TEXT NULL, -- Pour les réponses textuelles ou numériques
    is_checked BOOLEAN DEFAULT FALSE, -- Pour les checkboxes
    observation TEXT NULL,
    photo_urls JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES daily_rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES round_checklist_templates(id) ON DELETE CASCADE,
    UNIQUE KEY unique_round_template (round_id, template_id),
    INDEX idx_round_id (round_id),
    INDEX idx_template_id (template_id)
);

-- Insertion des templates de checklist pour le technicien biomédical
INSERT INTO round_checklist_templates (id, round_type, title, description, item_order, is_required, item_type) VALUES
(UUID(), 'biomedical', 'Vérification des équipements critiques', 'Vérifier l\'état de fonctionnement des équipements critiques', 1, TRUE, 'checkbox'),
(UUID(), 'biomedical', 'Contrôle des alarmes', 'Vérifier que toutes les alarmes fonctionnent correctement', 2, TRUE, 'checkbox'),
(UUID(), 'biomedical', 'Vérification des températures', 'Contrôler les températures des équipements réfrigérés', 3, TRUE, 'number'),
(UUID(), 'biomedical', 'Inspection visuelle', 'Inspection visuelle générale des équipements', 4, TRUE, 'checkbox'),
(UUID(), 'biomedical', 'Vérification des câbles et connexions', 'Contrôler l\'état des câbles et connexions électriques', 5, TRUE, 'checkbox'),
(UUID(), 'biomedical', 'Anesthésie - Date prévue', 'Date souhaitée pour l\'anesthésie', 6, TRUE, 'text'),
(UUID(), 'biomedical', 'Anesthésie - Heure prévue', 'Heure souhaitée pour l\'anesthésie', 7, TRUE, 'text'),
(UUID(), 'biomedical', 'Nettoyage des équipements', 'Nettoyage des surfaces et écrans', 8, FALSE, 'checkbox'),
(UUID(), 'biomedical', 'Vérification des stocks consommables', 'Contrôler les niveaux de stocks des consommables', 9, FALSE, 'checkbox'),
(UUID(), 'biomedical', 'Observations générales', 'Notes et observations diverses', 10, FALSE, 'text');

-- Insertion des templates de checklist pour le technicien polyvalent
INSERT INTO round_checklist_templates (id, round_type, title, description, item_order, is_required, item_type) VALUES
(UUID(), 'technicien_polyvalent', 'Vérification des systèmes électriques', 'Contrôler les tableaux électriques et disjoncteurs', 1, TRUE, 'checkbox'),
(UUID(), 'technicien_polyvalent', 'Vérification de la plomberie', 'Contrôler les fuites et le bon fonctionnement des robinets', 2, TRUE, 'checkbox'),
(UUID(), 'technicien_polyvalent', 'Contrôle de la climatisation', 'Vérifier le fonctionnement des systèmes de climatisation', 3, TRUE, 'checkbox'),
(UUID(), 'technicien_polyvalent', 'Vérification des portes et serrures', 'Contrôler le bon fonctionnement des portes et serrures', 4, TRUE, 'checkbox'),
(UUID(), 'technicien_polyvalent', 'Inspection des espaces communs', 'Vérifier l\'état général des espaces communs', 5, TRUE, 'checkbox'),
(UUID(), 'technicien_polyvalent', 'Vérification des éclairages', 'Contrôler le bon fonctionnement de l\'éclairage', 6, TRUE, 'checkbox'),
(UUID(), 'technicien_polyvalent', 'Contrôle des ascenseurs', 'Vérifier le bon fonctionnement des ascenseurs', 7, FALSE, 'checkbox'),
(UUID(), 'technicien_polyvalent', 'Vérification des systèmes de sécurité', 'Contrôler les systèmes d\'alarme et de sécurité', 8, TRUE, 'checkbox'),
(UUID(), 'technicien_polyvalent', 'Observations et interventions', 'Notes sur les interventions effectuées', 9, FALSE, 'text');
