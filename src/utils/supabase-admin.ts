import { supabase } from '@/integrations/supabase/client';
import { showError } from './toast';

// This function will call a Supabase Edge Function to reset a user's password
export const resetUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('reset-user-password', {
      body: { userId, newPassword },
    });

    if (error) {
      showError(`Erreur de la fonction Edge: ${error.message}`);
      return false;
    }

    // The Edge Function returns { success: boolean, message: string }
    if (data && data.success) {
      return true;
    } else {
      showError(data?.message || "Échec de la réinitialisation du mot de passe via la fonction Edge.");
      return false;
    }
  } catch (err: any) {
    console.error("Erreur lors de l'appel de la fonction Edge:", err);
    showError(`Erreur inattendue: ${err.message}`);
    return false;
  }
};