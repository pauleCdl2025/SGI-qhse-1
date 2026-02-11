import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/Icon";
import { IncidentType, IncidentPriority, IncidentService, UserRole, Users } from '@/types';
import { showError } from '@/utils/toast';

interface CreateTicketDialogProps {
  onCreateTicket: (ticket: {
    type: IncidentType;
    description: string;
    lieu: string;
    service: IncidentService;
    assignedTo: string;
    assigneeName?: string;
    priority: IncidentPriority;
    deadline: Date;
  }) => void;
  users: Users;
  currentUserRole?: UserRole; // Rôle de l'utilisateur qui crée le ticket
}

const getServiceFromRole = (role: UserRole): IncidentService | null => {
  switch (role) {
    case 'technicien':
      return 'technique';
    case 'technicien_polyvalent':
      return 'technique';
    case 'agent_entretien':
      return 'entretien';
    case 'agent_securite':
      return 'securite';
    default:
      return null;
  }
};

export const CreateTicketDialog = ({ onCreateTicket, users, currentUserRole }: CreateTicketDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<IncidentType>('autre');
  const [description, setDescription] = useState('');
  const [lieu, setLieu] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<IncidentPriority>('moyenne');
  const [deadlineHours, setDeadlineHours] = useState('24');
  const [maintenanceAssignee, setMaintenanceAssignee] = useState<string>('');

  // Rôles autorisés pour l'assignation directe
  // Le Superviseur QHSE et l'assistante QHSE ne peuvent plus assigner aux agents d'entretien
  // mais ils peuvent aussi assigner aux agents de sécurité
  const allowedRoles: UserRole[] = useMemo(() => {
    const baseRoles: UserRole[] = ['technicien', 'technicien_polyvalent', 'agent_entretien', 'agent_securite'];
    if (currentUserRole === 'superviseur_qhse' || currentUserRole === 'assistante_qhse') {
      // Exclure les agents d'entretien pour le Superviseur QHSE et l'assistante QHSE
      return baseRoles.filter(role => role !== 'agent_entretien');
    }
    return baseRoles;
  }, [currentUserRole]);

  const customUserDisplayNames: Record<string, string> = {
    technicien_polyvalent: 'Joachim',
    technicien: 'Teddy',
  };

  const availableUsers = useMemo(() => {
    return Object.entries(users)
      .filter(([, user]) => allowedRoles.includes(user.role))
      .map(([username, user]) => ({
        key: username,
        id: user.id,
        role: user.role,
        displayName: customUserDisplayNames[user.username] ||
          [user.first_name, user.last_name].filter(Boolean).join(' ') ||
          user.name ||
          user.username
      }));
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!selectedRole) return [];
    return availableUsers.filter(user => user.role === selectedRole);
  }, [availableUsers, selectedRole]);

  const selectedUser = useMemo(() => {
    return filteredUsers.find(u => u.id === assignedTo);
  }, [assignedTo, filteredUsers]);

  const maintenanceAgents = ['Stone', 'Paul', 'Edouard', 'Marina', 'Anne', 'Prisca', 'Jacque', 'Dorel', 'Christelle'];

  const handleSubmit = () => {
    if (!type || !description || !lieu || !priority || !deadlineHours) {
      showError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (description.trim().length < 10) {
      showError("La description doit contenir au moins 10 caractères.");
      return;
    }

    if (!selectedRole) {
      showError("Veuillez sélectionner un type d'agent.");
      return;
    }

    if (!assignedTo || !selectedUser) {
      showError("Veuillez sélectionner un agent.");
      return;
    }

    const service = getServiceFromRole(selectedRole);
    if (!service) {
      showError("Erreur : service non valide pour ce rôle.");
      return;
    }

    if (selectedUser.role === 'agent_entretien' && !maintenanceAssignee) {
      showError("Veuillez sélectionner le nom de l'agent d'entretien.");
      return;
    }

    const deadline = new Date(Date.now() + parseInt(deadlineHours, 10) * 60 * 60 * 1000);
    const assigneeName = selectedRole === 'agent_entretien' 
      ? maintenanceAssignee 
      : selectedUser.displayName;

    onCreateTicket({
      type,
      description,
      lieu,
      service,
      assignedTo,
      assigneeName,
      priority,
      deadline
    });

    // Reset form
    setType('autre');
    setDescription('');
    setLieu('');
    setSelectedRole('');
    setAssignedTo('');
    setPriority('moyenne');
    setDeadlineHours('24');
    setMaintenanceAssignee('');
    setIsOpen(false);
  };

  const roleLabels: Partial<Record<UserRole, string>> = {
    technicien: 'Technicien Biomédical',
    technicien_polyvalent: 'Technicien Polyvalent',
    agent_entretien: 'Agent d\'Entretien',
    agent_securite: 'Agent de Sécurité',
  };

  const getRoleLabel = (role: UserRole) => roleLabels[role] || role;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
          <Icon name="Plus" className="mr-2 h-4 w-4" /> Créer un Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Icon name="Ticket" className="mr-2 h-5 w-5" />
            Créer un Ticket Directement
          </DialogTitle>
          <DialogDescription>
            Créez un ticket et assignez-le directement à un technicien biomédical, technicien polyvalent ou agent de sécurité.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Type d'incident *</Label>
            <Select onValueChange={(v) => setType(v as IncidentType)} value={type}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {/* Incidents pour technicien biomédical */}
                <SelectItem value="equipement-medical">Équipement Médical</SelectItem>
                <SelectItem value="maintenance-preventive">Maintenance Préventive</SelectItem>
                {/* Incidents techniques pour technicien polyvalent */}
                <SelectItem value="technique">Technique</SelectItem>
                <SelectItem value="electrique">Électrique</SelectItem>
                <SelectItem value="plomberie">Plomberie</SelectItem>
                <SelectItem value="climatisation">Climatisation</SelectItem>
                <SelectItem value="informatique">Informatique</SelectItem>
                <SelectItem value="materiel">Matériel</SelectItem>
                {/* Incidents de sécurité pour agent de sécurité */}
                <SelectItem value="vol">Vol / Disparition</SelectItem>
                <SelectItem value="agression">Agression</SelectItem>
                <SelectItem value="intrusion">Intrusion</SelectItem>
                {/* Fallback générique */}
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le problème ou la tâche à effectuer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lieu">Lieu *</Label>
            <Input
              id="lieu"
              placeholder="Ex: Bâtiment A, Étage 2, Bureau 205"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Type d'agent *</Label>
            <Select
              value={selectedRole || ''}
              onValueChange={(value) => {
                setSelectedRole(value as UserRole);
                setAssignedTo('');
                setMaintenanceAssignee('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir le type d'agent" />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assignedTo">Agent *</Label>
            <Select
              onValueChange={setAssignedTo}
              value={assignedTo}
              disabled={!selectedRole}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedRole ? "Sélectionner un agent" : "Choisir le type d'agent d'abord"} />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <SelectItem key={user.key} value={user.id}>
                      {user.displayName}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {selectedRole ? "Aucun agent disponible pour ce rôle." : "Sélectionnez un type d'agent."}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedRole === 'agent_entretien' && (
            <div className="grid gap-2">
              <Label htmlFor="maintenanceAgent">Nom de l'agent d'entretien *</Label>
              <Select onValueChange={setMaintenanceAssignee} value={maintenanceAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le nom de l'agent" />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceAgents.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="priority">Priorité *</Label>
            <Select onValueChange={(v) => setPriority(v as IncidentPriority)} value={priority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faible">🟢 Faible</SelectItem>
                <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
                <SelectItem value="haute">🟠 Haute</SelectItem>
                <SelectItem value="critique">🔴 Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="deadline">Délai (heures) *</Label>
            <Input
              id="deadline"
              type="number"
              min="1"
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(e.target.value)}
              placeholder="24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            <Icon name="Check" className="mr-2 h-4 w-4" /> Créer et Assigner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

