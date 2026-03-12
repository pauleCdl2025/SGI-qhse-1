import { useState, useEffect, useCallback } from 'react';
import { PlannedTask, PlannedTaskStatus, User, Users } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface UsePlannedTasksProps {
  currentUser: { username: string; details: User } | null;
  users: Users;
  addNotification: (userId: string, message: string, link?: string) => void;
}

export const usePlannedTasks = ({ currentUser, users, addNotification }: UsePlannedTasksProps) => {
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([]);

  const fetchPlannedTasks = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setPlannedTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from('planned_tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) {
        throw error;
      }

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
        console.error("Error fetching planned tasks:", error.message || error);
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
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showError("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const { error } = await supabase.from('planned_tasks').insert([
        {
          title: task.title,
          description: task.description,
          assigned_to: task.assigned_to,
          assignee_name: task.assignee_name,
          due_date: task.due_date.toISOString().split('T')[0],
          status: 'en_attente',
          created_by: user.id,
        },
      ]);

      if (error) {
        throw error;
      }

      const assignedUser = Object.values(users).find(user => user.id === task.assigned_to);
      const assignedName = task.assignee_name || assignedUser?.name || assignedUser?.username || 'agent';
      showSuccess(`Tâche "${task.title}" créée et assignée à ${assignedName}.`);
      await fetchPlannedTasks();
    } catch (error: any) {
      console.error("Error adding planned task:", error.message || error);
      showError("Erreur lors de l'ajout de la tâche planifiée.");
    }
  };

  const updatePlannedTaskStatus = async (taskId: string, status: PlannedTaskStatus) => {
    try {
      const { error } = await supabase
        .from('planned_tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      setPlannedTasks(prev =>
        prev.map(task => task.id === taskId ? { ...task, status } : task)
      );
      showSuccess(`Le statut de la tâche a été mis à jour.`);
      await fetchPlannedTasks();
    } catch (error: any) {
      console.error("Error updating planned task status:", error.message || error);
      showError("Erreur lors de la mise à jour du statut de la tâche.");
    }
  };

  const deletePlannedTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('planned_tasks').delete().eq('id', taskId);

      if (error) {
        throw error;
      }

      showSuccess("La tâche a été supprimée.");
      await fetchPlannedTasks();
    } catch (error: any) {
      console.error("Error deleting planned task:", error.message || error);
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