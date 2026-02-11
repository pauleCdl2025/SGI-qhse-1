# Structure de la table `aes` (Accidents d'Exposition au Sang)

## Vue d'ensemble

La table `aes` contient **56 colonnes** au total, organisées en sections correspondant au formulaire FAES.

## Structure complète

### A. Identification de l'agent exposé (7 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `agent_nom` | VARCHAR(255) | NO | Nom de l'agent |
| `agent_prenom` | VARCHAR(255) | NO | Prénom de l'agent |
| `agent_matricule` | VARCHAR(100) | YES | Matricule |
| `agent_fonction` | VARCHAR(255) | YES | Fonction |
| `agent_service` | VARCHAR(255) | YES | Service |
| `agent_telephone` | VARCHAR(50) | YES | Téléphone |
| `agent_statut` | ENUM | NO | Personnel, Stagiaire, Prestataire |

### B. Informations sur l'accident (5 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `date_aes` | DATE | NO | Date de l'accident |
| `heure_aes` | TIME | NO | Heure de l'accident |
| `lieu_precis` | VARCHAR(500) | YES | Lieu précis |
| `type_exposition` | ENUM | NO | Piqure, Coupure, Projection muqueuse, Contact peau lésée |
| `description_circonstances` | TEXT | YES | Description des circonstances |

### C. Matériel ou produit en cause (4 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `type_dispositif` | VARCHAR(255) | YES | Type de dispositif |
| `usage_unique` | TINYINT(1) | YES | Usage unique (booléen) |
| `souille_sang` | TINYINT(1) | YES | Souillé de sang (booléen) |
| `dans_sac_dasri` | TINYINT(1) | YES | Dans sac DASRI (booléen) |

### D. Patient source (3 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `patient_source_identifiee` | TINYINT(1) | YES | Patient source identifiée (booléen) |
| `patient_code_identifiant` | VARCHAR(255) | YES | Code identifiant du patient |
| `consentement_prelevement` | TINYINT(1) | YES | Consentement prélèvement (booléen) |

### E. Gestes immédiats (4 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `lavage_eau_savon` | TINYINT(1) | YES | Lavage eau + savon (booléen) |
| `desinfection` | TINYINT(1) | YES | Désinfection (booléen) |
| `rinçage_muqueuse` | TINYINT(1) | YES | Rinçage muqueuse (booléen) |
| `heure_premiers_soins` | TIME | YES | Heure des premiers soins |

### F. Prise en charge médicale (6 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `medecin_referent_aes` | VARCHAR(255) | YES | Médecin référent AES |
| `examen_vih` | TINYINT(1) | YES | Examen VIH (défaut: 0) |
| `examen_vhb` | TINYINT(1) | YES | Examen VHB (défaut: 0) |
| `examen_vhc` | TINYINT(1) | YES | Examen VHC (défaut: 0) |
| `traitement_arv_initie` | TINYINT(1) | YES | Traitement ARV initié (booléen) |
| `date_debut_traitement` | DATE | YES | Date début traitement |

### G. Résultats biologiques (7 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `resultat_agent_vih` | TINYINT(1) | YES | Résultat agent VIH (booléen) |
| `resultat_agent_vhb` | TINYINT(1) | YES | Résultat agent VHB (booléen) |
| `resultat_agent_vhc` | TINYINT(1) | YES | Résultat agent VHC (booléen) |
| `resultat_patient_vih` | TINYINT(1) | YES | Résultat patient VIH (booléen) |
| `resultat_patient_vhb` | TINYINT(1) | YES | Résultat patient VHB (booléen) |
| `resultat_patient_vhc` | TINYINT(1) | YES | Résultat patient VHC (booléen) |
| `conduite_tenir` | TEXT | YES | Conduite à tenir |

### H. Suivi et accompagnement (3 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `orientation_infectiologue` | TINYINT(1) | YES | Orientation infectiologue (booléen) |
| `orientation_psychologue` | TINYINT(1) | YES | Orientation psychologue (booléen) |
| `dates_suivi_prevues` | TEXT | YES | Dates de suivi prévues |

### I. Suivi médical (12 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `suivi_m1_date` | DATE | YES | Date suivi M1 |
| `suivi_m1_vih` | TINYINT(1) | YES | Suivi M1 VIH (booléen) |
| `suivi_m1_vhb` | TINYINT(1) | YES | Suivi M1 VHB (booléen) |
| `suivi_m1_vhc` | TINYINT(1) | YES | Suivi M1 VHC (booléen) |
| `suivi_m6_date` | DATE | YES | Date suivi M6 |
| `suivi_m6_vih` | TINYINT(1) | YES | Suivi M6 VIH (booléen) |
| `suivi_m6_vhb` | TINYINT(1) | YES | Suivi M6 VHB (booléen) |
| `suivi_m6_vhc` | TINYINT(1) | YES | Suivi M6 VHC (booléen) |
| `suivi_m9_date` | DATE | YES | Date suivi M9 |
| `suivi_m9_vih` | TINYINT(1) | YES | Suivi M9 VIH (booléen) |
| `suivi_m9_vhb` | TINYINT(1) | YES | Suivi M9 VHB (booléen) |
| `suivi_m9_vhc` | TINYINT(1) | YES | Suivi M9 VHC (booléen) |

### J. Clôture QHSE (3 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `dossier_cloture` | TINYINT(1) | YES | Dossier clôturé (défaut: 0) |
| `date_cloture` | DATE | YES | Date de clôture |
| `nom_signature_qhse` | VARCHAR(255) | YES | Nom signature QHSE |

### Métadonnées (4 colonnes)
| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| `id` | VARCHAR(36) | NO | Identifiant unique (PRIMARY KEY) |
| `created_by` | VARCHAR(36) | NO | ID de l'utilisateur créateur (FOREIGN KEY) |
| `created_at` | TIMESTAMP | YES | Date de création (auto) |
| `updated_at` | TIMESTAMP | YES | Date de mise à jour (auto) |

## Notes importantes

1. **Types booléens** : Les colonnes booléennes utilisent `TINYINT(1)` qui peut accepter `NULL`, `0` (false), ou `1` (true).

2. **Valeurs par défaut** :
   - `examen_vih`, `examen_vhb`, `examen_vhc` : `0` (false)
   - `dossier_cloture` : `0` (false)
   - `created_at` et `updated_at` : `CURRENT_TIMESTAMP`

3. **Contraintes** :
   - `id` : PRIMARY KEY
   - `created_by` : FOREIGN KEY vers `profiles(id)`
   - `agent_nom`, `agent_prenom`, `agent_statut`, `date_aes`, `heure_aes`, `type_exposition` : NOT NULL

4. **ENUMs** :
   - `agent_statut` : 'Personnel', 'Stagiaire', 'Prestataire'
   - `type_exposition` : 'Piqure', 'Coupure', 'Projection muqueuse', 'Contact peau lésée'

## Vérification de la table

Pour vérifier que la table existe et sa structure :

```sql
-- Vérifier l'existence
SHOW TABLES LIKE 'aes';

-- Voir la structure
DESCRIBE aes;

-- Voir toutes les colonnes
SHOW COLUMNS FROM aes;
```

## Migration automatique

La table est créée automatiquement au démarrage du serveur backend si elle n'existe pas (fonction `ensureAESTable()` dans `backend/server.js`).
