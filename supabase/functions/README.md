# Supabase Edge Functions

## reset-user-password

Permet à un administrateur (rôle `superadmin`) de réinitialiser le mot de passe d’un autre utilisateur via l’API Auth Admin (service role).

- **Body** : `{ userId: string, newPassword: string }`
- **Auth** : header `Authorization: Bearer <session_jwt>` (envoyé automatiquement par `supabase.functions.invoke()` côté frontend).
- **Contrôle** : vérification du rôle `superadmin` dans la table `profiles`.

### Déploiement

À la racine du projet, avec [Supabase CLI](https://supabase.com/docs/guides/cli) installée et connectée, exécuter **une commande à la fois** :

```powershell
supabase login
```

Puis (remplacer `VOTRE_PROJECT_REF` par l’ID du projet, ex. `lpaakleuwselpyqjbwao`) :

```powershell
supabase link --project-ref VOTRE_PROJECT_REF
supabase functions deploy reset-user-password
```

Les secrets `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement par le projet Supabase. Aucune variable supplémentaire à configurer pour cette fonction.
