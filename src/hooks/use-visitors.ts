import { useState, useEffect } from 'react';
import { Visitor, User } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface UseVisitorsProps {
  currentUser: { username: string; details: User } | null;
}

export const useVisitors = ({ currentUser }: UseVisitorsProps) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  // Fetch visitors from API
  useEffect(() => {
    const fetchVisitors = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setVisitors([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('visitors')
          .select('*')
          .order('entry_time', { ascending: false });

        if (error) {
          throw error;
        }

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
          console.error("Error fetching visitors:", error.message || error);
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
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showError("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const { error } = await supabase.from('visitors').insert([
        {
          full_name: visitor.full_name,
          id_document: visitor.id_document,
          reason: visitor.reason,
          destination: visitor.destination,
          person_to_see: visitor.person_to_see,
          company: visitor.company,
          visit_type: visitor.visit_type,
          id_verified: visitor.id_verified ?? false,
          badge_code: visitor.badge_code,
          entry_signature: visitor.entry_signature,
          exit_signature: visitor.exit_signature,
          access_observations: visitor.access_observations,
          entry_time: new Date().toISOString(),
          registered_by: user.id,
        },
      ]);

      if (error) {
        throw error;
      }

      showSuccess(`Visiteur ${visitor.full_name} enregistré.`);
    } catch (error: any) {
      console.error("Error adding visitor:", error.message || error);
      showError("Erreur lors de l'enregistrement du visiteur.");
    }
  };

  const signOutVisitor = async (visitorId: string) => {
    try {
      const exitTime = new Date();
      const { error } = await supabase
        .from('visitors')
        .update({ exit_time: exitTime.toISOString() })
        .eq('id', visitorId);

      if (error) {
        throw error;
      }

      showSuccess("Sortie du visiteur enregistrée.");
      // Mise à jour optimiste de l'état local
      setVisitors(prev =>
        prev.map(v =>
          v.id === visitorId ? { ...v, exit_time } : v
        )
      );
    } catch (error: any) {
      console.error("Error signing out visitor:", error.message || error);
      showError("Erreur lors de l'enregistrement de la sortie du visiteur.");
    }
  };

  const deleteVisitor = async (visitorId: string) => {
    try {
      const { error } = await supabase.from('visitors').delete().eq('id', visitorId);

      if (error) {
        throw error;
      }

      showSuccess("Visiteur supprimé.");
      // Mise à jour optimiste de la liste des visiteurs
      setVisitors(prev => prev.filter(v => v.id !== visitorId));
    } catch (error: any) {
      console.error("Error deleting visitor:", error.message || error);
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