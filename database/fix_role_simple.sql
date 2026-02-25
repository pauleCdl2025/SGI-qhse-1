-- Script simple pour corriger le rôle de l'administrateur réseau
-- Copiez-collez ce code dans PhpMyAdmin → SQL

USE hospital_management;

-- Vérifier l'état actuel
SELECT username, email, role FROM profiles 
WHERE username = 'admin_reseau' OR email = 'admin.reseau@hospital.com';

-- Corriger le rôle
UPDATE profiles 
SET role = 'administrateur_reseau'
WHERE (username = 'admin_reseau' OR email = 'admin.reseau@hospital.com')
  AND (role IS NULL OR role = '' OR role != 'administrateur_reseau');

-- Vérifier après correction
SELECT username, email, role, service FROM profiles 
WHERE username = 'admin_reseau' OR email = 'admin.reseau@hospital.com';
