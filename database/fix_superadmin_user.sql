-- Script pour créer ou mettre à jour l'utilisateur superadmin
-- Email: admin@hospital.com
-- Mot de passe: admin123
-- Hash bcrypt: $2a$10$1o50rXzUgFgMwHEpx1FUUOX9jfyEvgzR7rhtyVFbcicvvPYqmfBUC

USE hospital_management;

-- Vérifier si l'utilisateur existe
SELECT id, username, email, role, first_name, last_name 
FROM profiles 
WHERE email = 'admin@hospital.com' OR username = 'superadmin';

-- Créer ou mettre à jour l'utilisateur superadmin
INSERT INTO profiles (
    id, 
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    civility, 
    role,
    service
) VALUES (
    UUID(),
    'superadmin',
    'admin@hospital.com',
    '$2a$10$1o50rXzUgFgMwHEpx1FUUOX9jfyEvgzR7rhtyVFbcicvvPYqmfBUC', -- bcrypt hash de 'admin123'
    'Super',
    'Admin',
    'M.',
    'superadmin',
    'Administration'
) ON DUPLICATE KEY UPDATE 
    password_hash = '$2a$10$1o50rXzUgFgMwHEpx1FUUOX9jfyEvgzR7rhtyVFbcicvvPYqmfBUC',
    username = 'superadmin',
    first_name = 'Super',
    last_name = 'Admin',
    civility = 'M.',
    role = 'superadmin',
    service = 'Administration',
    updated_at = CURRENT_TIMESTAMP;

-- Vérifier le résultat
SELECT id, username, email, role, first_name, last_name, 
       CASE 
           WHEN password_hash = '$2a$10$1o50rXzUgFgMwHEpx1FUUOX9jfyEvgzR7rhtyVFbcicvvPYqmfBUC' 
           THEN '✅ Hash correct' 
           ELSE '❌ Hash incorrect' 
       END AS password_status
FROM profiles 
WHERE email = 'admin@hospital.com' OR username = 'superadmin';
