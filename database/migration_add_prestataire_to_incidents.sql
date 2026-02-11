-- Migration: Ajout du champ prestataire pour les techniciens polyvalents
-- Ce champ permet de spécifier le nom du prestataire qui va intervenir

USE hospital_management;

-- Ajouter la colonne prestataire à la table incidents
ALTER TABLE incidents 
ADD COLUMN prestataire VARCHAR(255) NULL AFTER assigned_to_name;

-- Index pour améliorer les performances des requêtes
CREATE INDEX idx_prestataire ON incidents(prestataire);
