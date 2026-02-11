import { useState, useEffect, useCallback } from 'react';
import { PlannedTask, PlannedTaskStatus, User, Users } from '@/types';
import { apiClient } from '@/integrations/api/client';
import { showSuccess, showError } from '@/utils/toast';

interface UsePlannedTasksProps {
  currentUser: { username: string; details: User } | null;
  users: Users;
  addNotification: (userId: string, message: string, link?: string) => void;
}

export const usePlannedTasks = ({ currentUser, users, addNotification }: UsePlannedTasksProps) => {
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([]);

  const fetchPlannedTasks = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      setPlannedTasks([]);
      return;
    }

    apiClient.setToken(token);

    try {
      const data = await apiClient.getPlannedTasks();
      const fetchedTasks: PlannedTask[] = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        assigned_to: item.assigned_to,
        assignee_name: item.assignee_name || undefined,
        created_by: item.created_by,
        due_date: new Date(item.due_date),
        status: item.status as PlannedTaskStatus,
        created_at: new Date(item.created_at),
      }));
      setPlannedTasks(fetchedTasks);
    } catch (error: any) {
      if (error.status !== 401 && error.status !== 403) {
        console.error("Error fetching planned tasks:", error.message);
        showError("Erreur lors du chargement des tâches planifiées.");
      }
    }
  }, []);

  useEffect(() => {
    fetchPlannedTasks();
    const interval = setInterval(fetchPlannedTasks, 30000);
    return () => clearInterval(interval);
  }, [fetchPlannedTasks]);

  const addPlannedTask = async (task: Omit<PlannedTask, 'id' | 'created_by' | 'status' | 'created_at'>) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour créer une tâche.");
      return;
    }

    // Vérifier les permissions : superviseur QHSE et superadmin peuvent créer pour n'importe qui
    // Les techniciens (biomedical, technicien_polyvalent) peuvent créer des tâches uniquement pour eux-mêmes
    if (currentUser.details.role !== 'superviseur_qhse' && currentUser.details.role !== 'superadmin') {
      if (currentUser.details.role === 'biomedical' || currentUser.details.role === 'technicien_polyvalent') {
        // Les techniciens ne peuvent créer des tâches que pour eux-mêmes
        if (task.assigned_to !== currentUser.details.id) {
          showError("Vous ne pouvez créer des tâches que pour vous-même.");
          return;
        }
      } else {
        showError("Vous n'avez pas la permission de créer des tâches planifiées.");
      return;
      }
    }

    try {
      await apiClient.createPlannedTask({
        title: task.title,
        description: task.description,
        assigned_to: task.assigned_to,
        assignee_name: task.assignee_name,
        due_date: task.due_date.toISOString().split('T')[0], // Format date seulement
      });
      const assignedUser = Object.values(users).find(user => user.id === task.assigned_to);
      const assignedName = task.assignee_name || assignedUser?.name || assignedUser?.username || 'agent';
      showSuccess(`Tâche "${task.title}" créée et assignée à ${assignedName}.`);
      addNotification(task.assigned_to, `Nouvelle tâche planifiée: ${task.title}`);
      await fetchPlannedTasks();
    } catch (error: any) {
      console.error("Error adding planned task:", error.message);
      showError("Erreur lors de l'ajout de la tâche planifiée.");
    }
  };

  const updatePlannedTaskStatus = async (taskId: string, status: PlannedTaskStatus) => {
    try {
      await apiClient.updatePlannedTask(taskId, { status });
      setPlannedTasks(prev =>
        prev.map(task => task.id === taskId ? { ...task, status } : task)
      );
      showSuccess(`Le statut de la tâche a été mis à jour.`);
      const updatedTask = plannedTasks.find(t => t.id === taskId);
      if (updatedTask) {
        const statusLabels: Record<PlannedTaskStatus, string> = {
          'à faire': 'Pas commencé',
          'en_cours': 'En cours',
          'terminée': 'Terminé',
          'annulée': 'Bloqué',
        };
        addNotification(updatedTask.created_by, `La tâche "${updatedTask.title}" est maintenant: ${statusLabels[status] || status}`);
      }
      // Rafraîchir pour garantir la cohérence avec le backend
      await fetchPlannedTasks();
    } catch (error: any) {
      console.error("Error updating planned task status:", error.message);
      showError("Erreur lors de la mise à jour du statut de la tâche.");
    }
  };

  const deletePlannedTask = async (taskId: string) => {
    try {
      await apiClient.deletePlannedTask(taskId);
      showSuccess("La tâche a été supprimée.");
      await fetchPlannedTasks();
      const taskToDelete = plannedTasks.find(t => t.id === taskId);
      if (taskToDelete) {
        addNotification(taskToDelete.assigned_to, `La tâche "${taskToDelete.title}" a été supprimée.`);
      }
    } catch (error: any) {
      console.error("Error deleting planned task:", error.message);
      showError("Erreur lors de la suppression de la tâche.");
    }
  };

  return {
    plannedTasks,
    setPlannedTasks,
    addPlannedTask,
    updatePlannedTaskStatus,
    deletePlannedTask,
    fetchPlannedTasks,
  };
};