-- PostgreSQL dump converted from MySQL (phpMyAdmin)
-- Converted by automated script
-- Changes: ENUMs→TEXT CHECK, tinyint(1)→BOOLEAN, json→JSONB,
--          KEY→CREATE INDEX, ENGINE/CHARSET/COLLATE removed,
--          MySQL VIEW syntax → PostgreSQL, date_format→TO_CHAR
-- NOTE: ON UPDATE CURRENT_TIMESTAMP requires a trigger in PostgreSQL.

BEGIN;

-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : mar. 10 mars 2026 à 07:45
-- Version du serveur : 8.4.7
-- Version de PHP : 8.3.28

--
-- Base de données : `hospital_management`
--

-- --------------------------------------------------------

--
-- Structure de la table `aes`
--

DROP TABLE IF EXISTS aes CASCADE;
CREATE TABLE IF NOT EXISTS aes (
  id varchar(36) NOT NULL,
  agent_nom varchar(255) NOT NULL,
  agent_prenom varchar(255) NOT NULL,
  agent_matricule varchar(100) DEFAULT NULL,
  agent_fonction varchar(255) DEFAULT NULL,
  agent_service varchar(255) DEFAULT NULL,
  agent_telephone varchar(50) DEFAULT NULL,
  agent_statut TEXT CHECK (agent_statut IN ('Personnel','Stagiaire','Prestataire')) NOT NULL,
  date_aes date NOT NULL,
  heure_aes time NOT NULL,
  lieu_precis varchar(500) DEFAULT NULL,
  type_exposition TEXT CHECK (type_exposition IN ('Piqure','Coupure','Projection muqueuse','Contact peau lésée')) NOT NULL,
  description_circonstances text,
  type_dispositif varchar(255) DEFAULT NULL,
  usage_unique BOOLEAN DEFAULT NULL,
  souille_sang BOOLEAN DEFAULT NULL,
  dans_sac_dasri BOOLEAN DEFAULT NULL,
  patient_source_identifiee BOOLEAN DEFAULT NULL,
  patient_code_identifiant varchar(255) DEFAULT NULL,
  consentement_prelevement BOOLEAN DEFAULT NULL,
  lavage_eau_savon BOOLEAN DEFAULT NULL,
  desinfection BOOLEAN DEFAULT NULL,
  rinçage_muqueuse BOOLEAN DEFAULT NULL,
  heure_premiers_soins time DEFAULT NULL,
  medecin_referent_aes varchar(255) DEFAULT NULL,
  examen_vih BOOLEAN DEFAULT FALSE,
  examen_vhb BOOLEAN DEFAULT FALSE,
  examen_vhc BOOLEAN DEFAULT FALSE,
  traitement_arv_initie BOOLEAN DEFAULT NULL,
  date_debut_traitement date DEFAULT NULL,
  resultat_agent_vih BOOLEAN DEFAULT NULL,
  resultat_agent_vhb BOOLEAN DEFAULT NULL,
  resultat_agent_vhc BOOLEAN DEFAULT NULL,
  resultat_patient_vih BOOLEAN DEFAULT NULL,
  resultat_patient_vhb BOOLEAN DEFAULT NULL,
  resultat_patient_vhc BOOLEAN DEFAULT NULL,
  conduite_tenir text,
  orientation_infectiologue BOOLEAN DEFAULT NULL,
  orientation_psychologue BOOLEAN DEFAULT NULL,
  dates_suivi_prevues text,
  suivi_m1_date date DEFAULT NULL,
  suivi_m1_vih BOOLEAN DEFAULT NULL,
  suivi_m1_vhb BOOLEAN DEFAULT NULL,
  suivi_m1_vhc BOOLEAN DEFAULT NULL,
  suivi_m6_date date DEFAULT NULL,
  suivi_m6_vih BOOLEAN DEFAULT NULL,
  suivi_m6_vhb BOOLEAN DEFAULT NULL,
  suivi_m6_vhc BOOLEAN DEFAULT NULL,
  suivi_m9_date date DEFAULT NULL,
  suivi_m9_vih BOOLEAN DEFAULT NULL,
  suivi_m9_vhb BOOLEAN DEFAULT NULL,
  suivi_m9_vhc BOOLEAN DEFAULT NULL,
  dossier_cloture BOOLEAN DEFAULT FALSE,
  date_cloture date DEFAULT NULL,
  nom_signature_qhse varchar(255) DEFAULT NULL,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  numero_aes INTEGER DEFAULT NULL,
  port_epi BOOLEAN DEFAULT FALSE,
  declaration_immediate BOOLEAN DEFAULT FALSE,
  date_declaration date DEFAULT NULL,
  prise_charge_immediate BOOLEAN DEFAULT FALSE,
  inscription_sentimed BOOLEAN DEFAULT FALSE,
  bon_examen_prescrit BOOLEAN DEFAULT FALSE,
  matricule_sentimed varchar(100) DEFAULT NULL,
  date_prise_resultat date DEFAULT NULL,
  suivi_m3_date date DEFAULT NULL,
  suivi_m3_vhb BOOLEAN DEFAULT NULL,
  suivi_m3_vhc BOOLEAN DEFAULT NULL,
  observations text,
  PRIMARY KEY (id)
);

CREATE INDEX idx_aes_created_by ON aes (created_by);


-- --------------------------------------------------------

--
-- Structure de la table `audits`
--

DROP TABLE IF EXISTS audits CASCADE;
CREATE TABLE IF NOT EXISTS audits (
  id varchar(36) NOT NULL,
  title varchar(255) NOT NULL,
  audit_type TEXT CHECK (audit_type IN ('interne','externe','certification','inspection')) NOT NULL,
  scope text NOT NULL,
  planned_date date NOT NULL,
  actual_date date DEFAULT NULL,
  auditor_id varchar(36) DEFAULT NULL,
  audited_department varchar(255) DEFAULT NULL,
  status TEXT CHECK (status IN ('planifié','en_cours','terminé','annulé')) DEFAULT 'planifié',
  findings JSONB DEFAULT NULL,
  non_conformities_count INTEGER DEFAULT 0,
  conformities_count INTEGER DEFAULT 0,
  opportunities_count INTEGER DEFAULT 0,
  report_path varchar(500) DEFAULT NULL,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  recurrence_type TEXT CHECK (recurrence_type IN ('aucune','quotidienne','hebdomadaire','mensuelle','trimestrielle','semestrielle','annuelle')) DEFAULT 'aucune',
  recurrence_interval INTEGER DEFAULT NULL,
  next_audit_date date DEFAULT NULL,
  reminder_days_before INTEGER DEFAULT 7,
  auto_generate_report BOOLEAN DEFAULT FALSE,
  report_generation_date date DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX idx_audits_auditor_id ON audits (auditor_id);
CREATE INDEX idx_audits_created_by ON audits (created_by);
CREATE INDEX idx_audits_idx_audit_type ON audits (audit_type);
CREATE INDEX idx_audits_idx_status ON audits (status);
CREATE INDEX idx_audits_idx_planned_date ON audits (planned_date);


-- --------------------------------------------------------

--
-- Structure de la table `audit_action_plans`
--

DROP TABLE IF EXISTS audit_action_plans CASCADE;
CREATE TABLE IF NOT EXISTS audit_action_plans (
  id varchar(36) NOT NULL,
  audit_id varchar(36) NOT NULL,
  finding_id varchar(36) DEFAULT NULL,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  action_type TEXT CHECK (action_type IN ('corrective','preventive','amelioration')) NOT NULL,
  priority TEXT CHECK (priority IN ('faible','moyenne','haute','critique')) DEFAULT 'moyenne',
  assigned_to varchar(36) DEFAULT NULL,
  due_date date DEFAULT NULL,
  status TEXT CHECK (status IN ('planifié','en_cours','terminé','verifié','annulé')) DEFAULT 'planifié',
  completion_date date DEFAULT NULL,
  verification_date date DEFAULT NULL,
  verified_by varchar(36) DEFAULT NULL,
  notes text,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_audit_action_plans_verified_by ON audit_action_plans (verified_by);
CREATE INDEX idx_audit_action_plans_created_by ON audit_action_plans (created_by);
CREATE INDEX idx_audit_action_plans_idx_audit_action_plans_audit_id ON audit_action_plans (audit_id);
CREATE INDEX idx_audit_action_plans_idx_audit_action_plans_assigned_to ON audit_action_plans (assigned_to);
CREATE INDEX idx_audit_action_plans_idx_audit_action_plans_status ON audit_action_plans (status);


-- --------------------------------------------------------

--
-- Structure de la table `audit_checklists`
--

DROP TABLE IF EXISTS audit_checklists CASCADE;
CREATE TABLE IF NOT EXISTS audit_checklists (
  id varchar(36) NOT NULL,
  audit_id varchar(36) NOT NULL,
  question text NOT NULL,
  requirement text,
  compliance_status TEXT CHECK (compliance_status IN ('conforme','non_conforme','non_applicable','non_évalué')) DEFAULT 'non_évalué',
  observation text,
  photo_urls JSONB DEFAULT NULL,
  checked_by varchar(36) DEFAULT NULL,
  checked_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX idx_audit_checklists_checked_by ON audit_checklists (checked_by);
CREATE INDEX idx_audit_checklists_idx_audit_id ON audit_checklists (audit_id);
CREATE INDEX idx_audit_checklists_idx_audit_checklists_audit_id ON audit_checklists (audit_id);


-- --------------------------------------------------------

--
-- Structure de la table `biomedical_equipment`
--

DROP TABLE IF EXISTS biomedical_equipment CASCADE;
CREATE TABLE IF NOT EXISTS biomedical_equipment (
  id varchar(36) NOT NULL,
  name varchar(255) NOT NULL,
  model varchar(255) DEFAULT NULL,
  serial_number varchar(255) NOT NULL,
  department varchar(255) DEFAULT NULL,
  location varchar(255) NOT NULL,
  status TEXT CHECK (status IN ('opérationnel','en_maintenance','hors_service')) DEFAULT 'opérationnel',
  last_maintenance timestamp NULL DEFAULT NULL,
  next_maintenance timestamp NULL DEFAULT NULL,
  notes text,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


-- --------------------------------------------------------

--
-- Structure de la table `bookings`
--

DROP TABLE IF EXISTS bookings CASCADE;
CREATE TABLE IF NOT EXISTS bookings (
  id varchar(36) NOT NULL,
  room_id varchar(36) NOT NULL,
  title varchar(255) NOT NULL,
  booked_by varchar(36) DEFAULT NULL,
  start_time timestamp NOT NULL,
  end_time timestamp NOT NULL,
  doctor_id varchar(36) DEFAULT NULL,
  status TEXT CHECK (status IN ('réservé','en_cours','terminé','annulé')) DEFAULT 'réservé',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_bookings_room_id ON bookings (room_id);
CREATE INDEX idx_bookings_booked_by ON bookings (booked_by);
CREATE INDEX idx_bookings_doctor_id ON bookings (doctor_id);


--
-- Déchargement des données de la table `bookings`
--

INSERT INTO bookings (id, room_id, title, booked_by, start_time, end_time, doctor_id, status, created_at) VALUES
('542b3759-ae27-48c7-8905-e6fe3360d9f6', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Consultation', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 05:30:00', '2025-11-17 14:30:00', 'd322b091-ac07-4842-aa4d-0dbeecd5d01f', 'réservé', '2025-11-13 13:33:56'),
('c0204c7b-8d70-41bf-948f-e0b5ae59c63a', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 06:30:00', '2025-11-24 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('6834fa20-f582-4e5b-99aa-9203e487e8b7', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 06:30:00', '2025-12-01 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('d69c5878-a9e5-4271-8b00-da3dff6e95fa', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 06:30:00', '2025-12-08 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('4a76a46e-a565-47fb-842c-61c22a45452a', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 06:30:00', '2025-11-17 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('02ce9c0a-81a5-4a95-8ef2-ad35bdc0449b', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 06:30:00', '2025-11-24 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('32afb390-5090-4627-a95b-9824d49d4ec6', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 06:30:00', '2025-12-01 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('c68ab46c-a83f-4de9-96b5-df3f0399a96e', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 06:30:00', '2025-12-08 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('6549b379-4ae3-4cf6-827c-ceb486a6c36c', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 07:00:00', '2025-11-17 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('81daeefd-0525-41d1-906f-cff257cca030', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 07:00:00', '2025-11-24 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('65a8c296-dcf5-4019-8fe9-800f20f727fd', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 07:00:00', '2025-12-01 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('fb225285-6f62-4ebf-9e1e-61d040ef4d4d', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 07:00:00', '2025-12-08 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('f65750c4-33c9-40e4-8fdd-79cf79e3db1d', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 07:00:00', '2025-11-17 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('5b6c5257-77f6-45b7-8e99-77e77fcaf548', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 07:00:00', '2025-11-24 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('07f6d1d7-f97e-4979-bbe7-ac9f3eae50a2', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 07:00:00', '2025-12-01 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('b0dd2594-6b45-4ad2-9180-da8714651ea3', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 07:00:00', '2025-12-08 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('fe304337-d278-414e-a26c-02a3a2e2c0a9', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 13:00:00', '2025-11-17 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('16a8e732-7880-4706-a238-42084c084494', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 13:00:00', '2025-11-24 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('2daa9f0f-09fa-4b5f-8a89-9295fc21af34', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 13:00:00', '2025-12-01 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('c188d74e-1160-4168-b8cc-dd443e1cbbba', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 13:00:00', '2025-12-08 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('1b13af41-f161-42ab-a4cd-7cfcf57d1f94', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 13:00:00', '2025-11-17 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('f09da57a-9cb5-4e7f-999a-2b8e76b5297e', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 13:00:00', '2025-11-24 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('7ecdb081-8f81-4dc2-93a8-1402a88f4b33', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 13:00:00', '2025-12-01 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('c4923adc-1361-48c3-b5f0-d76ea9a24986', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 13:00:00', '2025-12-08 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('8644c1bf-d88d-4965-8911-de6122d8cc8e', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 06:30:00', '2025-11-18 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('3849c517-789f-445d-9c7c-a74b2e6764c8', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 06:30:00', '2025-11-25 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('5cd28e01-717e-4548-b568-2db938c2ed8b', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 06:30:00', '2025-12-02 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('3c5e2140-3806-4fdb-a141-17c5bf7b9f42', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 06:30:00', '2025-12-09 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('fd97f783-8268-4311-b408-37afe0d818a0', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 06:30:00', '2025-11-18 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('482c177f-934a-45ec-b3c1-8166ab810799', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 06:30:00', '2025-11-25 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('552c8074-2bb6-4c94-b642-314f1f31f08c', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 06:30:00', '2025-12-02 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('64c5175f-4057-499a-ab45-624c5a7de287', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 06:30:00', '2025-12-09 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('d6b2435f-044b-4b34-88e1-b6e739480dda', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 13:00:00', '2025-11-18 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2025-11-13 13:33:56'),
('e2c26959-0707-4277-9159-462a2214db8e', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 13:00:00', '2025-11-25 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2025-11-13 13:33:56'),
('eb25ee10-efbf-46ec-aec0-5e3b4bf5b0f6', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 13:00:00', '2025-12-02 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2025-11-13 13:33:56'),
('73deef60-71cc-4ca1-9698-370d4a2ad1d9', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 13:00:00', '2025-12-09 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2025-11-13 13:33:56'),
('259aba70-66fe-4d74-9041-b826c940da6f', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 07:00:00', '2025-11-18 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('519e38e1-fbfe-4fcc-8f79-99c8cf2dfad7', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 07:00:00', '2025-11-25 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('4d23385d-2a6b-48fc-8bba-f23fdcbf23da', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 07:00:00', '2025-12-02 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('2ec7bb5b-cebc-4de7-a700-f549471e67d5', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 07:00:00', '2025-12-09 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('254eba41-fa60-4ee7-b353-ee06426ad0b5', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 13:00:00', '2025-11-18 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 13:33:56'),
('db1f6131-a731-41a4-9eb9-ecc9d393d2cf', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 13:00:00', '2025-11-25 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 13:33:56'),
('462842a5-c0e0-44a4-8915-aacdc4305797', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 13:00:00', '2025-12-02 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 13:33:56'),
('6e91531f-2292-476c-a869-20a00561efe1', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 13:00:00', '2025-12-09 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 13:33:56'),
('9b315b35-3d27-4b3d-8233-8dba35dea03b', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 07:00:00', '2025-11-18 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('b51df2e3-8bed-4326-9cb6-0eec598a04ea', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 07:00:00', '2025-11-25 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('b83f118f-1b55-45bd-8c45-1d7805dfc704', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 07:00:00', '2025-12-02 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('19250137-e990-4502-8cbf-38811429c1a9', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 07:00:00', '2025-12-09 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('6ca30112-a78f-4d9d-8227-c0b855450fc4', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 06:30:00', '2025-11-19 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('2027a407-370e-4673-aa1d-bb174f7fa2c5', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 06:30:00', '2025-11-26 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('638bbe9a-69ac-4329-a088-6359704e7c2b', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 06:30:00', '2025-12-03 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('20cd7892-6858-4788-8688-f0674f4ce6c9', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 06:30:00', '2025-12-10 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('e0070bd0-6144-4b79-ad40-ce26e39180bc', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 06:30:00', '2025-11-19 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('1def2711-3dd8-40ab-88f9-ce975a9f2f57', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 06:30:00', '2025-11-26 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('da6b19c0-8049-4526-9871-508b2fd6adea', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 06:30:00', '2025-12-03 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('fe91551f-0736-4d11-b829-fb93e5919cc0', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 06:30:00', '2025-12-10 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('aded56af-1d61-46d0-80d9-5fa64cd0f661', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 07:00:00', '2025-11-19 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('0ba9b44d-3d3e-491e-8343-7100bae6432e', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 07:00:00', '2025-11-26 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('685766d1-4b9b-457b-908d-6588f15548a5', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 07:00:00', '2025-12-03 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('478155c0-ceda-43b8-b639-327fe947ce37', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 07:00:00', '2025-12-10 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('efc868b9-a1ba-4df2-8169-591c5acfb3b5', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 14:00:00', '2025-11-19 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2025-11-13 13:33:56'),
('2872e970-9e53-4e94-8a62-5cbe7bc64e67', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 14:00:00', '2025-11-26 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2025-11-13 13:33:56'),
('dbb5aa46-0a90-4b22-9158-bcadcb6776b8', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 14:00:00', '2025-12-03 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2025-11-13 13:33:56'),
('33f66930-3701-429b-baf2-085b50c4cb1d', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 14:00:00', '2025-12-10 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2025-11-13 13:33:56'),
('33ff4f78-e12d-4814-bc7e-291b4eab663e', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 14:00:00', '2025-11-19 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('cf1ed5c2-331b-4752-9431-9392a2a97eb0', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 14:00:00', '2025-11-26 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('1029f992-b40a-4ef4-abd7-f2de79378f23', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 14:00:00', '2025-12-03 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('69042214-c440-42d1-81cd-11de6ec200ac', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 14:00:00', '2025-12-10 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('444f791b-9481-45d7-b9c1-e7d9a788adbc', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 13:00:00', '2025-11-19 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('ccd89cd0-a4ef-40a5-acb2-4f962fce560d', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 13:00:00', '2025-11-26 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('fa3b36e7-cad8-4102-962d-4dec56e3a777', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 13:00:00', '2025-12-03 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('f5fe1554-64ce-4dc7-93c3-5d302b3bf495', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 13:00:00', '2025-12-10 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 13:33:56'),
('41a09a0c-2093-4000-8f89-7199da39658d', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 06:30:00', '2025-11-13 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('c1432aa2-2ab2-45c2-a628-129d8d55eb23', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 06:30:00', '2025-11-20 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('2ffa2b13-297a-4fba-9854-513e00e107ce', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 06:30:00', '2025-11-27 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('84b27a70-bfab-40fb-ad55-980306b00e36', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 06:30:00', '2025-12-04 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('98457ae9-a5cc-4f07-ac6c-3c5f700d18f8', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 06:30:00', '2025-11-13 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('a68c370e-f500-4f2d-b504-8090e68aaf23', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 06:30:00', '2025-11-20 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('bbee73e0-8154-456f-a1d0-3247b99758ea', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 06:30:00', '2025-11-27 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('32b57b04-5fa3-47f4-8742-ceccc0dc0596', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 06:30:00', '2025-12-04 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('84c2d652-4d9d-43c5-8947-18300acee729', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 07:00:00', '2025-11-13 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('80cf31bf-e11a-468a-babd-028cea3b8307', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 07:00:00', '2025-11-20 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('7c4cc10b-2e2f-4c54-8054-b3372627a98d', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 07:00:00', '2025-11-27 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('d1c9dd8b-2399-42d3-b3e4-2defabed7519', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 07:00:00', '2025-12-04 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('c26251db-cd7c-4cc5-b020-4d21dfdac221', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 07:00:00', '2025-11-13 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('3b260984-37ee-4a91-a963-ff5f4d5594cd', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 07:00:00', '2025-11-20 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('a62d0b28-28fb-4b4c-912d-3933d676abbc', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 07:00:00', '2025-11-27 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('a10f798c-11f9-46a1-a54a-5da9b784163f', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 07:00:00', '2025-12-04 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('8d92cc24-d385-4ac6-aab6-41ae6fec68ff', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 09:00:00', '2025-11-13 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2025-11-13 13:33:56'),
('33f114ff-b6c5-4039-897e-d370eb76005c', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 09:00:00', '2025-11-20 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2025-11-13 13:33:56'),
('cdae200f-57ff-4c83-b5ea-7f7e0a109df7', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 09:00:00', '2025-11-27 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2025-11-13 13:33:56'),
('26623e97-5e3f-42bf-90a4-72a5d2dde5e2', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 09:00:00', '2025-12-04 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2025-11-13 13:33:56'),
('197aa2e5-141b-4c11-857b-fc0d96f6ea0c', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 13:00:00', '2025-11-13 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 13:33:56'),
('605904bb-5b6d-4758-8b9d-4632d986a2c9', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 13:00:00', '2025-11-20 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 13:33:56'),
('0eff1555-fa7e-4bb5-bca7-4dc906160593', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 13:00:00', '2025-11-27 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 13:33:56'),
('f2a64c5a-690b-4727-acec-9b47b0ebf758', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 13:00:00', '2025-12-04 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 13:33:56'),
('c8a130ec-0011-4614-839f-0683907a5828', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 06:30:00', '2025-11-14 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('08f05750-7335-4e2c-8c9a-3335d112d3a3', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 06:30:00', '2025-11-21 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('4cfc60b2-5828-4169-ae6f-62802a9717bc', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 06:30:00', '2025-11-28 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('57cfae92-1919-452c-9bc9-33835d5349f8', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 06:30:00', '2025-12-05 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('3c2d2f26-39d9-4f23-800a-f3f20463a6b2', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 06:30:00', '2025-11-14 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('7de088d5-27ea-4dc3-8a07-c7467cdd99af', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 06:30:00', '2025-11-21 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('aa40583f-164e-447c-af9c-c9fd031b2210', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 06:30:00', '2025-11-28 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('aa6fa7dc-21dd-44e3-a7f5-d8fb46c26ffe', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 06:30:00', '2025-12-05 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('2268507b-5413-4333-8092-97cc3e7fb44f', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 07:00:00', '2025-11-14 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('5ff9fa6c-7054-493e-859c-80b7fc6ce1f5', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 07:00:00', '2025-11-21 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('e9c66789-930d-4aa6-9d93-9aee07fbb8af', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 07:00:00', '2025-11-28 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('98e08166-14c3-4729-80e1-1ed7c646696b', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 07:00:00', '2025-12-05 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-13 13:33:56'),
('741ba9fe-cb59-4cec-ae46-0ee709e0dbba', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 07:00:00', '2025-11-14 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('9c7da0fa-5e4d-47ef-9d7c-fd2724fdade4', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 07:00:00', '2025-11-21 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('4e57b2a8-6de8-4d65-91e3-9e872489f85c', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 07:00:00', '2025-11-28 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('88e56d43-bcab-4357-80ec-c082453db9ac', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 07:00:00', '2025-12-05 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('44b2b7db-f84e-47aa-b3b9-b20afeeb1464', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 14:00:00', '2025-11-14 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 13:33:56'),
('decc8f6d-c6c2-44dd-89cf-1c71abaaeff3', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 14:00:00', '2025-11-21 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 13:33:56'),
('b9d0471c-6c3e-4644-91a0-b550010cb01e', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 14:00:00', '2025-11-28 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 13:33:56'),
('c07aa7c1-af9c-4777-b430-7a1bfdf20319', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 14:00:00', '2025-12-05 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 13:33:56'),
('503bebf7-cbf2-4c75-a61a-d751dccecac9', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 14:00:00', '2025-11-14 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2025-11-13 13:33:56'),
('6f0b4400-b0c2-47e1-a925-e69f40d3a61a', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 14:00:00', '2025-11-21 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2025-11-13 13:33:56'),
('cc2878c4-1dff-4614-8846-0ba1afa37be8', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 14:00:00', '2025-11-28 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2025-11-13 13:33:56'),
('583c48e3-4164-4df5-a626-253b14e64c06', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 14:00:00', '2025-12-05 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2025-11-13 13:33:56'),
('d9290730-40fa-4a7d-9e18-4801ef345975', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 06:30:00', '2025-11-15 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('ab22ab39-3317-408e-a471-738f2a2388f5', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 06:30:00', '2025-11-22 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('764dd9a0-c836-49df-baef-71c22f4787ac', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 06:30:00', '2025-11-29 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('67abb1aa-609e-4371-ad21-86cf0b563679', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 06:30:00', '2025-12-06 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('d8ff942e-455f-4dab-b5cf-6727d20a92ee', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 06:30:00', '2025-11-15 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('e11b7934-4cbc-477b-b2a5-42312caa753a', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 06:30:00', '2025-11-22 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('1453c981-3c89-44f2-9b0b-2c587ee7c637', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 06:30:00', '2025-11-29 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('35d0100a-9a74-47c4-85f4-c40e32a44ce5', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 06:30:00', '2025-12-06 15:30:00', NULL, 'réservé', '2025-11-13 13:33:56'),
('6571a000-3982-4586-b2c3-43e2915b444e', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 07:00:00', '2025-11-15 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2025-11-13 13:33:56'),
('79ed3a90-7277-4c6a-a452-e7c50e6b5f86', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 07:00:00', '2025-11-22 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2025-11-13 13:33:56'),
('a0131aed-3e1b-477a-b80d-656e4cb53ada', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 07:00:00', '2025-11-29 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2025-11-13 13:33:56'),
('396f3b0f-42ed-439e-b8cf-515965cff6fb', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 07:00:00', '2025-12-06 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2025-11-13 13:33:56'),
('bbc2e6c5-ebba-412f-a258-0f0252cbd1e6', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 08:00:00', '2025-11-15 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('5ff06c71-31a2-40c6-ab19-75c07e7f0916', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 08:00:00', '2025-11-22 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('2f79599b-482e-4a3d-b26a-dcda657d8373', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 08:00:00', '2025-11-29 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('964ba72e-b91e-496a-b6be-3897bef7cb49', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 08:00:00', '2025-12-06 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-13 13:33:56'),
('cb917f28-2027-4fc5-9914-e6dd632a4078', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 08:00:00', '2025-11-15 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('ad56302a-b021-443d-b265-aa3e15a39751', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 08:00:00', '2025-11-22 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('292a4979-cc1b-44fb-96f7-b3db91842c8f', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 08:00:00', '2025-11-29 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('593c8530-2ad4-4771-9f3b-f9c4bd61923c', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 08:00:00', '2025-12-06 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-13 13:33:56'),
('aa7b8cd3-b1cd-4d07-adfb-798c072ca492', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 08:00:00', '2025-11-15 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 13:33:56'),
('244723e7-c06b-4c4d-86af-8f81800ff1bc', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 08:00:00', '2025-11-22 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 13:33:56'),
('82e08d2e-e700-4418-b74a-9377d29637a4', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 08:00:00', '2025-11-29 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 13:33:56'),
('c00bfd36-9fba-49d6-b621-d7c2ee70094b', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 08:00:00', '2025-12-06 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 13:33:56'),
('584da49a-3f5c-4bb8-aff5-7ef4fe3c72df', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 06:30:00', '2025-11-17 15:30:00', NULL, 'réservé', '2025-11-13 14:29:27'),
('7cae806d-941f-4dd4-a114-f74a742d3dbb', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 06:30:00', '2025-11-24 15:30:00', NULL, 'réservé', '2025-11-13 14:29:27'),
('9ddecb86-baf5-4f6d-83ac-849f79110bb5', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 06:30:00', '2025-12-01 15:30:00', NULL, 'réservé', '2025-11-13 14:29:27'),
('5a875e35-9f92-4276-9959-cd2ee2d8492d', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 06:30:00', '2025-12-08 15:30:00', NULL, 'réservé', '2025-11-13 14:29:27'),
('b2495675-b2b3-432f-b66c-3b01bc7943b6', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Médecine de famille - Dr Obame', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 06:30:00', '2025-11-17 15:30:00', 'd322b091-ac07-4842-aa4d-0dbeecd5d01f', 'réservé', '2025-11-13 14:29:27'),
('15a486cc-1aae-42bc-9d95-697c733bec4e', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Médecine de famille - Dr Obame', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 06:30:00', '2025-11-24 15:30:00', 'd322b091-ac07-4842-aa4d-0dbeecd5d01f', 'réservé', '2025-11-13 14:29:27'),
('a32103c3-3e17-47b1-a890-ac424cbfcb27', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Médecine de famille - Dr Obame', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 06:30:00', '2025-12-01 15:30:00', 'd322b091-ac07-4842-aa4d-0dbeecd5d01f', 'réservé', '2025-11-13 14:29:27'),
('334cb1af-d99a-491b-b496-2492355a70a0', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Médecine de famille - Dr Obame', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 06:30:00', '2025-12-08 15:30:00', 'd322b091-ac07-4842-aa4d-0dbeecd5d01f', 'réservé', '2025-11-13 14:29:27'),
('df487900-4b11-48f2-b183-3f1967e1e4c8', 'e14ec1ad-9d3d-48ae-9211-5c202058bc53', 'Urologie - Dr Lembangoye', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 07:00:00', '2025-11-17 12:00:00', '4ce3f2e6-85cb-465e-8a94-004b1419cc9a', 'réservé', '2025-11-13 14:29:27'),
('9ebd0203-0e3c-496b-874e-89d440a929be', 'e14ec1ad-9d3d-48ae-9211-5c202058bc53', 'Urologie - Dr Lembangoye', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 07:00:00', '2025-11-24 12:00:00', '4ce3f2e6-85cb-465e-8a94-004b1419cc9a', 'réservé', '2025-11-13 14:29:27'),
('2380101e-9d37-4094-b8c2-874c04bc3760', 'e14ec1ad-9d3d-48ae-9211-5c202058bc53', 'Urologie - Dr Lembangoye', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 07:00:00', '2025-12-01 12:00:00', '4ce3f2e6-85cb-465e-8a94-004b1419cc9a', 'réservé', '2025-11-13 14:29:27'),
('bf035d57-6d14-4324-b665-03ce86b6caaf', 'e14ec1ad-9d3d-48ae-9211-5c202058bc53', 'Urologie - Dr Lembangoye', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 07:00:00', '2025-12-08 12:00:00', '4ce3f2e6-85cb-465e-8a94-004b1419cc9a', 'réservé', '2025-11-13 14:29:27'),
('65c6d113-3c65-44ed-8b2c-45f08e9e4647', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 07:00:00', '2025-11-17 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 14:29:27'),
('8c1a8552-a547-4892-b5cf-830bb66f09b8', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 07:00:00', '2025-11-24 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 14:29:27'),
('f0cc9826-4366-4a4c-8d70-5b8c0d6f1427', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 07:00:00', '2025-12-01 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 14:29:27'),
('861c5d62-24ef-41bb-9fb2-7fc8b3f381cd', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 07:00:00', '2025-12-08 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 14:29:27'),
('8b67616a-745b-4833-994f-a05d7c07ca14', '8b1cb8b8-cda9-4da6-9637-9c101f52f48a', 'Orthophonie - Mme Aude', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 09:00:00', '2025-11-17 13:00:00', '9daf3288-715e-4f50-b08c-d38dae7db125', 'réservé', '2025-11-13 14:29:27'),
('5aa8a90e-284a-43a3-9616-3a71853aaab4', '8b1cb8b8-cda9-4da6-9637-9c101f52f48a', 'Orthophonie - Mme Aude', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 09:00:00', '2025-11-24 13:00:00', '9daf3288-715e-4f50-b08c-d38dae7db125', 'réservé', '2025-11-13 14:29:27'),
('9d9c2bb1-9e34-417e-9798-6fd1c493deae', '8b1cb8b8-cda9-4da6-9637-9c101f52f48a', 'Orthophonie - Mme Aude', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 09:00:00', '2025-12-01 13:00:00', '9daf3288-715e-4f50-b08c-d38dae7db125', 'réservé', '2025-11-13 14:29:27'),
('8b761851-f2ee-4aea-ba19-077dfa37ea87', '8b1cb8b8-cda9-4da6-9637-9c101f52f48a', 'Orthophonie - Mme Aude', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 09:00:00', '2025-12-08 13:00:00', '9daf3288-715e-4f50-b08c-d38dae7db125', 'réservé', '2025-11-13 14:29:27'),
('7dcebcd9-3cb6-4d8a-8633-6b67a253941a', '546c9ed4-e9ae-4b45-88bb-fe251f1768ba', 'Chirurgie - Dr Olende', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 14:00:00', '2025-11-17 17:00:00', '6e2e2d74-e523-4013-a1a5-98c6dc0e4c55', 'réservé', '2025-11-13 14:29:28'),
('d2925fad-0bb8-4bb6-9bb2-2db709c8dc90', '546c9ed4-e9ae-4b45-88bb-fe251f1768ba', 'Chirurgie - Dr Olende', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 14:00:00', '2025-11-24 17:00:00', '6e2e2d74-e523-4013-a1a5-98c6dc0e4c55', 'réservé', '2025-11-13 14:29:28'),
('4e41bebd-a58e-4d19-8b66-efdc1ac5be28', '546c9ed4-e9ae-4b45-88bb-fe251f1768ba', 'Chirurgie - Dr Olende', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 14:00:00', '2025-12-01 17:00:00', '6e2e2d74-e523-4013-a1a5-98c6dc0e4c55', 'réservé', '2025-11-13 14:29:28'),
('0b34ba7f-6fdb-4d5e-97cd-da0db77a3060', '546c9ed4-e9ae-4b45-88bb-fe251f1768ba', 'Chirurgie - Dr Olende', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 14:00:00', '2025-12-08 17:00:00', '6e2e2d74-e523-4013-a1a5-98c6dc0e4c55', 'réservé', '2025-11-13 14:29:28'),
('ad185500-4466-4916-aa00-f4356406bceb', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 13:00:00', '2025-11-17 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('590773ac-4f8d-4baa-a73c-f810f493aba4', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 13:00:00', '2025-11-24 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('7357b355-3a06-4f61-9af5-7b55c18e42b1', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 13:00:00', '2025-12-01 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('edcf6f1e-44a3-44f7-9909-d9d8b6417766', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 13:00:00', '2025-12-08 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('b42bb055-4f7a-4451-8c38-02a4fdef73cb', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 15:30:00', '2025-11-17 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-13 14:29:28'),
('abdbc56d-2855-4bb7-b41c-27de2766d072', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-24 15:30:00', '2025-11-24 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-13 14:29:28'),
('2c9c98b6-a80f-4d70-9dde-50436fbca8f8', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-01 15:30:00', '2025-12-01 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-13 14:29:28'),
('bff29aaf-0255-4918-a1fa-00bbda3af609', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-08 15:30:00', '2025-12-08 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-13 14:29:28'),
('bff423af-6f6d-40bf-a744-a1f46f346122', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 06:30:00', '2025-11-18 15:30:00', NULL, 'réservé', '2025-11-13 14:29:28'),
('3ec0674f-38ca-4fd5-a1b8-de975b448864', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 06:30:00', '2025-11-25 15:30:00', NULL, 'réservé', '2025-11-13 14:29:28'),
('42799b5e-8375-405b-bbd6-75fe8e8229cb', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 06:30:00', '2025-12-02 15:30:00', NULL, 'réservé', '2025-11-13 14:29:28'),
('375672d8-3a37-4f16-86ef-1f51f83ee4a1', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 06:30:00', '2025-12-09 15:30:00', NULL, 'réservé', '2025-11-13 14:29:28'),
('e68a3e8c-703a-4764-a919-98455d14c05d', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Gastro-entérologie - Dr Toko', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 07:00:00', '2025-11-18 12:00:00', 'ab64db36-9ad1-400d-8635-c321d5a87954', 'réservé', '2025-11-13 14:29:28'),
('d98b0319-5003-46c6-8248-362936da4991', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Gastro-entérologie - Dr Toko', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 07:00:00', '2025-11-25 12:00:00', 'ab64db36-9ad1-400d-8635-c321d5a87954', 'réservé', '2025-11-13 14:29:28'),
('31c08cb2-c456-408c-91cb-30740705c47b', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Gastro-entérologie - Dr Toko', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 07:00:00', '2025-12-02 12:00:00', 'ab64db36-9ad1-400d-8635-c321d5a87954', 'réservé', '2025-11-13 14:29:28'),
('b81331d9-e724-4eb5-991d-d3150405915a', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Gastro-entérologie - Dr Toko', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 07:00:00', '2025-12-09 12:00:00', 'ab64db36-9ad1-400d-8635-c321d5a87954', 'réservé', '2025-11-13 14:29:28'),
('6dd1a068-1d7b-4a78-b970-1f84fed5a2ad', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Yekini', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 07:00:00', '2025-11-18 12:00:00', 'fe14696c-126a-4790-9798-7a9ef865dcc8', 'réservé', '2025-11-13 14:29:28'),
('b2ec4b1e-1ca0-41e7-802c-ba46cb2ef051', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Yekini', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 07:00:00', '2025-11-25 12:00:00', 'fe14696c-126a-4790-9798-7a9ef865dcc8', 'réservé', '2025-11-13 14:29:28'),
('4fa3ea68-af0f-415e-bae1-44f7a28db62b', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Yekini', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 07:00:00', '2025-12-02 12:00:00', 'fe14696c-126a-4790-9798-7a9ef865dcc8', 'réservé', '2025-11-13 14:29:28'),
('7b61be32-dbf6-45fe-8581-2ac8d23e3ef0', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Yekini', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 07:00:00', '2025-12-09 12:00:00', 'fe14696c-126a-4790-9798-7a9ef865dcc8', 'réservé', '2025-11-13 14:29:28'),
('6a785204-ea1d-41bd-bf74-dc42ebd43fa6', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Bella', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 08:00:00', '2025-11-18 13:00:00', '5f94af5b-0020-4db1-b549-5af4b43d0293', 'réservé', '2025-11-13 14:29:28'),
('60286a65-dd2a-4fbf-8ef9-6f4d91289a23', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Bella', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 08:00:00', '2025-11-25 13:00:00', '5f94af5b-0020-4db1-b549-5af4b43d0293', 'réservé', '2025-11-13 14:29:28'),
('155135aa-4d75-4b59-ab90-7cb7d9ad0bf7', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Bella', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 08:00:00', '2025-12-02 13:00:00', '5f94af5b-0020-4db1-b549-5af4b43d0293', 'réservé', '2025-11-13 14:29:28'),
('f10c22d6-7cb2-479e-aee1-e3f26cc1e2b5', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Bella', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 08:00:00', '2025-12-09 13:00:00', '5f94af5b-0020-4db1-b549-5af4b43d0293', 'réservé', '2025-11-13 14:29:28'),
('3b59b05d-511b-470f-8fb7-70928029254c', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Rhumatologie - Dr Efemba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 13:00:00', '2025-11-18 17:00:00', '8546348b-1b7b-49ea-9e48-250277af15dc', 'réservé', '2025-11-13 14:29:28'),
('31d6479d-4396-4948-81bd-6259a23a7a83', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Rhumatologie - Dr Efemba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 13:00:00', '2025-11-25 17:00:00', '8546348b-1b7b-49ea-9e48-250277af15dc', 'réservé', '2025-11-13 14:29:28'),
('e29917e8-9a16-435e-afed-1dad7603d263', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Rhumatologie - Dr Efemba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 13:00:00', '2025-12-02 17:00:00', '8546348b-1b7b-49ea-9e48-250277af15dc', 'réservé', '2025-11-13 14:29:28');
INSERT INTO bookings (id, room_id, title, booked_by, start_time, end_time, doctor_id, status, created_at) VALUES
('3f0be8f5-b039-4a0d-85b7-917313428fe4', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Rhumatologie - Dr Efemba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 13:00:00', '2025-12-09 17:00:00', '8546348b-1b7b-49ea-9e48-250277af15dc', 'réservé', '2025-11-13 14:29:28'),
('8e79e0ec-1a52-40f1-9b43-9fb37ee9f089', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Sadibi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 13:00:00', '2025-11-18 17:00:00', '6fb484f9-86eb-4e3c-a379-8d0b1d55b134', 'réservé', '2025-11-13 14:29:28'),
('bf17c265-ea2c-473d-8d13-30b75f0e6ea5', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Sadibi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 13:00:00', '2025-11-25 17:00:00', '6fb484f9-86eb-4e3c-a379-8d0b1d55b134', 'réservé', '2025-11-13 14:29:28'),
('c18ff008-c3ed-480b-a464-226439310785', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Sadibi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 13:00:00', '2025-12-02 17:00:00', '6fb484f9-86eb-4e3c-a379-8d0b1d55b134', 'réservé', '2025-11-13 14:29:28'),
('849b95fa-9eda-4919-9838-783236858bbf', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Sadibi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 13:00:00', '2025-12-09 17:00:00', '6fb484f9-86eb-4e3c-a379-8d0b1d55b134', 'réservé', '2025-11-13 14:29:28'),
('3f592a32-ed67-42ff-bd9a-8fb33a47c3e4', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Germany', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 14:00:00', '2025-11-18 17:00:00', 'db3e492a-3b47-4dba-8701-28939361429b', 'réservé', '2025-11-13 14:29:28'),
('e486fb9b-4bfb-472d-a01c-39f285786612', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Germany', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 14:00:00', '2025-11-25 17:00:00', 'db3e492a-3b47-4dba-8701-28939361429b', 'réservé', '2025-11-13 14:29:28'),
('af63eb43-d8de-48cc-bdc8-60c96b786de0', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Germany', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 14:00:00', '2025-12-02 17:00:00', 'db3e492a-3b47-4dba-8701-28939361429b', 'réservé', '2025-11-13 14:29:28'),
('fe809d24-ae15-450e-878b-24a77152256c', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Germany', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 14:00:00', '2025-12-09 17:00:00', 'db3e492a-3b47-4dba-8701-28939361429b', 'réservé', '2025-11-13 14:29:28'),
('51e68536-7440-458c-bd00-aae54e2a596e', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Moupinda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 14:00:00', '2025-11-18 17:00:00', '7eaaccf5-5707-4550-ab47-e06414ef9804', 'réservé', '2025-11-13 14:29:28'),
('e7d64518-ecd4-46c2-bc00-890f2468c623', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Moupinda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 14:00:00', '2025-11-25 17:00:00', '7eaaccf5-5707-4550-ab47-e06414ef9804', 'réservé', '2025-11-13 14:29:28'),
('78d34d57-d5d2-426e-8011-b8fb7d47fcc7', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Moupinda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 14:00:00', '2025-12-02 17:00:00', '7eaaccf5-5707-4550-ab47-e06414ef9804', 'réservé', '2025-11-13 14:29:28'),
('1a0d214f-688a-467e-a43a-9e0829af9a54', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Moupinda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 14:00:00', '2025-12-09 17:00:00', '7eaaccf5-5707-4550-ab47-e06414ef9804', 'réservé', '2025-11-13 14:29:28'),
('07d8ae3a-5d97-4a71-9b0c-068212d3f561', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-18 13:00:00', '2025-11-18 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('8f4ba79f-be26-466e-8348-cf5ddcc7a1cd', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-25 13:00:00', '2025-11-25 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('1a2ab090-e81e-4e2e-a15e-88393e738c28', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-02 13:00:00', '2025-12-02 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('f5ee53bb-132e-45f5-aa0a-8b0710f07af6', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-09 13:00:00', '2025-12-09 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('d061b5ae-aa0c-409d-a9b8-90c7d35eb435', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 06:30:00', '2025-11-19 15:30:00', NULL, 'réservé', '2025-11-13 14:29:28'),
('64cc4692-1a4f-4ae4-bff9-9ed3e10e44cd', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 06:30:00', '2025-11-26 15:30:00', NULL, 'réservé', '2025-11-13 14:29:28'),
('49d5cc49-76b7-49c4-9630-5573ee1d725e', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 06:30:00', '2025-12-03 15:30:00', NULL, 'réservé', '2025-11-13 14:29:28'),
('ace0e769-c9cf-48e6-a128-687445d027a2', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 06:30:00', '2025-12-10 15:30:00', NULL, 'réservé', '2025-11-13 14:29:28'),
('3bc22ece-87f1-4424-bb7c-5287e1c76f9b', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 07:00:00', '2025-11-19 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:28'),
('21657bb0-1790-4a06-85c0-5e26a9a5692c', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 07:00:00', '2025-11-26 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:28'),
('fb6b0d61-7876-40b1-8f26-07350b452d3e', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 07:00:00', '2025-12-03 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:28'),
('4d57b73b-5bca-403d-998d-4367abe16799', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 07:00:00', '2025-12-10 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:28'),
('47ffeb03-d435-44b7-a5b4-aafc2a6261b0', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 07:00:00', '2025-11-19 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 14:29:28'),
('c3d9dd72-8a32-4a54-b63c-cb7cc7170c10', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 07:00:00', '2025-11-26 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 14:29:28'),
('18d75c6f-6f4d-43c2-8878-0582d779b7ad', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 07:00:00', '2025-12-03 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 14:29:28'),
('c7808e94-e4a1-4342-90ac-d9407d00cb3e', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 07:00:00', '2025-12-10 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-13 14:29:28'),
('c32c51d8-9c1d-4d47-9b39-1ca97a040a37', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Gastro-entérologie - Dr Itoudi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 07:00:00', '2025-11-19 12:00:00', '4d9eb610-07d0-4848-82fd-58dbcd49aad9', 'réservé', '2025-11-13 14:29:28'),
('fb3d864e-0fe3-4e1e-adf6-2ef43c2fe698', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Gastro-entérologie - Dr Itoudi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 07:00:00', '2025-11-26 12:00:00', '4d9eb610-07d0-4848-82fd-58dbcd49aad9', 'réservé', '2025-11-13 14:29:28'),
('48a3588b-4acc-4dd0-b9d4-79c355242d38', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Gastro-entérologie - Dr Itoudi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 07:00:00', '2025-12-03 12:00:00', '4d9eb610-07d0-4848-82fd-58dbcd49aad9', 'réservé', '2025-11-13 14:29:28'),
('48086729-3f75-4e83-be2d-9bfb970ec740', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Gastro-entérologie - Dr Itoudi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 07:00:00', '2025-12-10 12:00:00', '4d9eb610-07d0-4848-82fd-58dbcd49aad9', 'réservé', '2025-11-13 14:29:28'),
('f2860fe7-d021-4895-9eb5-ba5921c18230', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Infectiologie - Dr Kiki', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 13:00:00', '2025-11-19 16:00:00', '199030f4-3485-4719-bede-86405c591f5e', 'réservé', '2025-11-13 14:29:28'),
('292df906-d21a-43b4-a08d-cbe97c0674ae', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Infectiologie - Dr Kiki', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 13:00:00', '2025-11-26 16:00:00', '199030f4-3485-4719-bede-86405c591f5e', 'réservé', '2025-11-13 14:29:28'),
('ea544155-1392-4b5b-8dfa-a2dd44ad67c1', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Infectiologie - Dr Kiki', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 13:00:00', '2025-12-03 16:00:00', '199030f4-3485-4719-bede-86405c591f5e', 'réservé', '2025-11-13 14:29:28'),
('bec566c8-2ae9-4b08-9075-2ecaca5b10a0', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Infectiologie - Dr Kiki', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 13:00:00', '2025-12-10 16:00:00', '199030f4-3485-4719-bede-86405c591f5e', 'réservé', '2025-11-13 14:29:28'),
('22d9a11a-6335-46a4-a7cf-50f26025afe1', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 13:00:00', '2025-11-19 16:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 14:29:28'),
('02064413-f964-400b-9587-0a7ce0b34477', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 13:00:00', '2025-11-26 16:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 14:29:28'),
('31a9930e-78d8-493a-ba1d-bea143accc16', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 13:00:00', '2025-12-03 16:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 14:29:28'),
('d5555b7e-d9d2-4d4e-96a8-0c1b48f45065', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 13:00:00', '2025-12-10 16:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 14:29:28'),
('928feda5-62e7-48a1-b59f-335c330165c2', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 13:00:00', '2025-11-19 17:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:28'),
('ba4872c3-fc48-4b4b-90ab-b30f98a44be1', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 13:00:00', '2025-11-26 17:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:28'),
('d60de128-ad25-4ffa-9a73-83aad78746a9', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 13:00:00', '2025-12-03 17:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:28'),
('28a8fd71-2c08-4c16-9f2f-5a15bba2975c', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 13:00:00', '2025-12-10 17:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:28'),
('9b2eaf64-d86d-42b6-9283-f8aa4cf2d51b', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 13:00:00', '2025-11-19 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('eef20fff-5188-474e-b67e-ad57383f114f', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 13:00:00', '2025-11-26 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('85c9df22-343a-4825-ae8a-65dec6dd717e', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 13:00:00', '2025-12-03 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('ec91cc95-4bf9-4bbd-b5ab-08a77d36b049', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 13:00:00', '2025-12-10 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:28'),
('fc2dcb14-9c13-4d2b-8408-8d0b697c3d85', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-19 15:30:00', '2025-11-19 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-13 14:29:28'),
('ae563379-5eae-4188-b79e-e2db9dfcecbd', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-26 15:30:00', '2025-11-26 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-13 14:29:28'),
('859cd914-6a69-41bc-a388-2ae280b1816e', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-03 15:30:00', '2025-12-03 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-13 14:29:29'),
('67bbe43c-94cc-41d4-b75b-834581822c2b', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-10 15:30:00', '2025-12-10 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-13 14:29:29'),
('96623aca-1e9c-4b14-944c-fec110d8ab67', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 06:30:00', '2025-11-13 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('beff26ed-e1ec-4d43-93d7-81245ab23be0', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 06:30:00', '2025-11-20 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('83120b31-0c51-44e9-b9cb-98c66355d754', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 06:30:00', '2025-11-27 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('6cd11927-beb6-45df-b3f3-7506a4a5f82f', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 06:30:00', '2025-12-04 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('8ec8a50f-2758-46a4-bb2a-e6e98d08d2db', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 07:00:00', '2025-11-13 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 14:29:29'),
('35eb690d-91b2-49bf-83ac-50620dc35c80', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 07:00:00', '2025-11-20 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 14:29:29'),
('d3bd1686-2e63-4f80-bd3d-76516ba29141', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 07:00:00', '2025-11-27 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 14:29:29'),
('b21b75f7-9cf5-4416-8a87-66c9ea63f7ad', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 07:00:00', '2025-12-04 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 14:29:29'),
('60ca9bd2-836a-42fc-b3db-8bf8291beba6', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Sadibi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 13:00:00', '2025-11-13 17:00:00', '6fb484f9-86eb-4e3c-a379-8d0b1d55b134', 'réservé', '2025-11-13 14:29:29'),
('d3ae410c-f8ed-44cd-b176-b8ef73d6e288', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Sadibi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 13:00:00', '2025-11-20 17:00:00', '6fb484f9-86eb-4e3c-a379-8d0b1d55b134', 'réservé', '2025-11-13 14:29:29'),
('2053f816-223e-453f-8d3e-6179fe97ea59', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Sadibi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 13:00:00', '2025-11-27 17:00:00', '6fb484f9-86eb-4e3c-a379-8d0b1d55b134', 'réservé', '2025-11-13 14:29:29'),
('7cccb833-9c48-4800-8b29-30fe2777a6c6', '75af456b-4998-44b4-90b6-2ceb7225619b', 'Dermatologie - Dr Sadibi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 13:00:00', '2025-12-04 17:00:00', '6fb484f9-86eb-4e3c-a379-8d0b1d55b134', 'réservé', '2025-11-13 14:29:29'),
('6901c051-7f85-4edc-bf62-d4de7c333ec5', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 14:00:00', '2025-11-13 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 14:29:29'),
('7a2ea7b0-c7fa-4163-b64f-6c0bcff0d243', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 14:00:00', '2025-11-20 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 14:29:29'),
('deb74290-f4b8-4154-a836-f8c0b070d41d', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 14:00:00', '2025-11-27 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 14:29:29'),
('9958ecfd-2a83-4f93-a36d-d051c3134e31', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 14:00:00', '2025-12-04 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-13 14:29:29'),
('faaa8dca-e75c-428b-9105-2a05f3831e21', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-13 13:00:00', '2025-11-13 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:29'),
('8c40e154-7750-46be-8099-e2f9fc889f55', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-20 13:00:00', '2025-11-20 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:29'),
('1d93822e-3eda-4a3e-b48f-452c7216d9fd', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-27 13:00:00', '2025-11-27 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:29'),
('66ffd510-e0e7-4592-b7db-5ce6ebea540c', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Mekina', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-04 13:00:00', '2025-12-04 15:30:00', 'c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'réservé', '2025-11-13 14:29:29'),
('376df77c-9320-4f5f-ab1b-d9367079bba3', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 06:30:00', '2025-11-14 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('e622ab72-c5b5-419d-b275-12bc73c9ed98', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 06:30:00', '2025-11-21 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('08641179-c998-4ea7-a1c4-92f750e8f5c9', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 06:30:00', '2025-11-28 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('3aa16086-78ab-4e7f-b7c4-c9bf8d81ef69', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 06:30:00', '2025-12-05 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('ef4818b8-828b-40a0-a555-0614c54012cf', 'e14ec1ad-9d3d-48ae-9211-5c202058bc53', 'Urologie - Dr Lembangoye', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 07:00:00', '2025-11-14 12:00:00', '4ce3f2e6-85cb-465e-8a94-004b1419cc9a', 'réservé', '2025-11-13 14:29:29'),
('ba5e1b1a-0c57-45ea-b5d1-f40a98786688', 'e14ec1ad-9d3d-48ae-9211-5c202058bc53', 'Urologie - Dr Lembangoye', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 07:00:00', '2025-11-21 12:00:00', '4ce3f2e6-85cb-465e-8a94-004b1419cc9a', 'réservé', '2025-11-13 14:29:29'),
('5bc5aee1-4fbc-4a7e-953a-0324070fe7a0', 'e14ec1ad-9d3d-48ae-9211-5c202058bc53', 'Urologie - Dr Lembangoye', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 07:00:00', '2025-11-28 12:00:00', '4ce3f2e6-85cb-465e-8a94-004b1419cc9a', 'réservé', '2025-11-13 14:29:29'),
('3158b97c-0788-431d-9eb6-6dcb852fc5d5', 'e14ec1ad-9d3d-48ae-9211-5c202058bc53', 'Urologie - Dr Lembangoye', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 07:00:00', '2025-12-05 12:00:00', '4ce3f2e6-85cb-465e-8a94-004b1419cc9a', 'réservé', '2025-11-13 14:29:29'),
('cd44e059-3223-4de6-86aa-6ed97cec1f1d', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 07:00:00', '2025-11-14 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:29'),
('e5b7914a-4144-4657-b78c-399bd697fa4d', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 07:00:00', '2025-11-21 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:29'),
('d09bfdc1-e7f1-4a0c-a0c6-0af025ad3b67', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 07:00:00', '2025-11-28 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:29'),
('39ed59bd-217d-4082-9094-3b6a6f5a59fb', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 07:00:00', '2025-12-05 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:29'),
('98959c12-091d-4303-a40f-1b8a7b283415', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 07:00:00', '2025-11-14 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 14:29:29'),
('3c6a47f7-8a3a-40cd-ab25-92a29bf7b9fb', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 07:00:00', '2025-11-21 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 14:29:29'),
('dede7afa-6e17-4ac1-ac02-4a0850bcf499', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 07:00:00', '2025-11-28 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 14:29:29'),
('de9679bc-6c25-4e2a-b167-e8d2030ea9b0', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 07:00:00', '2025-12-05 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-13 14:29:29'),
('4a46a563-b866-48d3-b675-74973699599c', '98e5914f-0b88-490e-94b9-1f0fa5720667', 'Orthopédie - Dr Nguiabanda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 13:00:00', '2025-11-14 17:00:00', '87a554cc-e702-4833-8b50-508b5f532b4a', 'réservé', '2025-11-13 14:29:29'),
('8de98db3-8e20-4eb1-a8ae-fa4257a2ac2b', '98e5914f-0b88-490e-94b9-1f0fa5720667', 'Orthopédie - Dr Nguiabanda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 13:00:00', '2025-11-21 17:00:00', '87a554cc-e702-4833-8b50-508b5f532b4a', 'réservé', '2025-11-13 14:29:29'),
('cd74badd-c213-4e90-bc67-e707f9d0d3a6', '98e5914f-0b88-490e-94b9-1f0fa5720667', 'Orthopédie - Dr Nguiabanda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 13:00:00', '2025-11-28 17:00:00', '87a554cc-e702-4833-8b50-508b5f532b4a', 'réservé', '2025-11-13 14:29:29'),
('211ce749-7051-430c-a668-8acfe8a1616e', '98e5914f-0b88-490e-94b9-1f0fa5720667', 'Orthopédie - Dr Nguiabanda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 13:00:00', '2025-12-05 17:00:00', '87a554cc-e702-4833-8b50-508b5f532b4a', 'réservé', '2025-11-13 14:29:29'),
('3f1a07c4-9d58-492c-988c-dd5d2976b66b', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Rhumatologie - Dr Efemba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 13:00:00', '2025-11-14 17:00:00', '8546348b-1b7b-49ea-9e48-250277af15dc', 'réservé', '2025-11-13 14:29:29'),
('22db6f34-9e33-4d4f-94bb-45f8bf31faa0', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Rhumatologie - Dr Efemba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 13:00:00', '2025-11-21 17:00:00', '8546348b-1b7b-49ea-9e48-250277af15dc', 'réservé', '2025-11-13 14:29:29'),
('ce62a5c5-be80-4056-b782-e664a1f5350a', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Rhumatologie - Dr Efemba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 13:00:00', '2025-11-28 17:00:00', '8546348b-1b7b-49ea-9e48-250277af15dc', 'réservé', '2025-11-13 14:29:29'),
('1472c887-2d6a-4ca8-a26e-38614c202a35', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Rhumatologie - Dr Efemba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 13:00:00', '2025-12-05 17:00:00', '8546348b-1b7b-49ea-9e48-250277af15dc', 'réservé', '2025-11-13 14:29:29'),
('8e2c14b8-8391-419b-baa1-99f3fd5d431c', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Yekini', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 13:00:00', '2025-11-14 17:00:00', 'fe14696c-126a-4790-9798-7a9ef865dcc8', 'réservé', '2025-11-13 14:29:29'),
('854f62da-5ddb-4b4f-b2b2-ea837c93eab9', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Yekini', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 13:00:00', '2025-11-21 17:00:00', 'fe14696c-126a-4790-9798-7a9ef865dcc8', 'réservé', '2025-11-13 14:29:29'),
('872f4b76-e75d-432e-a312-7682750a94cb', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Yekini', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 13:00:00', '2025-11-28 17:00:00', 'fe14696c-126a-4790-9798-7a9ef865dcc8', 'réservé', '2025-11-13 14:29:29'),
('273d0431-c690-4d15-835c-4fd1bfd1936c', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Yekini', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 13:00:00', '2025-12-05 17:00:00', 'fe14696c-126a-4790-9798-7a9ef865dcc8', 'réservé', '2025-11-13 14:29:29'),
('9d306b87-133c-40e2-986c-9f373fb4fee7', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 13:00:00', '2025-11-14 17:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:29'),
('251a1683-48fb-4105-a679-8e400c5bfb8e', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 13:00:00', '2025-11-21 17:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:29'),
('9e0b6bc8-7a55-4204-b078-1762f6e2d43e', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 13:00:00', '2025-11-28 17:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:29'),
('d0a42270-490c-4b4b-a7da-ee971c73f6d8', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 13:00:00', '2025-12-05 17:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:29'),
('195eecbb-fa82-4ed0-b585-42f216f4d385', 'a21cc437-2db8-44cd-8f58-1569ec8c7669', 'Fibroscopie - Dr Ngoma', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 14:00:00', '2025-11-14 17:00:00', 'c8de7b54-ce6b-4d8b-91bb-500515c21978', 'réservé', '2025-11-13 14:29:29'),
('108d526f-1f2b-48eb-9b82-2eb203f8e10c', 'a21cc437-2db8-44cd-8f58-1569ec8c7669', 'Fibroscopie - Dr Ngoma', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 14:00:00', '2025-11-21 17:00:00', 'c8de7b54-ce6b-4d8b-91bb-500515c21978', 'réservé', '2025-11-13 14:29:29'),
('95542ecd-e844-41b2-9f36-7e3ecabea15f', 'a21cc437-2db8-44cd-8f58-1569ec8c7669', 'Fibroscopie - Dr Ngoma', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 14:00:00', '2025-11-28 17:00:00', 'c8de7b54-ce6b-4d8b-91bb-500515c21978', 'réservé', '2025-11-13 14:29:29'),
('bed9b1dc-d4a5-4d45-bd39-820a3d1d092b', 'a21cc437-2db8-44cd-8f58-1569ec8c7669', 'Fibroscopie - Dr Ngoma', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 14:00:00', '2025-12-05 17:00:00', 'c8de7b54-ce6b-4d8b-91bb-500515c21978', 'réservé', '2025-11-13 14:29:29'),
('ebf483f2-5a7a-405d-92a7-a7d4eed8812b', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Moupinda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-14 14:00:00', '2025-11-14 17:00:00', '7eaaccf5-5707-4550-ab47-e06414ef9804', 'réservé', '2025-11-13 14:29:29'),
('0171c907-6c7d-4a8f-b374-1a09f0ef7bd8', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Moupinda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-21 14:00:00', '2025-11-21 17:00:00', '7eaaccf5-5707-4550-ab47-e06414ef9804', 'réservé', '2025-11-13 14:29:29'),
('f7d9ce46-7e88-4ab5-af36-b7a998e55dfb', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Moupinda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-28 14:00:00', '2025-11-28 17:00:00', '7eaaccf5-5707-4550-ab47-e06414ef9804', 'réservé', '2025-11-13 14:29:29'),
('4bc3006a-675f-4646-a638-300b99efaeed', '79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Cardiologie - Dr Moupinda', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-05 14:00:00', '2025-12-05 17:00:00', '7eaaccf5-5707-4550-ab47-e06414ef9804', 'réservé', '2025-11-13 14:29:29'),
('f4f4d4d6-4358-4a84-b2ed-487af4a542b2', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 06:30:00', '2025-11-15 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('dbd07562-9847-4318-9358-f92b8f7e58eb', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 06:30:00', '2025-11-22 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('41cb5489-540b-45e1-8e1c-6d4c5ccfb9a9', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 06:30:00', '2025-11-29 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('64331976-ce90-436f-8625-e6a358d9b00d', '1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 06:30:00', '2025-12-06 15:30:00', NULL, 'réservé', '2025-11-13 14:29:29'),
('357ee262-d7f2-4e0c-a904-8242c288ab49', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Endocrinologie - Dr Anguezomo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 07:00:00', '2025-11-15 12:00:00', 'f8c233f9-4eea-4f41-8a3a-15a4dbc16883', 'réservé', '2025-11-13 14:29:29'),
('b646ebfb-4b08-4a33-b67d-5205384fc9e9', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Endocrinologie - Dr Anguezomo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 07:00:00', '2025-11-22 12:00:00', 'f8c233f9-4eea-4f41-8a3a-15a4dbc16883', 'réservé', '2025-11-13 14:29:29'),
('2e05330a-6ca2-4aca-933b-5d00203489cf', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Endocrinologie - Dr Anguezomo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 07:00:00', '2025-11-29 12:00:00', 'f8c233f9-4eea-4f41-8a3a-15a4dbc16883', 'réservé', '2025-11-13 14:29:29'),
('8d5c1e7a-35f1-44f8-a20b-3b4261339d06', '325c662b-45d8-477a-bb57-559b33b89a2f', 'Endocrinologie - Dr Anguezomo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 07:00:00', '2025-12-06 12:00:00', 'f8c233f9-4eea-4f41-8a3a-15a4dbc16883', 'réservé', '2025-11-13 14:29:29'),
('bfebacb1-1d0a-43ca-b47a-1d4c7f45e81d', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 07:00:00', '2025-11-15 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:29'),
('d6030110-4582-432b-b149-88a37eaa849d', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 07:00:00', '2025-11-22 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:29'),
('6580c555-57c0-471d-add1-d2986c8ea30e', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 07:00:00', '2025-11-29 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:29'),
('9013079f-9a6d-456a-ab60-97ac87bc8d4d', '04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Ophtalmologie - Dr Apedo', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 07:00:00', '2025-12-06 12:00:00', '4472f60e-ebaa-424b-94ec-39f893cd1eba', 'réservé', '2025-11-13 14:29:29'),
('c2b486eb-7b14-45ea-8e79-563a3c7ad389', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-15 08:00:00', '2025-11-15 13:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:29'),
('dd32472b-f7d2-4dc2-81bd-7b506787841d', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-22 08:00:00', '2025-11-22 13:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:29'),
('8534fb11-edb6-4993-a23d-bb2c468e050d', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-29 08:00:00', '2025-11-29 13:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:29'),
('95d89258-dd90-4df3-9a1a-2cdf0e646427', 'cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Dentisterie - Dr Nang', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-06 08:00:00', '2025-12-06 13:00:00', '6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'réservé', '2025-11-13 14:29:29'),
('0e4e6f60-c786-4bfb-aa99-79519808b570', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-11 06:30:00', '2025-12-11 15:30:00', NULL, 'réservé', '2025-11-14 13:45:08'),
('7a433bca-25fb-4ff6-a973-8b137e9048cb', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-11 06:30:00', '2025-12-11 15:30:00', NULL, 'réservé', '2025-11-14 13:45:08'),
('5c6a7f15-5b81-4535-b67e-eb4f5b83a4c9', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-11 07:00:00', '2025-12-11 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-14 13:45:08'),
('f8fc6537-4ab1-44ec-b3b5-f9c35834dd93', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-11 07:00:00', '2025-12-11 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-14 13:45:08'),
('f2f685e0-d4db-4db4-afe9-712581632cdb', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-11 09:00:00', '2025-12-11 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2025-11-14 13:45:08'),
('7ab0f2cc-f9d0-4ca9-8f51-bcbb6e8bea9f', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-11 13:00:00', '2025-12-11 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-14 13:45:08'),
('1aeede55-c606-4a5a-81d8-257e66899b84', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-12 06:30:00', '2025-12-12 15:30:00', NULL, 'réservé', '2025-11-15 07:47:08'),
('5d8b1343-aa47-4052-a199-ffd6b7f6a896', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-12 06:30:00', '2025-12-12 15:30:00', NULL, 'réservé', '2025-11-15 07:47:08'),
('cdc73b51-da3c-4807-8b7c-519a683561b4', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-12 07:00:00', '2025-12-12 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-15 07:47:08'),
('6adf6ef3-3ef8-4564-a43d-58cc3d7f8ac1', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-12 07:00:00', '2025-12-12 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-15 07:47:08'),
('e5483adf-097f-4b87-8997-066f13e04ac3', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-12 14:00:00', '2025-12-12 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-15 07:47:08'),
('060c84c1-157c-477e-95b1-a5325ae6ab69', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-12 14:00:00', '2025-12-12 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2025-11-15 07:47:08'),
('c0cd5bcb-92a0-4671-931d-48b64f366f89', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-13 06:30:00', '2025-12-13 15:30:00', NULL, 'réservé', '2025-11-16 16:27:47'),
('3a2ed405-60ad-471d-8449-d21e57cabcad', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-13 06:30:00', '2025-12-13 15:30:00', NULL, 'réservé', '2025-11-16 16:27:47'),
('235d7db5-72e6-4e55-9389-8741c6c4c4f2', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-13 07:00:00', '2025-12-13 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2025-11-16 16:27:47'),
('b5c4b38f-3b8a-4fbe-a32c-2cabf3990726', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-13 08:00:00', '2025-12-13 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-16 16:27:47'),
('3d5cb0f7-dd90-4e8f-a86c-132330a42f94', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-13 08:00:00', '2025-12-13 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-16 16:27:47'),
('f572c82e-1e1c-4b0b-a175-9a37921549a1', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-13 08:00:00', '2025-12-13 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-16 16:27:47'),
('f3f366c6-d93b-463f-a544-cd1b2157a2f0', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-11-17 06:30:00', '2025-11-17 15:30:00', NULL, 'réservé', '2025-11-16 19:29:58'),
('64a4c0fb-45b7-44c4-a73b-d0268dbde250', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-15 06:30:00', '2025-12-15 15:30:00', NULL, 'réservé', '2025-11-18 06:52:38'),
('edda8b3f-2876-4d04-9048-d821879a6d26', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-15 06:30:00', '2025-12-15 15:30:00', NULL, 'réservé', '2025-11-18 06:52:38'),
('64281660-9ceb-4aa3-a93c-d84d5fae38d0', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-15 07:00:00', '2025-12-15 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-18 06:52:38'),
('a53a177a-a547-4e04-a55c-28d7e195610a', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-15 07:00:00', '2025-12-15 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-18 06:52:38'),
('60945786-9137-4d42-905a-717dc6cfbcfa', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-15 13:00:00', '2025-12-15 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-18 06:52:38'),
('1e1ea588-083b-48db-b252-1abe8590bb48', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-15 13:00:00', '2025-12-15 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-18 06:52:38'),
('536909eb-6f9c-4987-a9b0-9949ff69eb21', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-16 06:30:00', '2025-12-16 15:30:00', NULL, 'réservé', '2025-11-19 09:45:22'),
('d1d93c2b-fb81-4642-b7fe-96493be4d058', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-16 06:30:00', '2025-12-16 15:30:00', NULL, 'réservé', '2025-11-19 09:45:22'),
('1aa831e8-fb7c-4a14-be02-98a6652af075', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-16 13:00:00', '2025-12-16 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2025-11-19 09:45:22'),
('6e13f9e8-f50d-444f-914e-9d30c1df4b52', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-16 07:00:00', '2025-12-16 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-19 09:45:22'),
('3b0a1c05-de1e-40ef-af90-f0be2a10f2a3', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-16 13:00:00', '2025-12-16 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-19 09:45:22'),
('a3e2ae94-46a4-409e-92fc-3a285eaa4646', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-16 07:00:00', '2025-12-16 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-19 09:45:22'),
('4da355f7-2d36-4f48-a55e-a118598b7488', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-17 06:30:00', '2025-12-17 15:30:00', NULL, 'réservé', '2025-11-20 08:40:38'),
('f8f828fd-8d8b-4a2c-b753-4e98bdc1839b', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-17 06:30:00', '2025-12-17 15:30:00', NULL, 'réservé', '2025-11-20 08:40:38'),
('bd59debd-45e9-4e15-b0c5-3c8c749b4e6b', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-17 07:00:00', '2025-12-17 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-20 08:40:38'),
('f358a926-86bc-4de5-b557-4b57f1de7e99', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-17 14:00:00', '2025-12-17 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2025-11-20 08:40:38'),
('5435c590-ca9e-41f1-893f-ec9f460633c8', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-17 14:00:00', '2025-12-17 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-20 08:40:38'),
('dccb46a5-5f58-49a2-a23f-48c4fea216b7', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-17 13:00:00', '2025-12-17 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-20 08:40:38'),
('7c3eeaa5-22e0-46dd-a83a-0974e1a8d437', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-18 06:30:00', '2025-12-18 15:30:00', NULL, 'réservé', '2025-11-21 09:50:52'),
('e9f7598a-0558-4f60-b009-31f810651b9f', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-18 06:30:00', '2025-12-18 15:30:00', NULL, 'réservé', '2025-11-21 09:50:52'),
('5b0ad46e-248b-4584-b799-46de1747ca8d', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-18 07:00:00', '2025-12-18 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-21 09:50:52'),
('5ac1b3f1-85b9-4d24-a69d-ca80f4353a0e', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-18 07:00:00', '2025-12-18 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-21 09:50:52'),
('1bf5680f-b32d-4cc8-846b-f6e419b7d940', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-18 09:00:00', '2025-12-18 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2025-11-21 09:50:52'),
('a2237a16-278f-4e3f-b03e-73c01aaa3511', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-18 13:00:00', '2025-12-18 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-21 09:50:52'),
('e10f9e52-b817-4d28-9639-0290b8f4b175', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-22 06:30:00', '2025-12-22 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('3e0f9cb0-ea58-4965-8c62-303c84cd22dc', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-22 06:30:00', '2025-12-22 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('da0e6de8-1b1e-4254-a23f-80337ba0aec2', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-22 07:00:00', '2025-12-22 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-29 07:34:57'),
('9f5d2deb-0074-4b37-85b8-82ac7a684023', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-22 07:00:00', '2025-12-22 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-29 07:34:57'),
('b8145a93-0573-4438-8ce7-61c09a2afc50', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-22 13:00:00', '2025-12-22 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-29 07:34:57'),
('ba5a6e88-1a35-4bb4-811b-90e1f91f7c71', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-22 13:00:00', '2025-12-22 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-29 07:34:57'),
('e06d761e-69d9-490f-b37c-e322a664a102', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-23 06:30:00', '2025-12-23 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('4c1337e7-1be2-4019-8e13-0c9e2d561194', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-23 06:30:00', '2025-12-23 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('ec67fa52-3e74-4935-873f-9ccb492017fb', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-23 13:00:00', '2025-12-23 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2025-11-29 07:34:57'),
('c6e0938c-b217-4f41-b70c-c6509c2f17d6', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-23 07:00:00', '2025-12-23 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-29 07:34:57'),
('4cc22c08-fb3c-4cc4-b6aa-e92c061e3ace', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-23 13:00:00', '2025-12-23 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-29 07:34:57'),
('053e1fdb-cee0-4701-977f-1c1a4fbe63b2', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-23 07:00:00', '2025-12-23 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2025-11-29 07:34:57'),
('e54be444-bd73-4bda-ad94-cb45d0abe218', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-24 06:30:00', '2025-12-24 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('cada6385-55be-4529-9e1f-5dd7235a71f8', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-24 06:30:00', '2025-12-24 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('3970eb83-a7f8-48ab-bd58-1cda4c84d463', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-24 07:00:00', '2025-12-24 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-29 07:34:57'),
('407720c1-db59-42fd-bd40-b6b4ef19fce6', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-24 14:00:00', '2025-12-24 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2025-11-29 07:34:57'),
('9f3e5003-e8b8-4161-aba2-8a2ae63e0b73', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-24 14:00:00', '2025-12-24 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-29 07:34:57'),
('6ac3e403-c82c-4727-a479-eaf6590c3066', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-24 13:00:00', '2025-12-24 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2025-11-29 07:34:57'),
('69c18a83-068f-43aa-90e9-1ddda9262c4a', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-25 06:30:00', '2025-12-25 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('f55d9d89-fe08-4e66-b874-07bb518cf9c6', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-25 06:30:00', '2025-12-25 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57');
INSERT INTO bookings (id, room_id, title, booked_by, start_time, end_time, doctor_id, status, created_at) VALUES
('f611ab9a-67bc-417a-bf76-5dfa995948ba', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-25 07:00:00', '2025-12-25 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-29 07:34:57'),
('cfec284a-fc9f-4f06-a2f5-1295535f3502', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-25 07:00:00', '2025-12-25 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-29 07:34:57'),
('1ddc2907-dfee-41e3-b382-5e18df81897f', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-25 09:00:00', '2025-12-25 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2025-11-29 07:34:57'),
('35305f6b-a568-4be6-9e1b-2888d273b8ac', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-25 13:00:00', '2025-12-25 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-29 07:34:57'),
('b0c6d4a3-50c1-433e-8e91-3cabcb03ba44', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-19 06:30:00', '2025-12-19 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('8b98d682-34d8-486a-8fbd-5d2e1aab4739', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-26 06:30:00', '2025-12-26 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('3e7272db-c7c6-47a6-a513-68c0d655faab', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-19 06:30:00', '2025-12-19 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('fed383f8-a0bd-4b5d-8cc5-a0707b45c4ce', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-26 06:30:00', '2025-12-26 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('4d423c70-5ec2-4b57-8bc9-b92640526d76', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-19 07:00:00', '2025-12-19 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-29 07:34:57'),
('fe15ee49-c068-463f-841d-a96a95c2bb20', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-26 07:00:00', '2025-12-26 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2025-11-29 07:34:57'),
('2fb20f0d-6c3e-4a5b-b7e0-89a907419183', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-19 07:00:00', '2025-12-19 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-29 07:34:57'),
('e59fe681-6ffd-42fc-80b1-27290e53eea9', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-26 07:00:00', '2025-12-26 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-29 07:34:57'),
('32a763cd-7215-43d0-ab2c-a90025b88b0c', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-19 14:00:00', '2025-12-19 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-29 07:34:57'),
('8266a9e6-5925-48e1-acb4-2ec8fdfe2c63', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-26 14:00:00', '2025-12-26 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2025-11-29 07:34:57'),
('b9ebeb42-42a6-4009-9bfb-4b58a40a44ef', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-19 14:00:00', '2025-12-19 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2025-11-29 07:34:57'),
('e079c253-f22d-41ee-b072-50c094d67354', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-26 14:00:00', '2025-12-26 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2025-11-29 07:34:57'),
('98ba49d0-a808-45a5-8d6f-cd920c735d07', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-20 06:30:00', '2025-12-20 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('c2d32bf3-fae7-469c-8483-954c02225b08', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-20 06:30:00', '2025-12-20 15:30:00', NULL, 'réservé', '2025-11-29 07:34:57'),
('7a6128c4-7500-4641-a7a1-e48e21e4bd29', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-20 07:00:00', '2025-12-20 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2025-11-29 07:34:57'),
('5cca63be-0e85-4731-8438-3162e40a43bf', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-20 08:00:00', '2025-12-20 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2025-11-29 07:34:57'),
('cb4e771b-d8d4-465e-a4dd-8633c9d610e9', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-20 08:00:00', '2025-12-20 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2025-11-29 07:34:57'),
('1888f39b-f616-4265-95eb-ddedfad3ad67', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2025-12-20 08:00:00', '2025-12-20 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2025-11-29 07:34:57'),
('5e09dbf0-ae2c-4d76-b0f1-756f0c10cd2a', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-12 06:30:00', '2026-01-12 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('81da75ab-0548-4473-8805-779d6a5727c0', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-19 06:30:00', '2026-01-19 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('4c949740-34e5-45a1-9ce9-6696839e235b', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-26 06:30:00', '2026-01-26 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('ae56cda8-6ff0-44fd-84f7-4ab1994fcb6c', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-02 06:30:00', '2026-02-02 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('0219f61d-87a2-4172-87ae-a7445f350553', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-12 06:30:00', '2026-01-12 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('9b047dbd-5491-48cd-b866-6a8a2fefeb0c', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-19 06:30:00', '2026-01-19 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('58e88c57-2211-4852-9f2d-46ace2c755fe', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-26 06:30:00', '2026-01-26 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('d2e16620-2c81-4646-96b8-b8b07269a03c', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-02 06:30:00', '2026-02-02 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('1886b40a-d49f-49b1-af76-3a4c583f1ead', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-12 07:00:00', '2026-01-12 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:01'),
('154464a8-3c9d-4574-92e6-4a90625e857b', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-19 07:00:00', '2026-01-19 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:01'),
('0718c93c-744c-4338-925e-f23bdb42741f', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-26 07:00:00', '2026-01-26 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:01'),
('e24b06d0-e2b3-4abf-b71f-d4e9835158bd', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-02 07:00:00', '2026-02-02 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:01'),
('c7b30bc9-35db-4eb8-9f56-eb647f2e01fc', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-12 07:00:00', '2026-01-12 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:01'),
('c74ba25b-6cee-42e7-a320-b5051d0571b6', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-19 07:00:00', '2026-01-19 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:01'),
('4be8bb96-447e-4293-9718-79687322ca8c', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-26 07:00:00', '2026-01-26 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:01'),
('3611eb8d-5046-441b-8a38-85b7e70c4b8a', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-02 07:00:00', '2026-02-02 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:01'),
('19a24a69-e6fc-4801-bf28-90c28379f0ff', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-12 13:00:00', '2026-01-12 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:01'),
('2240fc0c-4472-48f0-b570-27911eb68fdb', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-19 13:00:00', '2026-01-19 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:01'),
('d399664c-2454-40ae-9c70-cc4a5579d59e', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-26 13:00:00', '2026-01-26 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:01'),
('06492e39-4023-4839-9f1f-bd3f227aafec', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-02 13:00:00', '2026-02-02 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:01'),
('2a8ad87e-5887-41fd-bb1f-9d7717d6722e', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-12 13:00:00', '2026-01-12 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-01-12 12:09:01'),
('7c7292f5-6a40-4710-9f83-11911c3401fd', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-19 13:00:00', '2026-01-19 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-01-12 12:09:01'),
('cece3b4d-c390-4b01-8df6-78fe1dcc04cf', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-26 13:00:00', '2026-01-26 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-01-12 12:09:01'),
('9a6cb70b-af50-4792-a041-12b127356d09', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-02 13:00:00', '2026-02-02 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-01-12 12:09:01'),
('d8f646c1-c702-46d6-8c6f-91d407853a63', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-13 06:30:00', '2026-01-13 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('5d69ad21-1c9d-441b-bebd-2072c27bef0b', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-20 06:30:00', '2026-01-20 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('48d4de05-92c8-4eda-b9f7-e7d2e44a8dfb', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-27 06:30:00', '2026-01-27 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('a82b9718-e650-440d-861e-1bec9ab7147f', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-03 06:30:00', '2026-02-03 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('b5865532-5aa0-4c88-9bbb-50626a08d7a6', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-13 06:30:00', '2026-01-13 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('1e3bb0eb-76ac-49f6-9dc4-c083d923fc65', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-20 06:30:00', '2026-01-20 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('d4ffdc9b-12df-4928-a405-aac3f37c4441', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-27 06:30:00', '2026-01-27 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('7bfecc97-92d8-48c6-990f-1a2507344019', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-03 06:30:00', '2026-02-03 15:30:00', NULL, 'réservé', '2026-01-12 12:09:01'),
('b8f4d00d-2275-451a-b667-cdddb91d6fe0', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-13 13:00:00', '2026-01-13 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-01-12 12:09:02'),
('adafd8a6-5676-4dad-bcd2-096d0fa40881', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-20 13:00:00', '2026-01-20 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-01-12 12:09:02'),
('3b909aa8-d6cc-437e-a343-975cd9094a91', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-27 13:00:00', '2026-01-27 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-01-12 12:09:02'),
('03743735-7c64-42fc-aa9f-eb48495910b1', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-03 13:00:00', '2026-02-03 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-01-12 12:09:02'),
('4bcbbf74-a23e-495c-8d51-94e9d777237f', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-13 07:00:00', '2026-01-13 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('ce1f3192-cac7-4386-acf0-4c4bcfc5559e', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-20 07:00:00', '2026-01-20 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('171d2c9e-ec22-4a41-9d43-03701ba90f10', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-27 07:00:00', '2026-01-27 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('c699c88f-b734-48ca-b0b0-f14481d659a0', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-03 07:00:00', '2026-02-03 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('84393b52-8091-4aba-9328-6b95bb5ac8cc', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-13 13:00:00', '2026-01-13 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-01-12 12:09:02'),
('9a417faf-f095-4675-9b5c-5b20442dc58f', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-20 13:00:00', '2026-01-20 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-01-12 12:09:02'),
('0dd6dfb2-03b8-4f3c-8e0c-4b86dd576756', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-27 13:00:00', '2026-01-27 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-01-12 12:09:02'),
('a9b8d863-9efb-4d0e-af81-58584efa2747', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-03 13:00:00', '2026-02-03 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-01-12 12:09:02'),
('645231f9-f324-4ccf-b1ce-54ba38ada2d0', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-13 07:00:00', '2026-01-13 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-01-12 12:09:02'),
('17eb7bcb-5e30-4d68-baf2-53ade35fe321', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-20 07:00:00', '2026-01-20 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-01-12 12:09:02'),
('56388b1c-e012-4e77-b15f-788ac0538622', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-27 07:00:00', '2026-01-27 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-01-12 12:09:02'),
('7636ee98-1a05-4471-90f9-65f0c047935e', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-03 07:00:00', '2026-02-03 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-01-12 12:09:02'),
('07674f44-88fd-4dba-b629-2f98ecca014a', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-14 06:30:00', '2026-01-14 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('d401193e-6e2e-487a-8c85-8ce68e910b82', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-21 06:30:00', '2026-01-21 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('cae31409-9e40-48e8-ae8e-959900d4f13f', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-28 06:30:00', '2026-01-28 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('8feadc70-1a24-412d-b028-af7400cec065', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-04 06:30:00', '2026-02-04 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('a76a68da-1bb1-4d72-bd86-31df9599eaa5', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-14 06:30:00', '2026-01-14 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('3b02d2a0-09a2-431c-a97f-f5fa8c0e79c0', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-21 06:30:00', '2026-01-21 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('1a11eeb8-8fe6-4b8f-9ec8-a4a1120a4d77', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-28 06:30:00', '2026-01-28 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('376e043a-7095-46d7-a6e9-3c851bd3dc0a', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-04 06:30:00', '2026-02-04 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('408d3cdc-b000-470f-99d4-b97ccfdf6876', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-14 07:00:00', '2026-01-14 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('39f854f5-1e1e-45a1-ade2-908d77cfd79a', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-21 07:00:00', '2026-01-21 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('6a95ee20-288e-4e77-8f98-7ffe0f22fc54', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-28 07:00:00', '2026-01-28 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('e0b8c8d0-bb85-45ba-b0ae-0894c9a4c6a9', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-04 07:00:00', '2026-02-04 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('57b0459e-6331-4c62-b60e-ea5ed8d4c8c8', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-14 14:00:00', '2026-01-14 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-01-12 12:09:02'),
('cc376a1d-7d0e-4be9-a962-c8321472d78b', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-21 14:00:00', '2026-01-21 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-01-12 12:09:02'),
('c449064c-ebdb-496c-907b-6cca7ebc6215', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-28 14:00:00', '2026-01-28 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-01-12 12:09:02'),
('25cbf743-8392-4019-bbf6-f472f1d1f68e', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-04 14:00:00', '2026-02-04 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-01-12 12:09:02'),
('d785181e-41f1-462e-9360-b8e0aacf214d', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-14 14:00:00', '2026-01-14 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:02'),
('cf40097c-898c-4bc7-94c9-dc37f6e44ca2', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-21 14:00:00', '2026-01-21 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:02'),
('94fef167-1c34-42fb-9c3a-0c123576be52', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-28 14:00:00', '2026-01-28 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:02'),
('d84ef3d2-d33c-4d76-8286-e811de39b62b', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-04 14:00:00', '2026-02-04 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:02'),
('ed9c644c-edae-46c9-8d54-a789cefe94ad', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-14 13:00:00', '2026-01-14 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-01-12 12:09:02'),
('7e37d123-b8e3-4c36-a417-255ddc1542bc', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-21 13:00:00', '2026-01-21 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-01-12 12:09:02'),
('519857fd-9d28-4584-ab96-d470f688217f', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-28 13:00:00', '2026-01-28 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-01-12 12:09:02'),
('41ca6de9-3bc9-4d5f-9065-07c5e7e258ff', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-04 13:00:00', '2026-02-04 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-01-12 12:09:02'),
('048f690c-8bbc-4c46-a2e2-38a7368df397', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-15 06:30:00', '2026-01-15 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('7ec92e39-759b-4974-83d2-1891a717534c', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-22 06:30:00', '2026-01-22 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('d2559de7-9b9c-4764-9713-774e2e458c10', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-29 06:30:00', '2026-01-29 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('33969adb-b830-4fd8-b544-f1b60fd79653', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-05 06:30:00', '2026-02-05 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('c124eeda-3532-4b2d-b744-c7bdd5647464', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-15 06:30:00', '2026-01-15 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('297d7b1f-7b1c-404c-b032-c0f8c3caab9d', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-22 06:30:00', '2026-01-22 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('20bc1bce-1158-4d08-9508-2aaabaa85baf', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-29 06:30:00', '2026-01-29 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('4b8f3b46-173c-4cc7-b402-4d328b7c8da9', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-05 06:30:00', '2026-02-05 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('bf42c7f1-d785-4962-ba2c-06265daac873', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-15 07:00:00', '2026-01-15 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('f0d17938-26dc-4a36-b9dd-0c836a7e9cff', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-22 07:00:00', '2026-01-22 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('287bb872-2f86-4186-8796-ffd114e02ab3', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-29 07:00:00', '2026-01-29 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('84968ff1-612f-4dd4-99e6-34923d8dfae0', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-05 07:00:00', '2026-02-05 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('67577377-506a-46d4-9f1a-a08ec43dfa87', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-15 07:00:00', '2026-01-15 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('2450f3d4-cd07-406f-bcc0-962060e034a6', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-22 07:00:00', '2026-01-22 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('295fa5f9-cbb9-4369-a986-8299d171b08b', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-29 07:00:00', '2026-01-29 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('b1da1472-f809-4c41-90bb-aa0b03d11de9', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-05 07:00:00', '2026-02-05 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('53877a2c-800e-4bd2-b6ad-70112124b4ed', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-15 09:00:00', '2026-01-15 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-01-12 12:09:02'),
('3e3b95d6-2e6d-408a-b133-0cf3227bcc7f', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-22 09:00:00', '2026-01-22 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-01-12 12:09:02'),
('99e759ba-8794-47a5-97fd-1cf7eb148e42', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-29 09:00:00', '2026-01-29 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-01-12 12:09:02'),
('bfd90ad3-7e6e-452a-9c47-67864f3e5ed9', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-05 09:00:00', '2026-02-05 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-01-12 12:09:02'),
('b329cbfb-9c51-4ee3-a6fb-9ec83cafe0f5', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-15 13:00:00', '2026-01-15 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-01-12 12:09:02'),
('d180615a-6fbe-4ef1-a25a-81452ce0d7ae', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-22 13:00:00', '2026-01-22 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-01-12 12:09:02'),
('0f6fefa3-af1e-4427-abd8-3546a6e79186', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-29 13:00:00', '2026-01-29 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-01-12 12:09:02'),
('5f400b7a-1004-4276-b91f-4be4e33963e4', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-05 13:00:00', '2026-02-05 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-01-12 12:09:02'),
('c69f2a8e-df8d-4642-b10a-7ab839daff32', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-16 06:30:00', '2026-01-16 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('5e6dcf95-a95a-4d2b-ae93-f525ce966994', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-23 06:30:00', '2026-01-23 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('e39b3bcb-00de-4236-9ce3-68d1e914d706', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-30 06:30:00', '2026-01-30 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('a6da0623-1cd4-4b8a-b5fa-7d8ad6e51d73', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-06 06:30:00', '2026-02-06 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('ceb73a46-1394-425e-adbd-b805a9dd693b', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-16 06:30:00', '2026-01-16 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('2565f039-43b0-40ac-b80d-5a67aa83dbb0', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-23 06:30:00', '2026-01-23 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('e206e000-7add-49ca-b42c-ebdbcbc37894', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-30 06:30:00', '2026-01-30 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('05c5065b-ae1b-48b6-bf51-a1fb043cd148', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-06 06:30:00', '2026-02-06 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('a00a828d-f26c-4d7d-88df-bf2fd3e19909', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-16 07:00:00', '2026-01-16 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('6a05110f-77ee-45e7-a495-73e7678c646b', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-23 07:00:00', '2026-01-23 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('b0cf9ee4-04f8-411a-ace4-44bc48064404', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-30 07:00:00', '2026-01-30 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('e111341e-0287-4d55-8be2-ffdc13e8fbb4', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-06 07:00:00', '2026-02-06 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-12 12:09:02'),
('d45b846e-64d1-42bf-a891-86c81f7eacc9', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-16 07:00:00', '2026-01-16 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('b59d1ece-184d-4a0e-94e5-34ca1ab2bae7', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-23 07:00:00', '2026-01-23 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('c76ccfcc-7e11-4a9b-bd65-eb34441ef540', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-30 07:00:00', '2026-01-30 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('4615a59e-ea8b-4154-8ebf-d88d58e286ca', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-06 07:00:00', '2026-02-06 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('867ae0cc-f77d-4cc9-97bc-540d2c5d08b3', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-16 14:00:00', '2026-01-16 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-01-12 12:09:02'),
('141f3144-59ef-48e0-b850-7364e78f7bcf', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-23 14:00:00', '2026-01-23 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-01-12 12:09:02'),
('8abd499a-2541-4cf4-80b5-fcfeb6622c25', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-30 14:00:00', '2026-01-30 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-01-12 12:09:02'),
('09eab47a-7b95-4f2a-8433-984e9a3ae49d', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-06 14:00:00', '2026-02-06 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-01-12 12:09:02'),
('a67c3769-f318-4314-866c-ca4fd00ecdbb', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-16 14:00:00', '2026-01-16 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-01-12 12:09:02'),
('8d2ae2c7-73e2-4c2d-8e15-aac45ced3b1c', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-23 14:00:00', '2026-01-23 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-01-12 12:09:02'),
('ad499a15-974c-41c4-b2b0-0a3171bbac7f', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-30 14:00:00', '2026-01-30 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-01-12 12:09:02'),
('fca70df9-3d86-4a33-8b3b-b170197c572a', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-06 14:00:00', '2026-02-06 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-01-12 12:09:02'),
('f73661b0-974b-43ba-8c5f-b684fc047934', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-17 06:30:00', '2026-01-17 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('a316160c-621d-4639-be73-3fffec829c22', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-24 06:30:00', '2026-01-24 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('945566ac-2abf-4916-b2c5-566e16e1ff9a', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-31 06:30:00', '2026-01-31 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('cc43c087-017b-4507-9f9c-ef792ecc20c3', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-07 06:30:00', '2026-02-07 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('f8350cfe-e729-4289-9f76-ebc2d52ff9ec', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-17 06:30:00', '2026-01-17 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('30b28f4f-ed49-4f1d-8c4b-c2091f05b7c9', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-24 06:30:00', '2026-01-24 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('ef545bc5-24d3-4aba-bc4e-63cbf2802cd1', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-31 06:30:00', '2026-01-31 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('884cb3b8-9de2-4632-bdb6-d9cb6bb9e6f0', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-07 06:30:00', '2026-02-07 15:30:00', NULL, 'réservé', '2026-01-12 12:09:02'),
('7d9185c1-f170-40df-9f97-3a372396ff72', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-17 07:00:00', '2026-01-17 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-01-12 12:09:02'),
('f4740925-a9d0-4131-b0c3-e46de173ea30', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-24 07:00:00', '2026-01-24 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-01-12 12:09:02'),
('81c9b880-1746-4a40-8917-4a06f396aa8d', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-31 07:00:00', '2026-01-31 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-01-12 12:09:02'),
('c1e22609-b8fd-437b-a85a-72059fbb8456', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-07 07:00:00', '2026-02-07 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-01-12 12:09:02'),
('883d963a-b2bb-4448-abff-03e59a9e03c7', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-17 08:00:00', '2026-01-17 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('76032fc1-bbb2-4301-9819-6d12af5b5b52', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-24 08:00:00', '2026-01-24 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('b487dbad-c451-4347-a48c-199fc1edf838', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-31 08:00:00', '2026-01-31 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('dc9717b7-4e79-4b0b-8c89-2a7746b71ec5', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-07 08:00:00', '2026-02-07 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-12 12:09:02'),
('2a79d964-aec4-456d-9f91-304a0d1a3c85', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-17 08:00:00', '2026-01-17 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:02'),
('b597ce8c-721d-442b-aef5-e286adc2d182', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-24 08:00:00', '2026-01-24 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:02'),
('b23e89dc-d1f8-4b00-b482-e77bdaebf241', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-31 08:00:00', '2026-01-31 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:02'),
('8c4ee51c-e2be-4ee2-b9bf-c50e1e887dab', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-07 08:00:00', '2026-02-07 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-12 12:09:02'),
('956917e4-d363-4324-95de-7571e3b54d08', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-17 08:00:00', '2026-01-17 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-01-12 12:09:02'),
('eed28dc8-2cdd-4808-9b55-4ca0cee24a8e', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-24 08:00:00', '2026-01-24 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-01-12 12:09:02'),
('486b350c-20e7-46c0-b1e1-5751cadb829f', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-01-31 08:00:00', '2026-01-31 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-01-12 12:09:02'),
('570f5aed-8751-4e97-bd50-8f589d7c09c1', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-07 08:00:00', '2026-02-07 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-01-12 12:09:02'),
('2c8b76e3-0734-4e9a-9ef5-d838956a2675', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-09 06:30:00', '2026-02-09 15:30:00', NULL, 'réservé', '2026-01-13 07:02:56'),
('c1f01d1d-16f3-48d2-ad69-5cf5d9cc084a', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-09 06:30:00', '2026-02-09 15:30:00', NULL, 'réservé', '2026-01-13 07:02:56'),
('62f82558-3cbd-4b94-ab94-8990525c6475', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-09 07:00:00', '2026-02-09 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-01-13 07:02:56'),
('c775e498-b625-4660-ace3-651f0b6fd000', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-09 07:00:00', '2026-02-09 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-01-13 07:02:56'),
('f5b5b484-7910-406a-95bf-6f8d4d9e7143', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-09 13:00:00', '2026-02-09 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-01-13 07:02:56'),
('4ce0c142-2625-4221-bfcf-4d46247c7b11', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-09 13:00:00', '2026-02-09 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-01-13 07:02:56'),
('92f44f2c-f0c8-4c97-a4a1-ee4ed99d1e2c', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-16 06:30:00', '2026-02-16 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('08421415-d78d-4c7e-a800-1b7370ba13c5', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-23 06:30:00', '2026-02-23 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('c5e5c22e-6114-4a87-9d7b-f00952b99c60', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-16 06:30:00', '2026-02-16 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('2f951fba-eb3c-46fb-96ff-6f46dcfb1c5e', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-23 06:30:00', '2026-02-23 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('891ac02b-71c1-499d-9cb8-bb147b02f584', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-16 07:00:00', '2026-02-16 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('550f51c6-36d7-44cf-aa0f-bafc84bbae97', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-23 07:00:00', '2026-02-23 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('1fb47f6f-fd99-4110-8b30-2b76cef60a9e', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-16 07:00:00', '2026-02-16 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('622217a1-6828-45fd-bad8-0495760bf6c1', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-23 07:00:00', '2026-02-23 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('8d79414d-4053-4e36-b127-f232a2d3d71a', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-16 13:00:00', '2026-02-16 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-02 09:25:04'),
('368dfdc7-b360-4ddc-8516-044e4bffa526', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-23 13:00:00', '2026-02-23 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-02 09:25:04'),
('abaa7f8b-db3e-4b13-aca9-0dd1528eb317', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-16 13:00:00', '2026-02-16 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-02 09:25:04'),
('bb33ece3-d58a-435f-830d-94eb1e0701e3', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-23 13:00:00', '2026-02-23 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-02 09:25:04'),
('d142dde7-e458-4e14-8c82-7793e685ba09', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-10 06:30:00', '2026-02-10 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('6a55bf59-f1e5-4032-83f3-ed0234035490', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-17 06:30:00', '2026-02-17 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('2ff2a7f3-c43a-40f2-b073-1dec6807612f', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-24 06:30:00', '2026-02-24 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('1a327c1f-9a18-4320-aa2c-1fd0cbf03b5a', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-10 06:30:00', '2026-02-10 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('b9961514-403f-4ea9-94bc-32dad8d74eb5', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-17 06:30:00', '2026-02-17 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('80500413-7b0e-4da5-ab25-5973db8c1b16', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-24 06:30:00', '2026-02-24 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('eb600406-e82b-4447-b458-edf4108c8d45', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-10 13:00:00', '2026-02-10 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-02-02 09:25:04'),
('d32c7dd6-5bc4-48bd-abd5-2e9959573037', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-17 13:00:00', '2026-02-17 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-02-02 09:25:04'),
('bda04a5f-7a21-4af5-884d-d9986b4b6cfc', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-24 13:00:00', '2026-02-24 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-02-02 09:25:04'),
('718c51e3-829f-4a9b-bc50-0dba44d00d81', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-10 07:00:00', '2026-02-10 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('60367e4d-5777-4d1a-9404-ca2633ee945a', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-17 07:00:00', '2026-02-17 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('003d975e-3047-4ade-85ac-4ad4a6439f1c', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-24 07:00:00', '2026-02-24 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('43d64b01-1bab-49b3-b601-f87b5b5daf60', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-10 13:00:00', '2026-02-10 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-02 09:25:04'),
('79c1c650-7872-4763-8c60-2168bf0d0f06', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-17 13:00:00', '2026-02-17 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-02 09:25:04');
INSERT INTO bookings (id, room_id, title, booked_by, start_time, end_time, doctor_id, status, created_at) VALUES
('91ef2fea-3c4c-4ccc-b39e-d38e2251f954', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-24 13:00:00', '2026-02-24 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-02 09:25:04'),
('25bac9dc-f65d-4f7c-820c-c7f5abaa0090', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-10 07:00:00', '2026-02-10 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-02 09:25:04'),
('c27ecee4-c567-4fe2-bbc5-afe3520bdb52', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-17 07:00:00', '2026-02-17 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-02 09:25:04'),
('ec5f77f1-8d1d-44f7-9568-3bcbe0aa6f00', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-24 07:00:00', '2026-02-24 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-02 09:25:04'),
('e9549116-613d-4149-8834-063959108ccd', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-11 06:30:00', '2026-02-11 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('1750ce51-eba0-411e-9abb-6cd5613ac153', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-18 06:30:00', '2026-02-18 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('4b167a81-59f0-49c8-bb34-e9e126f0495b', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-25 06:30:00', '2026-02-25 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('88a61362-8032-481d-bcb0-6e64e36adf02', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-11 06:30:00', '2026-02-11 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('14cd7fd9-c050-4f49-8139-fcaba4929b4c', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-18 06:30:00', '2026-02-18 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('b58a1bb9-0cd7-4ba8-b277-071a014b7a8f', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-25 06:30:00', '2026-02-25 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('9ee73fdc-87a6-4b51-8236-f0d9150cfdc3', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-11 07:00:00', '2026-02-11 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('89a99e64-558c-4600-80f9-80bbbb71df0e', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-18 07:00:00', '2026-02-18 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('06274dd9-cd99-4ffc-b1f7-e787829ff890', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-25 07:00:00', '2026-02-25 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('95f2d22a-8061-42f4-9d6f-ce1c0b82ce62', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-11 14:00:00', '2026-02-11 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-02-02 09:25:04'),
('ede5e18d-389e-4718-a6df-a7c13d7fd91b', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-18 14:00:00', '2026-02-18 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-02-02 09:25:04'),
('af793bf6-b945-44bb-a798-4f9fee76b786', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-25 14:00:00', '2026-02-25 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-02-02 09:25:04'),
('928f2ac1-b1b7-408a-9f4b-6ce6bb7126b7', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-11 14:00:00', '2026-02-11 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-02 09:25:04'),
('d6caecdd-9195-4ceb-a3ad-cf56ffcfabba', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-18 14:00:00', '2026-02-18 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-02 09:25:04'),
('29f6f4be-65f1-4aee-9f0c-cdbb97bad572', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-25 14:00:00', '2026-02-25 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-02 09:25:04'),
('8694e6f9-28c9-4e60-887f-49a56097fb7a', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-11 13:00:00', '2026-02-11 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-02-02 09:25:04'),
('e7f03e97-c74b-44a2-ab33-d5f7e808903b', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-18 13:00:00', '2026-02-18 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-02-02 09:25:04'),
('179de9da-1024-4034-bfa1-dcb9b88e00ad', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-25 13:00:00', '2026-02-25 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-02-02 09:25:04'),
('fa6e93a1-fbd5-4211-ac25-9394e050c2e9', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-12 06:30:00', '2026-02-12 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('792e5d3d-321f-4a9f-9a0b-b0ff900f4432', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-19 06:30:00', '2026-02-19 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('c0a387fe-1538-4774-b85c-c57e4ecc041f', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-26 06:30:00', '2026-02-26 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('bef9ba09-0528-49e9-8c4c-80578d9385fa', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-12 06:30:00', '2026-02-12 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('a4914e9a-844d-48ca-9bea-6a5aa822f6b5', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-19 06:30:00', '2026-02-19 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('a5adadfd-409a-473a-851d-1f6b60eb7866', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-26 06:30:00', '2026-02-26 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('b1bcbc15-e570-4c02-8ea0-f8ce46c87386', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-12 07:00:00', '2026-02-12 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('05101bb2-aae9-40b6-ab71-2af2d9500989', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-19 07:00:00', '2026-02-19 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('ebca9108-b7d5-43a2-81c8-b5f8ff95ff7c', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-26 07:00:00', '2026-02-26 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('f2e783dc-3f51-4fdd-94a6-5d0deccdb534', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-12 07:00:00', '2026-02-12 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('9f6cb05a-b188-4130-a25d-723793d1e036', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-19 07:00:00', '2026-02-19 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('7f2813ae-c190-41f0-86f7-b00ca93ae99b', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-26 07:00:00', '2026-02-26 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('f3d427aa-2a2a-4c6d-931b-cd469779ed34', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-12 09:00:00', '2026-02-12 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-02-02 09:25:04'),
('559a527e-d624-4f26-9d6f-6f8217641e9a', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-19 09:00:00', '2026-02-19 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-02-02 09:25:04'),
('9aea1e52-0f2a-4628-bc6b-cb8631da1f2d', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-26 09:00:00', '2026-02-26 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-02-02 09:25:04'),
('c85b8151-c8b8-4bac-88bc-22699388c3b1', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-12 13:00:00', '2026-02-12 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-02 09:25:04'),
('2214a58c-fe95-4bfd-b0c0-b757f0a59635', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-19 13:00:00', '2026-02-19 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-02 09:25:04'),
('34f9c37d-69c5-4865-8a54-095d2872f397', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-26 13:00:00', '2026-02-26 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-02 09:25:04'),
('65c73c8e-08dc-444d-9e99-472fce89dcdb', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-13 06:30:00', '2026-02-13 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('8b7b7245-6faf-424f-a00d-3c7b04022721', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-20 06:30:00', '2026-02-20 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('4df77d18-9fa1-4867-92b2-22e48b8d6a8a', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-27 06:30:00', '2026-02-27 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('99eb8086-5fd9-4ffa-baf2-fa7a0cf55ec8', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-13 06:30:00', '2026-02-13 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('6a42be2a-c8fb-47b0-9909-690ac35d49c8', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-20 06:30:00', '2026-02-20 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('223de7c0-2577-4b1f-9094-9e933e6939f8', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-27 06:30:00', '2026-02-27 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('f0987de0-5e9b-46cd-b74c-25b4bd555617', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-13 07:00:00', '2026-02-13 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('237366d3-8a40-4ef5-952a-55c07db6fb05', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-20 07:00:00', '2026-02-20 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('8ad21e61-1ae9-4d00-b32e-aeae541253ee', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-27 07:00:00', '2026-02-27 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-02 09:25:04'),
('36f69f5f-f451-47ce-892d-d684f038c398', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-13 07:00:00', '2026-02-13 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('f6efc6c1-15f0-46d2-9846-7caaadc207ea', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-20 07:00:00', '2026-02-20 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('322532b1-54ae-4b0d-90d0-cc39dafa8f24', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-27 07:00:00', '2026-02-27 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('bfa56159-bebc-445b-92a2-a3b209f4799b', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-13 14:00:00', '2026-02-13 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-02 09:25:04'),
('bfc48388-ebcf-465b-acfc-9b24081c3699', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-20 14:00:00', '2026-02-20 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-02 09:25:04'),
('1816ac73-05ba-4a83-9ed4-e07bf5d20c88', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-27 14:00:00', '2026-02-27 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-02 09:25:04'),
('8ea3fbb5-06cb-44eb-ad39-7e9d49535205', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-13 14:00:00', '2026-02-13 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-02-02 09:25:04'),
('f81d0fcc-da7a-40dd-889c-f53fc55a94c7', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-20 14:00:00', '2026-02-20 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-02-02 09:25:04'),
('0ee803df-c2ff-49c4-9833-6f52db3d89e3', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-27 14:00:00', '2026-02-27 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-02-02 09:25:04'),
('74bfb581-2ce5-4103-9193-f07d64a63226', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-14 06:30:00', '2026-02-14 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('9c40e5cf-3989-4f67-bc95-98d97b46e693', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-21 06:30:00', '2026-02-21 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('7e27e294-1f7b-497b-943b-edce14590d71', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-28 06:30:00', '2026-02-28 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('a2a448fd-cf3c-4ba4-bf56-4ca1e7273c16', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-14 06:30:00', '2026-02-14 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('53a7c658-9d51-4fea-9297-76910482a066', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-21 06:30:00', '2026-02-21 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('a66b12f2-38fd-42ec-89d1-c89f531d5e30', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-28 06:30:00', '2026-02-28 15:30:00', NULL, 'réservé', '2026-02-02 09:25:04'),
('bcfd447c-eea2-4cdc-9ece-9cc452af9325', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-14 07:00:00', '2026-02-14 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-02-02 09:25:04'),
('b0b664b0-3384-4048-bb4d-6d4eac7a2cb6', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-21 07:00:00', '2026-02-21 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-02-02 09:25:04'),
('fb35a8e6-ceaf-460b-a057-03a7a5913839', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-28 07:00:00', '2026-02-28 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-02-02 09:25:04'),
('5f6271bd-d0f8-459c-9c2f-3dde60a96d0c', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-14 08:00:00', '2026-02-14 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('2e8db730-0249-47ea-b47b-8bcdf5d710ea', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-21 08:00:00', '2026-02-21 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('e999f37c-f548-403b-a0c0-b6c087a21215', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-28 08:00:00', '2026-02-28 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-02 09:25:04'),
('bcfaa39e-9607-47e4-95de-2aaeee20566a', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-14 08:00:00', '2026-02-14 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-02 09:25:04'),
('6bcabe04-6f29-41a4-8c03-38eb509eacbf', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-21 08:00:00', '2026-02-21 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-02 09:25:04'),
('b37c26b6-48bc-4ca1-92bf-987e383b5bca', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-28 08:00:00', '2026-02-28 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-02 09:25:04'),
('a3d354b7-089f-40e9-9d34-32eec454ab9c', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-14 08:00:00', '2026-02-14 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-02 09:25:04'),
('31097eb8-a76d-4159-ae8a-4cb7672505b8', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-21 08:00:00', '2026-02-21 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-02 09:25:04'),
('e9a41102-6ab2-471e-9023-d59b23c4f2d6', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-02-28 08:00:00', '2026-02-28 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-02 09:25:04'),
('190dd107-2d12-4aef-bdb2-5acc0ab3885b', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-02 06:30:00', '2026-03-02 15:30:00', NULL, 'réservé', '2026-02-03 06:20:49'),
('5ba5c991-ca84-4a07-8db7-12f626487e00', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-02 06:30:00', '2026-03-02 15:30:00', NULL, 'réservé', '2026-02-03 06:20:49'),
('cf0f6926-28c6-42d2-8b78-3670b32e3860', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-02 07:00:00', '2026-03-02 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-03 06:20:49'),
('8f42148c-0107-44ff-8486-c7c337815aba', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-02 07:00:00', '2026-03-02 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-03 06:20:49'),
('ed96c506-ef0b-48dd-a07e-b8ef1936f576', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-02 13:00:00', '2026-03-02 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-03 06:20:49'),
('47316bb5-229f-4805-9f5b-fd57b43f7b3e', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-02 13:00:00', '2026-03-02 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-03 06:20:49'),
('fd58d13c-3960-43b4-990e-826a427a9256', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-03 06:30:00', '2026-03-03 15:30:00', NULL, 'réservé', '2026-02-04 08:13:10'),
('6665b189-b027-4914-ae11-b21c68a85da9', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-03 06:30:00', '2026-03-03 15:30:00', NULL, 'réservé', '2026-02-04 08:13:10'),
('628c6257-2300-4ae1-9e10-13244a85c7a9', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-03 13:00:00', '2026-03-03 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-02-04 08:13:10'),
('be1490d3-c5a3-416f-8137-97497690fdb1', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-03 07:00:00', '2026-03-03 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-04 08:13:10'),
('ffd523d8-3a40-4096-b70f-5b0eb4810248', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-03 13:00:00', '2026-03-03 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-04 08:13:10'),
('5f47f8f9-c3b7-46aa-8bd5-f0bb0a91b213', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-03 07:00:00', '2026-03-03 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-04 08:13:10'),
('88ecd700-426a-46f1-b669-76686e8cb329', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-09 06:30:00', '2026-03-09 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('17e7a379-0212-426c-af4f-286284349658', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-09 06:30:00', '2026-03-09 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('1592192e-177c-416e-8b48-75d9f8804c5d', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-09 07:00:00', '2026-03-09 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-11 06:29:55'),
('98147e49-3fba-4dcc-b38b-155b6a577f3f', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-09 07:00:00', '2026-03-09 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-11 06:29:55'),
('4a811635-0cc7-4513-a7f4-d400d4aaf7f2', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-09 13:00:00', '2026-03-09 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-11 06:29:55'),
('a0e87743-a07f-4160-a16d-26b62349f95b', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-09 13:00:00', '2026-03-09 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-11 06:29:55'),
('80f5e42f-79f0-4373-acb6-30a72dd7123c', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-10 06:30:00', '2026-03-10 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('0ce02c71-001d-41b9-a456-403130c1fb46', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-10 06:30:00', '2026-03-10 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('c37336d5-2ca9-493e-8d3a-2d3dfd7eda83', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-10 13:00:00', '2026-03-10 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-02-11 06:29:55'),
('9b91bd09-5f40-4d56-aa10-b1dc11c8480a', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-10 07:00:00', '2026-03-10 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-11 06:29:55'),
('4365eeea-1439-4f2b-b651-797b52cce73f', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-10 13:00:00', '2026-03-10 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-11 06:29:55'),
('a35e68d0-32bf-4f78-beb7-5eaf2ffff8f5', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-10 07:00:00', '2026-03-10 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-11 06:29:55'),
('55a8f1a2-801d-469d-9d58-5518c7411f6e', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-04 06:30:00', '2026-03-04 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('ced9fa0b-82d1-4ff2-b7a1-14e6475733e3', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-04 06:30:00', '2026-03-04 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('705453f1-e2db-4c38-a19e-31b0fc9455ae', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-04 07:00:00', '2026-03-04 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-11 06:29:55'),
('49563e1c-60ac-413b-b73c-a714e9b0602d', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-04 14:00:00', '2026-03-04 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-02-11 06:29:55'),
('ff82a76d-506f-44c3-9f1a-f24b02e3f876', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-04 14:00:00', '2026-03-04 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-11 06:29:55'),
('1457d5ac-bb29-455d-a19f-029439b806be', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-04 13:00:00', '2026-03-04 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-02-11 06:29:55'),
('2634e48f-d47e-4a8c-b180-35e3066a5c5d', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-05 06:30:00', '2026-03-05 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('8a35f9e4-4ed9-47d2-badd-e5e709590907', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-05 06:30:00', '2026-03-05 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('b3ce0b96-c0f6-46ec-8a0d-847e9c9ef3aa', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-05 07:00:00', '2026-03-05 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-11 06:29:55'),
('64636249-d5d7-4d23-845c-92222285cb9c', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-05 07:00:00', '2026-03-05 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-11 06:29:55'),
('d1f89919-e522-402c-b441-97464d9d16ec', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-05 09:00:00', '2026-03-05 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-02-11 06:29:55'),
('fcd3f215-d028-4daa-b6e2-7101e12b273d', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-05 13:00:00', '2026-03-05 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-11 06:29:55'),
('7c6ee40a-34f9-4d16-a2fa-00d6670a27a3', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-06 06:30:00', '2026-03-06 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('7d4ee3ac-e5fb-4bfc-ba1b-fe52fdab0732', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-06 06:30:00', '2026-03-06 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('c5c65d05-f356-498a-a7e1-3ecb6cbec885', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-06 07:00:00', '2026-03-06 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-11 06:29:55'),
('20c370c7-5d1b-4430-8caf-ffa5cc45988f', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-06 07:00:00', '2026-03-06 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-11 06:29:55'),
('fb7b4d45-c1bd-4b3b-8ba3-2740d9534dbf', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-06 14:00:00', '2026-03-06 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-11 06:29:55'),
('de6285c8-cdaf-4d7b-9bd7-21e4194c0c38', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-06 14:00:00', '2026-03-06 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-02-11 06:29:55'),
('1c794f3e-a4a3-4ebb-9c99-d35fdf9aa60d', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-07 06:30:00', '2026-03-07 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('de2b4404-0f96-4f26-a36f-45e585ae805d', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-07 06:30:00', '2026-03-07 15:30:00', NULL, 'réservé', '2026-02-11 06:29:55'),
('63e25eb9-000e-4f3c-abc5-99436592ead6', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-07 07:00:00', '2026-03-07 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-02-11 06:29:55'),
('d2db20aa-11aa-484d-b367-3bddfbe75f43', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-07 08:00:00', '2026-03-07 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-11 06:29:55'),
('20d519dd-42b8-4750-bf51-8caedd082088', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-07 08:00:00', '2026-03-07 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-11 06:29:55'),
('faefb050-8b40-4de0-bc5b-e7403831be88', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-07 08:00:00', '2026-03-07 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-11 06:29:55'),
('ed83d36d-6d5e-48cc-919d-952cdd48ef45', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-11 06:30:00', '2026-03-11 15:30:00', NULL, 'réservé', '2026-02-16 07:13:30'),
('c55733a7-6a74-4988-b22c-6b22795dacb1', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-11 06:30:00', '2026-03-11 15:30:00', NULL, 'réservé', '2026-02-16 07:13:30'),
('90dbd2f7-65e2-461e-bb1e-e29bac22b7ac', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-11 07:00:00', '2026-03-11 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-16 07:13:30'),
('74d0f915-fe34-4851-a395-b199c88ae65b', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-11 14:00:00', '2026-03-11 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-02-16 07:13:30'),
('05b696ac-539d-4533-8435-b4fff41db870', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-11 14:00:00', '2026-03-11 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-16 07:13:30'),
('7703d297-5c9d-47f6-8551-0dd9912b83cd', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-11 13:00:00', '2026-03-11 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-02-16 07:13:30'),
('9cb891d2-2eb1-482c-8d6e-098377eacfd6', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-12 06:30:00', '2026-03-12 15:30:00', NULL, 'réservé', '2026-02-16 07:13:30'),
('c5d386aa-6c5d-4526-bbae-ad9c41eabc5e', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-12 06:30:00', '2026-03-12 15:30:00', NULL, 'réservé', '2026-02-16 07:13:30'),
('aaa22eb2-2cb6-417c-a0c0-6061ca76c80f', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-12 07:00:00', '2026-03-12 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-16 07:13:30'),
('93ef994c-7378-4222-baa8-0df1f7d0d15e', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-12 07:00:00', '2026-03-12 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-16 07:13:30'),
('75f21c27-7719-470b-bfb4-4eeea8dc4d84', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-12 09:00:00', '2026-03-12 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-02-16 07:13:30'),
('8edb35a8-c10c-472b-bf11-9d9703b723e2', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-12 13:00:00', '2026-03-12 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-16 07:13:30'),
('7dd37d91-def1-46fa-b331-69063be5dbce', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-13 06:30:00', '2026-03-13 15:30:00', NULL, 'réservé', '2026-02-16 07:13:30'),
('051f4949-9240-4cc5-96e0-ea786d4439f7', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-13 06:30:00', '2026-03-13 15:30:00', NULL, 'réservé', '2026-02-16 07:13:30'),
('0dd8fb06-d66e-4790-9969-837f8cb46d94', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-13 07:00:00', '2026-03-13 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-16 07:13:30'),
('ea5da055-dcda-4636-9f83-e3005396861a', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-13 07:00:00', '2026-03-13 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-16 07:13:30'),
('df43ec91-9b9c-48f3-b4fa-a2118e3f9d44', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-13 14:00:00', '2026-03-13 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-16 07:13:30'),
('1d5acd42-b95d-4891-978c-3cc53a88eb9d', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-13 14:00:00', '2026-03-13 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-02-16 07:13:30'),
('4c185739-2a7d-44f9-8d4d-6d9b69730b4a', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-14 06:30:00', '2026-03-14 15:30:00', NULL, 'réservé', '2026-02-16 07:13:30'),
('5cbd82bf-fd43-491f-9835-600d652570b9', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-14 06:30:00', '2026-03-14 15:30:00', NULL, 'réservé', '2026-02-16 07:13:30'),
('d734a180-26ab-4747-89cf-439f38d9e514', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-14 07:00:00', '2026-03-14 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-02-16 07:13:30'),
('88ca4f05-8887-4434-9586-8131780349cb', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-14 08:00:00', '2026-03-14 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-16 07:13:30'),
('c1f4c4cc-0edf-4895-8f69-757eb9a61e13', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-14 08:00:00', '2026-03-14 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-16 07:13:30'),
('005355f3-e88a-4dbb-bb60-8688419c3549', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-14 08:00:00', '2026-03-14 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-16 07:13:30'),
('75bc80d5-25d7-49cf-b211-73f6aa9e6585', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-16 06:30:00', '2026-03-16 15:30:00', NULL, 'réservé', '2026-02-17 07:29:32'),
('b5717218-4ba7-4f19-9965-9ac7b03aa131', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-16 06:30:00', '2026-03-16 15:30:00', NULL, 'réservé', '2026-02-17 07:29:32'),
('39984f42-fb9b-46c7-8f7c-764830da7857', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-16 07:00:00', '2026-03-16 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-17 07:29:32'),
('fa6180a8-eb70-4a55-a616-c605df1d4be1', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-16 07:00:00', '2026-03-16 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-17 07:29:32'),
('4758f836-8120-4493-8dd3-b083aa99f297', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-16 13:00:00', '2026-03-16 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-17 07:29:32'),
('940a081f-a2aa-4aff-b8e2-a9015be436b6', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-16 13:00:00', '2026-03-16 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-17 07:29:32'),
('0a2c84f2-51bd-4ac5-82ab-6b3b963922e7', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-23 06:30:00', '2026-03-23 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('13ca0dbc-4321-47b2-8b75-5124dc6f91bd', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-23 06:30:00', '2026-03-23 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('28d1d7a6-986f-4193-802d-9bf4f6220504', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-23 07:00:00', '2026-03-23 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-25 11:23:58'),
('f3e9ee25-ab8b-41c9-9878-521ebf7ea2a0', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-23 07:00:00', '2026-03-23 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-25 11:23:58'),
('054b5407-79cd-4176-8a0b-017a211a9a8f', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-23 13:00:00', '2026-03-23 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-25 11:23:58'),
('c889f65b-3022-4418-b1cf-ad254e5af76a', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-23 13:00:00', '2026-03-23 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-25 11:23:58'),
('7d408f02-b98c-4b0e-99d7-41edde5e2b0e', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-17 06:30:00', '2026-03-17 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('16a841a8-041a-41d4-a094-0a511b7de79e', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-24 06:30:00', '2026-03-24 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('8d7fd285-107a-45f9-bb91-a8ecf57c404f', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-17 06:30:00', '2026-03-17 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('bc97839c-cb0e-459d-87ec-470e765a78e9', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-24 06:30:00', '2026-03-24 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('9d48c02b-acac-4768-8b47-95e3a6eeb183', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-17 13:00:00', '2026-03-17 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-02-25 11:23:58'),
('1d054e7d-1946-4d19-b4a2-681dccff63f0', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-24 13:00:00', '2026-03-24 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-02-25 11:23:58'),
('354a476b-3ef5-47de-b842-9bbd7164103e', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-17 07:00:00', '2026-03-17 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-25 11:23:58'),
('fd2dea91-d82d-43a2-9d93-94e0e563fc7f', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-24 07:00:00', '2026-03-24 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-25 11:23:58'),
('fa9e186b-57f6-417e-91c3-54367a455789', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-17 13:00:00', '2026-03-17 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-25 11:23:58'),
('055facd6-95e7-4ed7-8164-6dacd3aa0100', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-24 13:00:00', '2026-03-24 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-25 11:23:58'),
('c7ff1f08-8b92-441f-a878-511ffb87fad6', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-17 07:00:00', '2026-03-17 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-25 11:23:58'),
('3c07a3b7-665c-47aa-a30c-8d931f43f2c9', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-24 07:00:00', '2026-03-24 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-02-25 11:23:58'),
('cea9d4bc-7a59-4400-b017-9d24af3055df', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-18 06:30:00', '2026-03-18 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('88652103-0f36-4f0b-9bcf-21484be49e6e', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-18 06:30:00', '2026-03-18 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('42775137-2acb-42e7-95cd-f8fb0caf83b0', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-18 07:00:00', '2026-03-18 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-25 11:23:58'),
('88eb5f0c-813c-4763-9a30-d66e2e5c9438', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-18 14:00:00', '2026-03-18 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-02-25 11:23:58'),
('4958f34c-5d62-4254-820d-83337d0521b7', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-18 14:00:00', '2026-03-18 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-25 11:23:58'),
('9ed5e15c-733a-4bb3-9760-848380f46b42', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-18 13:00:00', '2026-03-18 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-02-25 11:23:58'),
('2086c156-a703-4ce6-960d-62ffc2350dd7', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-19 06:30:00', '2026-03-19 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('263a8df9-4dd4-48d3-a954-e514e5281040', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-19 06:30:00', '2026-03-19 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('e785b4bf-da9b-4feb-a88b-e8dbdf9f9bee', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-19 07:00:00', '2026-03-19 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-25 11:23:58'),
('25423b08-8077-4f38-b209-b22bc499954c', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-19 07:00:00', '2026-03-19 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-25 11:23:58'),
('14e0e26c-f90f-4396-a963-6030713468b1', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-19 09:00:00', '2026-03-19 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-02-25 11:23:58'),
('ed15266e-cb55-44fd-9032-67875ccc08a4', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-19 13:00:00', '2026-03-19 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-25 11:23:58'),
('b5b52093-c0a9-4cab-922c-d48e07b9ecb9', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-20 06:30:00', '2026-03-20 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('b6c931ca-9de9-4818-961e-5daacabb9266', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-20 06:30:00', '2026-03-20 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('98389b88-940a-473b-85bd-2d8fe9b13eca', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-20 07:00:00', '2026-03-20 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-25 11:23:58'),
('1328d6d4-0e99-44c2-a286-42d4aebab54c', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-20 07:00:00', '2026-03-20 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-25 11:23:58'),
('a0433d25-a49b-4607-bd10-b78679e6f325', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-20 14:00:00', '2026-03-20 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-25 11:23:58'),
('0d9fb34c-534a-4d1f-a23a-4b8bca215e26', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-20 14:00:00', '2026-03-20 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-02-25 11:23:58'),
('5c7ba01b-d348-4e87-8776-ad58704c231e', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-21 06:30:00', '2026-03-21 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('211b1e25-dd64-414c-af15-f3cb95d8a852', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-21 06:30:00', '2026-03-21 15:30:00', NULL, 'réservé', '2026-02-25 11:23:58'),
('3779b335-0e97-4aef-b9c5-7d9ab96ff5c3', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-21 07:00:00', '2026-03-21 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-02-25 11:23:58'),
('21afadb4-e1cd-4095-a6ce-6e1ca770388c', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-21 08:00:00', '2026-03-21 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-25 11:23:58'),
('9d916b6f-c26a-4175-8bd2-3015c86c64f9', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-21 08:00:00', '2026-03-21 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-25 11:23:58'),
('b60aa686-5d7f-4bc4-8fdc-9760493093a1', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-21 08:00:00', '2026-03-21 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-25 11:23:58'),
('a83e7d55-117f-41dc-a26c-e0179cd9f86d', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-25 06:30:00', '2026-03-25 15:30:00', NULL, 'réservé', '2026-02-26 13:44:26'),
('09be4c05-e2ac-4fb4-9b54-19af72ffcf24', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-25 06:30:00', '2026-03-25 15:30:00', NULL, 'réservé', '2026-02-26 13:44:26');
INSERT INTO bookings (id, room_id, title, booked_by, start_time, end_time, doctor_id, status, created_at) VALUES
('b38d9961-c4de-4428-9c86-39359d476a16', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-25 07:00:00', '2026-03-25 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-26 13:44:26'),
('7fe718d1-279e-4caf-9dd1-5c414f828236', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-25 14:00:00', '2026-03-25 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-02-26 13:44:26'),
('fc2d9e37-4d4a-4d35-932b-bccd596e4839', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-25 14:00:00', '2026-03-25 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-02-26 13:44:26'),
('dd95ab4e-4f68-45e7-8859-2e965831d4a1', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-25 13:00:00', '2026-03-25 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-02-26 13:44:26'),
('dee11924-136e-41a2-9978-ece7c142ac3a', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-26 06:30:00', '2026-03-26 15:30:00', NULL, 'réservé', '2026-02-27 15:14:41'),
('1bba55a9-1338-4b2e-87f3-2c0b2dbe38ef', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-26 06:30:00', '2026-03-26 15:30:00', NULL, 'réservé', '2026-02-27 15:14:41'),
('85894446-feeb-4c79-9f8d-6cbb347a1004', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-26 07:00:00', '2026-03-26 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-27 15:14:41'),
('605b3553-4f55-4104-b845-1ec86bdc9cf7', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-26 07:00:00', '2026-03-26 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-27 15:14:41'),
('582f29c5-1fdd-4fdb-a4f7-0f7c9042f16d', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-26 09:00:00', '2026-03-26 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-02-27 15:14:41'),
('21e0f6eb-8f68-4396-ae51-56c5ae7a6330', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-26 13:00:00', '2026-03-26 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-02-27 15:14:41'),
('9fc1c3c7-24b8-410f-b7c1-ad6991b8269d', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-27 06:30:00', '2026-03-27 15:30:00', NULL, 'réservé', '2026-02-28 08:12:51'),
('8981271a-1fb9-4ea3-83cf-b9318b123a79', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-27 06:30:00', '2026-03-27 15:30:00', NULL, 'réservé', '2026-02-28 08:12:51'),
('544a2679-2c80-4d70-a1b8-957bd05c2a32', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-27 07:00:00', '2026-03-27 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-02-28 08:12:51'),
('3f6f06f6-086b-413f-9918-cdbe3fec956f', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-27 07:00:00', '2026-03-27 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-02-28 08:12:51'),
('dbf0bf93-598b-4bf5-8eba-9a5053d383a2', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-27 14:00:00', '2026-03-27 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-02-28 08:12:51'),
('277b30dc-6f86-4bb6-8b2a-aa1a3b02e14b', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-27 14:00:00', '2026-03-27 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-02-28 08:12:51'),
('9e9a7e92-7b09-418f-9a82-4fa10bcbcdc3', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-30 06:30:00', '2026-03-30 15:30:00', NULL, 'réservé', '2026-03-05 07:54:07'),
('6ce60176-6736-4d47-908d-825bc6e126ef', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-30 06:30:00', '2026-03-30 15:30:00', NULL, 'réservé', '2026-03-05 07:54:07'),
('037e018d-f709-481e-b458-53cb68f7ab3f', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-30 07:00:00', '2026-03-30 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-03-05 07:54:07'),
('3cf02a6c-40a4-4631-b4e2-0ef8455af25e', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-30 07:00:00', '2026-03-30 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-03-05 07:54:07'),
('d105d2f0-0a9f-4c49-bc7d-495e53a342c3', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-30 13:00:00', '2026-03-30 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-03-05 07:54:07'),
('e962181a-9a0d-45ab-8da9-824bb0486f61', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-30 13:00:00', '2026-03-30 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-03-05 07:54:07'),
('7d9b83d7-6e7c-4b82-b552-bf7bf4d1e885', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-31 06:30:00', '2026-03-31 15:30:00', NULL, 'réservé', '2026-03-05 07:54:07'),
('9948b852-c815-44f1-b388-0a506cc468c2', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-31 06:30:00', '2026-03-31 15:30:00', NULL, 'réservé', '2026-03-05 07:54:07'),
('2eeb270d-9e57-457a-ba38-453c558ca0df', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Aloli', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-31 13:00:00', '2026-03-31 17:00:00', 'a2784110-3750-4dc5-a520-30d47e41474d', 'réservé', '2026-03-05 07:54:07'),
('c4beb64c-0ddd-4f78-9b13-b06e51758d5a', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-31 07:00:00', '2026-03-31 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-03-05 07:54:07'),
('30a3f6b7-6799-406d-bdf9-d070e1943233', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-31 13:00:00', '2026-03-31 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-03-05 07:54:07'),
('f2edd2fa-a4eb-4c37-ac9a-bf129b5a8be0', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-31 07:00:00', '2026-03-31 13:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-03-05 07:54:07'),
('d5d9807e-16b9-417e-b29c-03b86290d1fd', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-01 06:30:00', '2026-04-01 15:30:00', NULL, 'réservé', '2026-03-05 07:54:07'),
('ebfe7c7b-39fb-4c3f-8aca-af757b19a7b5', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-01 06:30:00', '2026-04-01 15:30:00', NULL, 'réservé', '2026-03-05 07:54:07'),
('75d2a7ab-6e3e-45f8-b778-853a884093a6', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-01 07:00:00', '2026-04-01 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-03-05 07:54:07'),
('1d258b2d-1f4d-4d5e-b706-4f8f3c01a179', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pneumologie - Dr Ibinga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-01 14:00:00', '2026-04-01 17:00:00', '0b8ddc82-f902-41c0-843f-cac45c69cefe', 'réservé', '2026-03-05 07:54:07'),
('cb8b53f1-666b-4633-96f6-703463d60cf7', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-01 14:00:00', '2026-04-01 17:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-03-05 07:54:07'),
('c17657e1-94b7-4aec-bcdf-df1ecbf23567', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sonon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-01 13:00:00', '2026-04-01 18:00:00', '30660b6b-1da9-454a-967d-4d4a063dec7b', 'réservé', '2026-03-05 07:54:07'),
('7d72120d-4fd1-466e-9969-d96e58b05d42', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-28 06:30:00', '2026-03-28 15:30:00', NULL, 'réservé', '2026-03-05 07:54:07'),
('334b4482-d64e-4c3f-ae67-84f7aa79b893', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-28 06:30:00', '2026-03-28 15:30:00', NULL, 'réservé', '2026-03-05 07:54:07'),
('16c58ea7-24dc-423b-a54c-41fc1bdde984', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-28 07:00:00', '2026-03-28 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-03-05 07:54:07'),
('fb678cc5-fb9c-4ae1-ac1e-126176feb683', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-28 08:00:00', '2026-03-28 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-03-05 07:54:07'),
('fdaf465c-e550-4868-acf7-fd9ecaacbb1a', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-28 08:00:00', '2026-03-28 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-03-05 07:54:07'),
('cb6bdc7f-8174-4727-8eb5-384cd11d9ca0', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-03-28 08:00:00', '2026-03-28 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-03-05 07:54:07'),
('a0607d8a-706c-4fd0-a6eb-f4c4e9bc50bb', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-02 06:30:00', '2026-04-02 15:30:00', NULL, 'réservé', '2026-03-06 08:01:12'),
('a8eac0c0-ea9c-4fa7-9f98-eafddf4c0aa3', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-02 06:30:00', '2026-04-02 15:30:00', NULL, 'réservé', '2026-03-06 08:01:12'),
('917e602b-28a6-45a0-b112-24a21a29771c', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-02 07:00:00', '2026-04-02 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-03-06 08:01:12'),
('f2e2f583-2635-4509-8b06-e17b30691770', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-02 07:00:00', '2026-04-02 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-03-06 08:01:12'),
('57b89aba-1329-4734-8abe-35b6feea0466', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'Kinésithérapie - Dr Okoumba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-02 09:00:00', '2026-04-02 13:00:00', 'b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'réservé', '2026-03-06 08:01:12'),
('a98e62ab-c3fe-4ad1-93cc-b2b3566d61b4', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-02 13:00:00', '2026-04-02 17:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-03-06 08:01:12'),
('9b67e6ba-3d97-4494-a19b-cb4d7e2f8367', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-03 06:30:00', '2026-04-03 15:30:00', NULL, 'réservé', '2026-03-09 07:57:22'),
('98603704-68fb-4072-81e1-526f45b5e11e', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-03 06:30:00', '2026-04-03 15:30:00', NULL, 'réservé', '2026-03-09 07:57:22'),
('8459c79e-1904-41cb-9a14-88e13c7862ca', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-03 07:00:00', '2026-04-03 13:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-03-09 07:57:22'),
('aa1d53d4-d2da-4f4c-a422-9207a5caf4d3', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-03 07:00:00', '2026-04-03 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-03-09 07:57:22'),
('466e06fe-864e-427c-880a-baa0ae05fec9', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Nzamba', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-03 14:00:00', '2026-04-03 17:00:00', '5a3e09ae-b446-443f-bce3-f5e904586eca', 'réservé', '2026-03-09 07:57:22'),
('1718de3f-4f92-4673-88cb-9be404b58316', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Sanon', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-03 14:00:00', '2026-04-03 17:00:00', 'ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'réservé', '2026-03-09 07:57:22'),
('abda1b54-872e-4282-8e08-8bdfceb1ef53', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-04 06:30:00', '2026-04-04 15:30:00', NULL, 'réservé', '2026-03-09 07:57:22'),
('032a0cc4-7a23-4c18-a678-a725d431be7f', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-04 06:30:00', '2026-04-04 15:30:00', NULL, 'réservé', '2026-03-09 07:57:22'),
('ad850b14-d9d8-470a-a3d2-8336ab29ea89', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Moussa', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-04 07:00:00', '2026-04-04 12:00:00', '94eccd35-b605-4ddb-b7c8-1458a3576346', 'réservé', '2026-03-09 07:57:22'),
('10a9bd84-bf33-42f8-9874-0b41ba1f17c3', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-04 08:00:00', '2026-04-04 11:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-03-09 07:57:22'),
('f8acbc8a-5162-49f8-b46d-cc2d1cf39e67', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-04 08:00:00', '2026-04-04 11:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-03-09 07:57:22'),
('dd994ada-64fa-4b43-aea1-1aa3b93fc36a', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Maiga', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-04 08:00:00', '2026-04-04 12:00:00', '4870bc28-2666-4b88-ba35-b64912cf74f8', 'réservé', '2026-03-09 07:57:22'),
('2e4b716f-5bfa-44a7-a258-07e3f80d5611', '54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-06 06:30:00', '2026-04-06 15:30:00', NULL, 'réservé', '2026-03-10 07:39:44'),
('3bce7715-52bd-43f4-b744-63447c8a5a8b', '9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Médecine générale', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-06 06:30:00', '2026-04-06 15:30:00', NULL, 'réservé', '2026-03-10 07:39:44'),
('9d6cd982-f38b-4ac9-a74f-839ff19488bf', '8074ff85-657c-4693-99db-d36cc683f07c', 'Pédiatrie - Dr Serge', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-06 07:00:00', '2026-04-06 12:00:00', 'd0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'réservé', '2026-03-10 07:39:44'),
('69d11017-de85-40f8-a935-243e1b31271c', 'd2b076c7-e86b-4a67-8290-b57377247c67', 'Pédiatrie - Dr Yeni', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-06 07:00:00', '2026-04-06 12:00:00', 'eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'réservé', '2026-03-10 07:39:44'),
('1deb959b-93e6-4930-8412-48d202cb88f9', 'e834ac37-b1d6-4185-aad0-c064294ffc47', 'ORL - Dr Mamfumbi', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-06 13:00:00', '2026-04-06 16:00:00', 'd2871c2e-b927-4217-8e86-fa456de2b3bb', 'réservé', '2026-03-10 07:39:44'),
('16b9d75d-ebf2-4409-aa59-ed912072c95a', '05004989-9d52-432a-901c-2c081e66705a', 'Gynécologie - Dr Chitou', 'bc6721da-b978-11f0-9a15-1905ccf35bed', '2026-04-06 13:00:00', '2026-04-06 17:00:00', 'c743166b-f309-49fe-b96c-44245fbd255a', 'réservé', '2026-03-10 07:39:44');

-- --------------------------------------------------------

--
-- Structure de la table `camera_access_requests`
--

DROP TABLE IF EXISTS camera_access_requests CASCADE;
CREATE TABLE IF NOT EXISTS camera_access_requests (
  id varchar(36) NOT NULL,
  requester_id varchar(36) NOT NULL,
  requester_name varchar(255) DEFAULT NULL,
  requester_service varchar(255) DEFAULT NULL,
  requester_position varchar(255) DEFAULT NULL,
  request_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  access_reason text NOT NULL,
  access_start_date date NOT NULL,
  access_end_date date NOT NULL,
  access_start_time time DEFAULT NULL,
  access_end_time time DEFAULT NULL,
  camera_zones text,
  hierarchical_authorization varchar(255) DEFAULT NULL,
  hierarchical_authorization_date timestamp DEFAULT NULL,
  status TEXT CHECK (status IN ('en_attente','approuve','refuse','annule')) NOT NULL DEFAULT 'en_attente',
  notes text,
  qhse_validation varchar(255) DEFAULT NULL,
  qhse_validation_date timestamp DEFAULT NULL,
  requester_signature varchar(255) DEFAULT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_camera_access_requests_idx_requester_id ON camera_access_requests (requester_id);
CREATE INDEX idx_camera_access_requests_idx_status ON camera_access_requests (status);
CREATE INDEX idx_camera_access_requests_idx_request_date ON camera_access_requests (request_date);


-- --------------------------------------------------------

--
-- Structure de la table `checkpoints`
--

DROP TABLE IF EXISTS checkpoints CASCADE;
CREATE TABLE IF NOT EXISTS checkpoints (
  id varchar(36) NOT NULL,
  name varchar(255) NOT NULL,
  location varchar(255) NOT NULL,
  barcode_data varchar(191) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_checkpoints_barcode_data ON checkpoints (barcode_data);
CREATE INDEX idx_checkpoints_idx_barcode_data ON checkpoints (barcode_data);


-- --------------------------------------------------------

--
-- Structure de la table `competencies`
--

DROP TABLE IF EXISTS competencies CASCADE;
CREATE TABLE IF NOT EXISTS competencies (
  id varchar(36) NOT NULL,
  employee_id varchar(36) NOT NULL,
  skill_name varchar(255) NOT NULL,
  skill_category varchar(255) DEFAULT NULL,
  level TEXT CHECK (level IN ('débutant','intermédiaire','avancé','expert')) DEFAULT 'débutant',
  certification_number varchar(255) DEFAULT NULL,
  issued_date date DEFAULT NULL,
  expiry_date date DEFAULT NULL,
  issuing_authority varchar(255) DEFAULT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_by varchar(36) DEFAULT NULL,
  verification_date date DEFAULT NULL,
  notes text,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_competencies_verified_by ON competencies (verified_by);
CREATE INDEX idx_competencies_idx_employee_id ON competencies (employee_id);
CREATE INDEX idx_competencies_idx_expiry_date ON competencies (expiry_date);


-- --------------------------------------------------------

--
-- Structure de la table `daily_rounds`
--

DROP TABLE IF EXISTS daily_rounds CASCADE;
CREATE TABLE IF NOT EXISTS daily_rounds (
  id varchar(36) NOT NULL,
  technician_id varchar(36) NOT NULL,
  technician_name varchar(255) DEFAULT NULL,
  round_type TEXT CHECK (round_type IN ('biomedical','technicien_polyvalent')) NOT NULL,
  round_date date NOT NULL,
  start_time timestamp NULL DEFAULT NULL,
  end_time timestamp NULL DEFAULT NULL,
  status TEXT CHECK (status IN ('en_cours','terminée','annulée')) DEFAULT 'en_cours',
  notes text,
  photo_urls JSONB DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_daily_rounds_unique_daily_round ON daily_rounds (technician_id,round_type,round_date);
CREATE INDEX idx_daily_rounds_idx_technician_date ON daily_rounds (technician_id,round_date);
CREATE INDEX idx_daily_rounds_idx_round_type_date ON daily_rounds (round_type,round_date);
CREATE INDEX idx_daily_rounds_idx_status ON daily_rounds (status);


-- --------------------------------------------------------

--
-- Structure de la table `doctors`
--

DROP TABLE IF EXISTS doctors CASCADE;
CREATE TABLE IF NOT EXISTS doctors (
  id varchar(36) NOT NULL,
  name varchar(255) NOT NULL,
  specialty varchar(255) NOT NULL,
  status TEXT CHECK (status IN ('disponible','occupé','absent')) DEFAULT 'disponible',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_doctors_uq_doctors_name_specialty ON doctors (name,specialty);


--
-- Déchargement des données de la table `doctors`
--

INSERT INTO doctors (id, name, specialty, status, created_at) VALUES
('d0c62bf6-81b5-4a89-86bc-2bb6043f2437', 'Dr Serge', 'Pédiatrie', 'disponible', '2025-11-13 13:33:56'),
('eeda82a5-8fde-4eb0-83cc-16a91c70175b', 'Dr Yeni', 'Pédiatrie', 'disponible', '2025-11-13 13:33:56'),
('d2871c2e-b927-4217-8e86-fa456de2b3bb', 'Dr Mamfumbi', 'ORL', 'disponible', '2025-11-13 13:33:56'),
('c743166b-f309-49fe-b96c-44245fbd255a', 'Dr Chitou', 'Gynécologie', 'disponible', '2025-11-13 13:33:56'),
('a2784110-3750-4dc5-a520-30d47e41474d', 'Dr Aloli', 'Pédiatrie', 'disponible', '2025-11-13 13:33:56'),
('5a3e09ae-b446-443f-bce3-f5e904586eca', 'Dr Nzamba', 'ORL', 'disponible', '2025-11-13 13:33:56'),
('0b8ddc82-f902-41c0-843f-cac45c69cefe', 'Dr Ibinga', 'Pneumologie', 'disponible', '2025-11-13 13:33:56'),
('30660b6b-1da9-454a-967d-4d4a063dec7b', 'Dr Sonon', 'Gynécologie', 'disponible', '2025-11-13 13:33:56'),
('b731a9a9-b901-46bd-92b8-f1ad7ad9c715', 'Dr Okoumba', 'Kinésithérapie', 'disponible', '2025-11-13 13:33:56'),
('4870bc28-2666-4b88-ba35-b64912cf74f8', 'Dr Maiga', 'Gynécologie', 'disponible', '2025-11-13 13:33:56'),
('ea2a5663-c15f-4ce8-a1c4-c9d114850545', 'Dr Sanon', 'Gynécologie', 'disponible', '2025-11-13 13:33:56'),
('94eccd35-b605-4ddb-b7c8-1458a3576346', 'Dr Moussa', 'Pédiatrie', 'disponible', '2025-11-13 13:33:56'),
('d322b091-ac07-4842-aa4d-0dbeecd5d01f', 'Dr Obame', 'Médecine de famille', 'disponible', '2025-11-13 14:29:27'),
('4ce3f2e6-85cb-465e-8a94-004b1419cc9a', 'Dr Lembangoye', 'Urologie', 'disponible', '2025-11-13 14:29:27'),
('9daf3288-715e-4f50-b08c-d38dae7db125', 'Mme Aude', 'Orthophonie', 'disponible', '2025-11-13 14:29:27'),
('6e2e2d74-e523-4013-a1a5-98c6dc0e4c55', 'Dr Olende', 'Chirurgie', 'disponible', '2025-11-13 14:29:28'),
('c06a58ec-6272-4e1f-826b-7ebdc8142f2b', 'Dr Mekina', 'Ophtalmologie', 'disponible', '2025-11-13 14:29:28'),
('ab64db36-9ad1-400d-8635-c321d5a87954', 'Dr Toko', 'Gastro-entérologie', 'disponible', '2025-11-13 14:29:28'),
('fe14696c-126a-4790-9798-7a9ef865dcc8', 'Dr Yekini', 'Cardiologie', 'disponible', '2025-11-13 14:29:28'),
('5f94af5b-0020-4db1-b549-5af4b43d0293', 'Dr Bella', 'Dermatologie', 'disponible', '2025-11-13 14:29:28'),
('8546348b-1b7b-49ea-9e48-250277af15dc', 'Dr Efemba', 'Rhumatologie', 'disponible', '2025-11-13 14:29:28'),
('6fb484f9-86eb-4e3c-a379-8d0b1d55b134', 'Dr Sadibi', 'Dermatologie', 'disponible', '2025-11-13 14:29:28'),
('db3e492a-3b47-4dba-8701-28939361429b', 'Dr Germany', 'Dentisterie', 'disponible', '2025-11-13 14:29:28'),
('7eaaccf5-5707-4550-ab47-e06414ef9804', 'Dr Moupinda', 'Cardiologie', 'disponible', '2025-11-13 14:29:28'),
('4472f60e-ebaa-424b-94ec-39f893cd1eba', 'Dr Apedo', 'Ophtalmologie', 'disponible', '2025-11-13 14:29:28'),
('4d9eb610-07d0-4848-82fd-58dbcd49aad9', 'Dr Itoudi', 'Gastro-entérologie', 'disponible', '2025-11-13 14:29:28'),
('199030f4-3485-4719-bede-86405c591f5e', 'Dr Kiki', 'Infectiologie', 'disponible', '2025-11-13 14:29:28'),
('6a200b0b-6114-46fd-80d8-00a127ea1c9b', 'Dr Nang', 'Dentisterie', 'disponible', '2025-11-13 14:29:28'),
('87a554cc-e702-4833-8b50-508b5f532b4a', 'Dr Nguiabanda', 'Orthopédie', 'disponible', '2025-11-13 14:29:29'),
('c8de7b54-ce6b-4d8b-91bb-500515c21978', 'Dr Ngoma', 'Fibroscopie', 'disponible', '2025-11-13 14:29:29'),
('f8c233f9-4eea-4f41-8a3a-15a4dbc16883', 'Dr Anguezomo', 'Endocrinologie', 'disponible', '2025-11-13 14:29:29'),
('2668711e-ef8f-11f0-86db-10e7c6f33f80', 'MOUNGA MBASSI Merveille', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688801-ef8f-11f0-86db-10e7c6f33f80', 'MANSIR ELLA Michele', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('266888a8-ef8f-11f0-86db-10e7c6f33f80', 'MAZAMBA Loic Thystère', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('266888ea-ef8f-11f0-86db-10e7c6f33f80', 'SALOM RODRIGUEZ Yanet', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('2668892b-ef8f-11f0-86db-10e7c6f33f80', 'ONDOUA Fernandez', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688965-ef8f-11f0-86db-10e7c6f33f80', 'MOUNIEVI KOUANGA Negg', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('266889c0-ef8f-11f0-86db-10e7c6f33f80', 'OBAME ASSOUMOU Victor Cédric', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688a0e-ef8f-11f0-86db-10e7c6f33f80', 'KAMDEU Audrey Emilie', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688a4c-ef8f-11f0-86db-10e7c6f33f80', 'BIKANGA Bev', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688bcf-ef8f-11f0-86db-10e7c6f33f80', 'SOUOP Régis', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688c21-ef8f-11f0-86db-10e7c6f33f80', 'KOULSOUM Mohamadou', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688c61-ef8f-11f0-86db-10e7c6f33f80', 'ANGA KABA KITABA', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688ca1-ef8f-11f0-86db-10e7c6f33f80', 'MANFOUMBI Abi-Lenz', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688cdf-ef8f-11f0-86db-10e7c6f33f80', 'MBOULA Pauline', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688d21-ef8f-11f0-86db-10e7c6f33f80', 'NGAWOMA Lozi Gaelle', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688d63-ef8f-11f0-86db-10e7c6f33f80', 'NTSAME ANOUZOGO ABIAGA Elodie', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688da5-ef8f-11f0-86db-10e7c6f33f80', 'NGUIAKAM Princesse', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688de5-ef8f-11f0-86db-10e7c6f33f80', 'NGUIA NGUIA Camille', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688e2a-ef8f-11f0-86db-10e7c6f33f80', 'ONGOUTA MAFIA Grâce Chérille', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('26688e6c-ef8f-11f0-86db-10e7c6f33f80', 'PAMO LATELA Ornella Maeva', 'Médecine Générale', 'disponible', '2026-01-12 08:17:35'),
('266bfec7-ef8f-11f0-86db-10e7c6f33f80', 'RAMAROJAONA Serge', 'Pédiatre', 'disponible', '2026-01-12 08:17:35'),
('266c01e1-ef8f-11f0-86db-10e7c6f33f80', 'MOUSSA Ousmane', 'Pédiatre', 'disponible', '2026-01-12 08:17:35'),
('266c026a-ef8f-11f0-86db-10e7c6f33f80', 'ALOLI Nathalie Pauline', 'Pédiatre', 'disponible', '2026-01-12 08:17:35'),
('266c02b4-ef8f-11f0-86db-10e7c6f33f80', 'LOUMOUAMOU Yéni', 'Pédiatre', 'disponible', '2026-01-12 08:17:35'),
('266c030a-ef8f-11f0-86db-10e7c6f33f80', 'NGOGHE Valérie', 'Pédiatre', 'disponible', '2026-01-12 08:17:35'),
('266fe1b0-ef8f-11f0-86db-10e7c6f33f80', 'AKEWA Maruis', 'Anesthésiste-Réanimateur', 'disponible', '2026-01-12 08:17:35'),
('266fe2d4-ef8f-11f0-86db-10e7c6f33f80', 'SANMA Farid', 'Anesthésiste-Réanimateur', 'disponible', '2026-01-12 08:17:35'),
('2673e803-ef8f-11f0-86db-10e7c6f33f80', 'Pr ITOUDI BIGNOUMBA Emery', 'Gastro-Entérologue', 'disponible', '2026-01-12 08:17:35'),
('2673e934-ef8f-11f0-86db-10e7c6f33f80', 'DJIEUKAM TOKO Danielle', 'Gastro-Entérologue', 'disponible', '2026-01-12 08:17:35'),
('2673e98a-ef8f-11f0-86db-10e7c6f33f80', 'NGOMA SOUAMY Marielle', 'Gastro-Entérologue', 'disponible', '2026-01-12 08:17:35'),
('26771115-ef8f-11f0-86db-10e7c6f33f80', 'Pr HOUENASSI Martin', 'Cardiologue', 'disponible', '2026-01-12 08:17:35'),
('26771248-ef8f-11f0-86db-10e7c6f33f80', 'BABONGUI Latifa', 'Cardiologue', 'disponible', '2026-01-12 08:17:35'),
('26771296-ef8f-11f0-86db-10e7c6f33f80', 'YEKINI Carole', 'Cardiologue', 'disponible', '2026-01-12 08:17:35'),
('267712d9-ef8f-11f0-86db-10e7c6f33f80', 'MELO TECHE Ghislaine', 'Cardiologue', 'disponible', '2026-01-12 08:17:35'),
('267b41e2-ef8f-11f0-86db-10e7c6f33f80', 'MAIGA Fatoumata', 'Gynécologue-Obstétricien', 'disponible', '2026-01-12 08:17:35'),
('267b4315-ef8f-11f0-86db-10e7c6f33f80', 'CHITOU EPSE SANMA Bilkis', 'Gynécologue-Obstétricien', 'disponible', '2026-01-12 08:17:35'),
('267b436a-ef8f-11f0-86db-10e7c6f33f80', 'SANON Adama', 'Gynécologue-Obstétricien', 'disponible', '2026-01-12 08:17:35'),
('267b43b3-ef8f-11f0-86db-10e7c6f33f80', 'SONON Aurele', 'Gynécologue-Obstétricien', 'disponible', '2026-01-12 08:17:35'),
('267e5818-ef8f-11f0-86db-10e7c6f33f80', 'Pr NDANG NGOU Stevy', 'Urologue', 'disponible', '2026-01-12 08:17:35'),
('267e593c-ef8f-11f0-86db-10e7c6f33f80', 'LEMBANGOYE Paul', 'Urologue', 'disponible', '2026-01-12 08:17:35'),
('267e598a-ef8f-11f0-86db-10e7c6f33f80', 'IBABA Josaphat', 'Urologue', 'disponible', '2026-01-12 08:17:35'),
('2681f935-ef8f-11f0-86db-10e7c6f33f80', 'BOLO Gaëtan', 'Radiologue', 'disponible', '2026-01-12 08:17:35'),
('26852303-ef8f-11f0-86db-10e7c6f33f80', 'NDAO ETENO Mael', 'Neurologue', 'disponible', '2026-01-12 08:17:35'),
('26852429-ef8f-11f0-86db-10e7c6f33f80', 'SAPHOU DAMON Michel', 'Neurologue', 'disponible', '2026-01-12 08:17:35'),
('26883de6-ef8f-11f0-86db-10e7c6f33f80', 'MEKYNA EPSE MAPANGOU Cinthya', 'Ophtalmologue', 'disponible', '2026-01-12 08:17:35'),
('26883f1a-ef8f-11f0-86db-10e7c6f33f80', 'APEDO Wilfried', 'Ophtalmologue', 'disponible', '2026-01-12 08:17:35'),
('268b44dd-ef8f-11f0-86db-10e7c6f33f80', 'EFEMBA Diane Kristel', 'Rhumatologue', 'disponible', '2026-01-12 08:17:35'),
('268e5223-ef8f-11f0-86db-10e7c6f33f80', 'GERMANY NEE ABBOUD Muriel', 'Dentiste', 'disponible', '2026-01-12 08:17:35'),
('268e5372-ef8f-11f0-86db-10e7c6f33f80', 'MBOUMBA OVENGA Sergine', 'Dentiste', 'disponible', '2026-01-12 08:17:35'),
('26915d40-ef8f-11f0-86db-10e7c6f33f80', 'ZIZA NGAILA Nesta Patricia', 'Endocrinologue', 'disponible', '2026-01-12 08:17:35'),
('26915e61-ef8f-11f0-86db-10e7c6f33f80', 'ANGUEZOMO Glwadis', 'Endocrinologue', 'disponible', '2026-01-12 08:17:35'),
('2694792e-ef8f-11f0-86db-10e7c6f33f80', 'BELLA SAFIOU Nouratou', 'Dermatologue', 'disponible', '2026-01-12 08:17:35'),
('26947aaa-ef8f-11f0-86db-10e7c6f33f80', 'SADIBI Liz Carmen', 'Dermatologue', 'disponible', '2026-01-12 08:17:35'),
('2697cba2-ef8f-11f0-86db-10e7c6f33f80', 'IBINGA Linda', 'Pneumologue', 'disponible', '2026-01-12 08:17:35'),
('269bcb33-ef8f-11f0-86db-10e7c6f33f80', 'AKAGHAH ADEMBA Angélique', 'Néphrologue', 'disponible', '2026-01-12 08:17:35'),
('269bcc58-ef8f-11f0-86db-10e7c6f33f80', 'SAFOU DAMON Michel-Arnaud', 'Néphrologue', 'disponible', '2026-01-12 08:17:35'),
('269bcca8-ef8f-11f0-86db-10e7c6f33f80', 'NDAO ETENO Mael', 'Néphrologue', 'disponible', '2026-01-12 08:17:35'),
('269eddcb-ef8f-11f0-86db-10e7c6f33f80', 'MANFOUMBI NGOMA Brice Albert', 'ORL', 'disponible', '2026-01-12 08:17:35'),
('269edeff-ef8f-11f0-86db-10e7c6f33f80', 'NZAMBA Christelle', 'ORL', 'disponible', '2026-01-12 08:17:35'),
('26a2a207-ef8f-11f0-86db-10e7c6f33f80', 'Pr OWONO BOUENGOU Placide', 'Chirurgien Viscéral', 'disponible', '2026-01-12 08:17:35'),
('26a2a323-ef8f-11f0-86db-10e7c6f33f80', 'OLLENDE Crépin', 'Chirurgien', 'disponible', '2026-01-12 08:17:35'),
('7bf9902d-ef97-11f0-86db-10e7c6f33f80', 'Dr Sarah', 'Médecine Générale', 'disponible', '2026-01-12 09:17:14'),
('7bf990ef-ef97-11f0-86db-10e7c6f33f80', 'Dr Jérémie', 'Médecine Générale', 'disponible', '2026-01-12 09:17:14'),
('7bf99194-ef97-11f0-86db-10e7c6f33f80', 'Dr Princesse', 'Médecine Générale', 'disponible', '2026-01-12 09:17:14'),
('7bf9923a-ef97-11f0-86db-10e7c6f33f80', 'Dr NGUIA-NGUIA JULIE', 'Médecine Générale', 'disponible', '2026-01-12 09:17:14'),
('7bfe76b2-ef97-11f0-86db-10e7c6f33f80', 'Dr BUSSUGHU Itu', 'Pédiatre', 'disponible', '2026-01-12 09:17:14');

-- --------------------------------------------------------

--
-- Structure de la table `document_revisions`
--

DROP TABLE IF EXISTS document_revisions CASCADE;
CREATE TABLE IF NOT EXISTS document_revisions (
  id varchar(36) NOT NULL,
  document_id varchar(36) NOT NULL,
  version varchar(50) NOT NULL,
  change_description text,
  file_path varchar(500) DEFAULT NULL,
  revised_by varchar(36) NOT NULL,
  revision_date timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_document_revisions_revised_by ON document_revisions (revised_by);
CREATE INDEX idx_document_revisions_idx_document_id ON document_revisions (document_id);


-- --------------------------------------------------------

--
-- Structure de la table `incidents`
--

DROP TABLE IF EXISTS incidents CASCADE;
CREATE TABLE IF NOT EXISTS incidents (
  id varchar(36) NOT NULL,
  type varchar(255) NOT NULL,
  description text,
  date_creation timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  reported_by varchar(36) DEFAULT NULL,
  statut TEXT CHECK (statut IN ('nouveau','attente','en_cours','traite')) DEFAULT 'nouveau',
  priorite TEXT CHECK (priorite IN ('faible','moyenne','haute','critique')) NOT NULL DEFAULT 'moyenne',
  service varchar(255) DEFAULT NULL,
  lieu varchar(255) DEFAULT NULL,
  photo_urls JSONB DEFAULT NULL,
  assigned_to varchar(36) DEFAULT NULL,
  assigned_to_name varchar(255) DEFAULT NULL,
  prestataire varchar(255) DEFAULT NULL,
  deadline timestamp NULL DEFAULT NULL,
  report JSONB DEFAULT NULL,
  corrective_action text,
  preventive_action text,
  root_cause text,
  capa_status TEXT CHECK (capa_status IN ('non_défini','en_cours','terminé','vérifié')) DEFAULT 'non_défini',
  capa_due_date date DEFAULT NULL,
  capa_completed_date date DEFAULT NULL,
  recurrence_count INTEGER DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE INDEX idx_incidents_reported_by ON incidents (reported_by);
CREATE INDEX idx_incidents_assigned_to ON incidents (assigned_to);
CREATE INDEX idx_incidents_idx_incidents_statut ON incidents (statut);
CREATE INDEX idx_incidents_idx_incidents_priorite ON incidents (priorite);
CREATE INDEX idx_incidents_idx_incidents_service ON incidents (service);
CREATE INDEX idx_incidents_idx_incidents_date_creation ON incidents (date_creation);


--
-- Déchargement des données de la table `incidents`
--

INSERT INTO incidents (id, type, description, date_creation, reported_by, statut, priorite, service, lieu, photo_urls, assigned_to, assigned_to_name, prestataire, deadline, report, corrective_action, preventive_action, root_cause, capa_status, capa_due_date, capa_completed_date, recurrence_count) VALUES
('a77d4fd6-a6b3-47ef-9d1d-cc3cab05594e', 'maintenance-preventive', 'Équipement concerné : Autoclaves\nNuméro de série / ID : 1234\nDescription : Appareil non fonctionnel', '2026-03-09 14:52:56', 'f140f9e3-f07b-11f0-85c4-10e7c6f33f80', 'nouveau', 'moyenne', 'biomedical', 'Salle de prélèvement 1', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'non_défini', NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Structure de la table `incident_comments`
--

DROP TABLE IF EXISTS incident_comments CASCADE;
CREATE TABLE IF NOT EXISTS incident_comments (
  id varchar(36) NOT NULL,
  incident_id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  user_name varchar(255) NOT NULL,
  comment text NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_incident_comments_user_id ON incident_comments (user_id);
CREATE INDEX idx_incident_comments_idx_incident_id ON incident_comments (incident_id);
CREATE INDEX idx_incident_comments_idx_created_at ON incident_comments (created_at);


-- --------------------------------------------------------

--
-- Structure de la table `laundry_summary`
--

DROP TABLE IF EXISTS laundry_summary CASCADE;
CREATE TABLE IF NOT EXISTS laundry_summary (
  id varchar(36) NOT NULL,
  periode_type TEXT CHECK (periode_type IN ('hebdomadaire','mensuelle')) NOT NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  total_linge_traite_kg decimal(10,2) DEFAULT '0.00',
  taux_non_conformite decimal(5,2) DEFAULT '0.00',
  nombre_services_desservis INTEGER DEFAULT 0,
  observations text,
  responsable_buanderie varchar(36) DEFAULT NULL,
  signature_responsable varchar(500) DEFAULT NULL,
  date_visa date DEFAULT NULL,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_laundry_summary_responsable_buanderie ON laundry_summary (responsable_buanderie);
CREATE INDEX idx_laundry_summary_created_by ON laundry_summary (created_by);
CREATE INDEX idx_laundry_summary_idx_periode ON laundry_summary (date_debut,date_fin);
CREATE INDEX idx_laundry_summary_idx_periode_type ON laundry_summary (periode_type);


-- --------------------------------------------------------

--
-- Structure de la table `laundry_tracking`
--

DROP TABLE IF EXISTS laundry_tracking CASCADE;
CREATE TABLE IF NOT EXISTS laundry_tracking (
  id varchar(36) NOT NULL,
  service_emetteur varchar(255) NOT NULL,
  periode_concernee varchar(255) DEFAULT NULL,
  etabli_par varchar(36) NOT NULL,
  date_etablissement date NOT NULL,
  date_reception date NOT NULL,
  service_origine varchar(255) NOT NULL,
  type_linge TEXT CHECK (type_linge IN ('draps','coussins','blouses','gants','masques','autoclave','autre')) NOT NULL,
  poids_kg decimal(10,2) DEFAULT NULL,
  quantite INTEGER DEFAULT NULL,
  etat_linge varchar(255) DEFAULT NULL,
  agent_reception varchar(36) DEFAULT NULL,
  signature_reception varchar(500) DEFAULT NULL,
  date_lavage date DEFAULT NULL,
  machine_utilisee varchar(255) DEFAULT NULL,
  cycle_temperature varchar(100) DEFAULT NULL,
  produit_lessiviel varchar(255) DEFAULT NULL,
  duree_cycle INTEGER DEFAULT NULL,
  agent_lavage varchar(36) DEFAULT NULL,
  controle_visuel BOOLEAN DEFAULT NULL,
  observations_lavage text,
  date_sechage date DEFAULT NULL,
  type_sechage TEXT CHECK (type_sechage IN ('seche_linge','naturel','autre')) DEFAULT NULL,
  temperature_sechage decimal(5,2) DEFAULT NULL,
  duree_sechage INTEGER DEFAULT NULL,
  repassage_effectue_par varchar(36) DEFAULT NULL,
  controle_qualite_sechage BOOLEAN DEFAULT NULL,
  signature_sechage varchar(500) DEFAULT NULL,
  date_pliage date DEFAULT NULL,
  type_linge_plie varchar(255) DEFAULT NULL,
  quantite_pliee INTEGER DEFAULT NULL,
  mode_conditionnement varchar(255) DEFAULT NULL,
  zone_stockage varchar(255) DEFAULT NULL,
  controle_conformite_pliage BOOLEAN DEFAULT NULL,
  signature_agent_pliage varchar(500) DEFAULT NULL,
  observations_pliage text,
  date_livraison date DEFAULT NULL,
  service_destinataire varchar(255) DEFAULT NULL,
  type_linge_livre varchar(255) DEFAULT NULL,
  quantite_livree INTEGER DEFAULT NULL,
  etat_linge_livre varchar(255) DEFAULT NULL,
  agent_livreur varchar(36) DEFAULT NULL,
  receptonnaire_nom varchar(255) DEFAULT NULL,
  signature_receptonnaire varchar(500) DEFAULT NULL,
  heure_livraison time DEFAULT NULL,
  date_non_conformite date DEFAULT NULL,
  type_non_conformite varchar(255) DEFAULT NULL,
  service_concerne_non_conformite varchar(255) DEFAULT NULL,
  mesure_corrective text,
  responsable_corrective varchar(36) DEFAULT NULL,
  date_cloture_non_conformite date DEFAULT NULL,
  signature_non_conformite varchar(500) DEFAULT NULL,
  responsable_traçabilite varchar(36) DEFAULT NULL,
  date_validation_traçabilite date DEFAULT NULL,
  signature_traçabilite varchar(500) DEFAULT NULL,
  observations_traçabilite text,
  status TEXT CHECK (status IN ('en_reception','en_lavage','en_sechage','en_pliage','en_stockage','en_distribution','termine','non_conforme')) DEFAULT 'en_reception',
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_laundry_tracking_etabli_par ON laundry_tracking (etabli_par);
CREATE INDEX idx_laundry_tracking_agent_reception ON laundry_tracking (agent_reception);
CREATE INDEX idx_laundry_tracking_agent_lavage ON laundry_tracking (agent_lavage);
CREATE INDEX idx_laundry_tracking_repassage_effectue_par ON laundry_tracking (repassage_effectue_par);
CREATE INDEX idx_laundry_tracking_agent_livreur ON laundry_tracking (agent_livreur);
CREATE INDEX idx_laundry_tracking_responsable_corrective ON laundry_tracking (responsable_corrective);
CREATE INDEX idx_laundry_tracking_responsable_traçabilite ON laundry_tracking (responsable_traçabilite);
CREATE INDEX idx_laundry_tracking_created_by ON laundry_tracking (created_by);
CREATE INDEX idx_laundry_tracking_idx_date_reception ON laundry_tracking (date_reception);
CREATE INDEX idx_laundry_tracking_idx_service_origine ON laundry_tracking (service_origine);
CREATE INDEX idx_laundry_tracking_idx_status ON laundry_tracking (status);
CREATE INDEX idx_laundry_tracking_idx_date_etablissement ON laundry_tracking (date_etablissement);
CREATE INDEX idx_laundry_tracking_idx_type_linge ON laundry_tracking (type_linge);


-- --------------------------------------------------------

--
-- Structure de la table `login_history`
--

DROP TABLE IF EXISTS login_history CASCADE;
CREATE TABLE IF NOT EXISTS login_history (
  id varchar(36) NOT NULL,
  user_id varchar(36) NOT NULL,
  username varchar(100) NOT NULL,
  email varchar(255) NOT NULL,
  role varchar(50) NOT NULL,
  ip_address varchar(45) DEFAULT NULL,
  user_agent text,
  login_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  logout_time timestamp NULL DEFAULT NULL,
  session_duration INTEGER DEFAULT NULL,
  status TEXT CHECK (status IN ('success','failed','expired')) DEFAULT 'success',
  failure_reason varchar(255) DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX idx_login_history_idx_user_id ON login_history (user_id);
CREATE INDEX idx_login_history_idx_email ON login_history (email);
CREATE INDEX idx_login_history_idx_login_time ON login_history (login_time);
CREATE INDEX idx_login_history_idx_role ON login_history (role);


--
-- Déchargement des données de la table `login_history`
--

INSERT INTO login_history (id, user_id, username, email, role, ip_address, user_agent, login_time, logout_time, session_duration, status, failure_reason) VALUES
('228bdda5-3e23-4e9b-aa11-9ba6cffac46b', '3a40b05d-c55e-11f0-8501-3dc1110e1642', 'technicien_polyvalent', 'technicien.polyvalent@hospital.com', 'technicien_polyvalent', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 09:05:34', '2026-01-13 09:05:53', 18, 'success', NULL),
('33586d0a-25d8-4dc7-bf2e-91305e88970e', 'bc6721da-b978-11f0-9a15-1905ccf35bed', 'secretaire', 'secretaire@hospital.com', 'secretaire', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 09:05:56', '2026-01-13 09:05:59', 3, 'success', NULL),
('b18bbc54-8504-45d0-ad85-ca7361fa5491', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 09:06:02', '2026-01-13 09:11:13', 311, 'success', NULL),
('dd376168-d14d-4f6e-9aa5-8d839f874dc8', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 09:16:33', '2026-01-13 09:16:44', 11, 'success', NULL),
('bc721347-bcb3-4f70-a001-f6d822ecde2e', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 09:48:27', '2026-01-13 12:05:22', 8215, 'success', NULL),
('4bc0229c-c7da-418f-b465-914ce8b40519', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'agent_entretien', 'agent.entretien@hospital.com', 'agent_entretien', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:05:30', '2026-01-13 12:05:43', 13, 'success', NULL),
('bcf68bca-0ad5-45c6-86ff-92b484339295', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:05:46', '2026-01-13 12:06:23', 37, 'success', NULL),
('4fb23634-edb2-4bd8-bdf3-3acca34b4ca9', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'agent_entretien', 'agent.entretien@hospital.com', 'agent_entretien', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:06:26', '2026-01-13 12:07:35', 68, 'success', NULL),
('1f376029-2085-4030-835c-d003ecdfbe31', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:07:36', '2026-01-13 12:08:00', 23, 'success', NULL),
('84795213-f844-4aad-8e94-5296a213440c', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'agent_entretien', 'agent.entretien@hospital.com', 'agent_entretien', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:08:03', '2026-01-13 12:08:13', 10, 'success', NULL),
('3445785f-de5a-41b8-8c5c-15bb690eb335', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:08:15', '2026-01-13 12:11:52', 217, 'success', NULL),
('08f07c4d-9a89-46b0-85fc-45d689c06d30', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'agent_entretien', 'agent.entretien@hospital.com', 'agent_entretien', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:11:55', '2026-01-13 12:16:38', 282, 'success', NULL),
('9a4f3492-f945-4d0c-a993-42cb7d718b82', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:16:41', '2026-01-13 12:17:38', 56, 'success', NULL),
('8b8d9a63-0a75-4fa7-a592-50bce65843d4', 'bc6721da-b978-11f0-9a15-1905ccf35bed', 'secretaire', 'secretaire@hospital.com', 'secretaire', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:17:41', '2026-01-13 12:17:58', 16, 'success', NULL),
('86dcd1d8-936e-475d-ac62-7f06605f2129', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:18:00', '2026-01-13 12:18:17', 17, 'success', NULL),
('d188394a-323e-48ef-bb58-f8a6c1aa2ca8', '697e9e5c-b983-11f0-9a15-1905ccf35bed', 'medecin', 'medecin@hospital.com', 'medecin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:18:21', '2026-01-13 12:18:32', 11, 'success', NULL),
('ceb8e659-6e78-40d4-a170-d8798b02b2af', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:18:35', '2026-01-13 12:19:09', 34, 'success', NULL),
('5dd86e5f-fa4d-431c-8b62-3f84bc7d2c5d', 'bc6721da-b978-11f0-9a15-1905ccf35bed', 'secretaire', 'secretaire@hospital.com', 'secretaire', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:19:12', '2026-01-13 12:19:14', 2, 'success', NULL),
('a5f7770d-eaa1-4c29-b8c1-bd884ccd69e8', '697e9e5c-b983-11f0-9a15-1905ccf35bed', 'medecin', 'medecin@hospital.com', 'medecin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:19:16', '2026-01-13 12:19:25', 9, 'success', NULL),
('8beabf68-7171-447d-8817-7ce4b043abc2', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:19:28', '2026-01-13 12:28:52', 563, 'success', NULL),
('0af8ee48-37e5-41b9-8e34-0dfcfdc28493', 'unknown', 'employe@hospital.com', 'employe@hospital.com', 'unknown', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:29:22', NULL, NULL, 'failed', 'Email non trouvé'),
('75f94c91-c679-4652-a07b-a09ddd62c2b5', 'f140f9e3-f07b-11f0-85c4-10e7c6f33f80', 'employe', 'employe@hospital.com', 'employe', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:33:04', NULL, NULL, 'failed', 'Mot de passe incorrect'),
('0a986e65-7631-4818-9819-ff25c5ede5e2', 'f140f9e3-f07b-11f0-85c4-10e7c6f33f80', 'employe', 'employe@hospital.com', 'employe', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:34:18', '2026-01-13 12:35:24', 65, 'success', NULL),
('3a0b7d87-c58c-49bc-9035-c30a8de81fca', 'f140f9e3-f07b-11f0-85c4-10e7c6f33f80', 'employe', 'employe@hospital.com', 'employe', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:35:34', NULL, NULL, 'failed', 'Mot de passe incorrect'),
('284173a3-22c8-455b-b828-491aa9047a3a', 'f140f9e3-f07b-11f0-85c4-10e7c6f33f80', 'employe', 'employe@hospital.com', 'employe', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:35:39', NULL, NULL, 'failed', 'Mot de passe incorrect'),
('388a450a-4ff3-4d9e-af70-7e3616efe2ea', 'f140f9e3-f07b-11f0-85c4-10e7c6f33f80', 'employe', 'employe@hospital.com', 'employe', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:37:24', '2026-01-13 12:39:12', 108, 'success', NULL),
('6883bab5-427c-4471-8188-51f05910f1bb', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:39:18', '2026-01-13 12:44:19', 300, 'success', NULL),
('a234d7ae-834f-48c1-b30c-c0865a71a20d', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:45:39', '2026-01-13 12:46:30', 51, 'success', NULL),
('9b746eda-be44-4faa-a0f0-c45d4f2d5984', 'f140f9e3-f07b-11f0-85c4-10e7c6f33f80', 'employe', 'employe@hospital.com', 'employe', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:46:33', NULL, NULL, 'failed', 'Mot de passe incorrect'),
('612cff7c-0dc2-4d1f-a607-3ca5d31155ff', 'f140f9e3-f07b-11f0-85c4-10e7c6f33f80', 'employe', 'employe@hospital.com', 'employe', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:47:33', '2026-01-13 12:48:27', 53, 'success', NULL),
('613e8f99-202a-4f98-9e78-2848aa6f3919', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', 'superadmin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:48:31', '2026-01-13 12:59:14', 642, 'success', NULL),
('dabde3af-5f31-4335-8215-1458f19d485d', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'superviseur_qhse', 'qhse@hospital.com', 'superviseur_qhse', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:59:21', '2026-01-13 12:59:28', 6, 'success', NULL),
('b32bd373-ddab-455e-b249-986d2e470273', 'bc6721da-b978-11f0-9a15-1905ccf35bed', 'secretaire', 'secretaire@hospital.com', 'secretaire', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '2026-01-13 12:59:31', NULL, NULL, 'success', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `maintenance_tasks`
--

DROP TABLE IF EXISTS maintenance_tasks CASCADE;
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id varchar(36) NOT NULL,
  equipment_id varchar(36) NOT NULL,
  type varchar(255) NOT NULL,
  description text,
  technician_id varchar(36) DEFAULT NULL,
  scheduled_date timestamp NOT NULL,
  status TEXT CHECK (status IN ('planifiée','en_cours','terminée')) DEFAULT 'planifiée',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_maintenance_tasks_equipment_id ON maintenance_tasks (equipment_id);
CREATE INDEX idx_maintenance_tasks_technician_id ON maintenance_tasks (technician_id);


-- --------------------------------------------------------

--
-- Structure de la table `medical_waste`
--

DROP TABLE IF EXISTS medical_waste CASCADE;
CREATE TABLE IF NOT EXISTS medical_waste (
  id varchar(36) NOT NULL,
  waste_type TEXT CHECK (waste_type IN ('DASRI','médicamenteux','chimique','radioactif','autre')) NOT NULL,
  category varchar(255) DEFAULT NULL,
  quantity decimal(10,2) NOT NULL,
  unit TEXT CHECK (unit IN ('kg','litre','unité')) DEFAULT 'kg',
  collection_date date NOT NULL,
  collection_location varchar(255) NOT NULL,
  producer_service varchar(255) DEFAULT NULL,
  waste_code varchar(100) DEFAULT NULL,
  treatment_method varchar(255) DEFAULT NULL,
  treatment_company varchar(255) DEFAULT NULL,
  treatment_date date DEFAULT NULL,
  tracking_number varchar(255) DEFAULT NULL,
  certificate_number varchar(255) DEFAULT NULL,
  status TEXT CHECK (status IN ('collecté','stocké','traité','éliminé')) DEFAULT 'collecté',
  handled_by varchar(36) DEFAULT NULL,
  registered_by varchar(36) NOT NULL,
  notes text,
  photo_urls JSONB DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_medical_waste_handled_by ON medical_waste (handled_by);
CREATE INDEX idx_medical_waste_registered_by ON medical_waste (registered_by);
CREATE INDEX idx_medical_waste_idx_waste_type ON medical_waste (waste_type);
CREATE INDEX idx_medical_waste_idx_status ON medical_waste (status);
CREATE INDEX idx_medical_waste_idx_collection_date ON medical_waste (collection_date);


-- --------------------------------------------------------

--
-- Structure de la table `network_equipment`
--

DROP TABLE IF EXISTS network_equipment CASCADE;
CREATE TABLE IF NOT EXISTS network_equipment (
  id varchar(36) NOT NULL,
  name varchar(255) NOT NULL,
  type TEXT CHECK (type IN ('routeur','switch','point_acces','serveur','firewall','autre')) NOT NULL,
  brand varchar(255) DEFAULT NULL,
  model varchar(255) DEFAULT NULL,
  serial_number varchar(255) DEFAULT NULL,
  ip_address varchar(45) DEFAULT NULL,
  mac_address varchar(17) DEFAULT NULL,
  location varchar(255) DEFAULT NULL,
  status TEXT CHECK (status IN ('operationnel','en_maintenance','hors_service')) DEFAULT 'operationnel',
  installation_date date DEFAULT NULL,
  warranty_expiry date DEFAULT NULL,
  notes text,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_network_equipment_idx_network_equipment_status ON network_equipment (status);
CREATE INDEX idx_network_equipment_idx_network_equipment_type ON network_equipment (type);


-- --------------------------------------------------------

--
-- Structure de la table `network_inventory`
--

DROP TABLE IF EXISTS network_inventory CASCADE;
CREATE TABLE IF NOT EXISTS network_inventory (
  id varchar(36) NOT NULL,
  item_name varchar(255) NOT NULL,
  category TEXT CHECK (category IN ('cable','connecteur','antenne','boitier','autre')) NOT NULL,
  brand varchar(255) DEFAULT NULL,
  model varchar(255) DEFAULT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT CHECK (unit IN ('unite','metre','lot')) DEFAULT 'unite',
  location varchar(255) DEFAULT NULL,
  supplier varchar(255) DEFAULT NULL,
  purchase_date date DEFAULT NULL,
  purchase_cost decimal(10,2) DEFAULT NULL,
  notes text,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_network_inventory_idx_network_inventory_category ON network_inventory (category);


-- --------------------------------------------------------

--
-- Structure de la table `network_subscriptions`
--

DROP TABLE IF EXISTS network_subscriptions CASCADE;
CREATE TABLE IF NOT EXISTS network_subscriptions (
  id varchar(36) NOT NULL,
  service_name varchar(255) NOT NULL,
  provider varchar(255) NOT NULL,
  subscription_type TEXT CHECK (subscription_type IN ('internet','telephonie','cloud','securite','autre')) NOT NULL,
  monthly_cost decimal(10,2) DEFAULT '0.00',
  start_date date NOT NULL,
  renewal_date date NOT NULL,
  contract_number varchar(255) DEFAULT NULL,
  contact_person varchar(255) DEFAULT NULL,
  contact_phone varchar(50) DEFAULT NULL,
  contact_email varchar(255) DEFAULT NULL,
  status TEXT CHECK (status IN ('actif','suspendu','expire','resilie')) DEFAULT 'actif',
  notes text,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_network_subscriptions_idx_network_subscriptions_status ON network_subscriptions (status);
CREATE INDEX idx_network_subscriptions_idx_network_subscriptions_renewal_date ON network_subscriptions (renewal_date);


-- --------------------------------------------------------

--
-- Structure de la table `non_conformities`
--

DROP TABLE IF EXISTS non_conformities CASCADE;
CREATE TABLE IF NOT EXISTS non_conformities (
  id varchar(36) NOT NULL,
  audit_id varchar(36) DEFAULT NULL,
  incident_id varchar(36) DEFAULT NULL,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  severity TEXT CHECK (severity IN ('mineure','majeure','critique')) DEFAULT 'mineure',
  root_cause text,
  corrective_action text,
  preventive_action text,
  assigned_to varchar(36) DEFAULT NULL,
  due_date date DEFAULT NULL,
  status TEXT CHECK (status IN ('ouvert','en_cours','fermé','verifié')) DEFAULT 'ouvert',
  verification_date date DEFAULT NULL,
  verified_by varchar(36) DEFAULT NULL,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_non_conformities_audit_id ON non_conformities (audit_id);
CREATE INDEX idx_non_conformities_incident_id ON non_conformities (incident_id);
CREATE INDEX idx_non_conformities_assigned_to ON non_conformities (assigned_to);
CREATE INDEX idx_non_conformities_verified_by ON non_conformities (verified_by);
CREATE INDEX idx_non_conformities_created_by ON non_conformities (created_by);
CREATE INDEX idx_non_conformities_idx_status ON non_conformities (status);
CREATE INDEX idx_non_conformities_idx_severity ON non_conformities (severity);


-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE IF NOT EXISTS notifications (
  id varchar(36) NOT NULL,
  recipient_id varchar(36) NOT NULL,
  message text NOT NULL,
  link varchar(255) DEFAULT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_notifications_idx_recipient_read ON notifications (recipient_id,read);
CREATE INDEX idx_notifications_idx_created_at ON notifications (created_at);


--
-- Déchargement des données de la table `notifications`
--

INSERT INTO notifications (id, recipient_id, message, link, read, created_at) VALUES
('4c224535-5dab-4ab2-b6c5-4ed0cae29d89', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ndéndé se libérera à 17:00. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-19 15:53:54'),
('5a3914f5-2c76-4147-b806-7053196c6fbe', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Kango sera libre à 17:00. Préparez le nettoyage.', NULL, TRUE, '2025-11-19 15:53:54'),
('7b543fb6-5246-4822-8781-c4d1474ffdb5', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Kango se libérera à 17:00. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-19 15:53:54'),
('d9f4fac2-4e57-4eaa-8f35-b8dc6962f0f4', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Mbigou sera libre à 16:30. Préparez le nettoyage.', NULL, TRUE, '2025-11-19 15:26:34'),
('7e239364-7e06-4de9-aef7-18abdd7c928c', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Mbigou se libérera à 16:30. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-19 15:26:34'),
('96ab8682-556c-42d4-aa14-061badbdd925', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lastourville sera libre à 16:30. Préparez le nettoyage.', NULL, TRUE, '2025-11-19 15:26:34'),
('8c8df6ab-ad29-40c5-a480-3fae6c0c8035', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lastourville se libérera à 16:30. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-19 15:26:34'),
('5d6f4e4a-e71d-481c-acc5-45cdf4f98ef1', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné se libérera à 16:30. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-19 15:26:34'),
('ebbe904c-bc5b-4006-8812-1e9d541f021e', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil sera libre à 16:30. Préparez le nettoyage.', NULL, TRUE, '2025-11-19 15:26:34'),
('135b4fee-be1d-473c-adc0-308d2ad1a2a9', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ntoum sera libre à 14:00. Préparez le nettoyage.', NULL, TRUE, '2025-11-19 12:59:24'),
('bd249926-b445-46a0-8bbf-55b20864c2bb', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Koulamoutou se libérera à 13:00. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-18 11:47:11'),
('975c575c-4600-4087-9aa0-2ac1167e86eb', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Kango sera libre à 13:00. Préparez le nettoyage.', NULL, TRUE, '2025-11-18 11:47:11'),
('d266dbec-c364-44ff-9a67-8d30afdeb4a0', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Okondja sera libre à 13:00. Préparez le nettoyage.', NULL, TRUE, '2025-11-18 11:47:11'),
('8f11f8ac-1695-4d24-8aaf-2131b7e7463b', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ntoum se libérera à 14:00. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-19 12:59:24'),
('d0228237-89bc-40f0-9ae6-203c8bdcddb5', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Koulamoutou sera libre à 13:00. Préparez le nettoyage.', NULL, TRUE, '2025-11-18 11:47:11'),
('cdf4044a-6907-4589-ad9d-43d1ab8e0fb9', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Kango se libérera à 13:00. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-18 11:47:11'),
('b987ef04-26dc-45c0-900d-dac6c2bd4f46', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Okondja se libérera à 13:00. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-18 11:47:11'),
('cba15400-f2d4-426c-abdb-c20303085b25', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné sera libre à 16:30. Préparez le nettoyage.', NULL, TRUE, '2025-11-19 15:26:34'),
('6c793d15-0889-4c9c-8d1f-79e7e7812552', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil se libérera à 16:30. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-19 15:26:34'),
('c09a73ff-ed7c-4dcc-a913-4d7149c48d2a', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Nouvel incident (nettoyage) signalé par Superviseur QHSE.', NULL, TRUE, '2025-11-18 08:10:37'),
('097ae7b1-882e-49a6-bbde-50fbe23348de', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ndéndé sera libre à 17:00. Préparez le nettoyage.', NULL, TRUE, '2025-11-19 15:53:54'),
('4378b42b-b768-4907-98e0-10b59858c750', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Okondja sera libre à 12:00. Préparez le nettoyage.', NULL, TRUE, '2025-11-20 10:55:01'),
('53701fa9-2646-4b0b-88be-add9c58d981b', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Okondja se libérera à 12:00. Le nettoyage a été signalé.', NULL, TRUE, '2025-11-20 10:55:01'),
('f3babfe7-6881-436a-ab4f-a3f9cfbd8408', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:27:02'),
('60f36e82-c70c-4873-be77-75befdb0f4ee', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:27:02'),
('697ad5b6-3059-4140-9252-65ff00c6d4a4', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:27:49'),
('dd5c8186-20fc-4b7b-8983-95ae8ddf1a65', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:27:49'),
('10b9bc16-9c13-40fe-be95-7c732cd8e4ea', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: traite', 'dashboardEntretien', TRUE, '2026-01-12 13:27:53'),
('8633c52d-4af5-4edc-9f51-58a16af2f97c', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: traite', 'dashboardEntretien', TRUE, '2026-01-12 13:27:53'),
('e773783b-b4b4-4d65-a49e-c30f8afc1b72', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: resolu', 'dashboardEntretien', TRUE, '2026-01-12 13:28:11'),
('8970cbec-4949-4f64-8512-e5dcb5e1cba3', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: resolu', 'dashboardEntretien', TRUE, '2026-01-12 13:28:11'),
('5c3a3979-c49b-4e69-ada4-1e3286d9b385', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 319d13af mis à jour: cours', 'dashboardTechnicien', TRUE, '2026-01-12 13:29:31'),
('1b4afc11-0d00-4cf0-8d42-5def59e7bbb8', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ndéndé se libérera à 14:00. Le nettoyage a été signalé.', NULL, FALSE, '2026-03-05 12:45:31'),
('76321488-a248-495f-a671-6ced730a2315', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 319d13af mis à jour: traite', 'dashboardTechnicien', TRUE, '2026-01-12 13:29:34'),
('b8509cdc-ad4b-4c21-b87e-9f783f585ab0', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ntoum se libérera à 14:00. Le nettoyage a été signalé.', NULL, FALSE, '2026-03-05 12:45:31'),
('4bb6545d-d584-46f9-bff5-4bb66f31eb70', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 319d13af mis à jour: resolu', 'dashboardTechnicien', TRUE, '2026-01-12 13:30:14'),
('bd31947f-7952-4a63-8375-31bffde32761', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:06'),
('b2cf140f-d57f-45e6-8be9-a7c007b667ec', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:06'),
('3cecc547-16a1-474d-ae9a-a52f2d1fa21a', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:10'),
('855c3a5b-2ec1-48eb-a6bd-a3b0155930f5', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:10'),
('c9ca88ee-8131-4536-8628-1fef195101b9', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:12'),
('51aecf19-e787-488b-95e5-cf42bf695cb1', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:12'),
('9e7f9e5b-46f8-41a3-a99f-5c2c46430f8c', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:12'),
('e31c33a1-2bf9-4670-acc1-16120b96db52', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:12'),
('ae33835c-2513-4c0e-9064-0ca1c8b172d2', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:12'),
('55c1052d-d268-43fa-96d6-57588219f3d5', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:12'),
('4038231a-7b88-4a7b-a3d9-76ff7e48a12d', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:17'),
('0da3f937-481e-4e45-a0be-a86cce69d9e7', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:17'),
('0eee6e50-846e-4941-8e23-d5471ea313c8', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:19'),
('bd4663ba-ed13-4c97-98f9-1df74ebe71fa', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:19'),
('5a382b14-5810-4820-b168-684961b8a7ae', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:23'),
('c54ccd78-c74a-421f-b91c-c656c21a4830', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:23'),
('d708d431-28ad-4d7d-a2aa-bfb37b4882f1', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:24'),
('2a9b00c1-2383-4029-952f-baf3a5557810', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:24'),
('3141d5a0-3d88-44c7-ad5e-dce4c42f70d8', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:24'),
('74ffc623-270b-478d-8319-649bead81331', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:24'),
('7c05adc9-4b2e-4f25-816a-c0c4a7c0a46c', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:25'),
('1a7bbfce-0be6-4ca8-8c57-5c061a126e7a', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:25'),
('275a11f4-320d-4e67-9301-b0f672d0477e', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:25'),
('6bf77dc1-de44-4e28-b0d1-286a3905e5dc', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:25'),
('ab8efbe7-9b89-4488-8268-c90cc470c5bf', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:26'),
('c157e574-d3f5-42ca-813b-32979c4b0ace', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:26'),
('8bf4ced9-cb7d-4433-a587-b61970d17fe2', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:27'),
('3a1e3e5c-d80c-4d1f-ba09-d4de185c97e3', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:27'),
('9ff89b4e-1001-4635-878a-c48de76a7b17', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:29'),
('28469abd-7d97-455a-a675-e04f8a297911', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:29'),
('db388196-e61f-438c-b86b-cb12723a53c1', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:30'),
('3c368b6c-044d-4d6b-8899-fefc93b619c7', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 552901a9 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:35:30'),
('b538ff2a-47fe-4a38-b080-88d89b88bd4b', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Nouvel incident (nettoyage) signalé par Agent Entretien.', 'dashboardEntretien', TRUE, '2026-01-12 13:37:03'),
('82a11b64-0ad8-49f9-a0e0-183d9b63b257', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Nouvel incident (nettoyage) signalé par Agent Entretien.', 'dashboardEntretien', TRUE, '2026-01-12 13:38:05'),
('48f4d512-a0f2-4cda-9084-bc8cc846ba86', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Nouveau ticket vous a été assigné: 2413e203.', 'dashboardEntretien', TRUE, '2026-01-12 13:39:05'),
('b029137b-c544-42fb-a46b-5ee7fd23f128', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Ticket 2413e203 assigné à Edouard.', 'dashboardEntretien', TRUE, '2026-01-12 13:39:05'),
('88db06b7-13af-48f6-9066-66c171e9d115', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Nouveau ticket vous a été assigné: 9be20734.', 'dashboardEntretien', TRUE, '2026-01-12 13:39:13'),
('fdbf78a1-8f15-4630-a6a1-5ded4b726b05', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Ticket 9be20734 assigné à Anne.', 'dashboardEntretien', TRUE, '2026-01-12 13:39:13'),
('2fb94bce-8dd3-4b81-ac53-743d09241082', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:39:39'),
('29a7ba02-13ef-4ec3-ab6c-8a247a6fa249', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 2413e203 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:39:39'),
('5a978c51-cb0f-42b4-a2df-d5b10eec0755', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:39:41'),
('41661f44-a897-4c44-8e2b-052d955ed073', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 2413e203 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:39:41'),
('e0c5656e-bc39-4af0-81ef-06ea7c6643e5', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Statut du ticket mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:39:42'),
('5b4e3606-6578-4bd3-80ad-ad74c2b3ab4d', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 9be20734 mis à jour: cours', 'dashboardEntretien', TRUE, '2026-01-12 13:39:42'),
('306520a7-5786-49e8-a1f4-01cd3f54e3b1', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 06568e0a mis à jour: cours', 'dashboardTechnicien', TRUE, '2026-01-12 13:45:04'),
('57182e9c-2a38-4ac9-854e-df2b2d5f9f6f', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Un ticket vous a été retiré: 9be20734.', 'dashboardEntretien', TRUE, '2026-01-12 13:47:49'),
('00d99a62-6b9a-4964-b3f4-ef0da3e6f7c8', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Un ticket 9be20734 a été désassigné.', 'dashboardEntretien', TRUE, '2026-01-12 13:47:49'),
('1dec0fd3-81f8-48f0-9721-9795c43a9ee8', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ntoum sera libre à 14:00. Préparez le nettoyage.', NULL, FALSE, '2026-03-05 12:45:31'),
('e58a7383-aae4-442c-87de-cd5fbeceaeab', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Un ticket 06568e0a a été désassigné.', 'dashboardTechnicien', TRUE, '2026-01-12 13:53:57'),
('bf2d442f-111d-43d0-a1dc-b2349e944276', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'Un ticket vous a été retiré: 2413e203.', 'dashboardEntretien', TRUE, '2026-01-12 14:06:09'),
('24094c14-4006-47b5-a828-a4c73af4d827', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Un ticket 2413e203 a été désassigné.', 'dashboardEntretien', TRUE, '2026-01-12 14:06:09'),
('16b872c3-f332-4888-b7e0-fef692936552', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil sera libre à 16:30. Préparez le nettoyage.', NULL, TRUE, '2026-01-12 15:28:14'),
('ef581054-b23d-4c3a-a6dc-6b1fae57d78f', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil se libérera à 16:30. Le nettoyage a été signalé.', NULL, TRUE, '2026-01-12 15:28:14'),
('ec282fd7-9d14-4d06-b969-c8202cf71ac9', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné sera libre à 16:30. Préparez le nettoyage.', NULL, TRUE, '2026-01-12 15:28:14'),
('0658f8bc-8fc0-4a75-b0e1-de526436ed6f', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné se libérera à 16:30. Le nettoyage a été signalé.', NULL, TRUE, '2026-01-12 15:28:14'),
('3d11e3c5-b7b7-438f-b332-0bc1edee1130', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Okondja sera libre à 12:00. Préparez le nettoyage.', NULL, FALSE, '2026-03-05 10:48:40'),
('ac588df9-0a13-46e9-9509-f0693925af21', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Okondja se libérera à 12:00. Le nettoyage a été signalé.', NULL, FALSE, '2026-03-05 10:48:40'),
('e0306bf2-20f7-464b-8d2b-971623772637', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ntoum se libérera à 14:00. Le nettoyage a été signalé.', NULL, FALSE, '2026-02-11 12:55:07'),
('d3b60b72-34af-4a57-8ff6-e2d9b0aa77eb', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ntoum sera libre à 14:00. Préparez le nettoyage.', NULL, FALSE, '2026-02-11 12:55:07'),
('e0dddbde-0812-4fb6-b5a3-9c2f7c0fd6a7', '3a40b05d-c55e-11f0-8501-3dc1110e1642', 'Statut du ticket mis à jour: cours', 'dashboardTechnicien', FALSE, '2026-02-11 13:28:16'),
('5ddb239b-ebe9-4814-ad97-40762ac595a4', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 62f25685 mis à jour: cours', 'dashboardTechnicien', FALSE, '2026-02-11 13:28:16'),
('2f2e186e-f2d4-417c-8368-22e396b2d2cf', '3a40b05d-c55e-11f0-8501-3dc1110e1642', 'Statut du ticket mis à jour: traite', 'dashboardTechnicien', FALSE, '2026-02-11 13:28:34'),
('4fec7efe-64eb-42c6-8014-706e024e978a', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Statut du ticket 62f25685 mis à jour: traite', 'dashboardTechnicien', FALSE, '2026-02-11 13:28:34'),
('6313f3fa-a0fe-4931-9730-870f9a6c6f50', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil se libérera à 16:30. Le nettoyage a été signalé.', NULL, FALSE, '2026-02-11 15:18:40'),
('993e5916-9e4c-4663-bc22-1b620c36bafb', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil sera libre à 16:30. Préparez le nettoyage.', NULL, FALSE, '2026-02-11 15:18:40'),
('37a58c8a-cd05-4a71-8dfd-67ae938eafc5', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné se libérera à 16:30. Le nettoyage a été signalé.', NULL, FALSE, '2026-02-11 15:18:40'),
('db90bf51-7ad9-4488-ad0b-9bff8c19fdce', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné sera libre à 16:30. Préparez le nettoyage.', NULL, FALSE, '2026-02-11 15:18:40'),
('f010f279-f9ba-4435-b075-cadef5a46a11', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil se libérera à 16:30. Le nettoyage a été signalé.', NULL, FALSE, '2026-02-27 15:20:12'),
('7c776d10-6844-4f86-8c56-8518b688aa8e', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné se libérera à 16:30. Le nettoyage a été signalé.', NULL, FALSE, '2026-02-27 15:20:12'),
('8d832299-7c6e-4259-b4cf-c9c42900e984', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné sera libre à 16:30. Préparez le nettoyage.', NULL, FALSE, '2026-02-27 15:20:12'),
('ae949b08-d8c0-423d-bc73-50f72b3d87d2', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil sera libre à 16:30. Préparez le nettoyage.', NULL, FALSE, '2026-02-27 15:20:12'),
('0330cc87-62da-43ca-9df7-d6c24c1cc2be', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil se libérera à 16:30. Le nettoyage a été signalé.', NULL, FALSE, '2026-02-27 15:28:00'),
('dcc866cf-126c-4830-88b5-1d9dc6d62e11', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Port-Gentil sera libre à 16:30. Préparez le nettoyage.', NULL, FALSE, '2026-02-27 15:28:00'),
('22b88362-2281-4088-91c2-b2f56099d609', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné se libérera à 16:30. Le nettoyage a été signalé.', NULL, FALSE, '2026-02-27 15:28:00'),
('84951cd2-a0fa-48c5-a160-104979f17e31', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Lambaréné sera libre à 16:30. Préparez le nettoyage.', NULL, FALSE, '2026-02-27 15:28:00'),
('ebced43d-dd34-4a9e-99d1-e7fe2f974bc7', '0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'La salle Salle de consultation Ndéndé sera libre à 14:00. Préparez le nettoyage.', NULL, FALSE, '2026-03-05 12:45:31'),
('74bb34da-26ca-4feb-b7f2-bc472379cdee', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'Nouveau visiteur enregistré: JOHAN par Agent Sécurité.', 'dashboardSecurite', TRUE, '2026-03-06 08:22:02'),
('3614d29a-cfc8-4469-a151-cdf4d2377e5a', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Nouveau visiteur enregistré: JOHAN par Agent Sécurité.', 'dashboardSecurite', FALSE, '2026-03-06 08:22:02'),
('f40303ce-f7a6-4c8f-8b62-2a8a9c616ed0', 'da16a8e5-b979-11f0-9a15-1905ccf35bed', 'Nouveau visiteur enregistré: JOHAN par Agent Sécurité.', 'dashboardSecurite', FALSE, '2026-03-06 08:22:02'),
('6336138a-c26a-485d-8637-750640d707a3', 'e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'Nouvel incident (maintenance-preventive) signalé par Employé.', 'qhseTickets', FALSE, '2026-03-09 14:52:56'),
('478d8213-0f67-493c-ab50-ab5add81ca30', 'ea13fae7-b977-11f0-9a15-1905ccf35bed', 'Nouvel incident (maintenance-preventive) signalé par Employé.', 'qhseTickets', FALSE, '2026-03-09 14:52:56');

-- --------------------------------------------------------

--
-- Structure de la table `planned_tasks`
--

DROP TABLE IF EXISTS planned_tasks CASCADE;
CREATE TABLE IF NOT EXISTS planned_tasks (
  id varchar(36) NOT NULL,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  assigned_to varchar(36) DEFAULT NULL,
  assignee_name varchar(255) DEFAULT NULL,
  created_by varchar(36) DEFAULT NULL,
  due_date date NOT NULL,
  status TEXT CHECK (status IN ('à faire','en_cours','terminée','annulée')) DEFAULT 'à faire',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_planned_tasks_assigned_to ON planned_tasks (assigned_to);
CREATE INDEX idx_planned_tasks_created_by ON planned_tasks (created_by);


-- --------------------------------------------------------

--
-- Structure de la table `profiles`
--

DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE IF NOT EXISTS profiles (
  id varchar(36) NOT NULL,
  username varchar(191) NOT NULL,
  email varchar(191) NOT NULL,
  password_hash varchar(255) NOT NULL,
  first_name varchar(255) DEFAULT NULL,
  last_name varchar(255) DEFAULT NULL,
  civility TEXT CHECK (civility IN ('M.','Mme','Mlle')) DEFAULT NULL,
  service varchar(255) DEFAULT NULL,
  role TEXT CHECK (role IN ('agent_securite','agent_entretien','technicien','superviseur_qhse','assistante_qhse','superadmin','secretaire','superviseur_agent_securite','superviseur_agent_entretien','superviseur_technicien','medecin','biomedical','dop','Infirmier','buandiere','employe','technicien_polyvalent','admin_reseau')) NOT NULL,
  pin varchar(255) DEFAULT NULL,
  added_permissions JSONB DEFAULT NULL,
  removed_permissions JSONB DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_profiles_username ON profiles (username);
CREATE UNIQUE INDEX idx_profiles_email ON profiles (email);


--
-- Déchargement des données de la table `profiles`
--

INSERT INTO profiles (id, username, email, password_hash, first_name, last_name, civility, service, role, pin, added_permissions, removed_permissions, created_at, updated_at) VALUES
('e3ab1d48-b8f1-11f0-9a15-1905ccf35bed', 'superadmin', 'admin@hospital.com', '$2a$10$1o50rXzUgFgMwHEpx1FUUOX9jfyEvgzR7rhtyVFbcicvvPYqmfBUC', 'Super', 'Admin', 'M.', 'Administration', 'superadmin', NULL, NULL, NULL, '2025-11-03 20:15:49', '2026-02-11 07:01:30'),
('ea13fae7-b977-11f0-9a15-1905ccf35bed', 'responsable_qhse', 'responsableqhse@hospital.com', '$2a$10$QAKZ5a/n7raPrBo6RJh3euS6u3yRRNXP/xNIhXrC2k4vN877UkQRq', 'Responsable', 'QHSE', 'Mme', 'Qualité, Hygiène, Sécurité et Environnement', 'superviseur_qhse', NULL, '["reportMaintenanceIncident"]', '["reportIncident"]', '2025-11-04 12:15:12', '2026-02-17 13:13:36'),
('bc6721da-b978-11f0-9a15-1905ccf35bed', 'secretaire', 'secretaire@hospital.com', '$2a$10$Lk99gn0FmP0MyEoCma3Kz.GpSbEuxwdKsV8JhpGreVC1A19cwfC/O', 'Secrétaire', 'Médicale', 'Mme', 'Secrétariat', 'secretaire', NULL, '["reportMaintenanceIncident"]', '[]', '2025-11-04 12:21:05', '2026-01-13 12:17:35'),
('cc781dbc-b979-11f0-9a15-1905ccf35bed', 'agent_securite', 'agent.securite@hospital.com', '$2a$10$DoPIFbDXZKSls29fEXLpJ.HIlqgpHKqPAQkDaNkqRQfLfVKjGNbaa', 'Agent', 'Sécurité', 'M.', 'Sécurité & Accueil', 'agent_securite', NULL, '[]', '[]', '2025-11-04 12:28:42', '2026-01-13 12:21:58'),
('da16a8e5-b979-11f0-9a15-1905ccf35bed', 'superviseur_securite', 'superviseur.securite@hospital.com', '$2a$10$ceA7HbrXM711/UOs0nrK/uE/kEKmfvOfhybyQ9nlmdHITGyEZVbBG', 'Superviseur', 'Sécurité', 'M.', 'Sécurité & Accueil', 'superviseur_agent_securite', NULL, '[]', '["reportIncident"]', '2025-11-04 12:29:04', '2026-01-13 12:21:23'),
('697e9e5c-b983-11f0-9a15-1905ccf35bed', 'medecin', 'medecin@hospital.com', '$2a$10$RHjdi.Yl3kmsR/Yepo9UZ.O/fFYC3vASkQ7Jyg8o8VeyC.wAZrBAu', '', 'Médecin', 'M.', 'Médecine Générale', 'medecin', NULL, '["reportMaintenanceIncident"]', '["reportIncident"]', '2025-11-04 13:37:31', '2026-02-17 13:19:35'),
('0d3e17af-b98b-11f0-9a15-1905ccf35bed', 'agent_entretien', 'agent.entretien@hospital.com', '$2a$10$/VQSbyde252YK1DHQbm91eANGu//A4.3BpAxGjtYu1mzQgajY/CLm', 'Agent', 'Entretien', 'M.', 'Entretien & Maintenance', 'agent_entretien', NULL, '["planningSalles", "reportMaintenanceIncident"]', '["dashboardQHSE", "reportIncident"]', '2025-11-04 14:32:12', '2026-01-13 12:20:56'),
('35a4db15-be46-11f0-8d76-4424e924f666', 'technicien biomedical', 'technicien.biomedical@hospital.com', '$2a$10$pLh9MrMj1Qc1p/gKOCC3CuxXThkqG.xLKVl8z3M5rBIq/KVsEoXcu', 'Technicien', 'Biomédical', 'M.', 'Maintenance Technique', 'technicien', NULL, '["reportMaintenanceIncident", "portalSuperadmin"]', '["reportIncident"]', '2025-11-10 15:02:00', '2026-02-17 13:30:48'),
('82a05aa3-c547-11f0-8501-3dc1110e1642', 'buandiere', 'buanderie@hospital.com', '$2a$10$C8N/4WrlL/A60hgq..bkmegVntlsxbLuxEKaMCim0TGHJ.sbmgsXe', 'Agent', 'Buanderie', 'Mme', 'Buanderie', 'buandiere', NULL, '["reportMaintenanceIncident", "portalSuperadmin"]', '["reportIncident"]', '2025-11-19 12:58:57', '2026-02-17 13:30:42'),
('3a40b05d-c55e-11f0-8501-3dc1110e1642', 'technicien_maintenance', 'technicien.maintance@hospital.com', '$2a$10$hs8lSfSg4SxcXjjhM1Wq/ebpSXNfVsJ8ay3YSlPCI5IYHVcKmOgoe', 'Technicien', 'Maintenance', 'M.', 'Maintenance Polyvalente', 'technicien_polyvalent', NULL, '["portalSuperadmin"]', '[]', '2025-11-19 15:41:34', '2026-02-17 13:30:35'),
('f140f9e3-f07b-11f0-85c4-10e7c6f33f80', 'employe', 'employe@hospital.com', '$2a$10$Q9sXmc145UCT1ZH6fm95bOP3wwK9MSU953x3rBTP49ddwYApFYH9m', 'Employé', '', 'M.', 'Employé', 'employe', NULL, '["reportMaintenanceIncident", "planningSalles"]', '[]', '2026-01-13 12:32:36', '2026-03-09 14:48:54'),
('96a45e63-49bb-4838-99e8-d0534878351e', 'Assistante qhse', 'assistanteqhse@hospital.com', '$2a$10$UTCfbxUHMe3izD6.9ik9MeXudvi9aUsC0Usl3r7nKlVSJ7dLXI7A6', 'Assistante', 'Qhse', 'Mlle', 'Assistante QHSE', 'assistante_qhse', NULL, '["reportMaintenanceIncident", "dailyRoundsBiomedical", "dailyRoundsPolyvalent"]', '["dashboardQHSE", "planningSalles", "globalRoomOverview", "qhseAudits", "qhseWaste", "qhseSterilization", "qhseSterilizationRegister", "qhseLaundry", "qhseRisks"]', '2026-02-11 10:23:33', '2026-02-17 13:14:34'),
('2f582c4f-0b4a-11f1-b144-10e7c6f33f80', 'admin_reseau', 'admin.reseau@hospital.com', '$2a$10$MTD/5IIVsVMiRq.HI9RmDed0368J2UVCx5V51lSP5hTgwalai/GYK', 'Administrateur', 'Réseau', 'M.', 'Informatique & Réseau', 'admin_reseau', NULL, '["portalSuperadmin"]', '[]', '2026-02-16 15:14:27', '2026-02-17 13:30:28');

-- --------------------------------------------------------

--
-- Structure de la table `qhse_anomalies`
--

DROP TABLE IF EXISTS qhse_anomalies CASCADE;
CREATE TABLE IF NOT EXISTS qhse_anomalies (
  id varchar(36) NOT NULL,
  date_anomalie date NOT NULL,
  lieu varchar(255) NOT NULL,
  source varchar(255) DEFAULT NULL,
  description text NOT NULL,
  thematique varchar(255) DEFAULT NULL,
  sous_thematique varchar(255) DEFAULT NULL,
  responsable_action varchar(255) DEFAULT NULL,
  message_prise_en_compte text,
  actions_a_mettre_en_oeuvre text,
  devis_a_faire BOOLEAN DEFAULT FALSE,
  montant_devis decimal(10,2) DEFAULT NULL,
  commentaires text,
  impact_patient varchar(255) DEFAULT NULL,
  impact_structure varchar(255) DEFAULT NULL,
  niveau_priorite TEXT CHECK (niveau_priorite IN ('faible','moyenne','haute','critique')) DEFAULT 'moyenne',
  date_limite date DEFAULT NULL,
  etat_avancement varchar(255) DEFAULT NULL,
  date_resolution date DEFAULT NULL,
  date_verification date DEFAULT NULL,
  commentaire_verification text,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_qhse_anomalies_created_by ON qhse_anomalies (created_by);
CREATE INDEX idx_qhse_anomalies_idx_qhse_anomalies_date ON qhse_anomalies (date_anomalie);
CREATE INDEX idx_qhse_anomalies_idx_qhse_anomalies_priorite ON qhse_anomalies (niveau_priorite);
CREATE INDEX idx_qhse_anomalies_idx_qhse_anomalies_responsable ON qhse_anomalies (responsable_action);


-- --------------------------------------------------------

--
-- Structure de la table `qhse_documents`
--

DROP TABLE IF EXISTS qhse_documents CASCADE;
CREATE TABLE IF NOT EXISTS qhse_documents (
  id varchar(36) NOT NULL,
  title varchar(255) NOT NULL,
  document_type TEXT CHECK (document_type IN ('procedure','instruction','registre','rapport','audit','formation','autre')) NOT NULL,
  category varchar(255) DEFAULT NULL,
  version varchar(50) NOT NULL DEFAULT '1.0',
  file_path varchar(500) DEFAULT NULL,
  file_name varchar(255) DEFAULT NULL,
  file_size INTEGER DEFAULT NULL,
  mime_type varchar(100) DEFAULT NULL,
  description text,
  status TEXT CHECK (status IN ('brouillon','en_validation','validé','obsolète','archivé')) DEFAULT 'brouillon',
  created_by varchar(36) NOT NULL,
  validated_by varchar(36) DEFAULT NULL,
  validation_date timestamp NULL DEFAULT NULL,
  effective_date date DEFAULT NULL,
  review_date date DEFAULT NULL,
  access_level TEXT CHECK (access_level IN ('public','interne','confidentiel')) DEFAULT 'interne',
  tags JSONB DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_qhse_documents_created_by ON qhse_documents (created_by);
CREATE INDEX idx_qhse_documents_validated_by ON qhse_documents (validated_by);
CREATE INDEX idx_qhse_documents_idx_document_type ON qhse_documents (document_type);
CREATE INDEX idx_qhse_documents_idx_status ON qhse_documents (status);
CREATE INDEX idx_qhse_documents_idx_category ON qhse_documents (category);


-- --------------------------------------------------------

--
-- Structure de la table `reports`
--

DROP TABLE IF EXISTS reports CASCADE;
CREATE TABLE IF NOT EXISTS reports (
  id varchar(36) NOT NULL,
  title varchar(255) NOT NULL,
  report_type TEXT CHECK (report_type IN ('incidents','audits','formations','déchets','stérilisation','risques','conformité','personnalisé')) NOT NULL,
  period_type TEXT CHECK (period_type IN ('quotidien','hebdomadaire','mensuel','trimestriel','annuel','personnalisé')) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  filters JSONB DEFAULT NULL,
  generated_by varchar(36) NOT NULL,
  file_path varchar(500) DEFAULT NULL,
  file_format TEXT CHECK (file_format IN ('pdf','excel','word')) DEFAULT 'pdf',
  status TEXT CHECK (status IN ('en_cours','terminé','échoué')) DEFAULT 'en_cours',
  generated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_reports_generated_by ON reports (generated_by);
CREATE INDEX idx_reports_idx_report_type ON reports (report_type);
CREATE INDEX idx_reports_idx_generated_at ON reports (generated_at);


-- --------------------------------------------------------

--
-- Structure de la table `risks`
--

DROP TABLE IF EXISTS risks CASCADE;
CREATE TABLE IF NOT EXISTS risks (
  id varchar(36) NOT NULL,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  risk_category TEXT CHECK (risk_category IN ('biologique','chimique','physique','ergonomique','psychosocial','sécurité','environnemental','autre')) NOT NULL,
  poste varchar(255) DEFAULT NULL,
  risk_source varchar(255) DEFAULT NULL,
  probability TEXT CHECK (probability IN ('très_faible','faible','moyenne','élevée','très_élevée')) NOT NULL,
  severity TEXT CHECK (severity IN ('négligeable','faible','modérée','importante','critique')) NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('très_faible','faible','moyen','élevé','très_élevé')) NOT NULL,
  current_controls text,
  residual_probability TEXT CHECK (residual_probability IN ('très_faible','faible','moyenne','élevée','très_élevée')) DEFAULT NULL,
  residual_severity TEXT CHECK (residual_severity IN ('négligeable','faible','modérée','importante','critique')) DEFAULT NULL,
  residual_risk_level TEXT CHECK (residual_risk_level IN ('très_faible','faible','moyen','élevé','très_élevé')) DEFAULT NULL,
  treatment_plan text,
  action_plan text,
  responsible_person varchar(36) DEFAULT NULL,
  due_date date DEFAULT NULL,
  status TEXT CHECK (status IN ('identifié','évalué','en_traitement','traité','surveillé')) DEFAULT 'identifié',
  review_date date DEFAULT NULL,
  last_review_date date DEFAULT NULL,
  reviewed_by varchar(36) DEFAULT NULL,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_risks_responsible_person ON risks (responsible_person);
CREATE INDEX idx_risks_reviewed_by ON risks (reviewed_by);
CREATE INDEX idx_risks_created_by ON risks (created_by);
CREATE INDEX idx_risks_idx_risk_category ON risks (risk_category);
CREATE INDEX idx_risks_idx_risk_level ON risks (risk_level);
CREATE INDEX idx_risks_idx_status ON risks (status);
CREATE INDEX idx_risks_idx_risks_poste ON risks (poste);


-- --------------------------------------------------------

--
-- Structure de la table `risk_actions`
--

DROP TABLE IF EXISTS risk_actions CASCADE;
CREATE TABLE IF NOT EXISTS risk_actions (
  id varchar(36) NOT NULL,
  risk_id varchar(36) NOT NULL,
  action_title varchar(255) NOT NULL,
  action_description text,
  action_type TEXT CHECK (action_type IN ('prévention','mitigation','transfert','acceptation')) DEFAULT 'mitigation',
  action_status TEXT CHECK (action_status IN ('planifiée','en_cours','terminée','annulée')) DEFAULT 'planifiée',
  responsible_person varchar(255) DEFAULT NULL,
  assigned_to varchar(36) DEFAULT NULL,
  due_date date DEFAULT NULL,
  completion_date date DEFAULT NULL,
  effectiveness_level TEXT CHECK (effectiveness_level IN ('très_élevée','élevée','moyenne','faible')) DEFAULT NULL,
  notes text,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_risk_actions_assigned_to ON risk_actions (assigned_to);
CREATE INDEX idx_risk_actions_created_by ON risk_actions (created_by);
CREATE INDEX idx_risk_actions_idx_risk_id ON risk_actions (risk_id);
CREATE INDEX idx_risk_actions_idx_due_date ON risk_actions (due_date);
CREATE INDEX idx_risk_actions_idx_action_status ON risk_actions (action_status);


-- --------------------------------------------------------

--
-- Structure de la table `rooms`
--

DROP TABLE IF EXISTS rooms CASCADE;
CREATE TABLE IF NOT EXISTS rooms (
  id varchar(36) NOT NULL,
  name varchar(255) NOT NULL,
  capacity INTEGER DEFAULT NULL,
  location varchar(255) NOT NULL,
  doctor_in_charge varchar(255) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);


--
-- Déchargement des données de la table `rooms`
--

INSERT INTO rooms (id, name, capacity, location, doctor_in_charge, created_at) VALUES
('54c73655-2fec-4f4e-9bd4-6e0bc3005b82', 'Salle de consultation Port-Gentil', NULL, 'Port-Gentil', NULL, '2025-11-13 13:33:56'),
('9b1487d2-bebb-4b26-815c-713bfc5c173b', 'Salle de consultation Lambaréné', NULL, 'Lambaréné', NULL, '2025-11-13 13:33:56'),
('8074ff85-657c-4693-99db-d36cc683f07c', 'Salle de consultation Ntoum', NULL, 'Ntoum', 'Dr Serge', '2025-11-13 13:33:56'),
('d2b076c7-e86b-4a67-8290-b57377247c67', 'Salle de consultation Okondja', NULL, 'Okondja', 'Dr Yeni', '2025-11-13 13:33:56'),
('e834ac37-b1d6-4185-aad0-c064294ffc47', 'Salle de consultation Ndéndé', NULL, 'Ndéndé', 'Dr Mamfumbi', '2025-11-13 13:33:56'),
('05004989-9d52-432a-901c-2c081e66705a', 'Salle de consultation Fougamou', NULL, 'Fougamou', 'Dr Chitou', '2025-11-13 13:33:56'),
('1cf1dd77-d6aa-4b29-89a8-5242345ba025', 'Salle de consultation Lastourville', NULL, 'Lastourville', NULL, '2025-11-13 14:29:27'),
('79ae9cb3-06c2-44c8-9056-bd1f555a37f4', 'Salle de consultation Koulamoutou', NULL, 'Koulamoutou', 'Dr Obame', '2025-11-13 14:29:27'),
('e14ec1ad-9d3d-48ae-9211-5c202058bc53', 'Salle de consultation Gamba', NULL, 'Gamba', 'Dr Lembangoye', '2025-11-13 14:29:27'),
('8b1cb8b8-cda9-4da6-9637-9c101f52f48a', 'Salle de consultation Tchibanga 2', NULL, 'Tchibanga 2', 'Mme Aude', '2025-11-13 14:29:27'),
('546c9ed4-e9ae-4b45-88bb-fe251f1768ba', 'Salle de consultation Tchibanga 1', NULL, 'Tchibanga 1', 'Dr Olende', '2025-11-13 14:29:28'),
('04eb37ea-6347-4a59-9489-3fc64f3936d3', 'Salle de consultation Mbigou', NULL, 'Mbigou', 'Dr Mekina', '2025-11-13 14:29:28'),
('325c662b-45d8-477a-bb57-559b33b89a2f', 'Salle de consultation Kango', NULL, 'Kango', 'Dr Toko', '2025-11-13 14:29:28'),
('75af456b-4998-44b4-90b6-2ceb7225619b', 'Salle de consultation Johannesbourg', NULL, 'Johannesbourg', 'Dr Bella', '2025-11-13 14:29:28'),
('cd216250-5cf0-4f2a-82f9-57ef8718c1c2', 'Salle de consultation Mouila', NULL, 'Mouila', 'Dr Germany', '2025-11-13 14:29:28'),
('98e5914f-0b88-490e-94b9-1f0fa5720667', 'Salle de consultation Lekoni', NULL, 'Lekoni', 'Dr Nguiabanda', '2025-11-13 14:29:29'),
('a21cc437-2db8-44cd-8f58-1569ec8c7669', 'Salle de consultation Akanda', NULL, 'Akanda', 'Dr Ngoma', '2025-11-13 14:29:29');

-- --------------------------------------------------------

--
-- Structure de la table `round_checklist_responses`
--

DROP TABLE IF EXISTS round_checklist_responses CASCADE;
CREATE TABLE IF NOT EXISTS round_checklist_responses (
  id varchar(36) NOT NULL,
  round_id varchar(36) NOT NULL,
  template_id varchar(36) NOT NULL,
  response_value text,
  is_checked BOOLEAN DEFAULT FALSE,
  observation text,
  equipment_status TEXT CHECK (equipment_status IN ('bon_état','défectueux')) DEFAULT NULL,
  equipment_name varchar(255) DEFAULT NULL,
  service_name varchar(255) DEFAULT NULL,
  photo_urls JSONB DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_round_checklist_responses_unique_round_template ON round_checklist_responses (round_id,template_id);
CREATE INDEX idx_round_checklist_responses_idx_round_id ON round_checklist_responses (round_id);
CREATE INDEX idx_round_checklist_responses_idx_template_id ON round_checklist_responses (template_id);
CREATE INDEX idx_round_checklist_responses_idx_equipment_status ON round_checklist_responses (equipment_status);


--
-- Déchargement des données de la table `round_checklist_responses`
--

INSERT INTO round_checklist_responses (id, round_id, template_id, response_value, is_checked, observation, equipment_status, equipment_name, service_name, photo_urls, created_at, updated_at) VALUES
('b3ed5b12-44b3-401a-8eb8-36f9bdb1b231', '5120e184-a3ed-4c9f-9bd0-42eb244c09de', '5f6de56c-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-02 13:19:46', '2026-02-11 11:20:16'),
('e6805ce7-27ed-440b-b799-0810258a3660', '5120e184-a3ed-4c9f-9bd0-42eb244c09de', '5f6de6fc-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-02 13:19:53', '2026-02-11 11:20:16'),
('ffdc0eac-2c25-4448-95d8-f51e2e7df9f8', '5120e184-a3ed-4c9f-9bd0-42eb244c09de', '5f6de8cf-001a-11f1-805a-10e7c6f33f80', 'RAS', FALSE, 'RAS', NULL, NULL, NULL, '[]', '2026-02-02 13:20:53', '2026-02-02 13:21:09'),
('be77b9e1-1651-46ea-991b-77e97eda2228', '5120e184-a3ed-4c9f-9bd0-42eb244c09de', '5f6de871-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'C VV W', 'bon_état', NULL, NULL, '[]', '2026-02-02 13:21:55', '2026-02-11 11:20:16'),
('a8d0be6a-4744-483b-af4d-33b47f29932b', '5120e184-a3ed-4c9f-9bd0-42eb244c09de', '5f6de7dc-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-02 13:21:59', '2026-02-11 11:20:16'),
('94928fda-7f79-421f-be5a-612498985a98', '5120e184-a3ed-4c9f-9bd0-42eb244c09de', '5f6de74a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-02 13:22:01', '2026-02-11 11:20:16'),
('eeecf932-183a-41a6-89ef-11663e7de83d', '5120e184-a3ed-4c9f-9bd0-42eb244c09de', '5f6de69d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-02 13:22:03', '2026-02-11 11:20:16'),
('916adb44-a47a-41f6-965d-48a0fc26a700', '5120e184-a3ed-4c9f-9bd0-42eb244c09de', '5f6de826-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-02 13:22:13', '2026-02-11 11:20:16'),
('d281b268-f341-4ed8-89e7-86760a50558e', '5120e184-a3ed-4c9f-9bd0-42eb244c09de', '5f6de793-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-02 13:22:24', '2026-02-11 11:20:16'),
('042d9173-247f-4709-9aaf-6a0ce9976531', 'db3b2d0c-9358-402d-8f6d-6ca517673ced', '5f6de8cf-001a-11f1-805a-10e7c6f33f80', 'ghnk,;', FALSE, 'gbnk;', NULL, NULL, NULL, '[]', '2026-02-02 13:44:52', '2026-02-02 13:44:56'),
('776cef7d-f04c-4550-8f23-28fd45693a18', 'db3b2d0c-9358-402d-8f6d-6ca517673ced', '5f6de826-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'hjk,l', 'bon_état', NULL, NULL, '[]', '2026-02-02 13:45:08', '2026-02-11 11:20:16'),
('23eaef32-772b-4e41-9d0d-f1958036467a', 'db3b2d0c-9358-402d-8f6d-6ca517673ced', '5f6de871-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'gjhjiuhokl', 'bon_état', NULL, NULL, '[]', '2026-02-02 13:45:12', '2026-02-11 11:20:16'),
('9394272f-559d-4906-8bcb-a2786ea4ee86', 'db3b2d0c-9358-402d-8f6d-6ca517673ced', '5f6de7dc-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'rtfjvbjhj', 'bon_état', NULL, NULL, '[]', '2026-02-02 13:45:17', '2026-02-11 11:20:16'),
('df03e4e8-0660-435f-8162-3a325d044489', 'db3b2d0c-9358-402d-8f6d-6ca517673ced', '5f6de793-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'dfxcnfhgvh', 'bon_état', NULL, NULL, '[]', '2026-02-02 13:45:25', '2026-02-11 11:20:16'),
('92d38b40-8707-4acd-8231-948a15670abb', 'db3b2d0c-9358-402d-8f6d-6ca517673ced', '5f6de74a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'erfgthjkl', 'bon_état', NULL, NULL, '[]', '2026-02-02 13:45:42', '2026-02-11 11:20:16'),
('52e3d9e7-c601-4dd1-a558-b0bbabb35fad', 'db3b2d0c-9358-402d-8f6d-6ca517673ced', '5f6de6fc-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'thgfjvhgjk', 'bon_état', NULL, NULL, '[]', '2026-02-02 13:45:51', '2026-02-11 11:20:16'),
('c1f3175a-c3a3-453e-8657-0bb8280b4edf', 'db3b2d0c-9358-402d-8f6d-6ca517673ced', '5f6de69d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'sfgcgc,v', 'bon_état', NULL, NULL, '[]', '2026-02-02 13:46:01', '2026-02-11 11:20:16'),
('5a034627-03ab-42f1-a9a6-f95017af35a2', 'db3b2d0c-9358-402d-8f6d-6ca517673ced', '5f6de56c-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'sfdhfjj', 'bon_état', NULL, NULL, '[]', '2026-02-02 13:46:07', '2026-02-11 11:20:16'),
('2537febf-3977-4e1d-841e-536d9c4a88e9', 'f2c6fb8f-a180-4efa-86a4-59db8a13c5a5', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 07:29:37', '2026-02-11 11:20:16'),
('016d5338-6107-4c0d-8b57-cddcc607e7d7', 'f2c6fb8f-a180-4efa-86a4-59db8a13c5a5', '5f687869-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 07:29:39', '2026-02-11 11:20:16'),
('1fdf7104-716c-4368-8892-0029044630dc', 'f2c6fb8f-a180-4efa-86a4-59db8a13c5a5', '5f687966-001a-11f1-805a-10e7c6f33f80', '50', FALSE, NULL, NULL, NULL, NULL, '[]', '2026-02-11 07:29:54', '2026-02-11 07:29:54'),
('2839d978-54ef-4473-9800-5b3c36c58a97', 'f2c6fb8f-a180-4efa-86a4-59db8a13c5a5', '5f687a11-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 07:29:58', '2026-02-11 11:20:16'),
('2e51261c-1234-418d-a925-8ea9559df642', 'f2c6fb8f-a180-4efa-86a4-59db8a13c5a5', '5f688262-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 07:30:01', '2026-02-11 11:20:16'),
('e42beee0-da66-4c52-8032-b82c81a35d5d', 'f2c6fb8f-a180-4efa-86a4-59db8a13c5a5', '5f68831d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 07:30:02', '2026-02-11 11:20:16'),
('755355ac-ac64-4e29-bcc2-fe609f8868f6', 'f2c6fb8f-a180-4efa-86a4-59db8a13c5a5', '5f68837d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 07:30:04', '2026-02-11 11:20:16'),
('a8fbd3b1-80b8-4427-b82a-d8b163bdf74b', 'f2c6fb8f-a180-4efa-86a4-59db8a13c5a5', '5f6883c9-001a-11f1-805a-10e7c6f33f80', 'rsdgdfhfgh', FALSE, 'dgdsfgdfhd', NULL, NULL, NULL, '[]', '2026-02-11 07:30:06', '2026-02-11 07:30:09'),
('370c21e5-fb3a-42b6-89bb-17a9ccca7a1c', '89b964d1-255d-4a75-a3e6-1f88358d6a57', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'qdsfsdgsd', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:33:02', '2026-02-11 11:20:16'),
('da570987-fd35-40b2-938c-abdce47569b8', '89b964d1-255d-4a75-a3e6-1f88358d6a57', '5f687869-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'vdfgdgsg', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:33:06', '2026-02-11 11:20:16'),
('7c8be6ab-a542-4891-a9c2-f9797c27d584', '89b964d1-255d-4a75-a3e6-1f88358d6a57', '5f687966-001a-11f1-805a-10e7c6f33f80', '50', FALSE, 'qgvsgsfh', NULL, NULL, NULL, '[]', '2026-02-11 07:33:10', '2026-02-11 07:33:16'),
('634d51ed-1593-4487-b743-8927a8f85229', '89b964d1-255d-4a75-a3e6-1f88358d6a57', '5f687a11-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'sdgshdfj', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:33:18', '2026-02-11 11:20:16'),
('220ee701-6e09-4d47-8df3-87f6de29e1cb', '89b964d1-255d-4a75-a3e6-1f88358d6a57', '5f688262-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'fghngghj', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:33:22', '2026-02-11 11:20:16'),
('1a1e701a-533a-4eaf-8589-897bb9f102bc', '89b964d1-255d-4a75-a3e6-1f88358d6a57', '5f68831d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'dhdfhdfhdf', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:33:27', '2026-02-11 11:20:16'),
('a7e85b86-512f-4330-b953-0dc4b491739e', '89b964d1-255d-4a75-a3e6-1f88358d6a57', '5f68837d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'gsdgsdgsgs', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:33:30', '2026-02-11 11:20:16'),
('1295c9f0-cce0-4758-9d3c-d1374e089038', '89b964d1-255d-4a75-a3e6-1f88358d6a57', '5f6883c9-001a-11f1-805a-10e7c6f33f80', 'dgsdgsdg', FALSE, 'dsfdgfhngnhnfgj', NULL, NULL, NULL, '[]', '2026-02-11 07:33:34', '2026-02-11 07:33:51'),
('9515458f-05e4-4a19-8d7a-8dbcc0dcb267', '996c4527-6cdc-4438-8601-8d9b1264ba16', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'kkhjkhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:35:05', '2026-02-11 11:20:16'),
('d5b5e2ab-c396-427b-8816-06a3fe3149b5', '996c4527-6cdc-4438-8601-8d9b1264ba16', '5f687869-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'jhhhhhhhhhhhhhhhhhhhhhhhhhhh', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:35:10', '2026-02-11 11:20:16'),
('439aa6d7-d930-49ac-8e08-3081c5eda33d', '996c4527-6cdc-4438-8601-8d9b1264ba16', '5f687966-001a-11f1-805a-10e7c6f33f80', '25', FALSE, 'yuuuuuuuuuuuuuuuuuuuuuuuuuuu', NULL, NULL, NULL, '[]', '2026-02-11 07:35:15', '2026-02-11 07:35:20'),
('4ea59176-188c-4100-88c8-1c1782b715d7', '996c4527-6cdc-4438-8601-8d9b1264ba16', '5f687a11-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'tyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyu', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:35:22', '2026-02-11 11:20:16'),
('d654327c-d7f5-4cd1-819a-5f82a210b246', '996c4527-6cdc-4438-8601-8d9b1264ba16', '5f688262-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'tuuuuuuuuuuuuuuuuuuuuuuuu', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:35:26', '2026-02-11 11:20:16'),
('0326ce94-bf62-426c-9970-cd520f6ed954', '996c4527-6cdc-4438-8601-8d9b1264ba16', '5f68831d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'tjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:35:30', '2026-02-11 11:20:16'),
('6e3a5162-b3a2-4150-8e0d-686298630b58', '996c4527-6cdc-4438-8601-8d9b1264ba16', '5f68837d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'tuuuuuuuuuuuuuuuuuuuuuuuuuuu', 'bon_état', NULL, NULL, '[]', '2026-02-11 07:35:34', '2026-02-11 11:20:16'),
('96818ac0-4e7a-4755-970d-335ec28fe696', '996c4527-6cdc-4438-8601-8d9b1264ba16', '5f6883c9-001a-11f1-805a-10e7c6f33f80', 'tjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj', FALSE, 'tjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj', NULL, NULL, NULL, '[]', '2026-02-11 07:35:38', '2026-02-11 07:35:43'),
('b345ae74-fc49-4559-b84e-e04ca7673012', '6fd14ca6-2ee6-4734-8cd7-4b203d678332', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'sdfdwfdf', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:12:16', '2026-02-11 11:20:16'),
('9e5de697-f537-4599-b02e-7b4edf425942', '6fd14ca6-2ee6-4734-8cd7-4b203d678332', '5f687869-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'dfsfsdgdgfd', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:12:30', '2026-02-11 11:20:16'),
('88f73827-df60-40b8-90e8-8dd7a08ebeb4', '6fd14ca6-2ee6-4734-8cd7-4b203d678332', '5f687966-001a-11f1-805a-10e7c6f33f80', '50', FALSE, 'dswgdg', NULL, NULL, NULL, '[]', '2026-02-11 11:12:37', '2026-02-11 11:12:40'),
('ee520dd1-4508-4fbe-bdbc-c421a4aca456', '6fd14ca6-2ee6-4734-8cd7-4b203d678332', '5f687a11-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'wfqsfqsfqsf', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:12:50', '2026-02-11 11:20:16'),
('897ddc9e-6578-44ce-884a-6e46a756aa6a', '6fd14ca6-2ee6-4734-8cd7-4b203d678332', '5f688262-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'qsfqdgdgsd', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:12:55', '2026-02-11 11:20:16'),
('2aa2f819-7122-436b-a7a5-b34d07314d30', '6fd14ca6-2ee6-4734-8cd7-4b203d678332', '5f68831d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'dgsdfgsgs', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:12:58', '2026-02-11 11:20:16'),
('dace4c73-7aaf-4895-bfe8-0f9eb2290b3a', '6fd14ca6-2ee6-4734-8cd7-4b203d678332', '5f68837d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'sgdfdfsd', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:13:01', '2026-02-11 11:20:16'),
('98959ce8-f81c-422e-9a3e-29cba5a37d9f', '6fd14ca6-2ee6-4734-8cd7-4b203d678332', '5f6883c9-001a-11f1-805a-10e7c6f33f80', 'dfgdfgdf', FALSE, 'dgdfdfdf', NULL, NULL, NULL, '[]', '2026-02-11 11:13:03', '2026-02-11 11:13:06'),
('66fc6bcc-1021-4336-976e-9d00c4cae7c3', '2308be31-3ae6-45e5-a5f7-86c6ea2962cc', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 11:23:25', '2026-02-11 11:35:23'),
('dfd5f14d-a009-451f-9287-7a3d0779c8c9', '74254af7-7140-4de6-a9e7-151cacc10529', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 11:29:31', '2026-02-11 11:35:23'),
('812ac14f-2f10-4410-ace6-5bde3e00058b', '84feb690-c60e-40b1-bfd8-9f4a6d5087b2', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 11:33:45', '2026-02-11 11:35:23'),
('0c7028b7-53bb-4235-817b-7e2221dbc965', '736f1acb-1ddc-4532-9d31-e62a0d629c84', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'défectueux', 'moniteur', 'Salle de consultation Ntoum', '[]', '2026-02-11 11:36:15', '2026-02-11 11:36:54'),
('cd7f3bbf-5f92-421c-974f-06c0b9ad42a5', '736f1acb-1ddc-4532-9d31-e62a0d629c84', '5f687869-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'défectueux', 'ventilateur', 'Salle de consultation Port-Gentil', '[]', '2026-02-11 11:36:23', '2026-02-11 11:37:20'),
('29be9383-0aaf-4bb0-bce8-dec88d3d0531', '736f1acb-1ddc-4532-9d31-e62a0d629c84', '5f687966-001a-11f1-805a-10e7c6f33f80', '50', FALSE, NULL, NULL, NULL, NULL, '[]', '2026-02-11 11:37:24', '2026-02-11 11:37:24'),
('db0b7197-2ee3-4d8a-81f8-246c08f1bd01', '736f1acb-1ddc-4532-9d31-e62a0d629c84', '5f687a11-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 11:37:27', '2026-02-11 11:37:29'),
('a25a5cf6-9c61-4699-9d63-c31f66ae4c89', '736f1acb-1ddc-4532-9d31-e62a0d629c84', '5f688262-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 11:37:30', '2026-02-11 11:37:32'),
('7153496b-94f8-4415-a26e-2ac7335106c4', '736f1acb-1ddc-4532-9d31-e62a0d629c84', '5f68831d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 11:37:34', '2026-02-11 11:37:36'),
('3db3f643-b646-41dd-9aa4-57acd324c46a', '736f1acb-1ddc-4532-9d31-e62a0d629c84', '5f68837d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 11:37:37', '2026-02-11 11:37:39'),
('d845a29c-37d6-470a-a0bc-93dc1a016662', '736f1acb-1ddc-4532-9d31-e62a0d629c84', '5f6883c9-001a-11f1-805a-10e7c6f33f80', 'ggdghghgjkj', FALSE, 'ddfgdgdhfhfhg', NULL, NULL, NULL, '[]', '2026-02-11 11:37:41', '2026-02-11 11:37:46'),
('6e12e964-fa23-4e01-9083-b17215c624ad', '275d2def-1aa8-49fa-be2d-2d08bfd7a2d1', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, NULL, 'bon_état', NULL, NULL, '[]', '2026-02-11 11:42:02', '2026-02-11 11:42:04'),
('6b110513-443c-4ec7-8675-2edec9090be0', '275d2def-1aa8-49fa-be2d-2d08bfd7a2d1', '5f687869-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'ddfghjhk', 'défectueux', 'moniteur', 'Salle de consultation Ntoum', '[]', '2026-02-11 11:42:08', '2026-02-11 11:42:34'),
('6c98a9c4-c3e6-4caf-bc1d-88a9a62ffb24', '275d2def-1aa8-49fa-be2d-2d08bfd7a2d1', '5f687966-001a-11f1-805a-10e7c6f33f80', '50', FALSE, 'fdghfhgfhjgjg', NULL, NULL, NULL, '[]', '2026-02-11 11:42:37', '2026-02-11 11:42:41'),
('41932173-035b-4a77-8c88-790c1087a5d9', '275d2def-1aa8-49fa-be2d-2d08bfd7a2d1', '5f687a11-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'ffgghhhjhjg', 'défectueux', 'ventilateur', 'Bureau des urgences', '[]', '2026-02-11 11:43:06', '2026-02-11 11:43:25'),
('85f6244c-f104-4cc0-a1d3-0c9af3c69a33', '275d2def-1aa8-49fa-be2d-2d08bfd7a2d1', '5f688262-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'dfghfhfjhg', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:43:28', '2026-02-11 11:43:32'),
('094e376a-6404-4cf4-8940-e0d90fe63181', '275d2def-1aa8-49fa-be2d-2d08bfd7a2d1', '5f68831d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'gdgfhfgjhfjhh', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:43:34', '2026-02-11 11:43:38'),
('f629d7a0-b20f-4a52-ae75-08986ed9a6e5', '275d2def-1aa8-49fa-be2d-2d08bfd7a2d1', '5f68837d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'dsgfdhfdhgfhfhfh', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:43:40', '2026-02-11 11:43:46'),
('bbb4b19d-59b9-44d4-abb0-f4e28319398b', '275d2def-1aa8-49fa-be2d-2d08bfd7a2d1', '5f6883c9-001a-11f1-805a-10e7c6f33f80', 'fsfgdfddfhdgfdhgfhg', FALSE, 'qfgsdfgfgdhgfdhgdfyf', NULL, NULL, NULL, '[]', '2026-02-11 11:43:48', '2026-02-11 11:43:54'),
('522bcf99-1735-474f-96af-ab38c72ff0c2', '5b956cc3-8181-4640-9b70-876d8ede82fd', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'sdfghjk', 'défectueux', 'moniteur', 'Salle de consultation Ntoum', '[]', '2026-02-11 11:48:54', '2026-02-11 11:49:18'),
('40a70afc-c08b-4f8a-9dd0-60917059dfeb', '5b956cc3-8181-4640-9b70-876d8ede82fd', '5f687869-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'xcvxvcbcvhvjg', 'défectueux', 'sdfghj', 'Salle de consultation Okondja', '[]', '2026-02-11 11:49:20', '2026-02-11 11:49:54'),
('c401bd8a-a25a-4636-ae58-b2b459186fef', '5b956cc3-8181-4640-9b70-876d8ede82fd', '5f687966-001a-11f1-805a-10e7c6f33f80', '50', FALSE, NULL, NULL, NULL, NULL, '[]', '2026-02-11 11:49:56', '2026-02-11 11:49:56'),
('7c5e1c15-b120-44a0-8698-50247fc14049', '5b956cc3-8181-4640-9b70-876d8ede82fd', '5f687a11-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'fgdghdfhfghg', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:49:58', '2026-02-11 11:50:02'),
('1950d6cb-66b6-4ab1-881f-f6da7668d878', '5b956cc3-8181-4640-9b70-876d8ede82fd', '5f688262-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'fxgdfhfhfg', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:50:04', '2026-02-11 11:50:07'),
('3b3f1df9-af07-4b46-96e2-c80e84627d53', '5b956cc3-8181-4640-9b70-876d8ede82fd', '5f68831d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'fdfdgfhfgh', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:50:08', '2026-02-11 11:50:12'),
('0f07bd4f-377a-4406-b7f1-fb2cbc0d90d2', '5b956cc3-8181-4640-9b70-876d8ede82fd', '5f68837d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'fwdxfgfhfvh', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:50:14', '2026-02-11 11:50:17'),
('a2bf28d0-f218-4a40-bbba-8e45433ac961', '5b956cc3-8181-4640-9b70-876d8ede82fd', '5f6883c9-001a-11f1-805a-10e7c6f33f80', 'fvxhbcvnvbn', FALSE, 'bchcvnvbn,v', NULL, NULL, NULL, '[]', '2026-02-11 11:50:18', '2026-02-11 11:50:21'),
('005c3c47-9302-4bd9-ba9a-4f7300ad8f7f', '4467aeb7-faf4-4f67-9aa6-c18e2f7a8829', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'qfsdsgsgs', 'défectueux', 'moniteur', 'Salle de consultation Ntoum', '[]', '2026-02-11 11:56:10', '2026-02-11 11:56:23'),
('5bf6cae5-840f-423f-b6f1-6bc447ac948a', '4467aeb7-faf4-4f67-9aa6-c18e2f7a8829', '5f687869-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'dqsfsdgshdfhf', 'défectueux', 'ventilateur', 'Salle de consultation Okondja', '[]', '2026-02-11 11:56:25', '2026-02-11 11:56:42'),
('b8b87ae1-10d9-4708-b65a-26522fb0f3b3', '4467aeb7-faf4-4f67-9aa6-c18e2f7a8829', '5f687966-001a-11f1-805a-10e7c6f33f80', '50', FALSE, 'dqsfsgdfyhh', NULL, NULL, NULL, '[]', '2026-02-11 11:56:47', '2026-02-11 11:56:49'),
('466e38be-b1c2-48d6-a7ae-4f9df83d7bc0', '4467aeb7-faf4-4f67-9aa6-c18e2f7a8829', '5f687a11-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'qedrfgfgfh', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:56:51', '2026-02-11 11:56:55'),
('c2d16266-ab86-4ee3-b1b8-65e27336058a', '4467aeb7-faf4-4f67-9aa6-c18e2f7a8829', '5f688262-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'efvfhbfg,nf', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:57:03', '2026-02-11 11:57:07'),
('55ecee1a-de25-4ee5-b21d-b8ccd5835f8b', '4467aeb7-faf4-4f67-9aa6-c18e2f7a8829', '5f68831d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'dqrdfsdgvsdgdgv', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:57:10', '2026-02-11 11:57:16'),
('f19251d5-f622-42bf-95b4-c6eac7c9dd0d', '4467aeb7-faf4-4f67-9aa6-c18e2f7a8829', '5f68837d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'eqzrqsfdsgsdgdf', 'bon_état', NULL, NULL, '[]', '2026-02-11 11:57:18', '2026-02-11 11:57:22'),
('1d540fce-9008-4503-9671-2f0a625c492c', '4467aeb7-faf4-4f67-9aa6-c18e2f7a8829', '5f6883c9-001a-11f1-805a-10e7c6f33f80', 'qedzfdgrfdgdhdf', FALSE, 'fsdfsdgdfbdf', NULL, NULL, NULL, '[]', '2026-02-11 11:57:25', '2026-02-11 11:57:28'),
('f8d4cda6-c495-4b54-bdf1-fe13d10e059b', '72f27251-e449-4253-90d0-bd22e7019997', '5f68736a-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'qdqsfsdgdfhgh', 'défectueux', 'moniteur', 'Salle de consultation Ntoum', '[]', '2026-02-11 12:00:29', '2026-02-11 12:00:45'),
('e05b8f10-89f6-4c5e-a57b-9dd1a758f3b9', '72f27251-e449-4253-90d0-bd22e7019997', '5f687869-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'sfrfsfsfdefgfh', 'défectueux', 'ventilateur', 'Salle de consultation Okondja', '[]', '2026-02-11 12:00:46', '2026-02-11 12:01:15'),
('15525ec0-b0a8-4785-80ab-ab17d9be7378', '72f27251-e449-4253-90d0-bd22e7019997', '5f687966-001a-11f1-805a-10e7c6f33f80', '50', FALSE, 'dqfshbghjfgj', NULL, NULL, NULL, '[]', '2026-02-11 12:01:45', '2026-02-11 12:01:48'),
('974abb53-604f-49a8-bfaf-8452cde7b145', '72f27251-e449-4253-90d0-bd22e7019997', '5f687a11-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'fsdgshgfh', 'bon_état', NULL, NULL, '[]', '2026-02-11 12:01:50', '2026-02-11 12:01:54'),
('5e20fd24-42a6-4175-8e12-c0b0e3dae380', '72f27251-e449-4253-90d0-bd22e7019997', '5f688262-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'sqfdgdfhdfh', 'bon_état', NULL, NULL, '[]', '2026-02-11 12:01:56', '2026-02-11 12:02:00'),
('97fda0ba-da30-4d30-99d4-ad4139a6fee3', '72f27251-e449-4253-90d0-bd22e7019997', '5f68831d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'dqsfsgsdg', 'bon_état', NULL, NULL, '[]', '2026-02-11 12:02:06', '2026-02-11 12:02:10'),
('d7fd77ae-de78-45e0-8eb8-8b7cd307cea0', '72f27251-e449-4253-90d0-bd22e7019997', '5f68837d-001a-11f1-805a-10e7c6f33f80', NULL, TRUE, 'qsFQDGsdg', 'bon_état', NULL, NULL, '[]', '2026-02-11 12:02:11', '2026-02-11 12:02:14'),
('caa625af-3c28-4692-ab81-d6f7224d7c9f', '72f27251-e449-4253-90d0-bd22e7019997', '5f6883c9-001a-11f1-805a-10e7c6f33f80', 'qdsfsgdsg', FALSE, 'sgsdgdfg', NULL, NULL, NULL, '[]', '2026-02-11 12:02:15', '2026-02-11 12:02:18');

-- --------------------------------------------------------

--
-- Structure de la table `round_checklist_templates`
--

DROP TABLE IF EXISTS round_checklist_templates CASCADE;
CREATE TABLE IF NOT EXISTS round_checklist_templates (
  id varchar(36) NOT NULL,
  round_type TEXT CHECK (round_type IN ('biomedical','technicien_polyvalent')) NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  item_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  item_type TEXT CHECK (item_type IN ('checkbox','text','number','select')) DEFAULT 'checkbox',
  options JSONB DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_round_checklist_templates_idx_round_type ON round_checklist_templates (round_type);
CREATE INDEX idx_round_checklist_templates_idx_item_order ON round_checklist_templates (round_type,item_order);


--
-- Déchargement des données de la table `round_checklist_templates`
--

INSERT INTO round_checklist_templates (id, round_type, title, description, item_order, is_required, item_type, options, created_at, updated_at) VALUES
('5f68736a-001a-11f1-805a-10e7c6f33f80', 'biomedical', 'Vérification des équipements critiques', 'Vérifier l''état de fonctionnement des équipements critiques', 1, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f687869-001a-11f1-805a-10e7c6f33f80', 'biomedical', 'Contrôle des alarmes', 'Vérifier que toutes les alarmes fonctionnent correctement', 2, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f687966-001a-11f1-805a-10e7c6f33f80', 'biomedical', 'Vérification des températures', 'Contrôler les températures des équipements réfrigérés', 3, TRUE, 'number', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f687a11-001a-11f1-805a-10e7c6f33f80', 'biomedical', 'Inspection visuelle', 'Inspection visuelle générale des équipements', 4, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f688262-001a-11f1-805a-10e7c6f33f80', 'biomedical', 'Vérification des câbles et connexions', 'Contrôler l''état des câbles et connexions électriques', 5, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f68831d-001a-11f1-805a-10e7c6f33f80', 'biomedical', 'Nettoyage des équipements', 'Nettoyage des surfaces et écrans', 6, FALSE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f68837d-001a-11f1-805a-10e7c6f33f80', 'biomedical', 'Vérification des stocks consommables', 'Contrôler les niveaux de stocks des consommables', 7, FALSE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6883c9-001a-11f1-805a-10e7c6f33f80', 'biomedical', 'Observations générales', 'Notes et observations diverses', 8, FALSE, 'text', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6de56c-001a-11f1-805a-10e7c6f33f80', 'technicien_polyvalent', 'Vérification des systèmes électriques', 'Contrôler les tableaux électriques et disjoncteurs', 1, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6de69d-001a-11f1-805a-10e7c6f33f80', 'technicien_polyvalent', 'Vérification de la plomberie', 'Contrôler les fuites et le bon fonctionnement des robinets', 2, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6de6fc-001a-11f1-805a-10e7c6f33f80', 'technicien_polyvalent', 'Contrôle de la climatisation', 'Vérifier le fonctionnement des systèmes de climatisation', 3, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6de74a-001a-11f1-805a-10e7c6f33f80', 'technicien_polyvalent', 'Vérification des portes et serrures', 'Contrôler le bon fonctionnement des portes et serrures', 4, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6de793-001a-11f1-805a-10e7c6f33f80', 'technicien_polyvalent', 'Inspection des espaces communs', 'Vérifier l''état général des espaces communs', 5, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6de7dc-001a-11f1-805a-10e7c6f33f80', 'technicien_polyvalent', 'Vérification des éclairages', 'Contrôler le bon fonctionnement de l''éclairage', 6, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6de826-001a-11f1-805a-10e7c6f33f80', 'technicien_polyvalent', 'Contrôle des ascenseurs', 'Vérifier le bon fonctionnement des ascenseurs', 7, FALSE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6de871-001a-11f1-805a-10e7c6f33f80', 'technicien_polyvalent', 'Vérification des systèmes de sécurité', 'Contrôler les systèmes d''alarme et de sécurité', 8, TRUE, 'checkbox', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29'),
('5f6de8cf-001a-11f1-805a-10e7c6f33f80', 'technicien_polyvalent', 'Observations et interventions', 'Notes sur les interventions effectuées', 9, FALSE, 'text', NULL, '2026-02-02 09:34:29', '2026-02-02 09:34:29');

-- --------------------------------------------------------

--
-- Structure de la table `round_logs`
--

DROP TABLE IF EXISTS round_logs CASCADE;
CREATE TABLE IF NOT EXISTS round_logs (
  id varchar(36) NOT NULL,
  agent_id varchar(36) NOT NULL,
  checkpoint_id varchar(36) NOT NULL,
  scanned_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_round_logs_idx_agent_id ON round_logs (agent_id);
CREATE INDEX idx_round_logs_idx_checkpoint_id ON round_logs (checkpoint_id);
CREATE INDEX idx_round_logs_idx_scanned_at ON round_logs (scanned_at);


-- --------------------------------------------------------

--
-- Structure de la table `sterilization_charges`
--

DROP TABLE IF EXISTS sterilization_charges CASCADE;
CREATE TABLE IF NOT EXISTS sterilization_charges (
  id varchar(36) NOT NULL,
  register_id varchar(36) NOT NULL,
  date_controle date NOT NULL,
  type_charge varchar(255) NOT NULL,
  nombre_unites INTEGER NOT NULL,
  numero_cycle varchar(100) DEFAULT NULL,
  resultat_controle TEXT CHECK (resultat_controle IN ('acceptee','rejetee','en_attente')) DEFAULT 'en_attente',
  statut TEXT CHECK (statut IN ('acceptee','rejetee','en_attente')) DEFAULT 'en_attente',
  signature varchar(500) DEFAULT NULL,
  observations text,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_sterilization_charges_idx_register_id ON sterilization_charges (register_id);
CREATE INDEX idx_sterilization_charges_idx_date_controle ON sterilization_charges (date_controle);


-- --------------------------------------------------------

--
-- Structure de la table `sterilization_cycles`
--

DROP TABLE IF EXISTS sterilization_cycles CASCADE;
CREATE TABLE IF NOT EXISTS sterilization_cycles (
  id varchar(36) NOT NULL,
  cycle_number varchar(100) NOT NULL,
  sterilizer_id varchar(255) NOT NULL,
  sterilizer_type TEXT CHECK (sterilizer_type IN ('autoclave','ETO','plasma','peroxyde')) NOT NULL,
  cycle_type TEXT CHECK (cycle_type IN ('stérilisation','désinfection','préventif')) DEFAULT 'stérilisation',
  program_name varchar(255) DEFAULT NULL,
  start_time timestamp NOT NULL,
  end_time timestamp NULL DEFAULT NULL,
  duration_minutes INTEGER DEFAULT NULL,
  temperature decimal(5,2) DEFAULT NULL,
  pressure decimal(5,2) DEFAULT NULL,
  operator_id varchar(36) NOT NULL,
  status TEXT CHECK (status IN ('en_cours','terminé','échoué','annulé')) DEFAULT 'en_cours',
  result TEXT CHECK (result IN ('conforme','non_conforme','en_attente')) DEFAULT 'en_attente',
  biological_indicator_result TEXT CHECK (biological_indicator_result IN ('conforme','non_conforme','non_testé')) DEFAULT 'non_testé',
  chemical_indicator_result TEXT CHECK (chemical_indicator_result IN ('conforme','non_conforme','non_testé')) DEFAULT 'non_testé',
  non_conformity_reason text,
  batch_number varchar(100) DEFAULT NULL,
  items_count INTEGER DEFAULT 0,
  notes text,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_sterilization_cycles_cycle_number ON sterilization_cycles (cycle_number);
CREATE INDEX idx_sterilization_cycles_operator_id ON sterilization_cycles (operator_id);
CREATE INDEX idx_sterilization_cycles_idx_cycle_number ON sterilization_cycles (cycle_number);
CREATE INDEX idx_sterilization_cycles_idx_status ON sterilization_cycles (status);
CREATE INDEX idx_sterilization_cycles_idx_start_time ON sterilization_cycles (start_time);


-- --------------------------------------------------------

--
-- Structure de la table `sterilization_liberations`
--

DROP TABLE IF EXISTS sterilization_liberations CASCADE;
CREATE TABLE IF NOT EXISTS sterilization_liberations (
  id varchar(36) NOT NULL,
  register_id varchar(36) NOT NULL,
  date_liberation date NOT NULL,
  numero_lot_charge varchar(100) NOT NULL,
  service_destinataire varchar(255) NOT NULL,
  delai_validite date DEFAULT NULL,
  signature_receptionnaire varchar(500) DEFAULT NULL,
  observations text,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_sterilization_liberations_idx_register_id ON sterilization_liberations (register_id);
CREATE INDEX idx_sterilization_liberations_idx_date_liberation ON sterilization_liberations (date_liberation);


-- --------------------------------------------------------

--
-- Structure de la table `sterilization_maintenance`
--

DROP TABLE IF EXISTS sterilization_maintenance CASCADE;
CREATE TABLE IF NOT EXISTS sterilization_maintenance (
  id varchar(36) NOT NULL,
  register_id varchar(36) NOT NULL,
  date_maintenance date NOT NULL,
  type_operation varchar(255) NOT NULL,
  nom_technicien varchar(255) DEFAULT NULL,
  technicien_id varchar(36) DEFAULT NULL,
  resultat_controle TEXT CHECK (resultat_controle IN ('conforme','non_conforme','en_attente')) DEFAULT 'en_attente',
  signature varchar(500) DEFAULT NULL,
  observations text,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_sterilization_maintenance_technicien_id ON sterilization_maintenance (technicien_id);
CREATE INDEX idx_sterilization_maintenance_idx_register_id ON sterilization_maintenance (register_id);
CREATE INDEX idx_sterilization_maintenance_idx_date_maintenance ON sterilization_maintenance (date_maintenance);


-- --------------------------------------------------------

--
-- Structure de la table `sterilization_non_conformites`
--

DROP TABLE IF EXISTS sterilization_non_conformites CASCADE;
CREATE TABLE IF NOT EXISTS sterilization_non_conformites (
  id varchar(36) NOT NULL,
  register_id varchar(36) NOT NULL,
  date_observation date NOT NULL,
  description text NOT NULL,
  type_non_conformite varchar(255) DEFAULT NULL,
  action_corrective text,
  responsable_action varchar(36) DEFAULT NULL,
  date_cloture date DEFAULT NULL,
  status TEXT CHECK (status IN ('ouverte','en_cours','cloturee')) DEFAULT 'ouverte',
  signature varchar(500) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_sterilization_non_conformites_responsable_action ON sterilization_non_conformites (responsable_action);
CREATE INDEX idx_sterilization_non_conformites_idx_register_id ON sterilization_non_conformites (register_id);
CREATE INDEX idx_sterilization_non_conformites_idx_status ON sterilization_non_conformites (status);


-- --------------------------------------------------------

--
-- Structure de la table `sterilization_register`
--

DROP TABLE IF EXISTS sterilization_register CASCADE;
CREATE TABLE IF NOT EXISTS sterilization_register (
  id varchar(36) NOT NULL,
  code_document varchar(50) DEFAULT 'EN-STE-001-CDL',
  version varchar(10) DEFAULT 'AA',
  date_application date DEFAULT NULL,
  date_limite_validite date DEFAULT NULL,
  redacteur varchar(255) DEFAULT NULL,
  verificateur varchar(255) DEFAULT NULL,
  approbateur varchar(255) DEFAULT NULL,
  periode_debut date DEFAULT NULL,
  periode_fin date DEFAULT NULL,
  date_cycle date NOT NULL,
  service_concerne varchar(255) NOT NULL,
  operateur_nom varchar(255) NOT NULL,
  operateur_id varchar(36) DEFAULT NULL,
  type_materiel varchar(255) NOT NULL,
  numero_lot varchar(100) DEFAULT NULL,
  code_traçabilite varchar(100) DEFAULT NULL,
  methode_sterilisation TEXT CHECK (methode_sterilisation IN ('vapeur','chaleur_seche','ethylene_oxyde','plasma_hydrogene','autre')) NOT NULL,
  numero_cycle varchar(100) DEFAULT NULL,
  programme varchar(100) DEFAULT NULL,
  temperature decimal(5,2) DEFAULT NULL,
  duree_cycle INTEGER DEFAULT NULL,
  resultat_test_controle TEXT CHECK (resultat_test_controle IN ('conforme','non_conforme','en_attente')) DEFAULT 'en_attente',
  status_cycle TEXT CHECK (status_cycle IN ('en_cours','terminé','échoué','interrompu')) DEFAULT 'en_cours',
  observation_action_corrective text,
  signature_operateur varchar(500) DEFAULT NULL,
  signature_superviseur varchar(500) DEFAULT NULL,
  date_controle date DEFAULT NULL,
  type_charge varchar(255) DEFAULT NULL,
  nombre_unites INTEGER DEFAULT NULL,
  numero_cycle_controle varchar(100) DEFAULT NULL,
  resultat_controle TEXT CHECK (resultat_controle IN ('acceptee','rejetee','en_attente')) DEFAULT 'en_attente',
  statut_charge TEXT CHECK (statut_charge IN ('acceptee','rejetee','en_attente')) DEFAULT 'en_attente',
  signature_controle varchar(500) DEFAULT NULL,
  date_liberation date DEFAULT NULL,
  numero_lot_charge varchar(100) DEFAULT NULL,
  service_destinataire varchar(255) DEFAULT NULL,
  delai_validite date DEFAULT NULL,
  signature_receptionnaire varchar(500) DEFAULT NULL,
  observations_liberation text,
  date_maintenance date DEFAULT NULL,
  type_operation_maintenance varchar(255) DEFAULT NULL,
  nom_technicien varchar(255) DEFAULT NULL,
  technicien_id varchar(36) DEFAULT NULL,
  resultat_controle_maintenance TEXT CHECK (resultat_controle_maintenance IN ('conforme','non_conforme','en_attente')) DEFAULT 'en_attente',
  signature_maintenance varchar(500) DEFAULT NULL,
  observations_maintenance text,
  observations_generales text,
  non_conformites text,
  responsable_sterilisation varchar(255) DEFAULT NULL,
  responsable_sterilisation_id varchar(36) DEFAULT NULL,
  date_validation date DEFAULT NULL,
  signature_validation varchar(500) DEFAULT NULL,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_sterilization_register_operateur_id ON sterilization_register (operateur_id);
CREATE INDEX idx_sterilization_register_technicien_id ON sterilization_register (technicien_id);
CREATE INDEX idx_sterilization_register_responsable_sterilisation_id ON sterilization_register (responsable_sterilisation_id);
CREATE INDEX idx_sterilization_register_created_by ON sterilization_register (created_by);
CREATE INDEX idx_sterilization_register_idx_date_cycle ON sterilization_register (date_cycle);
CREATE INDEX idx_sterilization_register_idx_service_concerne ON sterilization_register (service_concerne);
CREATE INDEX idx_sterilization_register_idx_status_cycle ON sterilization_register (status_cycle);
CREATE INDEX idx_sterilization_register_idx_numero_cycle ON sterilization_register (numero_cycle);
CREATE INDEX idx_sterilization_register_idx_periode ON sterilization_register (periode_debut,periode_fin);


-- --------------------------------------------------------

--
-- Structure de la table `sterilized_items`
--

DROP TABLE IF EXISTS sterilized_items CASCADE;
CREATE TABLE IF NOT EXISTS sterilized_items (
  id varchar(36) NOT NULL,
  cycle_id varchar(36) NOT NULL,
  item_name varchar(255) NOT NULL,
  item_code varchar(255) DEFAULT NULL,
  lot_number varchar(100) DEFAULT NULL,
  quantity INTEGER DEFAULT 1,
  location varchar(255) DEFAULT NULL,
  expiry_date date DEFAULT NULL,
  used_date date DEFAULT NULL,
  used_by varchar(36) DEFAULT NULL,
  status TEXT CHECK (status IN ('stérilisé','utilisé','expiré','rejeté')) DEFAULT 'stérilisé',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE INDEX idx_sterilized_items_used_by ON sterilized_items (used_by);
CREATE INDEX idx_sterilized_items_idx_cycle_id ON sterilized_items (cycle_id);
CREATE INDEX idx_sterilized_items_idx_status ON sterilized_items (status);
CREATE INDEX idx_sterilized_items_idx_expiry_date ON sterilized_items (expiry_date);


-- --------------------------------------------------------

--
-- Structure de la table `trainings`
--

DROP TABLE IF EXISTS trainings CASCADE;
CREATE TABLE IF NOT EXISTS trainings (
  id varchar(36) NOT NULL,
  title varchar(255) NOT NULL,
  category varchar(255) NOT NULL,
  description text,
  trainer varchar(255) DEFAULT NULL,
  training_type TEXT CHECK (training_type IN ('interne','externe','en_ligne','présentiel')) DEFAULT 'interne',
  duration_hours decimal(5,2) DEFAULT NULL,
  location varchar(255) DEFAULT NULL,
  planned_date date DEFAULT NULL,
  actual_date date DEFAULT NULL,
  status TEXT CHECK (status IN ('planifiée','en_cours','terminée','annulée')) DEFAULT 'planifiée',
  max_participants INTEGER DEFAULT NULL,
  certificate_required BOOLEAN DEFAULT FALSE,
  validity_months INTEGER DEFAULT NULL,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  prestataire varchar(255) DEFAULT NULL,
  prestataire_evaluation text,
  prestataire_note decimal(3,1) DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX idx_trainings_created_by ON trainings (created_by);
CREATE INDEX idx_trainings_idx_status ON trainings (status);
CREATE INDEX idx_trainings_idx_category ON trainings (category);
CREATE INDEX idx_trainings_idx_planned_date ON trainings (planned_date);


-- --------------------------------------------------------

--
-- Structure de la table `training_participations`
--

DROP TABLE IF EXISTS training_participations CASCADE;
CREATE TABLE IF NOT EXISTS training_participations (
  id varchar(36) NOT NULL,
  training_id varchar(36) NOT NULL,
  participant_id varchar(36) DEFAULT NULL,
  participant_name varchar(255) DEFAULT NULL,
  registration_status TEXT CHECK (registration_status IN ('inscrit','présent','absent','excused')) DEFAULT 'inscrit',
  attendance_date date DEFAULT NULL,
  score decimal(5,2) DEFAULT NULL,
  passed BOOLEAN DEFAULT FALSE,
  certificate_number varchar(255) DEFAULT NULL,
  certificate_issued_date date DEFAULT NULL,
  certificate_expiry_date date DEFAULT NULL,
  comments text,
  registered_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_training_participations_unique_training_participant ON training_participations (training_id,participant_id);
CREATE INDEX idx_training_participations_registered_by ON training_participations (registered_by);
CREATE INDEX idx_training_participations_idx_participant_id ON training_participations (participant_id);
CREATE INDEX idx_training_participations_idx_certificate_expiry ON training_participations (certificate_expiry_date);


-- --------------------------------------------------------

--
-- Structure de la table `visitors`
--

DROP TABLE IF EXISTS visitors CASCADE;
CREATE TABLE IF NOT EXISTS visitors (
  id varchar(36) NOT NULL,
  full_name varchar(255) NOT NULL,
  id_document varchar(255) NOT NULL,
  reason text,
  destination varchar(255) DEFAULT NULL,
  person_to_see varchar(255) DEFAULT NULL,
  company varchar(255) DEFAULT NULL,
  visit_type varchar(100) DEFAULT NULL,
  id_verified BOOLEAN DEFAULT FALSE,
  badge_code varchar(50) DEFAULT NULL,
  entry_signature text,
  exit_signature text,
  access_observations text,
  entry_time timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  exit_time timestamp NULL DEFAULT NULL,
  registered_by varchar(36) DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX idx_visitors_registered_by ON visitors (registered_by);


-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_laundry_statistics`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS v_laundry_statistics;

-- --------------------------------------------------------

--
-- Structure de la table `waste_tracking`
--

DROP TABLE IF EXISTS waste_tracking CASCADE;
CREATE TABLE IF NOT EXISTS waste_tracking (
  id varchar(36) NOT NULL,
  waste_id varchar(36) NOT NULL,
  step TEXT CHECK (step IN ('collecte','transport','traitement','élimination')) NOT NULL,
  location varchar(255) DEFAULT NULL,
  handler_name varchar(255) DEFAULT NULL,
  handler_signature varchar(500) DEFAULT NULL,
  timestamp timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  notes text,
  PRIMARY KEY (id)
);

CREATE INDEX idx_waste_tracking_idx_waste_id ON waste_tracking (waste_id);
CREATE INDEX idx_waste_tracking_idx_timestamp ON waste_tracking (timestamp);


-- --------------------------------------------------------

--
-- Structure de la table `works`
--

DROP TABLE IF EXISTS works CASCADE;
CREATE TABLE IF NOT EXISTS works (
  id varchar(36) NOT NULL,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  work_type TEXT CHECK (work_type IN ('maintenance','reparation','renovation','construction','amelioration','autre')) NOT NULL DEFAULT 'maintenance',
  location varchar(255) DEFAULT NULL,
  priority TEXT CHECK (priority IN ('faible','moyenne','haute','critique')) DEFAULT 'moyenne',
  status TEXT CHECK (status IN ('planifié','en_cours','en_pause','terminé','annulé')) DEFAULT 'planifié',
  assigned_to varchar(36) DEFAULT NULL,
  assigned_to_name varchar(255) DEFAULT NULL,
  planned_start_date date DEFAULT NULL,
  planned_end_date date DEFAULT NULL,
  actual_start_date date DEFAULT NULL,
  actual_end_date date DEFAULT NULL,
  estimated_cost decimal(10,2) DEFAULT NULL,
  actual_cost decimal(10,2) DEFAULT NULL,
  supplier_name varchar(255) DEFAULT NULL,
  supplier_contact varchar(255) DEFAULT NULL,
  notes text,
  photo_urls JSONB DEFAULT NULL,
  created_by varchar(36) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,  -- NOTE: ON UPDATE trigger needed
  PRIMARY KEY (id)
);

CREATE INDEX idx_works_created_by ON works (created_by);
CREATE INDEX idx_works_idx_works_status ON works (status);
CREATE INDEX idx_works_idx_works_assigned_to ON works (assigned_to);
CREATE INDEX idx_works_idx_works_work_type ON works (work_type);
CREATE INDEX idx_works_idx_works_planned_start_date ON works (planned_start_date);


-- --------------------------------------------------------

--
-- Structure de la vue `v_laundry_statistics`
--

DROP VIEW IF EXISTS v_laundry_statistics;
CREATE OR REPLACE VIEW v_laundry_statistics  AS SELECT TO_CHAR(laundry_tracking.date_reception, 'YYYY-MM') AS mois, TO_CHAR(laundry_tracking.date_reception, 'YYYY-IW') AS semaine, count(0) AS nombre_lots, sum(coalesce(laundry_tracking.poids_kg,0)) AS total_poids_kg, sum(coalesce(laundry_tracking.quantite,0)) AS total_quantite, count((case when (laundry_tracking.date_non_conformite is not null) then 1 end)) AS nombre_non_conformites, (case when (count(0) > 0) then round(((count((case when (laundry_tracking.date_non_conformite is not null) then 1 end)) * 100.0) / count(0)),2) else 0 end) AS taux_non_conformite_pourcent, count(distinct laundry_tracking.service_origine) AS nombre_services_desservis FROM laundry_tracking WHERE (laundry_tracking.date_reception is not null) GROUP BY TO_CHAR(laundry_tracking.date_reception, 'YYYY-MM'), TO_CHAR(laundry_tracking.date_reception, 'YYYY-IW') ;




COMMIT;