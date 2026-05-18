import { useState, useEffect } from 'react';
import { showError, showSuccess } from '@/utils/toast';
import { User, Users } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface UseAuthProps {
  initialUsers: Users; // Still needed for initial setup, but will be replaced by DB fetch
}

export const useAuth = ({ initialUsers }: UseAuthProps) => {
  const [currentUser, setCurrentUser] = useState<{ username: string; details: User } | null>(null);
  const [users, setUsers] = useState<Users>(initialUsers); // Will be populated from DB

  const clearLocalAuth = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
  };

  const mapAuthError = (error: { message?: string; status?: number } | null) => {
    const message = (error?.message || '').toLowerCase();
    if (error?.status === 422 || message.includes('email not confirmed')) {
      return "Email non confirmé. Vérifiez votre boîte mail ou désactivez la confirmation email dans Supabase Auth.";
    }
    if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
      return "Email ou mot de passe incorrect (nouveau projet Supabase : recréez l'utilisateur dans Authentication).";
    }
    if (message.includes('user not found')) {
      return "Utilisateur introuvable sur ce projet Supabase.";
    }
    return error?.message || "Erreur lors de la connexion.";
  };

  // Function to fetch all profiles from API
  const fetchAllProfiles = async () => {
    try {
      const {
        data: profilesData,
        error,
      } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching profiles from Supabase:', error.message);
        return {};
      }

      const fetchedUsers: Users = {};
      profilesData.forEach((profile: any) => {
        // Fallback: détecter le rôle si vide
        let detectedRole = profile.role;
        if (!detectedRole || detectedRole.trim() === '') {
          if (profile.email && profile.email.includes('reseau')) {
            detectedRole = 'administrateur_reseau';
          } else if (profile.username && profile.username.includes('reseau')) {
            detectedRole = 'administrateur_reseau';
          }
        }
        
        fetchedUsers[profile.username] = {
          id: profile.id,
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          name: `${profile.civility || ''} ${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          civility: profile.civility,
          email: profile.email,
          position: profile.service,
          role: detectedRole || profile.role,
          pin: profile.pin,
          added_permissions: Array.isArray(profile.added_permissions) ? profile.added_permissions : (profile.added_permissions ? JSON.parse(profile.added_permissions) : []),
          removed_permissions: Array.isArray(profile.removed_permissions) ? profile.removed_permissions : (profile.removed_permissions ? JSON.parse(profile.removed_permissions) : []),
        };
      });
      setUsers(fetchedUsers);
      return fetchedUsers;
    } catch (error: any) {
      // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
      console.error("Error fetching all profiles:", error.message);
      return {};
    }
  };

  // Effect to handle initial load and auth state changes
  useEffect(() => {
    // Initial fetch of profiles and current user
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('Session Supabase invalide (ancien projet ?):', sessionError.message);
          await clearLocalAuth();
          return;
        }

        if (!session) {
          await clearLocalAuth();
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.warn('Utilisateur Supabase introuvable:', userError?.message);
          await clearLocalAuth();
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile on init (Supabase):", profileError.message);
          await clearLocalAuth();
          return;
        }

        if (!profile) {
          console.warn("No profile found on init (Supabase) for user:", user.id);
          await clearLocalAuth();
          return;
        }

          // Fallback: détecter le rôle si vide
          let detectedRole = profile.role;
          if (!detectedRole || detectedRole.trim() === '') {
            if (profile.email && profile.email.includes('reseau')) {
              detectedRole = 'administrateur_reseau';
              console.warn('Rôle détecté automatiquement (email): administrateur_reseau');
            } else if (profile.username && profile.username.includes('reseau')) {
              detectedRole = 'administrateur_reseau';
              console.warn('Rôle détecté automatiquement (username): administrateur_reseau');
            }
          }
          
          const fullUser: User = {
            id: profile.id,
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name,
            name: `${profile.civility || ''} ${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            civility: profile.civility,
            email: profile.email,
            position: profile.service,
            role: detectedRole || profile.role,
            pin: profile.pin,
            added_permissions: Array.isArray(profile.added_permissions) ? profile.added_permissions : (profile.added_permissions ? JSON.parse(profile.added_permissions) : []),
            removed_permissions: Array.isArray(profile.removed_permissions) ? profile.removed_permissions : (profile.removed_permissions ? JSON.parse(profile.removed_permissions) : []),
          };
          setCurrentUser({ username: profile.username, details: fullUser });
          localStorage.setItem('currentUserId', user.id);

          // Fetch all profiles only if user is authenticated
          await fetchAllProfiles();
      } catch (error) {
        console.error("Error initializing auth with Supabase:", error);
        await clearLocalAuth();
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await clearLocalAuth();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error || !data.user) {
        throw new Error(mapAuthError(error));
      }

      const user = data.user;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error(
          profileError?.message ||
            "Connexion Auth OK mais profil absent. Exécutez les migrations SQL sur le nouveau projet Supabase, puis créez l'utilisateur dans public.profiles."
        );
      }
      // Fallback: détecter le rôle si vide
      let detectedRole = profile.role;
      if (!detectedRole || detectedRole.trim() === '') {
        if (profile.email && profile.email.includes('reseau')) {
          detectedRole = 'administrateur_reseau';
          console.warn('Rôle détecté automatiquement (email): administrateur_reseau');
        } else if (profile.username && profile.username.includes('reseau')) {
          detectedRole = 'administrateur_reseau';
          console.warn('Rôle détecté automatiquement (username): administrateur_reseau');
        }
      }
      
      const fullUser: User = {
        id: profile.id,
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        name: `${profile.civility || ''} ${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        civility: profile.civility,
        email: profile.email,
        position: profile.service,
        role: detectedRole || profile.role,
        pin: profile.pin,
        added_permissions: Array.isArray(profile.added_permissions) ? profile.added_permissions : (profile.added_permissions ? JSON.parse(profile.added_permissions) : []),
        removed_permissions: Array.isArray(profile.removed_permissions) ? profile.removed_permissions : (profile.removed_permissions ? JSON.parse(profile.removed_permissions) : []),
      };
      setCurrentUser({ username: profile.username, details: fullUser });
      setUsers(prev => ({ ...prev, [profile.username]: fullUser }));
      localStorage.setItem('currentUserId', user.id);
      showSuccess("Connexion réussie !");
      await fetchAllProfiles();
      return { success: true };
    } catch (error: any) {
      const message = error?.message || mapAuthError(error);
      showError(message);
      return { success: false, error: message };
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      localStorage.removeItem('currentUserId');
      showSuccess("Déconnexion réussie.");
    } catch (error: any) {
      showError(error.message || "Erreur lors de la déconnexion.");
      // Déconnexion locale même en cas d'erreur
      setCurrentUser(null);
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('auth_token');
    }
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(userError?.message || 'Utilisateur non connecté');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      showSuccess("Mot de passe mis à jour avec succès.");
      return true;
    } catch (error: any) {
      showError(error.message || "Erreur lors de la mise à jour du mot de passe.");
      return false;
    }
  };

  return {
    currentUser,
    users,
    setUsers,
    handleLogin,
    handleLogout,
    setCurrentUser,
    updatePassword,
    fetchAllProfiles, // Expose fetchAllProfiles for other components if needed
  };
};