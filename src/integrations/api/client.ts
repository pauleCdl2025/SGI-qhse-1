// Client API pour remplacer Supabase
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Récupérer le token depuis localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur serveur' }));
      const error = new Error(errorData.error || 'Erreur lors de la requête');
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    return response.json();
  }

  // Authentification
  async signIn(email: string, password: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async signUp(userData: any) {
    const data = await this.request<{ user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.setToken(data.token);
    return data;
  }

  async signOut() {
    await this.request('/auth/signout', { method: 'POST' });
    this.setToken(null);
  }

  async updatePassword(password: string) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  // Profils
  async getProfiles() {
    return this.request<any[]>('/profiles');
  }

  async getProfile(id: string) {
    return this.request<any>(`/profiles/${id}`);
  }

  async updateProfile(id: string, data: any) {
    return this.request(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProfile(id: string) {
    return this.request(`/profiles/${id}`, {
      method: 'DELETE',
    });
  }

  // QHSE - Gestion documentaire
  async getQHSEDocuments() {
    return this.request<any[]>('/qhse/documents');
  }

  async createQHSEDocument(formData: FormData) {
    const headers: HeadersInit = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/qhse/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
      throw new Error(error.error || 'Erreur lors de la création du document');
    }

    return response.json();
  }

  async updateQHSEDocument(id: string, data: any) {
    return this.request(`/qhse/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Incidents
  async getIncidents() {
    return this.request<any[]>('/incidents');
  }

  async createIncident(incident: any) {
    // Debug: vérifier ce qui est envoyé
    console.log('ApiClient.createIncident - Données envoyées:', JSON.stringify(incident));
    console.log('ApiClient.createIncident - Priorité dans incident:', incident.priorite, 'type:', typeof incident.priorite);
    return this.request('/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  }

  async updateIncident(id: string, data: any) {
    return this.request(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteIncident(id: string) {
    return this.request(`/incidents/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));

    const response = await fetch(`${API_BASE_URL}/incidents/upload-images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'upload des images');
    }

    return response.json();
  }

  // Visiteurs
  async getVisitors() {
    return this.request<any[]>('/visitors');
  }

  async createVisitor(visitor: any) {
    return this.request('/visitors', {
      method: 'POST',
      body: JSON.stringify(visitor),
    });
  }

  async signOutVisitor(id: string) {
    return this.request(`/visitors/${id}/signout`, {
      method: 'PUT',
    });
  }

  async deleteVisitor(id: string) {
    return this.request(`/visitors/${id}`, {
      method: 'DELETE',
    });
  }

  // Équipements biomédicaux
  async getBiomedicalEquipment() {
    return this.request<any[]>('/biomedical-equipment');
  }

  async createBiomedicalEquipment(equipment: any) {
    return this.request('/biomedical-equipment', {
      method: 'POST',
      body: JSON.stringify(equipment),
    });
  }

  async updateBiomedicalEquipmentStatus(id: string, status: string) {
    return this.request(`/biomedical-equipment/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Tâches de maintenance
  async getMaintenanceTasks() {
    return this.request<any[]>('/maintenance-tasks');
  }

  async createMaintenanceTask(task: any) {
    return this.request('/maintenance-tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateMaintenanceTaskStatus(id: string, status: string) {
    return this.request(`/maintenance-tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Salles
  async getRooms() {
    return this.request<any[]>('/rooms');
  }

  // Médecins
  async getDoctors() {
    return this.request<any[]>('/doctors');
  }

  // Réservations
  async getBookings() {
    return this.request<any[]>('/bookings');
  }

  async createBooking(booking: any) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  async updateBooking(id: string, booking: any) {
    return this.request(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(booking),
    });
  }

  async deleteBooking(id: string) {
    return this.request(`/bookings/${id}`, {
      method: 'DELETE',
    });
  }

  // Tâches planifiées
  async getPlannedTasks() {
    return this.request<any[]>('/planned-tasks');
  }

  async createPlannedTask(task: any) {
    return this.request('/planned-tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updatePlannedTask(id: string, data: any) {
    return this.request(`/planned-tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlannedTask(id: string) {
    return this.request(`/planned-tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Déchets médicaux
  async getMedicalWaste() {
    return this.request<any[]>('/medical-waste');
  }

  async createMedicalWaste(waste: any) {
    return this.request('/medical-waste', {
      method: 'POST',
      body: JSON.stringify(waste),
    });
  }

  async updateMedicalWaste(id: string, data: any) {
    return this.request(`/medical-waste/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMedicalWaste(id: string) {
    return this.request(`/medical-waste/${id}`, {
      method: 'DELETE',
    });
  }

  // Formations
  async getTrainings() {
    return this.request<any[]>('/trainings');
  }

  async createTraining(training: any) {
    return this.request('/trainings', {
      method: 'POST',
      body: JSON.stringify(training),
    });
  }

  async updateTraining(id: string, data: any) {
    return this.request(`/trainings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTraining(id: string) {
    return this.request(`/trainings/${id}`, {
      method: 'DELETE',
    });
  }

  async getTrainingParticipations() {
    return this.request<any[]>('/training-participations');
  }

  async createTrainingParticipation(participation: any) {
    return this.request('/training-participations', {
      method: 'POST',
      body: JSON.stringify(participation),
    });
  }

  async updateTrainingParticipation(id: string, data: any) {
    return this.request(`/training-participations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTrainingParticipation(id: string) {
    return this.request(`/training-participations/${id}`, {
      method: 'DELETE',
    });
  }

  async getCompetencies() {
    return this.request<any[]>('/competencies');
  }

  async createCompetency(data: any) {
    return this.request('/competencies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompetency(id: string, data: any) {
    return this.request(`/competencies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompetency(id: string) {
    return this.request(`/competencies/${id}`, {
      method: 'DELETE',
    });
  }

  // Audits
  async getAudits() {
    return this.request<any[]>('/audits');
  }

  async createAudit(audit: any) {
    return this.request('/audits', {
      method: 'POST',
      body: JSON.stringify(audit),
    });
  }

  async updateAudit(id: string, data: any) {
    return this.request(`/audits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAudit(id: string) {
    return this.request(`/audits/${id}`, {
      method: 'DELETE',
    });
  }

  // Audit Checklists
  async getAuditChecklists(auditId: string) {
    return this.request<any[]>(`/audits/${auditId}/checklists`);
  }

  async createAuditChecklist(auditId: string, checklist: any) {
    return this.request(`/audits/${auditId}/checklists`, {
      method: 'POST',
      body: JSON.stringify(checklist),
    });
  }

  async updateAuditChecklist(checklistId: string, data: any) {
    return this.request(`/audits/checklists/${checklistId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAuditChecklist(checklistId: string) {
    return this.request(`/audits/checklists/${checklistId}`, {
      method: 'DELETE',
    });
  }

  // Audit Action Plans
  async getAuditActionPlans(auditId: string) {
    return this.request<any[]>(`/audits/${auditId}/action-plans`);
  }

  async createAuditActionPlan(auditId: string, actionPlan: any) {
    return this.request(`/audits/${auditId}/action-plans`, {
      method: 'POST',
      body: JSON.stringify(actionPlan),
    });
  }

  async updateAuditActionPlan(actionPlanId: string, data: any) {
    return this.request(`/audits/action-plans/${actionPlanId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAuditActionPlan(actionPlanId: string) {
    return this.request(`/audits/action-plans/${actionPlanId}`, {
      method: 'DELETE',
    });
  }

  // Risques
  async getRisks() {
    return this.request<any[]>('/risks');
  }

  async createRisk(risk: any) {
    return this.request('/risks', {
      method: 'POST',
      body: JSON.stringify(risk),
    });
  }

  async updateRisk(id: string, data: any) {
    return this.request(`/risks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRisk(id: string) {
    return this.request(`/risks/${id}`, {
      method: 'DELETE',
    });
  }

  // Risk Actions
  async getRiskActions(riskId: string) {
    return this.request<any[]>(`/risks/${riskId}/actions`);
  }

  async createRiskAction(riskId: string, action: any) {
    return this.request(`/risks/${riskId}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  async updateRiskAction(actionId: string, data: any) {
    return this.request(`/risks/actions/${actionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRiskAction(actionId: string) {
    return this.request(`/risks/actions/${actionId}`, {
      method: 'DELETE',
    });
  }

  // Stérilisation - Cycles
  async getSterilizationCycles() {
    return this.request<any[]>('/sterilization-cycles');
  }

  async createSterilizationCycle(cycle: any) {
    return this.request('/sterilization-cycles', {
      method: 'POST',
      body: JSON.stringify(cycle),
    });
  }

  async updateSterilizationCycle(id: string, data: any) {
    return this.request(`/sterilization-cycles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSterilizationCycle(id: string) {
    return this.request(`/sterilization-cycles/${id}`, {
      method: 'DELETE',
    });
  }

  // Stérilisation - Registre
  async getSterilizationRegister() {
    return this.request<any[]>('/sterilization-register');
  }

  async createSterilizationRegister(register: any) {
    return this.request('/sterilization-register', {
      method: 'POST',
      body: JSON.stringify(register),
    });
  }

  async updateSterilizationRegister(id: string, data: any) {
    return this.request(`/sterilization-register/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSterilizationRegister(id: string) {
    return this.request(`/sterilization-register/${id}`, {
      method: 'DELETE',
    });
  }

  // Suivi de linge (Laundry Tracking)
  async getLaundryTracking() {
    return this.request<any[]>('/laundry-tracking');
  }

  async createLaundryTracking(tracking: any) {
    return this.request('/laundry-tracking', {
      method: 'POST',
      body: JSON.stringify(tracking),
    });
  }

  async updateLaundryTracking(id: string, data: any) {
    return this.request(`/laundry-tracking/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLaundryTracking(id: string) {
    return this.request(`/laundry-tracking/${id}`, {
      method: 'DELETE',
    });
  }

  // Notifications
  async getNotifications() {
    return this.request<any[]>('/notifications');
  }

  async createNotification(notification: any) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  }

  async markNotificationsAsRead() {
    return this.request('/notifications/mark-read', {
      method: 'PUT',
    });
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request(`/notifications/${notificationId}/mark-read`, {
      method: 'PUT',
    });
  }

  // Ensure superadmin
  async ensureSuperadmin() {
    return this.request<{ success: boolean; message: string }>('/ensure-superadmin', {
      method: 'POST',
    });
  }

  // Rondes quotidiennes
  async getDailyRounds(technicianId?: string, roundType?: string) {
    const params = new URLSearchParams();
    if (technicianId) params.append('technician_id', technicianId);
    if (roundType) params.append('round_type', roundType);
    const queryString = params.toString();
    return this.request<any[]>(`/daily-rounds${queryString ? '?' + queryString : ''}`);
  }

  async createDailyRound(round: any) {
    return this.request('/daily-rounds', {
      method: 'POST',
      body: JSON.stringify(round),
    });
  }

  async updateDailyRound(id: string, data: any) {
    return this.request(`/daily-rounds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDailyRound(id: string) {
    return this.request(`/daily-rounds/${id}`, {
      method: 'DELETE',
    });
  }

  async getRoundChecklistTemplates(roundType: string) {
    return this.request<any[]>(`/round-checklist-templates?round_type=${roundType}`);
  }

  async getRoundChecklistResponses(roundId: string) {
    return this.request<any[]>(`/round-checklist-responses?round_id=${roundId}`);
  }

  async createRoundChecklistResponse(response: any) {
    return this.request('/round-checklist-responses', {
      method: 'POST',
      body: JSON.stringify(response),
    });
  }

  async updateRoundChecklistResponse(id: string, data: any) {
    return this.request(`/round-checklist-responses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();


