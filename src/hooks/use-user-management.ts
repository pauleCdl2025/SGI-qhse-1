import { User, Users, UserRole, Civility } from '@/types';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

// Define a specific type for the user data passed to addUser
interface NewUserData {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  role: UserRole;
  civility: Civility;
  position: string;
  pin?: string;
}

interface UseUserManagementProps {
  setUsers: React.Dispatch<React.SetStateAction<Users>>;
  fetchAllProfiles: () => Promise<Users>; // Add fetchAllProfiles to props
}

export const useUserManagement = ({ setUsers, fetchAllProfiles }: UseUserManagementProps) => {
  const addUser = async (username: string, user: NewUserData) => {
    if (!user.password) {
      showError("Le mot de passe est requis pour la création d'utilisateur.");
      return;
    }

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            username,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            service: user.position,
            civility: user.civility,
            pin: user.role === 'medecin' ? user.pin : null,
          },
        },
      });
      if (signUpError) throw signUpError;
      const createdUser = authData.user;
      if (!createdUser) throw new Error('Utilisateur non créé');

      // Créer explicitement le profil (INSERT) plutôt qu'un upsert avec onConflict=id
      const { error: insertError } = await supabase.from('profiles').insert([{
        id: createdUser.id,
        username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        service: user.position,
        civility: user.civility,
        pin: user.role === 'medecin' ? user.pin : null,
      }]);
      if (insertError) throw insertError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', createdUser.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error('Profil non trouvé');
      const newUserWithId: User = {
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
      setUsers(prev => ({ ...prev, [username]: newUserWithId }));
      showSuccess(`L'utilisateur ${newUserWithId.name} a été ajouté avec succès.`);
    } catch (error: any) {
      showError(error?.message || "Erreur lors de la création de l'utilisateur.");
    }
  };

  const deleteUser = async (username: string) => {
    try {
      const userToDelete = Object.values(await fetchAllProfiles()).find(u => u.username === username);

      if (!userToDelete) {
        showError("Utilisateur non trouvé.");
        return;
      }

      const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
      if (error) throw error;

      // Update local state after successful deletion
      setUsers(prev => {
        const newUsers = { ...prev };
        delete newUsers[username];
        return newUsers;
      });
      showSuccess("L'utilisateur a été supprimé avec succès.");
    } catch (error: any) {
      showError(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
    }
  };

  const updateUserPermissions = async (username: string, permissions: { added: string[], removed: string[] }) => {
    try {
      const userToUpdate = Object.values(await fetchAllProfiles()).find(u => u.username === username);

      if (!userToUpdate) {
        showError("Utilisateur non trouvé.");
        return;
      }

      const { error } = await supabase.from('profiles').update({
        added_permissions: permissions.added,
        removed_permissions: permissions.removed,
      }).eq('id', userToUpdate.id);
      if (error) throw error;

      // Update local state
      setUsers(prev => ({
        ...prev,
        [username]: {
          ...prev[username],
          added_permissions: permissions.added,
          removed_permissions: permissions.removed,
        }
      }));
      showSuccess("Les permissions de l'utilisateur ont été mises à jour.");
    } catch (error: any) {
      showError(`Erreur lors de la mise à jour des permissions: ${error?.message || error}`);
    }
  };

  return {
    addUser,
    deleteUser,
    updateUserPermissions,
  };
};