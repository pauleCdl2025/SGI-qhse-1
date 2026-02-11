-- Script pour ajouter le rôle 'assistante_qhse' à l'ENUM de la colonne role dans la table profiles
-- À exécuter dans la base hospital_management si votre schéma existe déjà.

USE hospital_management;

ALTER TABLE profiles 
MODIFY COLUMN role ENUM(
    'agent_securite', 
    'agent_entretien', 
    'technicien', 
    'superviseur_qhse', 
    'assistante_qhse',
    'superadmin',
    'secretaire', 
    'superviseur_agent_securite', 
    'superviseur_agent_entretien',
    'superviseur_technicien', 
    'medecin',
    'biomedical',
    'dop',
    'Infirmier',
    'buandiere',
    'employe',
    'technicien_polyvalent'
) NOT NULL;

-- Vérifier le résultat
DESCRIBE profiles;

