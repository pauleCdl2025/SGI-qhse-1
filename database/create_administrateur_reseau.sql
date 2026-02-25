-- =====================================================
-- CRÉATION DE L'UTILISATEUR ADMINISTRATEUR RÉSEAU
-- Centre Diagnostic Libreville
-- =====================================================
-- Ce script crée l'utilisateur Administrateur Réseau par défaut
-- Exécutez ce script dans PhpMyAdmin ou MySQL
-- =====================================================

USE hospital_management;

-- =====================================================
-- ADMINISTRATEUR RÉSEAU
-- =====================================================
INSERT INTO profiles (
    id, username, email, password_hash, first_name, last_name, civility, role, service
) VALUES (
    UUID(),
    'admin_reseau',
    'admin.reseau@hospital.com',
    '$2a$10$MTD/5IIVsVMiRq.HI9RmDed0368J2UVCx5V51lSP5hTgwalai/GYK', -- Mot de passe: admin_reseau123
    'Administrateur',
    'Réseau',
    'M.',
    'administrateur_reseau',
    'Informatique & Réseau'
) ON DUPLICATE KEY UPDATE 
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    civility = VALUES(civility),
    role = VALUES(role),
    service = VALUES(service);

-- =====================================================
-- VÉRIFICATION
-- =====================================================
SELECT 
    username,
    email,
    first_name,
    last_name,
    role,
    service
FROM profiles 
WHERE role = 'administrateur_reseau';
