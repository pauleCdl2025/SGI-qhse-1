import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Icon } from "@/components/Icon";
import { Notification } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  userId: string;
  notifications: Notification[];
  onMarkAsRead: (userId: string) => void;
  onMarkNotificationAsRead?: (notificationId: string) => void;
  onDeleteAll?: () => Promise<void>;
  onNotificationClick: (link: string) => void;
}

export const NotificationBell = ({ userId, notifications, onMarkAsRead, onMarkNotificationAsRead, onDeleteAll, onNotificationClick }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const userNotifications = notifications.filter(n => n.recipient_id === userId); // Filter by recipient_id
  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && unreadCount > 0) {
      onMarkAsRead(userId);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marquer la notification comme lue immédiatement si elle ne l'est pas déjà
    if (!notification.read) {
      // Marquer cette notification individuelle comme lue si la fonction est disponible
      if (onMarkNotificationAsRead) {
        onMarkNotificationAsRead(notification.id);
      } else {
        // Sinon, marquer toutes les notifications comme lues (comportement de fallback)
        onMarkAsRead(userId);
      }
    }
    
    // Si la notification a un lien, naviguer vers ce lien
    if (notification.link) {
      console.log('Notification click - navigating to:', notification.link);
      onNotificationClick(notification.link);
      setIsOpen(false); // Close popover on click
    } else {
      // Même sans lien, fermer le popover pour indiquer que la notification a été vue
      console.log('Notification click - no link available');
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Icon name="Bell" className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 font-medium border-b">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {userNotifications.length > 0 ? (
            userNotifications.map(notification => (
              <div 
                key={notification.id} 
                className={cn(
                  "p-4 border-b text-sm transition-colors", 
                  !notification.read && "bg-blue-50 font-semibold",
                  "cursor-pointer hover:bg-blue-100 active:bg-blue-200"
                )}
                onClick={() => handleNotificationClick(notification)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNotificationClick(notification);
                  }
                }}
              >
                <p>{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(notification.created_at, { addSuffix: true, locale: fr })}
                </p>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              <Icon name="Bell" className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              Aucune notification
            </div>
          )}
        </div>
        {userNotifications.length > 0 && (
          <div className="p-2 border-t flex flex-col gap-1">
            {unreadCount > 0 && (
              <Button variant="link" size="sm" className="w-full" onClick={() => onMarkAsRead(userId)}>
                Marquer tout comme lu
              </Button>
            )}
            {onDeleteAll && (
              <Button variant="link" size="sm" className="w-full text-red-600 hover:text-red-700" onClick={() => onDeleteAll()}>
                Supprimer toutes les notifications
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};