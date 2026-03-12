import { useState, useEffect } from 'react';
import { BiomedicalEquipment, BiomedicalEquipmentStatus, MaintenanceTask } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface UseBiomedicalEquipmentProps {
  addNotification: (userId: string, message: string, link?: string) => void;
}

export const useBiomedicalEquipment = ({ addNotification }: UseBiomedicalEquipmentProps) => {
  const [biomedicalEquipment, setBiomedicalEquipment] = useState<BiomedicalEquipment[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);

  // Fetch biomedical equipment from API
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setBiomedicalEquipment([]);
          return;
        }

        const { data, error } = await supabase
          .from('biomedical_equipment')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const fetchedEquipment: BiomedicalEquipment[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          model: item.model,
          serial_number: item.serial_number,
          department: item.department,
          location: item.location,
          status: item.status as BiomedicalEquipmentStatus,
          last_maintenance: item.last_maintenance ? new Date(item.last_maintenance) : undefined,
          next_maintenance: item.next_maintenance ? new Date(item.next_maintenance) : undefined,
          notes: item.notes ?? null,
          created_at: new Date(item.created_at),
        }));
        setBiomedicalEquipment(fetchedEquipment);
      } catch (error: any) {
        // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
        if (error.status !== 401 && error.status !== 403) {
          console.error("Error fetching biomedical equipment:", error.message || error);
          showError("Erreur lors du chargement des équipements biomédicaux.");
        }
      }
    };

    fetchEquipment();
    // Polling toutes les 30 secondes
    const interval = setInterval(fetchEquipment, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch maintenance tasks from API
  useEffect(() => {
    const fetchMaintenanceTasks = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setMaintenanceTasks([]);
          return;
        }

        const { data, error } = await supabase
          .from('maintenance_tasks')
          .select('*')
          .order('scheduled_date', { ascending: true });

        if (error) {
          throw error;
        }

        const fetchedTasks: MaintenanceTask[] = data.map((item: any) => ({
          id: item.id,
          equipment_id: item.equipment_id,
          type: item.type,
          description: item.description,
          technician_id: item.technician_id,
          scheduled_date: new Date(item.scheduled_date),
          comments: item.comments ?? null,
          status: item.status,
          created_at: new Date(item.created_at),
        }));
        setMaintenanceTasks(fetchedTasks);
      } catch (error: any) {
        // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
        if (error.status !== 401 && error.status !== 403) {
          console.error("Error fetching maintenance tasks:", error.message || error);
          showError("Erreur lors du chargement des tâches de maintenance.");
        }
      }
    };

    fetchMaintenanceTasks();
    // Polling toutes les 30 secondes
    const interval = setInterval(fetchMaintenanceTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const addBiomedicalEquipment = async (equipment: Omit<BiomedicalEquipment, 'id' | 'status' | 'last_maintenance' | 'next_maintenance' | 'model' | 'department' | 'created_at'>) => {
    try {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const { error } = await supabase.from('biomedical_equipment').insert([
        {
          id,
          name: equipment.name,
          serial_number: equipment.serial_number,
          location: equipment.location,
          model: 'N/A',
          department: 'N/A',
          notes: equipment.notes ?? null,
          status: 'opérationnel',
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw error;
      }

      showSuccess(`Équipement ${equipment.name} ajouté.`);
    } catch (error: any) {
      console.error("Error adding equipment:", error.message || error);
      showError("Erreur lors de l'ajout de l'équipement.");
    }
  };

  const updateBiomedicalEquipmentStatus = async (equipmentId: string, status: BiomedicalEquipmentStatus) => {
    try {
      const { error } = await supabase
        .from('biomedical_equipment')
        .update({ status })
        .eq('id', equipmentId);

      if (error) {
        throw error;
      }

      showSuccess("Le statut de l'équipement a été mis à jour.");
    } catch (error: any) {
      console.error("Error updating equipment status:", error.message || error);
      showError("Erreur lors de la mise à jour du statut de l'équipement.");
    }
  };

  const scheduleMaintenanceTask = async (task: Omit<MaintenanceTask, 'id' | 'status' | 'created_at'>) => {
    try {
      const { error } = await supabase.from('maintenance_tasks').insert([
        {
          equipment_id: task.equipment_id,
          type: task.type,
          description: task.description,
          technician_id: task.technician_id,
          scheduled_date: task.scheduled_date.toISOString(),
          comments: task.comments ?? null,
          status: 'planifiée',
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw error;
      }

      showSuccess(`Tâche de maintenance planifiée.`);
      // Notification créée côté backend
    } catch (error: any) {
      console.error("Error scheduling maintenance task:", error.message || error);
      showError("Erreur lors de la planification de la tâche de maintenance.");
    }
  };

  const updateMaintenanceTaskStatus = async (taskId: string, status: MaintenanceTaskStatus) => {
    const previousTasks = maintenanceTasks;
    setMaintenanceTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, status } : task))
    );
    try {
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      showSuccess("Statut de la tâche mis à jour.");
    } catch (error: any) {
      console.error("Error updating maintenance task status:", error.message);
      showError("Erreur lors de la mise à jour du statut de la tâche.");
      setMaintenanceTasks(previousTasks);
    }
  };

  return {
    biomedicalEquipment,
    setBiomedicalEquipment,
    maintenanceTasks,
    setMaintenanceTasks,
    addBiomedicalEquipment,
    updateBiomedicalEquipmentStatus,
    scheduleMaintenanceTask,
    updateMaintenanceTaskStatus,
  };
};