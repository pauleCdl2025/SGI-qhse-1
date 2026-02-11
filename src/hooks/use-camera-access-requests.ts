import { useState, useEffect } from 'react';
import { CameraAccessRequest } from '@/types';
import { apiClient } from '@/integrations/api/client';
import { showError } from '@/utils/toast';

export const useCameraAccessRequests = () => {
  const [requests, setRequests] = useState<CameraAccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch camera access requests from API
  useEffect(() => {
    const fetchRequests = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      apiClient.setToken(token);

      try {
        setIsLoading(true);
        const data = await apiClient.getCameraAccessRequests();
        const fetchedRequests: CameraAccessRequest[] = data.map((item: any) => ({
          id: item.id,
          requester_id: item.requester_id,
          requester_name: item.requester_name || undefined,
          requester_service: item.requester_service || undefined,
          requester_position: item.requester_position || undefined,
          request_date: new Date(item.request_date),
          access_reason: item.access_reason,
          access_start_date: new Date(item.access_start_date),
          access_end_date: new Date(item.access_end_date),
          access_start_time: item.access_start_time || undefined,
          access_end_time: item.access_end_time || undefined,
          camera_zones: item.camera_zones || undefined,
          hierarchical_authorization: item.hierarchical_authorization || undefined,
          hierarchical_authorization_date: item.hierarchical_authorization_date ? new Date(item.hierarchical_authorization_date) : undefined,
          status: item.status,
          notes: item.notes || undefined,
          created_at: item.created_at ? new Date(item.created_at) : undefined,
          updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
        }));
        setRequests(fetchedRequests);
      } catch (error: any) {
        if (error.status !== 401 && error.status !== 403) {
          console.error("Error fetching camera access requests:", error.message);
          showError("Erreur lors du chargement des demandes d'accès aux caméras.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
    // Polling toutes les 30 secondes
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshRequests = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;

    apiClient.setToken(token);

    try {
      const data = await apiClient.getCameraAccessRequests();
      const fetchedRequests: CameraAccessRequest[] = data.map((item: any) => ({
        id: item.id,
        requester_id: item.requester_id,
        requester_name: item.requester_name || undefined,
        requester_service: item.requester_service || undefined,
        requester_position: item.requester_position || undefined,
        request_date: new Date(item.request_date),
        access_reason: item.access_reason,
        access_start_date: new Date(item.access_start_date),
        access_end_date: new Date(item.access_end_date),
        access_start_time: item.access_start_time || undefined,
        access_end_time: item.access_end_time || undefined,
        camera_zones: item.camera_zones || undefined,
        hierarchical_authorization: item.hierarchical_authorization || undefined,
        hierarchical_authorization_date: item.hierarchical_authorization_date ? new Date(item.hierarchical_authorization_date) : undefined,
        status: item.status,
        notes: item.notes || undefined,
        created_at: item.created_at ? new Date(item.created_at) : undefined,
        updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
      }));
      setRequests(fetchedRequests);
    } catch (error: any) {
      console.error("Error refreshing camera access requests:", error.message);
    }
  };

  return { requests, isLoading, refreshRequests };
};
