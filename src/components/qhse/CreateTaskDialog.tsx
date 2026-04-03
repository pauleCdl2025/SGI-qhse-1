import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Icon } from '@/components/Icon';
import { PlannedTask, Users, UserRole } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Label } from '../ui/label';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface CreateTaskDialogProps {
  users: Users;
  onAddTask: (task: Omit<PlannedTask, 'id' | 'created_by' | 'status' | 'created_at'>) => void;
}

export const CreateTaskDialog = ({ users, onAddTask }: CreateTaskDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assigneeName, setAssigneeName] = useState('');

  const preferredPrestataires = [
    {
      key: 'teddy',
      displayName: 'Teddy',
      displayRole: 'Technicien Biomédical',
      matchRoles: ['technicien', 'biomedical'] as UserRole[],
    },
    {
      key: 'ben',
      displayName: 'Ben',
      displayRole: 'Admin Réseau',
      matchRoles: ['administrateur_reseau'] as UserRole[],
    },
    {
      key: 'joachim',
      displayName: 'Joachim',
      displayRole: 'Technicien Polyvalent',
      matchRoles: ['technicien_polyvalent'] as UserRole[],
    },
  ];

  const prestataireOptions = preferredPrestataires
    .map((preset) => {
      const entry = Object.values(users).find((u) => preset.matchRoles.includes(u.role));
      if (!entry) return null;
      return {
        id: entry.id,
        name: preset.displayName,
        roleLabel: preset.displayRole,
      };
    })
    .filter((v): v is { id: string; name: string; roleLabel: string } => Boolean(v));

  const formatUserName = (user: Users[string]) => {
    const parts = [user.first_name, user.last_name].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    if (user.name) {
      return user.name;
    }
    return user.username;
  };

  const handleAssignedChange = (value: string) => {
    setAssignedTo(value);
    const selectedPrestataire = prestataireOptions.find((p) => p.id === value);
    setAssigneeName(selectedPrestataire?.name || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !assignedTo || !dueDate) {
      showError("Veuillez remplir tous les champs.");
      return;
    }

    if (!assigneeName) {
      showError("Veuillez sélectionner un prestataire.");
      return;
    }

    onAddTask({
      title,
      description,
      assigned_to: assignedTo,
      assignee_name: assigneeName || undefined,
      due_date: dueDate
    });
    setIsOpen(false);
    // Reset form
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setAssigneeName('');
    setDueDate(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button><Icon name="Plus" className="mr-2 h-4 w-4" /> Planifier une tâche</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle Tâche Planifiée</DialogTitle>
          <DialogDescription>
            Renseignez les informations de la tâche à assigner. Tous les champs sont obligatoires.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titre de la tâche</Label>
            <Input placeholder="Ex: Ronde de sécurité" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea placeholder="Décrivez la tâche en détail..." value={description} onChange={e => setDescription(e.target.value)} required />
          </div>
          <div>
            <Label>Assigner à</Label>
            <Select onValueChange={handleAssignedChange} value={assignedTo} required>
              <SelectTrigger><SelectValue placeholder="Sélectionner un prestataire" /></SelectTrigger>
              <SelectContent>
                {prestataireOptions.map((prestataire) => (
                  <SelectItem key={prestataire.id} value={prestataire.id}>
                    {prestataire.name} - {prestataire.roleLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date d'échéance</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                  <Icon name="Calendar" className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP', { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
            </Popover>
          </div>
          <Button type="submit" className="w-full">Créer la tâche</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};