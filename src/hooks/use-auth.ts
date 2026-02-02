import { useState, useEffect } from 'react';
import { apiClient } from '@/integrations/api/client';
import { showError, showSuccess } from '@/utils/toast';
import { User, Users } from '@/types';

interface UseAuthProps {
  initialUsers: Users; // Still needed for initial setup, but will be replaced by DB fetch
}

export const useAuth = ({ initialUsers }: UseAuthProps) => {
  const [currentUser, setCurrentUser] = useState<{ username: string; details: User } | null>(null);
  const [users, setUsers] = useState<Users>(initialUsers); // Will be populated from DB

  // Function to fetch all profiles from API
  const fetchAllProfiles = async () => {
    // Vérifier si l'utilisateur est connecté avant de faire la requête
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      console.log("No token available, skipping fetchAllProfiles");
      return {};
    }

    // Vérifier aussi que le token est défini dans le client API
    apiClient.setToken(token);

    try {
      const profilesData = await apiClient.getProfiles();

      const fetchedUsers: Users = {};
      profilesData.forEach((profile: any) => {
        fetchedUsers[profile.username] = {
          id: profile.id,
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          name: `${profile.civility || ''} ${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          civility: profile.civility,
          email: profile.email,
          position: profile.service,
          role: profile.role,
          pin: profile.pin,
          added_permissions: Array.isArray(profile.added_permissions) ? profile.added_permissions : (profile.added_permissions ? JSON.parse(profile.added_permissions) : []),
          removed_permissions: Array.isArray(profile.removed_permissions) ? profile.removed_permissions : (profile.removed_permissions ? JSON.parse(profile.removed_permissions) : []),
        };
      });
      setUsers(fetchedUsers);
      return fetchedUsers;
    } catch (error: any) {
      // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
      if (error.status !== 401 && error.status !== 403) {
        console.error("Error fetching all profiles:", error.message);
      }
      return {};
    }
  };

  // Effect to handle initial load and auth state changes
  useEffect(() => {
    // Initial fetch of profiles and current user
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const userId = localStorage.getItem('currentUserId');

      if (token && userId) {
        try {
          const profile = await apiClient.getProfile(userId);
          const fullUser: User = {
            id: profile.id,
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name,
            name: `${profile.civility || ''} ${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            civility: profile.civility,
            email: profile.email,
            position: profile.service,
            role: profile.role,
            pin: profile.pin,
            added_permissions: Array.isArray(profile.added_permissions) ? profile.added_permissions : (profile.added_permissions ? JSON.parse(profile.added_permissions) : []),
            removed_permissions: Array.isArray(profile.removed_permissions) ? profile.removed_permissions : (profile.removed_permissions ? JSON.parse(profile.removed_permissions) : []),
          };
          setCurrentUser({ username: profile.username, details: fullUser });
          // Fetch all profiles only if user is authenticated
          await fetchAllProfiles();
        } catch (error) {
          console.error("Error fetching profile on init:", error);
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('auth_token');
          setCurrentUser(null);
        }
      }
      // Don't fetch profiles if no token - wait for login
    };

    initializeAuth();
  }, []);

  const handleLogin = async (email: string, pass: string): Promise<boolean> => {
    try {
      const { user, token } = await apiClient.signIn(email, pass);
      
      // Le token est déjà défini dans apiClient.signIn, mais on s'assure qu'il est bien stocké
      if (token) {
        apiClient.setToken(token);
      }
      
      const profile = await apiClient.getProfile(user.id);
      const fullUser: User = {
        id: profile.id,
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        name: `${profile.civility || ''} ${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        civility: profile.civility,
        email: profile.email,
        position: profile.service,
        role: profile.role,
        pin: profile.pin,
        added_permissions: Array.isArray(profile.added_permissions) ? profile.added_permissions : (profile.added_permissions ? JSON.parse(profile.added_permissions) : []),
        removed_permissions: Array.isArray(profile.removed_permissions) ? profile.removed_permissions : (profile.removed_permissions ? JSON.parse(profile.removed_permissions) : []),
      };
      setCurrentUser({ username: profile.username, details: fullUser });
      setUsers(prev => ({ ...prev, [profile.username]: fullUser }));
      localStorage.setItem('currentUserId', user.id);
      showSuccess("Connexion réussie !");
      await fetchAllProfiles();
      return true;
    } catch (error: any) {
      showError(error.message || "Erreur lors de la connexion.");
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.signOut();
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
      await apiClient.updatePassword(newPassword);
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