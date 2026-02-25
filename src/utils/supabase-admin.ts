import { apiClient } from '@/integrations/api/client';
import { showError } from './toast';

// This function calls the backend API to reset a user's password
export const resetUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  try {
    const data = await apiClient.resetUserPassword(userId, newPassword);

    if (data && data.success) {
      return true;
    } else {
      showError(data?.message || "Échec de la réinitialisation du mot de passe.");
      return false;
    }
  } catch (err: any) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", err);
    showError(err.message || "Erreur lors de la réinitialisation du mot de passe.");
    return false;
  }
};