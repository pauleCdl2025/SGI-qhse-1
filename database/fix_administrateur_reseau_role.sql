-- =====================================================
-- CORRECTION DU RÔLE ADMINISTRATEUR RÉSEAU
-- =====================================================
-- Ce script corrige le rôle de l'utilisateur administrateur réseau
-- si celui-ci est vide ou incorrect
-- =====================================================

USE hospital_management;

-- Vérifier l'état actuel
SELECT 
    id,
    username,
    email,
    role,
    service
FROM profiles 
WHERE username = 'admin_reseau' 
   OR email = 'admin.reseau@hospital.com';

-- Corriger le rôle si nécessaire
UPDATE profiles 
SET role = 'administrateur_reseau',
    service = 'Informatique & Réseau'
WHERE (username = 'admin_reseau' OR email = 'admin.reseau@hospital.com')
  AND (role IS NULL OR role = '' OR role != 'administrateur_reseau');

-- Vérifier après correction
SELECT 
    id,
    username,
    email,
    role,
    service,
    first_name,
    last_name
FROM profiles 
WHERE username = 'admin_reseau' 
   OR email = 'admin.reseau@hospital.com';
