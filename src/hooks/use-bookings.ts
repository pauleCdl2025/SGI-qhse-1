import { useState, useEffect } from 'react';
import { Booking, Room, Doctor, User, Users, BookingStatus } from '@/types';
import { showError, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const NOTIFICATION_LEAD_TIME_MINUTES = 15;
const EXPIRED_HIGHLIGHT_MINUTES = 15;
const PRE_EXPIRATION_HIGHLIGHT_MINUTES = 5;

interface UseBookingsProps {
  currentUser: { username: string; details: User } | null;
  users: Users;
  addNotification: (userId: string, message: string, link?: string) => void;
}

export const useBookings = ({ currentUser, users, addNotification }: UseBookingsProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [sentEndingNotifications, setSentEndingNotifications] = useState<Set<string>>(new Set());
  const [expiringBookingIds, setExpiringBookingIds] = useState<Set<string>>(new Set());
  const [preExpiringBookingIds, setPreExpiringBookingIds] = useState<Set<string>>(new Set());

  // Fetch rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setRooms([]);
          return;
        }

        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        const fetchedRooms: Room[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          capacity: item.capacity,
          location: item.location,
          doctor_in_charge: item.doctor_in_charge,
          created_at: new Date(item.created_at),
        }));
        setRooms(fetchedRooms);
      } catch (error: any) {
        // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
        if (error.status !== 401 && error.status !== 403) {
          console.error("Error fetching rooms:", error.message || error);
          showError("Erreur lors du chargement des salles.");
        }
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch doctors from API
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setDoctors([]);
          return;
        }

        const { data, error } = await supabase
          .from('doctors')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        const fetchedDoctors: Doctor[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          specialty: item.specialty,
          status: item.status as Doctor['status'],
          created_at: new Date(item.created_at),
        }));
        setDoctors(fetchedDoctors);
      } catch (error: any) {
        // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
        if (error.status !== 401 && error.status !== 403) {
          console.error("Error fetching doctors:", error.message || error);
          showError("Erreur lors du chargement des médecins.");
        }
      }
    };

    fetchDoctors();
    const interval = setInterval(fetchDoctors, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch bookings from API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setBookings([]);
          return;
        }

        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const fetchedBookings: Booking[] = data.map((item: any) => ({
          id: item.id,
          room_id: item.room_id,
          title: item.title,
          booked_by: item.booked_by,
          start_time: new Date(item.start_time),
          end_time: new Date(item.end_time),
          doctor_id: item.doctor_id,
          status: item.status as BookingStatus,
          created_at: new Date(item.created_at),
        }));
        setBookings(fetchedBookings);
      } catch (error: any) {
        // Ne pas afficher d'erreur si c'est juste une erreur d'authentification
        if (error.status !== 401 && error.status !== 403) {
          console.error("Error fetching bookings:", error.message || error);
          showError("Erreur lors du chargement des réservations.");
        }
      }
    };

    fetchBookings();
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      const notificationWindowEnd = new Date(now.getTime() + NOTIFICATION_LEAD_TIME_MINUTES * 60 * 1000);
      const expiredHighlightWindowStart = new Date(now.getTime() - EXPIRED_HIGHLIGHT_MINUTES * 60 * 1000);
      const preExpirationWindowEnd = new Date(now.getTime() + PRE_EXPIRATION_HIGHLIGHT_MINUTES * 60 * 1000);
      
      const newExpiringIds = new Set<string>();
      const newPreExpiringIds = new Set<string>();

      bookings.forEach(booking => {
        // Notification logic
        if (
          booking.end_time > now &&
          booking.end_time <= notificationWindowEnd &&
          !sentEndingNotifications.has(booking.id)
        ) {
          const room = rooms.find(r => r.id === booking.room_id);
          if (!room) return;

          const endTimeFormatted = format(booking.end_time, 'HH:mm');
          
          const supervisors = Object.values(users).filter(user => user.role === 'superviseur_qhse');
          supervisors.forEach(user => {
            addNotification(user.id, `La salle ${room.name} se libérera à ${endTimeFormatted}. Le nettoyage a été signalé.`);
          });

          const maintenanceAgents = Object.values(users).filter(user => user.role === 'agent_entretien');
          maintenanceAgents.forEach(user => {
            addNotification(user.id, `La salle ${room.name} sera libre à ${endTimeFormatted}. Préparez le nettoyage.`);
          });

          setSentEndingNotifications(prev => new Set(prev).add(booking.id));
        }

        // Blinking logic for recently expired
        if (booking.end_time > expiredHighlightWindowStart && booking.end_time <= now) {
          newExpiringIds.add(booking.id);
        }

        // Highlight logic for pre-expiring
        if (booking.end_time > now && booking.end_time <= preExpirationWindowEnd) {
          newPreExpiringIds.add(booking.id);
        }
      });

      setExpiringBookingIds(newExpiringIds);
      setPreExpiringBookingIds(newPreExpiringIds);

    }, 60 * 1000); // Check every minute

    return () => clearInterval(intervalId);
  }, [bookings, users, rooms, sentEndingNotifications, addNotification]);

  const addBooking = async (booking: Omit<Booking, 'id' | 'booked_by' | 'status' | 'created_at'>) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour réserver une salle.");
      return;
    }

    // Seule la secrétaire peut créer des réservations
    if (currentUser.details.role !== 'secretaire') {
      showError("Seule la secrétaire peut créer des réservations.");
      return;
    }

    // Check for booking conflicts
    const isConflict = bookings.some(b => 
      b.room_id === booking.room_id &&
      (
        (booking.start_time >= b.start_time && booking.start_time < b.end_time) ||
        (booking.end_time > b.start_time && booking.end_time <= b.end_time) ||
        (booking.start_time <= b.start_time && booking.end_time >= b.end_time)
      )
    );

    if (isConflict) {
      showError("Le créneau horaire est déjà réservé. Veuillez en choisir un autre.");
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

      const { error } = await supabase.from('bookings').insert([
        {
          room_id: booking.room_id,
          title: booking.title,
          booked_by: user.id,
          start_time: booking.start_time.toISOString(),
          end_time: booking.end_time.toISOString(),
          doctor_id: booking.doctor_id,
          status: 'prévu',
        },
      ]);

      if (error) {
        throw error;
      }

      showSuccess(`La salle a été réservée avec succès.`);
    } catch (error: any) {
      console.error("Error adding booking:", error.message || error);
      showError("Erreur lors de la réservation de la salle.");
    }
  };

  const updateBooking = async (bookingId: string, updatedData: Omit<Booking, 'id' | 'booked_by' | 'created_at'>) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour modifier une réservation.");
      return;
    }

    // Seule la secrétaire peut modifier des réservations
    if (currentUser.details.role !== 'secretaire') {
      showError("Seule la secrétaire peut modifier des réservations.");
      return;
    }

    // Check for booking conflicts, excluding the current booking being updated
    const isConflict = bookings.some(b => 
      b.id !== bookingId &&
      b.room_id === updatedData.room_id &&
      (
        (updatedData.start_time >= b.start_time && updatedData.start_time < b.end_time) ||
        (updatedData.end_time > b.start_time && updatedData.end_time <= b.end_time) ||
        (updatedData.start_time <= b.start_time && updatedData.end_time >= b.end_time)
      )
    );

    if (isConflict) {
      showError("Le créneau horaire est déjà réservé. Veuillez en choisir un autre.");
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          room_id: updatedData.room_id,
          title: updatedData.title,
          start_time: updatedData.start_time.toISOString(),
          end_time: updatedData.end_time.toISOString(),
          doctor_id: updatedData.doctor_id,
          status: updatedData.status,
        })
        .eq('id', bookingId);

      if (error) {
        throw error;
      }

      showSuccess("La réservation a été modifiée avec succès.");
    } catch (error: any) {
      console.error("Error updating booking:", error.message || error);
      showError("Erreur lors de la modification de la réservation.");
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!currentUser) {
      showError("Vous devez être connecté pour annuler une réservation.");
      return;
    }

    // Seule la secrétaire peut supprimer des réservations
    if (currentUser.details.role !== 'secretaire') {
      showError("Seule la secrétaire peut annuler des réservations.");
      return;
    }

    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);

      if (error) {
        throw error;
      }

      showSuccess("La réservation a été annulée.");
    } catch (error: any) {
      console.error("Error deleting booking:", error.message || error);
      showError("Erreur lors de l'annulation de la réservation.");
    }
  };

  const handleStartBooking = async (bookingId: string, pin: string): Promise<boolean> => {
    if (!currentUser || currentUser.details.pin !== pin) {
      showError("Code PIN incorrect.");
      return false;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'en_cours' })
        .eq('id', bookingId);

      if (error) {
        throw error;
      }

      showSuccess("La consultation a démarré.");
      return true;
    } catch (error: any) {
      console.error("Error starting booking:", error.message || error);
      showError("Erreur lors du démarrage de la consultation.");
      return false;
    }
  };

  const handleEndBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'terminé' })
        .eq('id', bookingId);

      if (error) {
        throw error;
      }

      showSuccess("La consultation est terminée.");
    } catch (error: any) {
      console.error("Error ending booking:", error.message || error);
      showError("Erreur lors de la fin de la consultation.");
    }
  };

  return {
    rooms,
    setRooms,
    bookings,
    setBookings,
    doctors,
    setDoctors,
    addBooking,
    updateBooking,
    deleteBooking,
    expiringBookingIds,
    preExpiringBookingIds,
    startBooking: handleStartBooking,
    endBooking: handleEndBooking,
  };
};