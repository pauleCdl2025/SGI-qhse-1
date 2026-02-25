-- Migration pour ajouter les champs de prestataire et évaluation à la table trainings
-- Exécutez ce script dans votre base de données MySQL (hospital_management)

USE hospital_management;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_training_column_if_not_exists$$
CREATE PROCEDURE add_training_column_if_not_exists(
    IN p_column_name VARCHAR(255),
    IN p_column_definition TEXT
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO column_exists
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'trainings'
    AND column_name = p_column_name;
    
    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE trainings ADD COLUMN ', p_column_name, ' ', p_column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Ajouter les colonnes manquantes
CALL add_training_column_if_not_exists('prestataire', 'VARCHAR(255) NULL COMMENT "Nom du prestataire"');
CALL add_training_column_if_not_exists('prestataire_evaluation', 'TEXT NULL COMMENT "Évaluation/commentaire sur le prestataire"');
CALL add_training_column_if_not_exists('prestataire_note', 'DECIMAL(3,1) NULL COMMENT "Note du prestataire (sur 10)"');

-- Nettoyer la procédure
DROP PROCEDURE IF EXISTS add_training_column_if_not_exists;
