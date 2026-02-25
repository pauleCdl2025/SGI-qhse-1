-- Script de création de la table works (Gestion des travaux)
-- Exécutez ce script dans votre base de données MySQL (hospital_management)

USE hospital_management;

-- Table des travaux
CREATE TABLE IF NOT EXISTS works (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    work_type ENUM('maintenance', 'reparation', 'renovation', 'construction', 'amelioration', 'autre') NOT NULL DEFAULT 'maintenance',
    location VARCHAR(255) NULL,
    priority ENUM('faible', 'moyenne', 'haute', 'critique') DEFAULT 'moyenne',
    status ENUM('planifié', 'en_cours', 'en_pause', 'terminé', 'annulé') DEFAULT 'planifié',
    assigned_to VARCHAR(36) NULL,
    assigned_to_name VARCHAR(255) NULL,
    planned_start_date DATE NULL,
    planned_end_date DATE NULL,
    actual_start_date DATE NULL,
    actual_end_date DATE NULL,
    estimated_cost DECIMAL(10, 2) NULL,
    actual_cost DECIMAL(10, 2) NULL,
    supplier_name VARCHAR(255) NULL,
    supplier_contact VARCHAR(255) NULL,
    notes TEXT NULL,
    photo_urls JSON DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_works_assigned_to ON works(assigned_to);
CREATE INDEX idx_works_work_type ON works(work_type);
CREATE INDEX idx_works_planned_start_date ON works(planned_start_date);
