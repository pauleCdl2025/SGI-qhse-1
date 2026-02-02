import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { User } from '@/types';
import { allPermissions, roleConfig } from '@/lib/data';
import { ScrollArea } from '../ui/scroll-area';
import { showSuccess } from '@/utils/toast';

interface ManagePermissionsDialogProps {
  user: User;
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onSavePermissions: (username: string, permissions: { added: string[], removed: string[] }) => void;
}

export const EditUserPermissionsDialog = ({ user, username, isOpen, onClose, onSavePermissions }: ManagePermissionsDialogProps) => {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const basePermissions = useMemo(() => new Set<string>(roleConfig[user.role].map(p => p.id)), [user.role]);

  useEffect(() => {
    if (user) {
      const effectivePermissions = new Set(basePermissions);
      user.removed_permissions?.forEach(p => effectivePermissions.delete(p));
      user.added_permissions?.forEach(p => effectivePermissions.add(p));
      setSelectedPermissions(effectivePermissions);
    }
  }, [user, basePermissions]);

  const handleTogglePermission = (permissionId: string, checked: boolean) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(permissionId);
      } else {
        newSet.delete(permissionId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    const added = [...selectedPermissions].filter(p => !basePermissions.has(p));
    const removed = [...basePermissions].filter(p => !selectedPermissions.has(p));
    onSavePermissions(username, { added, removed });
    showSuccess("Permissions mises à jour avec succès.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gérer les permissions de {user.first_name} {user.last_name}</DialogTitle>
          <DialogDescription>
            Rôle de base : <span className="font-semibold">{user.role}</span>. Cochez pour ajouter ou retirer des droits.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border p-4">
          <div className="space-y-4">
            {allPermissions.map(permission => (
              <div key={permission.id} className="flex items-center space-x-2">
                <Checkbox
                  id={permission.id}
                  checked={selectedPermissions.has(permission.id)}
                  onCheckedChange={(checked) => handleTogglePermission(permission.id, !!checked)}
                />
                <Label htmlFor={permission.id} className="cursor-pointer">{permission.name}</Label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};