# 🔐 Identifiants de Connexion - Centre Diagnostic Libreville

## 📋 Liste Complète des Utilisateurs

### 👑 1. Super Admin
- **Nom d'utilisateur** : `superadmin`
- **Email** : `admin@hospital.com`
- **Mot de passe** : `admin123`
- **Rôle** : Super Administrateur
- **Accès** : Accès complet à toutes les fonctionnalités

---

### 🛡️ 2. Superviseur QHSE
- **Nom d'utilisateur** : `superviseur_qhse`
- **Email** : `qhse@hospital.com`
- **Mot de passe** : `qhse123`
- **Rôle** : Superviseur Qualité, Hygiène, Sécurité et Environnement
- **Accès** : Tous les modules QHSE, gestion des tickets, planning, biomédical, utilisateurs

---

### 🏢 2bis. Direction Opérationnelle (DOP)
- **Nom d'utilisateur** : `dop`
- **Email** : `dop@hospital.com`
- **Mot de passe** : `dop123`
- **Rôle** : Direction Opérationnelle
- **Accès** : Validation des documents GED, suivi des indicateurs clés

---

### 📝 3. Secrétaire
- **Nom d'utilisateur** : `secretaire`
- **Email** : `secretaire@hospital.com`
- **Mot de passe** : `secretaire123`
- **Rôle** : Secrétaire
- **Accès** : Planning des salles, registre des visiteurs, annuaire médecins

---

### 👨‍⚕️ 4. Médecin
- **Nom d'utilisateur** : `medecin`
- **Email** : `medecin@hospital.com`
- **Mot de passe** : `medecin123`
- **Rôle** : Médecin
- **Accès** : Planning des salles, consultations, profil personnel

---

### 🔒 5. Agent de Sécurité
- **Nom d'utilisateur** : `agent_securite`
- **Email** : `agent.securite@hospital.com`
- **Mot de passe** : `agent_securite123`
- **Rôle** : Agent de Sécurité
- **Accès** : Signalement d'incidents, registre visiteurs, mes tâches

---

### 🛡️ 6. Superviseur Agent de Sécurité
- **Nom d'utilisateur** : `superviseur_securite`
- **Email** : `superviseur.securite@hospital.com`
- **Mot de passe** : `superviseur_securite123`
- **Rôle** : Superviseur Agent de Sécurité
- **Accès** : Dashboard sécurité, gestion incidents, planning tâches, utilisateurs

---

### 🧹 7. Agent d'Entretien
- **Nom d'utilisateur** : `agent_entretien`
- **Email** : `agent.entretien@hospital.com`
- **Mot de passe** : `agent_entretien123`
- **Rôle** : Agent d'Entretien
- **Accès** : Signalement problèmes, historique entretien, mes tâches, modules QHSE

---

### 🔧 8. Superviseur Agent d'Entretien
- **Nom d'utilisateur** : `superviseur_entretien`
- **Email** : `superviseur.entretien@hospital.com`
- **Mot de passe** : `superviseur_entretien123`
- **Rôle** : Superviseur Agent d'Entretien
- **Accès** : Dashboard entretien, gestion tickets, planning tâches, utilisateurs, modules QHSE

---

### 🔧 9. Technicien
- **Nom d'utilisateur** : `technicien`
- **Email** : `technicien@hospital.com`
- **Mot de passe** : `technicien123`
- **Rôle** : Technicien
- **Accès** : Interventions techniques, historique, mes tâches, modules QHSE

---

### 🛠️ 10. Superviseur Technicien
- **Nom d'utilisateur** : `superviseur_technicien`
- **Email** : `superviseur.technicien@hospital.com`
- **Mot de passe** : `superviseur_technicien123`
- **Rôle** : Superviseur Technicien
- **Accès** : Dashboard technique, gestion interventions, planning tâches, utilisateurs, modules QHSE

---

### 🩺 11. Responsable Biomédical
- **Nom d'utilisateur** : `biomedical`
- **Email** : `biomedical@hospital.com`
- **Mot de passe** : `biomedical123`
- **Rôle** : Biomédical
- **Accès** : Portail biomédical, parc équipements, maintenance, indicateurs biomédicaux

---

## 📊 Récapitulatif Rapide

| Rôle | Nom d'utilisateur | Mot de passe |
|------|-------------------|--------------|
| Super Admin | `superadmin` | `admin123` |
| Superviseur QHSE | `superviseur_qhse` | `qhse123` |
| Direction Opérationnelle | `dop` | `dop123` |
| Secrétaire | `secretaire` | `secretaire123` |
| Médecin | `medecin` | `medecin123` |
| Agent Sécurité | `agent_securite` | `agent_securite123` |
| Superviseur Sécurité | `superviseur_securite` | `superviseur_securite123` |
| Agent Entretien | `agent_entretien` | `agent_entretien123` |
| Superviseur Entretien | `superviseur_entretien` | `superviseur_entretien123` |
| Technicien | `technicien` | `technicien123` |
| Superviseur Technicien | `superviseur_technicien` | `superviseur_technicien123` |
| Responsable Biomédical | `biomedical` | `biomedical123` |

---

## 🔄 Création des Utilisateurs

Pour créer tous les utilisateurs dans la base de données, exécutez le script SQL :

```sql
-- Exécuter dans PhpMyAdmin ou MySQL
SOURCE database/init_all_users.sql;
```

Ou individuellement :

- `database/create_qhse_user.sql` - Superviseur QHSE
- `database/create_secretaire_user.sql` - Secrétaire
- `database/create_agent_securite_user.sql` - Agent Sécurité
- `database/create_superviseur_securite_user.sql` - Superviseur Sécurité

---

## ⚠️ Notes Importantes

1. **Sécurité** : Changez ces mots de passe par défaut en production !
2. **Super Admin** : L'utilisateur `superadmin` est créé automatiquement lors de l'exécution de `database/schema.sql`
3. **Doublons** : Les scripts utilisent `ON DUPLICATE KEY UPDATE` pour éviter les doublons
4. **Hachage** : Les mots de passe sont stockés avec bcrypt (10 rounds)

---

## 📝 Format de Connexion

Pour vous connecter à l'application :

1. Allez sur la page de connexion
2. Utilisez le **nom d'utilisateur** (username) et le **mot de passe** correspondant
3. Vous serez redirigé vers votre portail personnalisé selon votre rôle

---

*Dernière mise à jour : Application QHSE - Centre Diagnostic Libreville*

