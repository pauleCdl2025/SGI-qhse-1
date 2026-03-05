import { useEffect, useState } from 'react';
import { apiClient } from '@/integrations/api/client';
import { showError, showSuccess } from '@/utils/toast';

export interface QHSEAnomaly {
  id: string;
  date_anomalie: string;
  lieu: string;
  source?: string | null;
  description: string;
  thematique?: string | null;
  sous_thematique?: string | null;
  responsable_action?: string | null;
  message_prise_en_compte?: string | null;
  actions_a_mettre_en_oeuvre?: string | null;
  devis_a_faire?: boolean;
  montant_devis?: number | null;
  commentaires?: string | null;
  impact_patient?: string | null;
  impact_structure?: string | null;
  niveau_priorite: 'faible' | 'moyenne' | 'haute' | 'critique';
  date_limite?: string | null;
  etat_avancement?: string | null;
  date_resolution?: string | null;
  date_verification?: string | null;
  commentaire_verification?: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export const useAnomalies = () => {
  const [anomalies, setAnomalies] = useState<QHSEAnomaly[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getQHSEAnomalies();
      setAnomalies(
        data.map((a: any) => ({
          ...a,
          niveau_priorite: a.niveau_priorite || 'moyenne',
        }))
      );
    } catch (error: any) {
      console.error('Error fetching anomalies:', error);
      if (error?.response?.status !== 403 && error?.response?.status !== 401) {
        showError("Erreur lors du chargement des anomalies QHSE.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const createAnomaly = async (payload: Partial<QHSEAnomaly>) => {
    try {
      await apiClient.createQHSEAnomaly(payload);
      showSuccess("Anomalie créée.");
      await fetchAnomalies();
    } catch (error: any) {
      console.error('Error creating anomaly:', error);
      showError("Erreur lors de la création de l'anomalie.");
    }
  };

  const updateAnomaly = async (id: string, payload: Partial<QHSEAnomaly>) => {
    try {
      await apiClient.updateQHSEAnomaly(id, payload);
      showSuccess("Anomalie mise à jour.");
      await fetchAnomalies();
    } catch (error: any) {
      console.error('Error updating anomaly:', error);
      showError("Erreur lors de la mise à jour de l'anomalie.");
    }
  };

  const deleteAnomaly = async (id: string) => {
    try {
      await apiClient.deleteQHSEAnomaly(id);
      showSuccess("Anomalie supprimée.");
      setAnomalies(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      console.error('Error deleting anomaly:', error);
      showError("Erreur lors de la suppression de l'anomalie.");
    }
  };

  return {
    anomalies,
    loading,
    fetchAnomalies,
    createAnomaly,
    updateAnomaly,
    deleteAnomaly,
  };
};

