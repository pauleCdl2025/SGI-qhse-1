-- Migration: Ajout des colonnes pour la gestion des accès (visiteurs)
-- À exécuter sur une base existante si la table visitors existe déjà

USE hospital_management;

ALTER TABLE visitors ADD COLUMN company VARCHAR(255) NULL COMMENT 'Société / Organisme' AFTER person_to_see;
ALTER TABLE visitors ADD COLUMN visit_type VARCHAR(100) NULL COMMENT 'Type (visiteur, prestataire, etc.)' AFTER company;
ALTER TABLE visitors ADD COLUMN id_verified TINYINT(1) DEFAULT 0 COMMENT 'Pièce d''identité vérifiée ?' AFTER visit_type;
ALTER TABLE visitors ADD COLUMN badge_code VARCHAR(50) NULL COMMENT 'Code du badge remis' AFTER id_verified;
ALTER TABLE visitors ADD COLUMN entry_signature TEXT NULL COMMENT 'Signature entrée' AFTER badge_code;
ALTER TABLE visitors ADD COLUMN exit_signature TEXT NULL COMMENT 'Signature sortie' AFTER entry_signature;
ALTER TABLE visitors ADD COLUMN access_observations TEXT NULL COMMENT 'Observations' AFTER exit_signature;
