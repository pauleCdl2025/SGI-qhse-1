import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/Icon";
import { Incident, IncidentPriority, IncidentStatus, IncidentType, IncidentService, Users, UserRole, User } from "@/types";
import { format } from 'date-fns';
import { CreateTicketDialog } from './CreateTicketDialog';
import { AssignTicketDialog } from './AssignTicketDialog';
import { TicketComments } from './TicketComments';
import { EditPrestataireDialog } from './EditPrestataireDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";

const priorityClasses: Record<IncidentPriority, string> = {
  faible: "bg-green-500",
  moyenne: "bg-yellow-500",
  haute: "bg-orange-600",
  critique: "bg-red-600",
};

const statusClasses: Record<IncidentStatus, string> = {
  nouveau: "bg-blue-500",
  cours: "bg-yellow-500",
  traite: "bg-teal-500",
  resolu: "bg-green-500",
  attente: "bg-gray-500",
};

const roleLabels: Partial<Record<UserRole, string>> = {
  superadmin: 'Super Admin',
  superviseur_qhse: 'Service QHSE',
  secretaire: 'Secrétariat',
  medecin: 'Médecin',
  superviseur_agent_securite: 'Superviseur Sécurité',
  agent_securite: 'Agent Sécurité',
  superviseur_agent_entretien: 'Superviseur Entretien',
  agent_entretien: 'Agent Entretien',
  superviseur_technicien: 'Superviseur Technique',
  technicien: 'Technicien',
  biomedical: 'Service Biomédical',
  dop: 'Direction Opérationnelle',
  buandiere: 'Buanderie',
  technicien_polyvalent: 'Technicien Polyvalent',
};

const assignmentRoleLabels: Partial<Record<UserRole, string>> = {
  technicien: 'Technicien Biomédical',
  technicien_polyvalent: 'Technicien Polyvalent',
  agent_entretien: 'Agent d\'Entretien',
};

const formatUserName = (users: Users, userId?: string) => {
  if (!userId) return 'Non assigné';
  const entry = Object.values(users).find(user => user.id === userId);
  if (!entry) return 'Non assigné';
  const parts = [entry.first_name, entry.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (entry.name) return entry.name;
  return entry.username;
};

const getReporterRole = (incident: Incident, users: Users): UserRole | 'unknown' => {
  const reporter = Object.values(users).find(user => user.id === incident.reported_by);
  return reporter?.role ?? 'unknown';
};

const getReporterLabel = (incident: Incident, users: Users) => {
  const role = getReporterRole(incident, users);
  if (role === 'unknown') {
    return 'Service non renseigné';
  }
  return roleLabels[role] ?? role;
};

type ReporterFilter = UserRole | 'unknown' | 'all';

interface QhseTicketsTableProps {
  incidents: Incident[];
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus) => void;
  onAssignTicket: (incidentId: string, assignedTo: string, priority: IncidentPriority, deadline: Date, assigneeName?: string, prestataire?: string) => void;
  onUnassignTicket: (incidentId: string) => void;
  onUpdatePrestataire?: (incidentId: string, prestataire: string) => Promise<void>;
  onCreateAndAssignTicket?: (ticket: {
    type: IncidentType;
    description: string;
    lieu: string;
    service: IncidentService;
    assignedTo: string;
    assigneeName?: string;
    priority: IncidentPriority;
    deadline: Date;
    prestataire?: string;
  }) => void;
  users: Users;
  currentUserRole?: UserRole; // Ajouter le rôle de l'utilisateur actuel
  currentUserId?: string; // Ajouter l'ID de l'utilisateur actuel
  currentUser?: User; // Ajouter l'utilisateur actuel pour les commentaires
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
declare global {
  interface Window {
    appUsersCache?: Users;
  }
}

const formatTicketNumber = (incident: Incident, allIncidents: Incident[] = [], users: Users): string => {
  const prefix = getServicePrefix(incident.service);

  // Pour les techniciens, ajouter une indication du type d'agent assigné
  let roleSuffix = '';
  if (incident.service === 'technique' && incident.assigned_to) {
    const entry = Object.values(users).find(user => user.id === incident.assigned_to);
    if (entry?.role === 'technicien_polyvalent') {
      roleSuffix = 'TP';
    } else if (entry?.role === 'technicien') {
      roleSuffix = 'TB';
    }
  }

  if (!allIncidents || allIncidents.length === 0) {
    const cleanId = incident.id.replace(/-/g, '').toUpperCase();
    return `${prefix}-${roleSuffix ? roleSuffix + '-' : ''}${cleanId.slice(-6)}`;
  }

  const serviceIncidents = allIncidents
    .filter(i => i.service === incident.service)
    .sort((a, b) => {
      const dateA = typeof a.date_creation === 'string' ? new Date(a.date_creation) : a.date_creation;
      const dateB = typeof b.date_creation === 'string' ? new Date(b.date_creation) : b.date_creation;
      return dateA.getTime() - dateB.getTime();
    });

  const index = serviceIncidents.findIndex(i => i.id === incident.id) + 1;

  return `${prefix}-${roleSuffix ? roleSuffix + '-' : ''}${index}`;
};

export const QhseTicketsTable = ({ incidents, onUpdateStatus, onAssignTicket, onUnassignTicket, onUpdatePrestataire, onCreateAndAssignTicket, users, currentUserRole, currentUserId, currentUser }: QhseTicketsTableProps) => {
  const [filterRequester, setFilterRequester] = useState<ReporterFilter>('all');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<IncidentPriority | 'all'>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [showPrestataireDialog, setShowPrestataireDialog] = useState(false);

  // Le superviseur QHSE et l'assistante QHSE peuvent assigner/désassigner des tickets
  const canAssignTickets = currentUserRole === 'superviseur_qhse' || currentUserRole === 'assistante_qhse' || currentUserRole === 'superadmin';
  
  // Vérifier si l'utilisateur peut modifier le statut d'un ticket (s'il est assigné à ce ticket)
  const canUpdateStatus = (incident: Incident) => {
    if (!currentUserId) return false;
    // Le superviseur QHSE peut toujours modifier le statut
    if (canAssignTickets) return true;
    // L'agent assigné peut modifier le statut de son ticket
    return incident.assigned_to === currentUserId;
  };

  // Utilisation du hook de recherche amélioré
  const { filteredData: searchedIncidents, searchQuery, setSearchQuery } = useFilterAndSearch(
    incidents,
    ['type', 'description', 'lieu', 'id']
  );

  const reporterFilters = useMemo(() => {
    const set = new Set<ReporterFilter>();
    incidents.forEach(incident => {
      set.add(getReporterRole(incident, users));
    });
    return Array.from(set);
  }, [incidents, users]);

  const filteredIncidents = useMemo(() => {
    return searchedIncidents
      .filter(incident => incident.service !== 'biomedical')
      .filter(incident => {
      if (filterRequester !== 'all') {
        const role = getReporterRole(incident, users);
        if (role !== filterRequester) return false;
      }
      if (filterStatus !== 'all' && incident.statut !== filterStatus) return false;
      if (filterPriority !== 'all' && incident.priorite !== filterPriority) return false;
      return true;
    });
  }, [searchedIncidents, filterRequester, filterStatus, filterPriority, users]);

  const handleAssign = (incidentId: string, assignedTo: string, priority: IncidentPriority, deadline: Date, assigneeName?: string, prestataire?: string) => {
    onAssignTicket(incidentId, assignedTo, priority, deadline, assigneeName, prestataire);
    setSelectedIncident(null);
  };

  const getAssignedRoleLabel = (userId?: string) => {
    if (!userId) return 'Non défini';
    const entry = Object.values(users).find(user => user.id === userId);
    if (!entry) return 'Non défini';
    return assignmentRoleLabels[entry.role] || 'Autre';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="Ticket" className="text-blue-600 mr-2" />
          Traitement et Assignation des Tickets
        </CardTitle>
        {canAssignTickets && onCreateAndAssignTicket && (
          <CreateTicketDialog onCreateTicket={onCreateAndAssignTicket} users={users} currentUserRole={currentUserRole} />
        )}
      </CardHeader>
      <CardContent>
        {/* Barre de recherche améliorée */}
        <div className="mb-6">
          <div className="relative mb-4">
            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par type, description, lieu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <Select onValueChange={(v) => setFilterRequester(v as ReporterFilter)} value={filterRequester}>
            <SelectTrigger><SelectValue placeholder="Tous les demandeurs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les demandeurs</SelectItem>
              {reporterFilters.map(role => (
                <SelectItem key={role} value={role}>
                  {role === 'unknown' ? 'Service non renseigné' : (roleLabels[role as UserRole] ?? role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setFilterStatus(v as any)} value={filterStatus}>
            <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="nouveau">Nouveau</SelectItem>
              <SelectItem value="attente">En attente</SelectItem>
              <SelectItem value="cours">En cours</SelectItem>
              <SelectItem value="traite">Traité</SelectItem>
              <SelectItem value="resolu">Résolu</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setFilterPriority(v as any)} value={filterPriority}>
            <SelectTrigger><SelectValue placeholder="Toutes priorités" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
              <SelectItem value="critique">Critique</SelectItem>
              <SelectItem value="haute">Haute</SelectItem>
              <SelectItem value="moyenne">Moyenne</SelectItem>
              <SelectItem value="faible">Faible</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Demandeur</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Prestataire</TableHead>
              <TableHead>Délai</TableHead>
              <TableHead>Type d&apos;agent</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIncidents.length > 0 ? filteredIncidents.map(incident => (
              <TableRow key={incident.id}>
                <TableCell className="font-mono text-sm font-semibold">
                  <Link to={`/incident/${incident.id}`} className="text-blue-600 hover:underline">
                    {formatTicketNumber(incident, incidents, users)}
                  </Link>
                </TableCell>
                <TableCell>{getReporterLabel(incident, users)}</TableCell>
                <TableCell><Badge className={`${priorityClasses[incident.priorite]} hover:${priorityClasses[incident.priorite]}`}>{incident.priorite}</Badge></TableCell>
                <TableCell><Badge className={`${statusClasses[incident.statut]} hover:${statusClasses[incident.statut]}`}>{incident.statut}</Badge></TableCell>
                <TableCell>{incident.assigned_to_name || formatUserName(users, incident.assigned_to)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {incident.prestataire ? (
                      <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                        <Icon name="Building2" className="mr-1 h-3 w-3" />
                        {incident.prestataire}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                    {/* Bouton pour modifier le prestataire (technicien polyvalent uniquement) */}
                    {currentUserRole === 'technicien_polyvalent' && incident.assigned_to === currentUserId && onUpdatePrestataire && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedIncident(incident);
                          setShowPrestataireDialog(true);
                        }}
                        className="h-6 px-2 text-xs"
                        title="Modifier le prestataire"
                      >
                        <Icon name="Edit" className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>{incident.deadline ? format(incident.deadline, 'dd/MM HH:mm') : '-'}</TableCell>
                <TableCell>
                  <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200">
                    {getAssignedRoleLabel(incident.assigned_to)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {/* Bouton pour voir les commentaires (visible pour tous les utilisateurs connectés) */}
                    {currentUser && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIncident(incident);
                          setShowCommentsDialog(true);
                        }}
                        className="transition-transform hover:scale-105"
                      >
                        <Icon name="MessageSquare" className="mr-1 h-4 w-4" />
                        Commentaires
                        {incident.comments && incident.comments.length > 0 && (
                          <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                            {incident.comments.length}
                          </Badge>
                        )}
                      </Button>
                    )}
                    
                    {/* Actions pour superviseur QHSE */}
                    {canAssignTickets && (
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedIncident(incident)} 
                        disabled={
                          incident.statut !== 'nouveau' || 
                          // Le Superviseur QHSE et l'assistante QHSE ne peuvent plus assigner les tickets d'entretien
                          (incident.service === 'entretien' && (currentUserRole === 'superviseur_qhse' || currentUserRole === 'assistante_qhse'))
                        } 
                        className="transition-transform hover:scale-105"
                        title={
                          incident.service === 'entretien' && (currentUserRole === 'superviseur_qhse' || currentUserRole === 'assistante_qhse')
                            ? "Vous ne pouvez plus assigner des tickets d'entretien"
                            : undefined
                        }
                      >
                        <Icon name="UserCog" className="mr-1 h-4 w-4" /> Assigner
                      </Button>
                    )}
                    {canAssignTickets && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={!incident.assigned_to || ['cours', 'traite', 'resolu'].includes(incident.statut)} 
                            className="transition-transform hover:scale-105 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <Icon name="UserX" className="mr-1 h-4 w-4" /> Désassigner
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Désassigner le ticket ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action retirera l'assignation de {incident.assigned_to_name || formatUserName(users, incident.assigned_to)} et remettra le ticket au statut "Nouveau". Voulez-vous continuer ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onUnassignTicket(incident.id)} className="bg-red-600 hover:bg-red-700">
                              Oui, désassigner
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    
                    {/* Actions pour mettre à jour le statut (superviseur QHSE ou agent assigné) */}
                    {canUpdateStatus(incident) && (
                      <>
                        <Button 
                          size="sm" 
                          className="bg-blue-500 hover:bg-blue-600 transition-transform hover:scale-105"
                          onClick={() => onUpdateStatus(incident.id, 'cours')}
                          disabled={incident.statut === 'cours' || incident.statut === 'traite' || incident.statut === 'resolu'}
                        >
                          <Icon name="Play" className="mr-1 h-4 w-4" /> Démarrer
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-teal-500 hover:bg-teal-600 transition-transform hover:scale-105"
                          onClick={() => onUpdateStatus(incident.id, 'traite')}
                          disabled={incident.statut !== 'cours'}
                        >
                          <Icon name="Check" className="mr-1 h-4 w-4" /> Traiter
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => onUpdateStatus(incident.id, 'resolu')} 
                          disabled={incident.statut !== 'traite'} 
                          className="transition-transform hover:scale-105"
                        >
                          <Icon name="CheckCheck" className="mr-1 h-4 w-4" /> Résoudre
                        </Button>
                      </>
                    )}
                    
                    {/* Message si aucune action disponible */}
                    {!canAssignTickets && !canUpdateStatus(incident) && (
                      <span className="text-xs text-gray-400 italic">Aucune action disponible</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Icon name="Ticket" className="mx-auto text-4xl text-gray-300 mb-2" />
                  {searchQuery || filterRequester !== 'all' || filterStatus !== 'all' || filterPriority !== 'all'
                    ? 'Aucun ticket ne correspond à votre recherche.' 
                    : 'Aucun ticket à afficher.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {selectedIncident && (
          <AssignTicketDialog
            incident={selectedIncident}
            allIncidents={incidents}
            isOpen={!!selectedIncident && !showCommentsDialog}
            onClose={() => setSelectedIncident(null)}
            onAssign={handleAssign}
            currentUserRole={currentUserRole}
            users={users}
          />
        )}
        
        {/* Dialog pour les commentaires */}
        {selectedIncident && currentUser && (
          <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Icon name="MessageSquare" className="text-blue-600" />
                  Commentaires - Ticket {formatTicketNumber(selectedIncident, incidents, users)}
                </DialogTitle>
              </DialogHeader>
              <TicketComments
                incident={selectedIncident}
                currentUser={currentUser}
                onCommentAdded={() => {
                  // Rafraîchir les incidents pour mettre à jour les commentaires
                  window.location.reload();
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog pour modifier le prestataire */}
        {selectedIncident && onUpdatePrestataire && (
          <EditPrestataireDialog
            incident={selectedIncident}
            isOpen={showPrestataireDialog}
            onClose={() => {
              setShowPrestataireDialog(false);
              setSelectedIncident(null);
            }}
            onUpdate={onUpdatePrestataire}
          />
        )}
      </CardContent>
    </Card>
  );
};