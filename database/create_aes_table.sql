-- Table pour les Accidents d'Exposition au Sang (AES)
CREATE TABLE IF NOT EXISTS aes (
    id VARCHAR(36) PRIMARY KEY,
    
    -- A. Identification de l'agent exposé
    agent_nom VARCHAR(255) NOT NULL,
    agent_prenom VARCHAR(255) NOT NULL,
    agent_matricule VARCHAR(100),
    agent_fonction VARCHAR(255),
    agent_service VARCHAR(255),
    agent_telephone VARCHAR(50),
    agent_statut ENUM('Personnel', 'Stagiaire', 'Prestataire') NOT NULL,
    
    -- B. Informations sur l'accident
    date_aes DATE NOT NULL,
    heure_aes TIME NOT NULL,
    lieu_precis VARCHAR(500),
    type_exposition ENUM('Piqure', 'Coupure', 'Projection muqueuse', 'Contact peau lésée') NOT NULL,
    description_circonstances TEXT,
    
    -- C. Matériel ou produit en cause
    type_dispositif VARCHAR(255),
    usage_unique BOOLEAN,
    souille_sang BOOLEAN,
    dans_sac_dasri BOOLEAN,
    
    -- D. Patient source
    patient_source_identifiee BOOLEAN,
    patient_code_identifiant VARCHAR(255),
    consentement_prelevement BOOLEAN,
    
    -- E. Gestes immédiats
    lavage_eau_savon BOOLEAN,
    desinfection BOOLEAN,
    rinçage_muqueuse BOOLEAN,
    heure_premiers_soins TIME,
    
    -- F. Prise en charge médicale
    medecin_referent_aes VARCHAR(255),
    examen_vih BOOLEAN DEFAULT FALSE,
    examen_vhb BOOLEAN DEFAULT FALSE,
    examen_vhc BOOLEAN DEFAULT FALSE,
    traitement_arv_initie BOOLEAN,
    date_debut_traitement DATE,
    
    -- G. Résultats biologiques
    resultat_agent_vih BOOLEAN,
    resultat_agent_vhb BOOLEAN,
    resultat_agent_vhc BOOLEAN,
    resultat_patient_vih BOOLEAN,
    resultat_patient_vhb BOOLEAN,
    resultat_patient_vhc BOOLEAN,
    conduite_tenir TEXT,
    
    -- H. Suivi et accompagnement
    orientation_infectiologue BOOLEAN,
    orientation_psychologue BOOLEAN,
    dates_suivi_prevues TEXT, -- JSON array ou texte
    
    -- I. Suivi médical
    suivi_m1_date DATE,
    suivi_m1_vih BOOLEAN,
    suivi_m1_vhb BOOLEAN,
    suivi_m1_vhc BOOLEAN,
    suivi_m6_date DATE,
    suivi_m6_vih BOOLEAN,
    suivi_m6_vhb BOOLEAN,
    suivi_m6_vhc BOOLEAN,
    suivi_m9_date DATE,
    suivi_m9_vih BOOLEAN,
    suivi_m9_vhb BOOLEAN,
    suivi_m9_vhc BOOLEAN,
    
    -- J. Clôture QHSE
    dossier_cloture BOOLEAN DEFAULT FALSE,
    date_cloture DATE,
    nom_signature_qhse VARCHAR(255),
    
    -- Métadonnées
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT
);
