import { useState, useEffect } from 'react';
import { Incident, IncidentStatus, InterventionReport, IncidentPriority, Users, User } from '@/types';
import { apiClient } from '@/integrations/api/client';
import { showSuccess, showError } from '@/utils/toast';

interface UseIncidentsProps {
  currentUser: { username: string; details: User } | null;
  users: Users;
  addNotification: (userId: string, message: string, link?: string) => void;
}

export const useIncidents = ({ currentUser, users, addNotification }: UseIncidentsProps) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Fetch incidents from API
  useEffect(() => {
    const fetchIncidents = async () => {
      // Vérifier si l'utilisateur est connecté avant de faire la requête
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        setIncidents([]);
        return;
      }

      // Vérifier aussi que le token est défini dans le client API
      apiClient.setToken(token);

      try {
        const data = await apiClient.getIncidents();
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
            deadline: item.deadline ? new Date(item.deadline) : undefined,
            report: item.report ? (typeof item.report === 'string' ? JSON.parse(item.report) : item.report) : undefined,
          };
        });
        setIncidents(fetchedIncidents);
      } catch (error: any) {
        // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
        if (error.status !== 401 && error.status !== 403) {
          console.error("Error fetching incidents:", error.message);
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
      const { urls } = await apiClient.uploadImages(files);
      return urls;
    } catch (error: any) {
      console.error("Error uploading images:", error.message);
      showError(`Erreur lors du téléchargement des images: ${error.message}`);
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
      
      await apiClient.createIncident({
        ...newIncident,
        priorite: prioriteToSend,
        photo_urls,
      });

      showSuccess("L'incident a été signalé avec succès.");
      
      // Déterminer le lien selon le service de l'incident
      let notificationLink = 'qhseTickets';
      if (newIncident.service === 'securite') {
        notificationLink = 'dashboardSecurite';
      } else if (newIncident.service === 'entretien') {
        notificationLink = 'dashboardEntretien';
      } else if (newIncident.service === 'biomedical') {
        notificationLink = 'biomedicalDecl';
      } else if (newIncident.service === 'technique') {
        notificationLink = 'dashboardTechnicien';
      }
      
      const supervisor = Object.values(users).find(u => u.role === 'superviseur_qhse');
      if (supervisor) {
        addNotification(supervisor.id, `Nouvel incident (${newIncident.type}) signalé par ${currentUser.details.first_name} ${currentUser.details.last_name}.`, notificationLink);
      }
    } catch (error: any) {
      console.error("Error adding incident:", error.message);
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

      await apiClient.updateIncident(incidentId, { statut: newStatus });
      showSuccess(`Le statut du ticket a été mis à jour.`);

      const updatedIncident = previousIncidents.find(i => i.id === incidentId);
      
      // Déterminer le lien selon le service de l'incident
      let notificationLink = 'qhseTickets';
      if (updatedIncident) {
        if (updatedIncident.service === 'securite') {
          notificationLink = 'dashboardSecurite';
        } else if (updatedIncident.service === 'entretien') {
          notificationLink = 'dashboardEntretien';
        } else if (updatedIncident.service === 'biomedical') {
          notificationLink = 'biomedicalDecl';
        } else if (updatedIncident.service === 'technique') {
          notificationLink = 'dashboardTechnicien';
        }
      }
      
      if (updatedIncident?.assigned_to) {
        addNotification(updatedIncident.assigned_to, `Statut du ticket mis à jour: ${newStatus}`, notificationLink);
      }
      const supervisor = Object.values(users).find(u => u.role === 'superviseur_qhse');
      if (supervisor) {
        addNotification(supervisor.id, `Statut du ticket ${incidentId.substring(0, 8)} mis à jour: ${newStatus}`, notificationLink);
      }
    } catch (error: any) {
      console.error("Error updating incident status:", error.message);
      showError("Erreur lors de la mise à jour du statut de l'incident.");
      setIncidents(previousIncidents);
    }
  };

  const deleteIncident = async (incidentId: string) => {
    const previousIncidents = incidents;
    setIncidents(prev => prev.filter(incident => incident.id !== incidentId));
    try {
      await apiClient.deleteIncident(incidentId);
      showSuccess("Le ticket a été supprimé.");
    } catch (error: any) {
      console.error("Error deleting incident:", error.message);
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

      await apiClient.updateIncident(incidentId, { statut: 'traite', report: fullReport });
      showSuccess(`Rapport d'intervention soumis.`);
      
      // Déterminer le lien selon le service de l'incident
      const incidentForReport = incidents.find(i => i.id === incidentId);
      let notificationLink = 'qhseTickets';
      if (incidentForReport) {
        if (incidentForReport.service === 'securite') {
          notificationLink = 'dashboardSecurite';
        } else if (incidentForReport.service === 'entretien') {
          notificationLink = 'dashboardEntretien';
        } else if (incidentForReport.service === 'biomedical') {
          notificationLink = 'biomedicalDecl';
        } else if (incidentForReport.service === 'technique') {
          notificationLink = 'dashboardTechnicien';
        }
      }
      
      const supervisor = Object.values(users).find(u => u.role === 'superviseur_qhse');
      if (supervisor) {
        addNotification(supervisor.id, `Rapport soumis pour ticket ${incidentId.substring(0, 8)} par ${currentUser.details.first_name} ${currentUser.details.last_name}.`, notificationLink);
      }
    } catch (error: any) {
      console.error("Error adding intervention report:", error.message);
      showError("Erreur lors de l'ajout du rapport d'intervention.");
    }
  };

  const assignTicket = async (incidentId: string, assignedTo: string, priority: IncidentPriority, deadline: Date, assigneeName?: string) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour assigner un ticket.");
      return;
    }

    // Seul le superviseur QHSE peut assigner des tickets
    if (currentUser.details.role !== 'superviseur_qhse' && currentUser.details.role !== 'superadmin') {
      showError("Seul le superviseur QHSE peut assigner des tickets.");
      return;
    }

    try {
      await apiClient.updateIncident(incidentId, {
        assigned_to: assignedTo,
        assigned_to_name: assigneeName,
        priorite: priority,
        deadline: deadline.toISOString(),
        statut: 'attente'
      });

      const assignedUserName = assigneeName || users[Object.keys(users).find(key => users[key].id === assignedTo)!]?.name || 'un agent';
      showSuccess(`Ticket assigné à ${assignedUserName}.`);
      setIncidents(prev =>
        prev.map(incident =>
          incident.id === incidentId
            ? {
                ...incident,
                assigned_to: assignedTo,
                assigned_to_name: assigneeName,
                priorite: priority,
                deadline
              }
            : incident
        )
      );
      // Déterminer le lien selon le service de l'incident
      const incidentForLink = incidents.find(i => i.id === incidentId);
      let notificationLink = 'qhseTickets';
      if (incidentForLink) {
        if (incidentForLink.service === 'securite') {
          notificationLink = 'dashboardSecurite';
        } else if (incidentForLink.service === 'entretien') {
          notificationLink = 'dashboardEntretien';
        } else if (incidentForLink.service === 'biomedical') {
          notificationLink = 'biomedicalDecl';
        } else if (incidentForLink.service === 'technique') {
          notificationLink = 'dashboardTechnicien';
        }
      }
      
      addNotification(assignedTo, `Nouveau ticket vous a été assigné: ${incidentId.substring(0, 8)}.`, notificationLink);
      const supervisor = Object.values(users).find(u => u.role === 'superviseur_qhse');
      if (supervisor) {
        addNotification(supervisor.id, `Ticket ${incidentId.substring(0, 8)} assigné à ${assignedUserName}.`, notificationLink);
      }
    } catch (error: any) {
      console.error("Error assigning ticket:", error.message);
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
      await apiClient.updateIncident(incidentId, {
        assigned_to: null,
        assigned_to_name: null,
        deadline: null,
        statut: 'nouveau'
      });
      
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
      const incidentToUnassign = incidents.find(i => i.id === incidentId);
      
      // Déterminer le lien selon le service de l'incident
      let notificationLink = 'qhseTickets';
      if (incidentToUnassign) {
        if (incidentToUnassign.service === 'securite') {
          notificationLink = 'dashboardSecurite';
        } else if (incidentToUnassign.service === 'entretien') {
          notificationLink = 'dashboardEntretien';
        } else if (incidentToUnassign.service === 'biomedical') {
          notificationLink = 'biomedicalDecl';
        } else if (incidentToUnassign.service === 'technique') {
          notificationLink = 'dashboardTechnicien';
        }
      }
      
      if (incidentToUnassign?.assigned_to) {
        addNotification(incidentToUnassign.assigned_to, `Un ticket vous a été retiré: ${incidentId.substring(0, 8)}.`, notificationLink);
      }
      const supervisor = Object.values(users).find(u => u.role === 'superviseur_qhse');
      if (supervisor) {
        addNotification(supervisor.id, `Un ticket ${incidentId.substring(0, 8)} a été désassigné.`, notificationLink);
      }
    } catch (error: any) {
      console.error("Error unassigning ticket:", error.message);
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
      await apiClient.createIncident({
        type: intervention.type,
        description: intervention.description,
        priorite: intervention.priorite,
        service: intervention.service,
        lieu: intervention.lieu,
        photo_urls: [],
      });
      
      // Ensuite mettre à jour pour assigner
      const allIncidents = await apiClient.getIncidents();
      const created = allIncidents[allIncidents.length - 1]; // Dernier créé
      await apiClient.updateIncident(created.id, {
        assigned_to: intervention.assigned_to,
        assigned_to_name: undefined,
        deadline: intervention.deadline?.toISOString(),
        statut: 'attente'
      });

      const assignedUserName = users[Object.keys(users).find(key => users[key].id === intervention.assigned_to)!]?.name || 'un agent';
      showSuccess(`Intervention planifiée et assignée à ${assignedUserName}.`);
      if (intervention.assigned_to) {
        addNotification(intervention.assigned_to, `Nouvelle intervention planifiée pour vous: ${intervention.type}.`);
      }
    } catch (error: any) {
      console.error("Error planning intervention:", error.message);
      showError("Erreur lors de la planification de l'intervention.");
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
  };
};