import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/Icon";
import { Incident, IncidentPriority, IncidentService, UserRole, Users } from '@/types';
import { showError } from '@/utils/toast';

interface AssignTicketDialogProps {
  incident: Incident;
  allIncidents: Incident[]; // Liste complète des incidents pour calculer le numéro séquentiel
  isOpen: boolean;
  onClose: () => void;
  onAssign: (incidentId: string, assignedTo: string, priority: IncidentPriority, deadline: Date, assigneeName?: string, prestataire?: string) => void;
  users: Users; // Pass users prop
  currentUserRole?: UserRole; // Rôle de l'utilisateur qui assigne
}

// Fonction pour obtenir le préfixe du service
const getServicePrefix = (service: IncidentService): string => {
  switch (service) {
    case 'securite':
      return 'secu';
    case 'entretien':
      return 'ent';
    case 'biomedical':
      return 'bio';
    case 'technique':
      return 'tech';
    default:
      return 'inc';
  }
};

// Fonction pour formater le numéro de ticket de manière séquentielle
const formatTicketNumber = (incident: Incident, allIncidents: Incident[] = []): string => {
  if (!allIncidents || allIncidents.length === 0) {
    // Fallback si allIncidents n'est pas disponible
    const cleanId = incident.id.replace(/-/g, '').toUpperCase();
    return `${getServicePrefix(incident.service)}-${cleanId.slice(-6)}`;
  }
  
  const prefix = getServicePrefix(incident.service);
  // Trier tous les incidents du même service par date de création
  const serviceIncidents = allIncidents
    .filter(i => i.service === incident.service)
    .sort((a, b) => {
      const dateA = typeof a.date_creation === 'string' ? new Date(a.date_creation) : a.date_creation;
      const dateB = typeof b.date_creation === 'string' ? new Date(b.date_creation) : b.date_creation;
      return dateA.getTime() - dateB.getTime();
    });
  
  // Trouver l'index de l'incident actuel + 1 (pour commencer à 1)
  const index = serviceIncidents.findIndex(i => i.id === incident.id) + 1;
  
  return `${prefix}-${index}`;
};

export const AssignTicketDialog = ({ incident, allIncidents, isOpen, onClose, onAssign, users, currentUserRole }: AssignTicketDialogProps) => {
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<IncidentPriority>(incident.priorite);
  const [deadlineHours, setDeadlineHours] = useState('24');
  const [maintenanceAssignee, setMaintenanceAssignee] = useState<string>('');
  const [prestataire, setPrestataire] = useState<string>('');

  const formatUserName = (userId: string) => {
    const entry = Object.values(users).find(user => user.id === userId);
    if (!entry) return 'Agent inconnu';
    const parts = [entry.first_name, entry.last_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    if (entry.name) return entry.name;
    return entry.username;
  };

  const maintenanceAgents = ['Stone', 'Paul', 'Edouard', 'Marina', 'Anne', 'Prisca', 'Jacque', 'Dorel', 'Christelle'];

  const agents = useMemo(() => {
    // Le Superviseur QHSE et l'assistante QHSE peuvent assigner uniquement aux agents de sécurité
    // Ils ne peuvent plus assigner aux agents d'entretien
    if (currentUserRole === 'superviseur_qhse' || currentUserRole === 'assistante_qhse') {
      if (incident.service === 'securite') {
        // Pour les tickets de sécurité : montrer les agents de sécurité
        return Object.entries(users)
          .filter(([, user]) => user.role === 'agent_securite')
          .map(([username, user]) => ({
            key: username,
            id: user.id,
            displayName: formatUserName(user.id),
            role: user.role
          }));
      } else if (incident.service === 'entretien') {
        // Pour les tickets d'entretien : ne pas permettre l'assignation (liste vide)
        return [];
      } else if (incident.service === 'technique') {
        // Pour les tickets techniques : montrer les techniciens polyvalents
        return Object.entries(users)
          .filter(([, user]) => user.role === 'technicien_polyvalent' || user.role === 'technicien')
          .map(([username, user]) => ({
            key: username,
            id: user.id,
            displayName: formatUserName(user.id),
            role: user.role
          }));
      }
    }
    
    // Pour les autres rôles, logique normale
    const roleMap: Record<Incident['service'], UserRole> = {
      'securite': 'agent_securite',
      'entretien': 'agent_entretien',
      'technique': 'technicien_polyvalent' // Modifié pour inclure technicien_polyvalent
    };
    const targetRole = roleMap[incident.service];
    return Object.entries(users)
      .filter(([, user]) => user.role === targetRole || (targetRole === 'technicien_polyvalent' && user.role === 'technicien'))
      .map(([username, user]) => ({
        key: username,
        id: user.id,
        displayName: formatUserName(user.id),
        role: user.role
      }));
  }, [incident.service, users, currentUserRole]);

  const isTechnicienPolyvalent = useMemo(() => {
    const assignedUser = Object.values(users).find(user => user.id === assignedTo);
    return assignedUser?.role === 'technicien_polyvalent';
  }, [assignedTo, users]);

  useEffect(() => {
    setAssignedTo('');
    setPriority(incident.priorite);
    setDeadlineHours('24');
    setMaintenanceAssignee('');
    setPrestataire('');
  }, [incident, isOpen]);

  useEffect(() => {
    if (!assignedTo && agents.length === 1) {
      setAssignedTo(agents[0].id);
    }
  }, [agents, assignedTo]);

  const handleSubmit = () => {
    if (!assignedTo || !priority || !deadlineHours) {
      showError("Veuillez remplir tous les champs.");
      return;
    }
    // Le Superviseur QHSE et l'assistante QHSE ne peuvent plus assigner aux agents d'entretien
    if (incident.service === 'entretien' && (currentUserRole === 'superviseur_qhse' || currentUserRole === 'assistante_qhse')) {
      showError("Vous ne pouvez plus assigner des tickets d'entretien.");
      return;
    }
    if (incident.service === 'entretien' && !maintenanceAssignee) {
      showError("Veuillez sélectionner le nom de l'agent d'entretien.");
      return;
    }
    if (isTechnicienPolyvalent && !prestataire.trim()) {
      showError("Veuillez saisir le nom du prestataire qui va intervenir.");
      return;
    }
    const deadline = new Date(Date.now() + parseInt(deadlineHours, 10) * 60 * 60 * 1000);
    
    // Récupérer le nom de l'agent assigné
    const assignedUser = Object.values(users).find(user => user.id === assignedTo);
    const assigneeName = incident.service === 'entretien' 
      ? maintenanceAssignee 
      : assignedUser 
        ? [assignedUser.first_name, assignedUser.last_name].filter(Boolean).join(' ') || assignedUser.name || assignedUser.username
        : undefined;
    
    onAssign(incident.id, assignedTo, priority, deadline, assigneeName, isTechnicienPolyvalent ? prestataire.trim() : undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assigner le Ticket {formatTicketNumber(incident, allIncidents)}</DialogTitle>
          <DialogDescription>
            Assignez ce ticket à un agent et définissez une priorité et un délai.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="agent" className="text-right">Agent</Label>
            <Select onValueChange={setAssignedTo} value={assignedTo}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner un agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(agent => (
                  <SelectItem key={agent.key} value={agent.id}>{agent.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {incident.service === 'entretien' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maintenanceAgent" className="text-right">Nom de l'agent</Label>
              <Select onValueChange={setMaintenanceAssignee} value={maintenanceAssignee}>
                <SelectTrigger className="col-span-3">
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
          {isTechnicienPolyvalent && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="prestataire" className="text-right">
                Prestataire <span className="text-red-500">*</span>
              </Label>
              <Input
                id="prestataire"
                value={prestataire}
                onChange={(e) => setPrestataire(e.target.value)}
                placeholder="Nom du prestataire qui va intervenir"
                className="col-span-3"
                required
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">Priorité</Label>
            <Select onValueChange={(v) => setPriority(v as IncidentPriority)} value={priority}>
              <SelectTrigger className="col-span-3">
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deadline" className="text-right">Délai (heures)</Label>
            <Input id="deadline" type="number" value={deadlineHours} onChange={(e) => setDeadlineHours(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" onClick={handleSubmit}>
            <Icon name="UserCog" className="mr-2 h-4 w-4" /> Assigner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};