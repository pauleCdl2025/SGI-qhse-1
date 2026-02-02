-- Migration: Ajouter le champ technician_name à la table daily_rounds
-- Exécutez ce script si la table daily_rounds existe déjà sans le champ technician_name

USE hospital_management;

-- Ajouter la colonne technician_name si elle n'existe pas déjà
ALTER TABLE daily_rounds 
ADD COLUMN IF NOT EXISTS technician_name VARCHAR(255) NULL AFTER technician_id;
