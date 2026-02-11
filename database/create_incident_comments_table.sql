-- Script de création de la table pour les commentaires/réponses aux tickets
-- Exécutez ce script dans votre base de données MySQL (hospital_management)

USE hospital_management;

-- Table des commentaires sur les incidents/tickets
CREATE TABLE IF NOT EXISTS incident_comments (
    id VARCHAR(36) PRIMARY KEY,
    incident_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_incident_id (incident_id),
    INDEX idx_created_at (created_at)
);
