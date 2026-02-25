-- =====================================================
-- VÉRIFICATION DE L'UTILISATEUR ADMINISTRATEUR RÉSEAU
-- =====================================================
-- Ce script vérifie si l'utilisateur Administrateur Réseau existe
-- et affiche ses informations
-- =====================================================

USE hospital_management;

-- Vérifier si l'utilisateur existe
SELECT 
    id,
    username,
    email,
    first_name,
    last_name,
    civility,
    role,
    service,
    CASE 
        WHEN password_hash IS NOT NULL AND password_hash != '' THEN 'Oui'
        ELSE 'Non'
    END as mot_de_passe_defini
FROM profiles 
WHERE role = 'administrateur_reseau' 
   OR username = 'admin_reseau'
   OR email = 'admin.reseau@hospital.com';

-- Vérifier tous les rôles disponibles dans la base
SELECT DISTINCT role, COUNT(*) as nombre_utilisateurs
FROM profiles
GROUP BY role
ORDER BY role;
