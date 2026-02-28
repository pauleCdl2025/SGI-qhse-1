import { useState, useEffect } from 'react';
import { BiomedicalEquipment, BiomedicalEquipmentStatus, MaintenanceTask, User } from '@/types';
import { apiClient } from '@/integrations/api/client';
import { showSuccess, showError } from '@/utils/toast';

interface UseBiomedicalEquipmentProps {
  addNotification: (userId: string, message: string, link?: string) => void;
}

export const useBiomedicalEquipment = ({ addNotification }: UseBiomedicalEquipmentProps) => {
  const [biomedicalEquipment, setBiomedicalEquipment] = useState<BiomedicalEquipment[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);

  // Fetch biomedical equipment from API
  useEffect(() => {
    const fetchEquipment = async () => {
      // Vérifier si l'utilisateur est connecté avant de faire la requête
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        setBiomedicalEquipment([]);
        return;
      }

      // Vérifier aussi que le token est défini dans le client API
      apiClient.setToken(token);

      try {
        const data = await apiClient.getBiomedicalEquipment();
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
          console.error("Error fetching biomedical equipment:", error.message);
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
      // Vérifier si l'utilisateur est connecté avant de faire la requête
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        setMaintenanceTasks([]);
        return;
      }

      // Vérifier aussi que le token est défini dans le client API
      apiClient.setToken(token);

      try {
        const data = await apiClient.getMaintenanceTasks();
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
          console.error("Error fetching maintenance tasks:", error.message);
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
      await apiClient.createBiomedicalEquipment({
        name: equipment.name,
        serial_number: equipment.serial_number,
        location: equipment.location,
        model: 'N/A',
        department: 'N/A',
        notes: equipment.notes ?? null,
      });
      showSuccess(`Équipement ${equipment.name} ajouté.`);
    } catch (error: any) {
      console.error("Error adding equipment:", error.message);
      showError("Erreur lors de l'ajout de l'équipement.");
    }
  };

  const updateBiomedicalEquipmentStatus = async (equipmentId: string, status: BiomedicalEquipmentStatus) => {
    try {
      await apiClient.updateBiomedicalEquipmentStatus(equipmentId, status);
      showSuccess("Le statut de l'équipement a été mis à jour.");
    } catch (error: any) {
      console.error("Error updating equipment status:", error.message);
      showError("Erreur lors de la mise à jour du statut de l'équipement.");
    }
  };

  const scheduleMaintenanceTask = async (task: Omit<MaintenanceTask, 'id' | 'status' | 'created_at'>) => {
    try {
      await apiClient.createMaintenanceTask({
        equipment_id: task.equipment_id,
        type: task.type,
        description: task.description,
        technician_id: task.technician_id,
        scheduled_date: task.scheduled_date.toISOString(),
        comments: task.comments ?? null,
      });
      showSuccess(`Tâche de maintenance planifiée.`);
      // Notification créée côté backend
    } catch (error: any) {
      console.error("Error scheduling maintenance task:", error.message);
      showError("Erreur lors de la planification de la tâche de maintenance.");
    }
  };

  const updateMaintenanceTaskStatus = async (taskId: string, status: MaintenanceTaskStatus) => {
    const previousTasks = maintenanceTasks;
    setMaintenanceTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, status } : task))
    );
    try {
      await apiClient.updateMaintenanceTaskStatus(taskId, status);
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