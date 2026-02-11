-- Migration: Ajout des champs equipment_status, equipment_name et service_name pour les rondes biomédicales
-- Ce champ permet de marquer l'état de l'équipement (bon_état / défectueux) et de préciser l'équipement et le service

USE hospital_management;

-- Ajouter la colonne equipment_status à la table round_checklist_responses
ALTER TABLE round_checklist_responses 
ADD COLUMN equipment_status ENUM('bon_état', 'défectueux') NULL AFTER observation;

-- Ajouter la colonne equipment_name pour identifier l'équipement
ALTER TABLE round_checklist_responses 
ADD COLUMN equipment_name VARCHAR(255) NULL AFTER equipment_status;

-- Ajouter la colonne service_name pour identifier le service/location
ALTER TABLE round_checklist_responses 
ADD COLUMN service_name VARCHAR(255) NULL AFTER equipment_name;

-- Mettre à jour les réponses existantes pour avoir 'bon_état' par défaut si is_checked = true
UPDATE round_checklist_responses 
SET equipment_status = 'bon_état' 
WHERE is_checked = TRUE AND equipment_status IS NULL;


-- Index pour améliorer les performances des requêtes
CREATE INDEX idx_equipment_status ON round_checklist_responses(equipment_status);
CREATE INDEX idx_service_name ON round_checklist_responses(service_name);
