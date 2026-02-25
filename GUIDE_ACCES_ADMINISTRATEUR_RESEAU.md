# 🌐 GUIDE D'ACCÈS AU PORTAIL ADMINISTRATEUR RÉSEAU

## 📋 Comment accéder au Portail Administrateur Réseau

L'**Administrateur Réseau** gère le matériel réseau, les abonnements, l'inventaire réseau, effectue des rondes et gère les tâches et incidents.

---

## 🔐 ÉTAPE 1 : SE CONNECTER

### Identifiants par défaut

**Email** : `admin.reseau@hospital.com`  
**Mot de passe** : `admin_reseau123`

---

## 🛠️ CRÉER LE COMPTE (si nécessaire)

### Méthode 1 : Via l'interface Super Admin (Recommandé)

1. **Connectez-vous** en tant que Super Admin :
   - Email : `admin@hospital.com`
   - Mot de passe : `admin123`

2. **Allez dans** : **Menu → Gestion Utilisateurs** (icône Settings)

3. **Cliquez sur** : **"Ajouter un utilisateur"**

4. **Remplissez le formulaire** :
   - **Identifiant** : `admin_reseau` (ou un autre nom)
   - **Email** : `admin.reseau@hospital.com`
   - **Mot de passe** : `admin_reseau123` (ou un mot de passe sécurisé)
   - **Prénom** : `Administrateur`
   - **Nom** : `Réseau`
   - **Civilité** : `M.`, `Mme` ou `Mlle`
   - **Rôle** : Sélectionnez **"Administrateur Réseau"**
   - **Service** : `Informatique & Réseau`

5. **Cliquez sur** : **"Créer l'utilisateur"**

6. **Déconnectez-vous** et reconnectez-vous avec les nouveaux identifiants

---

### Méthode 2 : Via SQL (base de données)

#### Via PhpMyAdmin ou MySQL

1. **Ouvrez** PhpMyAdmin ou votre client MySQL

2. **Sélectionnez** la base de données `hospital_management`

3. **Exécutez** le script SQL suivant :

```sql
USE hospital_management;

INSERT INTO profiles (
    id, username, email, password_hash, first_name, last_name, civility, role, service
) VALUES (
    UUID(),
    'admin_reseau',
    'admin.reseau@hospital.com',
    '$2a$10$XK8vJ9mN5qR3wL2pF7hH8uY6zT4nB1cD9eM0kP5sA8vJ3wL6xN2bC', -- Mot de passe: admin_reseau123
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
```

**OU** exécutez directement le fichier :
```bash
mysql -u root -p hospital_management < database/create_administrateur_reseau.sql
```

---

## ✅ Identifiants de connexion

Après avoir créé l'utilisateur, utilisez :

- **Email** : `admin.reseau@hospital.com`
- **Mot de passe** : `admin_reseau123`

---

## 🎯 Permissions de l'Administrateur Réseau

L'administrateur réseau a accès à :

### 📦 Matériel Réseau
- Gestion complète du matériel réseau (routeurs, switches, serveurs, etc.)
- Suivi des équipements et de leur statut
- Maintenance préventive

### 💳 Abonnements Réseau
- Gestion des abonnements (internet, téléphonie, cloud, sécurité)
- Suivi des dates de renouvellement
- Gestion des coûts et facturation

### 📋 Inventaire Réseau
- Inventaire complet des articles réseau (câbles, connecteurs, antennes, etc.)
- Localisation et statut des articles
- Historique des modifications

### 🔍 Rondes Réseau
- Effectuer des rondes de vérification des équipements réseau
- Contrôles quotidiens
- Rapports de ronde

### ✅ Tâches et Incidents
- Gérer ses tâches planifiées
- Traiter les incidents réseau et informatiques
- Suivre les priorités et échéances

---

## 🚀 Fonctionnalités du Portail

### Statistiques en temps réel
- Nombre d'incidents réseau
- Incidents en cours
- Mes interventions
- Mes tâches

### Accès rapides
- Matériel Réseau
- Abonnements Réseau
- Inventaire Réseau
- Rondes Réseau
- Planning des Tâches
- Incidents Réseau
- Historique de Maintenance
- Mes Tâches

---

## 📝 Notes importantes

- L'administrateur réseau peut créer et gérer son matériel réseau
- Il peut suivre les abonnements et être alerté avant leur expiration
- Il peut tenir l'inventaire des articles réseau
- Il peut effectuer des rondes de vérification comme les techniciens
- Il peut gérer ses tâches et incidents assignés

---

## 🔒 Sécurité

⚠️ **Important** : Changez le mot de passe par défaut après la première connexion !

Pour changer le mot de passe :
1. Connectez-vous
2. Allez dans **Menu → Informations Personnelles**
3. Cliquez sur **"Modifier le mot de passe"**
4. Entrez votre nouveau mot de passe

---

## ❓ Problèmes courants

### "Email ou nom d'utilisateur déjà utilisé"
- L'utilisateur existe déjà. Utilisez les identifiants existants ou modifiez l'email/nom d'utilisateur.

### "Rôle invalide"
- Assurez-vous que le backend a été redémarré après l'ajout du nouveau rôle.

### "Table network_equipment non trouvée"
- Redémarrez le backend pour que les migrations automatiques créent les tables réseau.

---

## 📞 Support

Pour toute question ou problème, contactez le Super Admin ou consultez la documentation technique.
