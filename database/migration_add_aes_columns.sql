-- Migration pour ajouter les colonnes manquantes au tableau de suivi AES
-- Basé sur le fichier Tableau_suivi_AES.xlsx
-- MySQL ne supporte pas ADD COLUMN IF NOT EXISTS, on utilise une procédure

USE hospital_management;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_aes_column_if_not_exists$$
CREATE PROCEDURE add_aes_column_if_not_exists(
    IN p_column_name VARCHAR(255),
    IN p_column_definition TEXT
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO column_exists
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'aes'
    AND column_name = p_column_name;
    
    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE aes ADD COLUMN ', p_column_name, ' ', p_column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Ajouter les colonnes manquantes
CALL add_aes_column_if_not_exists('numero_aes', 'INT NULL COMMENT "Numéro unique de l\'AES"');
CALL add_aes_column_if_not_exists('port_epi', 'BOOLEAN DEFAULT FALSE COMMENT "Port des EPI"');
CALL add_aes_column_if_not_exists('declaration_immediate', 'BOOLEAN DEFAULT FALSE COMMENT "Déclaration immédiate"');
CALL add_aes_column_if_not_exists('date_declaration', 'DATE NULL COMMENT "Date de déclaration"');
CALL add_aes_column_if_not_exists('prise_charge_immediate', 'BOOLEAN DEFAULT FALSE COMMENT "Prise en charge immédiate réalisée"');
CALL add_aes_column_if_not_exists('inscription_sentimed', 'BOOLEAN DEFAULT FALSE COMMENT "Inscription sur SENTIMED"');
CALL add_aes_column_if_not_exists('bon_examen_prescrit', 'BOOLEAN DEFAULT FALSE COMMENT "Bon d\'examen prescrit"');
CALL add_aes_column_if_not_exists('matricule_sentimed', 'VARCHAR(100) NULL COMMENT "Matricule SENTIMED"');
CALL add_aes_column_if_not_exists('date_prise_resultat', 'DATE NULL COMMENT "Date de prise de résultat"');
CALL add_aes_column_if_not_exists('suivi_m3_date', 'DATE NULL COMMENT "Date de suivi M+3"');
CALL add_aes_column_if_not_exists('suivi_m3_vhb', 'BOOLEAN NULL COMMENT "Résultat M+3 VHB"');
CALL add_aes_column_if_not_exists('suivi_m3_vhc', 'BOOLEAN NULL COMMENT "Résultat M+3 VHC"');
CALL add_aes_column_if_not_exists('observations', 'TEXT NULL COMMENT "Observations / Commentaires"');

-- Mettre à jour numero_aes pour les enregistrements existants (basé sur la date de création)
SET @row_number = 0;
UPDATE aes 
SET numero_aes = (@row_number := @row_number + 1)
WHERE numero_aes IS NULL
ORDER BY created_at, date_aes;

-- Nettoyer la procédure
DROP PROCEDURE IF EXISTS add_aes_column_if_not_exists;
