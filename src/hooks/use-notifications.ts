import { useState, useEffect, useRef } from 'react';
import { Notification } from '@/types';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

// Fonction pour jouer un son de notification
const playNotificationSound = () => {
  try {
    // Créer un contexte audio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Créer un oscillateur pour générer un son
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connecter les nœuds
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configurer le son (fréquence, type d'onde)
    oscillator.frequency.value = 800; // Fréquence en Hz (son aigu)
    oscillator.type = 'sine';
    
    // Enveloppe ADSR (Attack, Decay, Sustain, Release)
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.1); // Decay
    gainNode.gain.setValueAtTime(0.1, now + 0.1); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3); // Release
    
    // Démarrer et arrêter l'oscillateur
    oscillator.start(now);
    oscillator.stop(now + 0.3);
    
    // Nettoyer après la fin
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    // Si l'API Web Audio n'est pas disponible, essayer avec un son HTML5
    try {
      const audio = new Audio('data:audio/wav;base64,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');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignorer les erreurs de lecture audio
      });
    } catch (e) {
      // Si tout échoue, ignorer silencieusement
    }
  }
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const previousNotificationsRef = useRef<Set<string>>(new Set());

  // Fetch notifications from Supabase
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setNotifications([]);
          return;
        }

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching notifications from Supabase:", error.message);
          return;
        }

        const fetchedNotifications: Notification[] = data.map((item: any) => ({
          id: item.id,
          recipient_id: item.recipient_id,
          message: item.message,
          read: item.read === 1 || item.read === true,
          created_at: new Date(item.created_at),
          link: item.link,
        }));
        
        // Détecter les nouvelles notifications non lues
        const currentNotificationIds = new Set(fetchedNotifications.map(n => n.id));
        const newUnreadNotifications = fetchedNotifications.filter(
          n => !n.read && !previousNotificationsRef.current.has(n.id)
        );
        
        // Jouer le son pour les nouvelles notifications
        if (newUnreadNotifications.length > 0) {
          playNotificationSound();
        }
        
        // Mettre à jour la référence des notifications précédentes
        previousNotificationsRef.current = currentNotificationIds;
        
        setNotifications(fetchedNotifications);
      } catch (error: any) {
        console.error("Error fetching notifications:", error.message);
      }
    };

    fetchNotifications();
    // Polling toutes les 10 secondes pour les notifications
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const addNotification = async (recipientId: string, message: string, link?: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: recipientId,
          message,
          link: link || null,
          read: false,
        });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error("Error adding notification:", error.message);
      // Don't show error to user for notifications, just log
    }
  };

  const markNotificationsAsRead = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', userId)
        .eq('read', false);

      if (error) {
        throw new Error(error.message);
      }

      // Mettre à jour l'état local pour marquer toutes les notifications non lues comme lues
      setNotifications(prev => 
        prev.map(notification => 
          notification.recipient_id === userId && !notification.read
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error: any) {
      console.error("Error marking notifications as read:", error.message);
      showError("Erreur lors de la mise à jour des notifications.");
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        throw new Error(error.message);
      }

      // Mettre à jour l'état local pour marquer cette notification comme lue
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error: any) {
      console.error("Error marking notification as read:", error.message);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(userError?.message || 'Utilisateur non connecté');
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', user.id);

      if (error) {
        throw new Error(error.message);
      }

      setNotifications([]);
      showSuccess("Notifications supprimées.");
    } catch (error: any) {
      console.error("Error deleting notifications:", error);
      const status = error?.response?.status;
      const msg = error?.response?.data?.error || error?.message;
      if (status === 404) {
        showError("Route non trouvée. Redémarrez le serveur backend.");
      } else {
        showError(msg || "Erreur lors de la suppression des notifications.");
      }
    }
  };

  return {
    notifications,
    setNotifications,
    addNotification,
    markNotificationsAsRead,
    markNotificationAsRead,
    deleteAllNotifications,
  };
};