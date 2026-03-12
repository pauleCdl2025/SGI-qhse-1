import { useState, useEffect } from 'react';
import { Incident, IncidentStatus, InterventionReport, IncidentPriority, Users, User } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface UseIncidentsProps {
  currentUser: { username: string; details: User } | null;
  users: Users;
  addNotification: (userId: string, message: string, link?: string) => void;
}

export const useIncidents = ({ currentUser, users, addNotification: _addNotification }: UseIncidentsProps) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Fetch incidents from API
  useEffect(() => {
    const fetchIncidents = async () => {
      // Vérifier si l'utilisateur est connecté avant de faire la requête
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setIncidents([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .order('date_creation', { ascending: false });

        if (error) {
          throw error;
        }

        const fetchedIncidents: Incident[] = data.map((item: any) => {
          // Debug: vérifier la priorité reçue
          let rawPriorite = item.priorite;
          
          // Normaliser la priorité (convertir en string, enlever espaces, minuscules)
          let normalizedPriorite = 'moyenne';
          if (rawPriorite != null && rawPriorite !== undefined) {
            const strPriorite = String(rawPriorite).trim().toLowerCase();
            const validPriorities = ['faible', 'moyenne', 'haute', 'critique'];
            if (validPriorities.includes(strPriorite)) {
              normalizedPriorite = strPriorite;
            }
          }
          
          console.log('Frontend - Incident priorité reçue:', item.id, 'raw:', rawPriorite, 'normalisée:', normalizedPriorite);
          
          return {
            id: item.id,
            type: item.type,
            description: item.description,
            date_creation: new Date(item.date_creation),
            reported_by: item.reported_by,
            statut: item.statut,
            priorite: normalizedPriorite as IncidentPriority,
            service: item.service,
            lieu: item.lieu,
          photo_urls: Array.isArray(item.photo_urls) ? item.photo_urls : (item.photo_urls ? JSON.parse(item.photo_urls) : []),
            assigned_to: item.assigned_to,
            assigned_to_name: item.assigned_to_name || undefined,
            prestataire: item.prestataire || undefined,
            deadline: item.deadline ? new Date(item.deadline) : undefined,
            report: item.report ? (typeof item.report === 'string' ? JSON.parse(item.report) : item.report) : undefined,
          };
        });
        setIncidents(fetchedIncidents);
      } catch (error: any) {
        // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
        if (error.status !== 401 && error.status !== 403) {
          console.error("Error fetching incidents:", error.message || error);
          showError("Erreur lors du chargement des incidents.");
        }
      }
    };

    fetchIncidents();
    // Polling toutes les 30 secondes au lieu de temps réel
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (!files || files.length === 0) return [];

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const result = await supabase.storage
          .from('incidents')
          .upload(`incidents/${Date.now()}-${file.name}`, file);

        if (result.error) {
          throw result.error;
        }

        const { data: publicUrlData } = supabase.storage
          .from('incidents')
          .getPublicUrl(result.data.path);

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      return uploadedUrls;
    } catch (error: any) {
      console.error("Error uploading images:", error.message || error);
      showError(`Erreur lors du téléchargement des images: ${error.message || error}`);
      return [];
    }
  };

  const addIncident = async (newIncident: Omit<Incident, 'id' | 'date_creation' | 'reported_by' | 'photo_urls'>, files: File[]) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour signaler un incident.");
      return;
    }

    try {
      const photo_urls = await uploadImages(files);
      // Normaliser et vérifier la priorité avant envoi
      let prioriteToSend: IncidentPriority = newIncident.priorite || 'moyenne';
      if (typeof prioriteToSend === 'string') {
        const normalized = prioriteToSend.trim().toLowerCase();
        const validPriorities: IncidentPriority[] = ['faible', 'moyenne', 'haute', 'critique'];
        if (validPriorities.includes(normalized as IncidentPriority)) {
          prioriteToSend = normalized as IncidentPriority;
        } else {
          console.warn('Priorité invalide, utilisation de "moyenne" par défaut:', normalized);
          prioriteToSend = 'moyenne';
        }
      }
      
      // Debug: vérifier la priorité avant envoi
      console.log('Frontend - Incident à envoyer:', { ...newIncident, priorite: prioriteToSend, photo_urls });
      console.log('Frontend - Priorité originale:', newIncident.priorite, 'normalisée:', prioriteToSend);
      
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showError("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const { error } = await supabase.from('incidents').insert([
        {
          type: newIncident.type,
          description: newIncident.description,
          date_creation: new Date().toISOString(),
          reported_by: user.id,
          statut: 'nouveau',
          priorite: prioriteToSend,
          service: newIncident.service,
          lieu: newIncident.lieu,
          photo_urls,
          assigned_to: newIncident.assigned_to || null,
          assigned_to_name: newIncident.assigned_to_name || null,
          prestataire: newIncident.prestataire || null,
          deadline: newIncident.deadline ? newIncident.deadline.toISOString() : null,
          report: newIncident.report || null,
        },
      ]);

      if (error) {
        throw error;
      }

      showSuccess("L'incident a été signalé avec succès.");
    } catch (error: any) {
      console.error("Error adding incident:", error.message || error);
      showError("Erreur lors de l'ajout de l'incident.");
    }
  };

  const updateIncidentStatus = async (incidentId: string, newStatus: IncidentStatus) => {
    let previousIncidents = incidents;
    try {
      setIncidents(prev =>
        prev.map(incident =>
          incident.id === incidentId
            ? {
                ...incident,
                statut: newStatus
              }
            : incident
        )
      );

      const { error } = await supabase
        .from('incidents')
        .update({ statut: newStatus })
        .eq('id', incidentId);

      if (error) {
        throw error;
      }

      showSuccess(`Le statut du ticket a été mis à jour.`);
    } catch (error: any) {
      console.error("Error updating incident status:", error.message || error);
      showError("Erreur lors de la mise à jour du statut de l'incident.");
      setIncidents(previousIncidents);
    }
  };

  const deleteIncident = async (incidentId: string) => {
    const previousIncidents = incidents;
    setIncidents(prev => prev.filter(incident => incident.id !== incidentId));
    try {
      const { error } = await supabase.from('incidents').delete().eq('id', incidentId);

      if (error) {
        throw error;
      }

      showSuccess("Le ticket a été supprimé.");
    } catch (error: any) {
      console.error("Error deleting incident:", error.message || error);
      showError("Erreur lors de la suppression du ticket.");
      setIncidents(previousIncidents);
    }
  };

  const addInterventionReport = async (incidentId: string, report: Omit<InterventionReport, 'report_date' | 'technician_name'>) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour soumettre un rapport.");
      return;
    }

    try {
      const fullReport: InterventionReport = {
        ...report,
        report_date: new Date(),
        technician_name: `${currentUser.details.first_name} ${currentUser.details.last_name}`,
      };

      const { error } = await supabase
        .from('incidents')
        .update({
          statut: 'traite',
          report: fullReport,
        })
        .eq('id', incidentId);

      if (error) {
        throw error;
      }

      showSuccess(`Rapport d'intervention soumis.`);
    } catch (error: any) {
      console.error("Error adding intervention report:", error.message || error);
      showError("Erreur lors de l'ajout du rapport d'intervention.");
    }
  };

  const assignTicket = async (incidentId: string, assignedTo: string, priority: IncidentPriority, deadline: Date, assigneeName?: string, prestataire?: string) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour assigner un ticket.");
      return;
    }

    // Seul le superviseur QHSE et l'assistante QHSE peuvent assigner des tickets
    if (currentUser.details.role !== 'superviseur_qhse' && currentUser.details.role !== 'assistante_qhse' && currentUser.details.role !== 'superadmin') {
      showError("Seul le superviseur QHSE ou l'assistante QHSE peut assigner des tickets.");
      return;
    }

    try {
      const { error } = await supabase
        .from('incidents')
        .update({
          assigned_to: assignedTo,
          assigned_to_name: assigneeName || null,
          prestataire: prestataire || null,
          priorite: priority,
          deadline: deadline.toISOString(),
          statut: 'attente',
        })
        .eq('id', incidentId);

      if (error) {
        throw error;
      }

      const assignedUserName = assigneeName || users[Object.keys(users).find(key => users[key].id === assignedTo)!]?.name || 'un agent';
      showSuccess(`Ticket assigné à ${assignedUserName}${prestataire ? ` (Prestataire: ${prestataire})` : ''}.`);
      setIncidents(prev =>
        prev.map(incident =>
          incident.id === incidentId
            ? {
                ...incident,
                assigned_to: assignedTo,
                assigned_to_name: assigneeName,
                prestataire: prestataire,
                priorite: priority,
                deadline
              }
            : incident
        )
      );
    } catch (error: any) {
      console.error("Error assigning ticket:", error.message || error);
      showError("Erreur lors de l'assignation du ticket.");
    }
  };

  const unassignTicket = async (incidentId: string) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour désassigner un ticket.");
      return;
    }

    // Seul le superviseur QHSE peut désassigner des tickets
    if (currentUser.details.role !== 'superviseur_qhse' && currentUser.details.role !== 'superadmin') {
      showError("Seul le superviseur QHSE peut désassigner des tickets.");
      return;
    }

    try {
      const { error } = await supabase
        .from('incidents')
        .update({
          assigned_to: null,
          assigned_to_name: null,
          deadline: null,
          statut: 'nouveau',
        })
        .eq('id', incidentId);

      if (error) {
        throw error;
      }
      
      showSuccess(`Le ticket a été désassigné.`);
      setIncidents(prev =>
        prev.map(incident =>
          incident.id === incidentId
            ? {
                ...incident,
                assigned_to: undefined,
                assigned_to_name: undefined,
                deadline: undefined,
                statut: 'nouveau'
              }
            : incident
        )
      );
    } catch (error: any) {
      console.error("Error unassigning ticket:", error.message || error);
      showError("Erreur lors de la désassignation du ticket.");
    }
  };

  const planIntervention = async (intervention: Omit<Incident, 'id' | 'date_creation' | 'reported_by' | 'statut' | 'photo_urls'>) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour planifier une intervention.");
      return;
    }

    // Seul le superviseur QHSE peut planifier des interventions
    if (currentUser.details.role !== 'superviseur_qhse' && currentUser.details.role !== 'superadmin') {
      showError("Seul le superviseur QHSE peut planifier des interventions.");
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

      const { error } = await supabase.from('incidents').insert([
        {
          type: intervention.type,
          description: intervention.description,
          priorite: intervention.priorite,
          service: intervention.service,
          lieu: intervention.lieu,
          photo_urls: [],
          date_creation: new Date().toISOString(),
          reported_by: user.id,
          assigned_to: intervention.assigned_to || null,
          assigned_to_name: null,
          deadline: intervention.deadline ? intervention.deadline.toISOString() : null,
          statut: 'attente',
        },
      ]);

      if (error) {
        throw error;
      }

      const assignedUserName = users[Object.keys(users).find(key => users[key].id === intervention.assigned_to)!]?.name || 'un agent';
      showSuccess(`Intervention planifiée et assignée à ${assignedUserName}.`);
    } catch (error: any) {
      console.error("Error planning intervention:", error.message || error);
      showError("Erreur lors de la planification de l'intervention.");
    }
  };

  const updatePrestataire = async (incidentId: string, prestataire: string) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour modifier le prestataire.");
      return;
    }

    // Vérifier que le ticket est assigné à l'utilisateur actuel
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident) {
      showError("Ticket introuvable.");
      return;
    }

    // Seul le technicien polyvalent peut modifier le prestataire de ses propres tickets
    if (currentUser.details.role !== 'technicien_polyvalent') {
      showError("Seul le technicien polyvalent peut modifier le prestataire.");
      return;
    }

    if (incident.assigned_to !== currentUser.details.id) {
      showError("Vous ne pouvez modifier le prestataire que pour les tickets qui vous sont assignés.");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('incidents')
        .update({
          prestataire,
        })
        .eq('id', incidentId);

      if (updateError) {
        throw updateError;
      }

      // Recharger les incidents depuis Supabase pour s'assurer que la mise à jour est bien sauvegardée
      const { data, error: fetchError } = await supabase
        .from('incidents')
        .select('*')
        .order('date_creation', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const formattedIncidents: Incident[] = data.map((item: any) => {
        let rawPriorite = item.priorite;
        if (rawPriorite != null && rawPriorite !== undefined) {
          rawPriorite = String(rawPriorite);
        }
        let normalizedPriorite = 'moyenne';
        if (rawPriorite && typeof rawPriorite === 'string') {
          normalizedPriorite = rawPriorite.trim().toLowerCase();
        }
        const validPriorities = ['faible', 'moyenne', 'haute', 'critique'];
        const priorite = validPriorities.includes(normalizedPriorite) ? normalizedPriorite : 'moyenne';
        
        return {
          id: item.id,
          type: item.type,
          description: item.description,
          date_creation: new Date(item.date_creation),
          reported_by: item.reported_by,
          statut: item.statut,
          priorite: priorite as IncidentPriority,
          service: item.service,
          lieu: item.lieu,
          photo_urls: Array.isArray(item.photo_urls)
            ? item.photo_urls
            : item.photo_urls
            ? (() => {
                try {
                  const parsed = typeof item.photo_urls === 'string' ? JSON.parse(item.photo_urls) : item.photo_urls;
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              })()
            : [],
          assigned_to: item.assigned_to || undefined,
          assigned_to_name: item.assigned_to_name || undefined,
          prestataire: item.prestataire || undefined,
          deadline: item.deadline ? new Date(item.deadline) : undefined,
          report: item.report ? (typeof item.report === 'string' ? JSON.parse(item.report) : item.report) : undefined,
        };
      });

      setIncidents(formattedIncidents);
      showSuccess(`Prestataire mis à jour avec succès.`);
    } catch (error: any) {
      console.error("Error updating prestataire:", error.message || error);
      showError("Erreur lors de la mise à jour du prestataire.");
      throw error;
    }
  };

  return {
    incidents,
    setIncidents,
    addIncident,
    updateIncidentStatus,
    deleteIncident,
    addInterventionReport,
    assignTicket,
    unassignTicket,
    planIntervention,
    updatePrestataire,
  };
};