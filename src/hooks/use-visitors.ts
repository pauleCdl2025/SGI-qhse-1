import { useState, useEffect } from 'react';
import { Visitor, User } from '@/types';
import { apiClient } from '@/integrations/api/client';
import { showSuccess, showError } from '@/utils/toast';

interface UseVisitorsProps {
  currentUser: { username: string; details: User } | null;
}

export const useVisitors = ({ currentUser }: UseVisitorsProps) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  // Fetch visitors from API
  useEffect(() => {
    const fetchVisitors = async () => {
      // Vérifier si l'utilisateur est connecté avant de faire la requête
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        setVisitors([]);
        return;
      }

      // Vérifier aussi que le token est défini dans le client API
      apiClient.setToken(token);

      try {
        const data = await apiClient.getVisitors();
        const fetchedVisitors: Visitor[] = data.map((item: any) => ({
          id: item.id,
          full_name: item.full_name,
          id_document: item.id_document,
          reason: item.reason,
          destination: item.destination,
          person_to_see: item.person_to_see,
          company: item.company,
          visit_type: item.visit_type,
          id_verified: !!item.id_verified,
          badge_code: item.badge_code,
          entry_signature: item.entry_signature,
          exit_signature: item.exit_signature,
          access_observations: item.access_observations,
          entry_time: new Date(item.entry_time),
          exit_time: item.exit_time ? new Date(item.exit_time) : undefined,
          registered_by: item.registered_by,
        }));
        setVisitors(fetchedVisitors);
      } catch (error: any) {
        // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
        if (error.status !== 401 && error.status !== 403) {
          console.error("Error fetching visitors:", error.message);
          showError("Erreur lors du chargement des visiteurs.");
        }
      }
    };

    fetchVisitors();
    // Polling toutes les 30 secondes
    const interval = setInterval(fetchVisitors, 30000);
    return () => clearInterval(interval);
  }, []);

  const addVisitor = async (visitor: Omit<Visitor, 'id' | 'entry_time' | 'registered_by'>) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour enregistrer un visiteur.");
      return;
    }

    try {
      await apiClient.createVisitor(visitor);
      showSuccess(`Visiteur ${visitor.full_name} enregistré.`);
    } catch (error: any) {
      console.error("Error adding visitor:", error.message);
      showError("Erreur lors de l'enregistrement du visiteur.");
    }
  };

  const signOutVisitor = async (visitorId: string) => {
    try {
      await apiClient.signOutVisitor(visitorId);
      showSuccess("Sortie du visiteur enregistrée.");
      // Mise à jour optimiste de l'état local
      setVisitors(prev =>
        prev.map(v =>
          v.id === visitorId ? { ...v, exit_time: new Date() } : v
        )
      );
    } catch (error: any) {
      console.error("Error signing out visitor:", error.message);
      showError("Erreur lors de l'enregistrement de la sortie du visiteur.");
    }
  };

  const deleteVisitor = async (visitorId: string) => {
    try {
      await apiClient.deleteVisitor(visitorId);
      showSuccess("Visiteur supprimé.");
      // Mise à jour optimiste de la liste des visiteurs
      setVisitors(prev => prev.filter(v => v.id !== visitorId));
    } catch (error: any) {
      console.error("Error deleting visitor:", error.message);
      showError("Erreur lors de la suppression du visiteur.");
    }
  };

  return {
    visitors,
    setVisitors,
    addVisitor,
    signOutVisitor,
    deleteVisitor,
  };
};