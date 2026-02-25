-- =====================================================
-- CRÉATION DES TABLES RÉSEAU (VERSION SIMPLIFIÉE)
-- Centre Diagnostic Libreville
-- =====================================================
-- Ce script crée les tables pour le module Administrateur Réseau
-- SANS les contraintes de clé étrangère (pour éviter les erreurs)
-- Exécutez ce script dans PhpMyAdmin ou MySQL
-- =====================================================

USE hospital_management;

-- =====================================================
-- TABLE: network_equipment (Matériel Réseau)
-- =====================================================
CREATE TABLE IF NOT EXISTS network_equipment (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('routeur', 'switch', 'point_acces', 'serveur', 'firewall', 'autre') NOT NULL,
  brand VARCHAR(255) NULL,
  model VARCHAR(255) NULL,
  serial_number VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  mac_address VARCHAR(17) NULL,
  location VARCHAR(255) NULL,
  status ENUM('operationnel', 'en_maintenance', 'hors_service') DEFAULT 'operationnel',
  installation_date DATE NULL,
  warranty_expiry DATE NULL,
  notes TEXT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_network_equipment_status (status),
  INDEX idx_network_equipment_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: network_subscriptions (Abonnements Réseau)
-- =====================================================
CREATE TABLE IF NOT EXISTS network_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  subscription_type ENUM('internet', 'telephonie', 'cloud', 'securite', 'autre') NOT NULL,
  monthly_cost DECIMAL(10, 2) DEFAULT 0,
  start_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  contract_number VARCHAR(255) NULL,
  contact_person VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  contact_email VARCHAR(255) NULL,
  status ENUM('actif', 'suspendu', 'expire', 'resilie') DEFAULT 'actif',
  notes TEXT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_network_subscriptions_status (status),
  INDEX idx_network_subscriptions_renewal_date (renewal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: network_inventory (Inventaire Réseau)
-- =====================================================
CREATE TABLE IF NOT EXISTS network_inventory (
  id VARCHAR(36) PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  category ENUM('cable', 'connecteur', 'antenne', 'boitier', 'autre') NOT NULL,
  brand VARCHAR(255) NULL,
  model VARCHAR(255) NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit ENUM('unite', 'metre', 'lot') DEFAULT 'unite',
  location VARCHAR(255) NULL,
  supplier VARCHAR(255) NULL,
  purchase_date DATE NULL,
  purchase_cost DECIMAL(10, 2) NULL,
  notes TEXT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_network_inventory_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VÉRIFICATION
-- =====================================================
SELECT 
    'network_equipment' as table_name,
    COUNT(*) as row_count
FROM network_equipment
UNION ALL
SELECT 
    'network_subscriptions' as table_name,
    COUNT(*) as row_count
FROM network_subscriptions
UNION ALL
SELECT 
    'network_inventory' as table_name,
    COUNT(*) as row_count
FROM network_inventory;
