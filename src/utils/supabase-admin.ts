import { showError, showSuccess } from './toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Réinitialise le mot de passe d'un utilisateur.
 * - Si userId === utilisateur connecté : utilise supabase.auth.updateUser.
 * - Sinon : nécessite une Edge Function Supabase avec service role (ex: reset-user-password).
 */
export const resetUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === userId) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showSuccess("Mot de passe mis à jour.");
      return true;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (sessionError || !accessToken) {
      showError("Session invalide. Veuillez vous reconnecter puis réessayer.");
      return false;
    }

    const { data, error } = await supabase.functions.invoke('reset-user-password', {
      body: { userId, newPassword },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (error) {
      showError(error.message || "Échec de l'appel de la fonction reset-user-password.");
      return false;
    }
    if (data?.success) return true;
    showError(data?.message || "Échec de la réinitialisation du mot de passe.");
    return false;
  } catch (err: any) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", err);
    showError(err?.message || "Erreur lors de la réinitialisation du mot de passe.");
    return false;
  }
};