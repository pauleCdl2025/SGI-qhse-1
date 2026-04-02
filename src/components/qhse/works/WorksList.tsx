import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { Work, WorkType, WorkStatus, Users } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { format, isBefore, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";
import { LoadingSpinner } from "@/components/shared/Loading";
import { exportToExcel } from "@/utils/excelExport";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { supabase } from "@/integrations/supabase/client";

const workTypeLabels: Record<WorkType, string> = {
  maintenance: "Maintenance",
  reparation: "Réparation",
  renovation: "Rénovation",
  construction: "Construction",
  amelioration: "Amélioration",
  autre: "Autre",
};

const statusLabels: Record<WorkStatus, string> = {
  planifié: "Planifié",
  en_cours: "En cours",
  en_pause: "En pause",
  terminé: "Terminé",
  annulé: "Annulé",
};

const statusColors: Record<WorkStatus, string> = {
  planifié: "bg-blue-100 text-blue-700",
  en_cours: "bg-yellow-100 text-yellow-700",
  en_pause: "bg-orange-100 text-orange-700",
  terminé: "bg-green-100 text-green-700",
  annulé: "bg-red-100 text-red-700",
};

const priorityColors: Record<string, string> = {
  faible: "bg-green-100 text-green-700",
  moyenne: "bg-yellow-100 text-yellow-700",
  haute: "bg-orange-100 text-orange-700",
  critique: "bg-red-100 text-red-700",
};

interface WorksListProps {
  users?: Users;
}

export const WorksList = ({ users }: WorksListProps = {}) => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<WorkType | 'all'>('all');

  const { filteredData: baseFilteredWorks, searchQuery, setSearchQuery } = useFilterAndSearch(
    works,
    ['title', 'description', 'location']
  );

  // Filtres supplémentaires par statut et type
  const filteredWorks = useMemo(() => {
    return baseFilteredWorks.filter(work => {
      if (statusFilter !== 'all' && work.status !== statusFilter) return false;
      if (typeFilter !== 'all' && work.work_type !== typeFilter) return false;
      return true;
    });
  }, [baseFilteredWorks, statusFilter, typeFilter]);

  // Statistiques
  const stats = useMemo(() => {
    const total = works.length;
    const planifie = works.filter(w => w.status === 'planifié').length;
    const enCours = works.filter(w => w.status === 'en_cours').length;
    const termine = works.filter(w => w.status === 'terminé').length;
    const enPause = works.filter(w => w.status === 'en_pause').length;
    
    const today = new Date();
    const enRetard = works.filter(w => 
      w.status === 'planifié' && 
      w.planned_start_date && 
      isBefore(w.planned_start_date, today)
    ).length;
    
    const totalEstimatedCost = works.reduce((sum, w) => sum + (w.estimated_cost || 0), 0);
    const totalActualCost = works.reduce((sum, w) => sum + (w.actual_cost || 0), 0);
    
    return {
      total,
      planifie,
      enCours,
      termine,
      enPause,
      enRetard,
      totalEstimatedCost,
      totalActualCost,
    };
  }, [works]);

  useEffect(() => {
    fetchWorks();
  }, []);

  const fetchWorks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setWorks(data.map((work: any) => ({
        ...work,
        planned_start_date: work.planned_start_date ? new Date(work.planned_start_date) : undefined,
        planned_end_date: work.planned_end_date ? new Date(work.planned_end_date) : undefined,
        actual_start_date: work.actual_start_date ? new Date(work.actual_start_date) : undefined,
        actual_end_date: work.actual_end_date ? new Date(work.actual_end_date) : undefined,
        created_at: new Date(work.created_at),
        updated_at: new Date(work.updated_at),
        photo_urls: work.photo_urls ? (typeof work.photo_urls === 'string' ? JSON.parse(work.photo_urls) : work.photo_urls) : [],
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement des travaux: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWork = async (workData: any) => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Utilisateur non authentifié");

      const newId =
        typeof globalThis.crypto !== "undefined" &&
        "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const { id: _ignoredId, created_by: _ignoredCreatedBy, ...rest } =
        workData ?? {};

      // Optionnel: renseigner assigned_to_name si on peut résoudre l'utilisateur sélectionné
      let assigned_to_name: string | null = null;
      if (rest?.assigned_to && users) {
        const assignedUser = Object.values(users).find((u: any) => u.id === rest.assigned_to);
        if (assignedUser) {
          assigned_to_name =
            `${assignedUser.civility || ""} ${assignedUser.first_name || ""} ${assignedUser.last_name || ""}`
              .trim() ||
            assignedUser.name ||
            assignedUser.username ||
            null;
        }
      }

      const payload = {
        ...rest,
        id: newId,
        created_by: user.id,
        assigned_to_name,
      };

      const { error } = await supabase.from('works').insert([payload]);

      if (error) {
        throw error;
      }

      showSuccess("Travail créé avec succès");
      setIsDialogOpen(false);
      fetchWorks();
    } catch (error: any) {
      showError("Erreur lors de la création: " + error.message);
    }
  };

  const handleUpdateWork = async (id: string, workData: any) => {
    try {
      const { error } = await supabase
        .from('works')
        .update(workData)
        .eq('id', id);

      if (error) {
        throw error;
      }

      showSuccess("Travail mis à jour avec succès");
      setIsDetailsDialogOpen(false);
      setSelectedWork(null);
      fetchWorks();
    } catch (error: any) {
      showError("Erreur lors de la mise à jour: " + error.message);
    }
  };

  const handleDeleteWork = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce travail ?")) return;
    try {
      const { error } = await supabase.from('works').delete().eq('id', id);

      if (error) {
        throw error;
      }

      showSuccess("Travail supprimé");
      fetchWorks();
    } catch (error: any) {
      showError("Erreur lors de la suppression: " + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="Wrench" className="text-cyan-600 mr-2" />
          Gestion des Travaux
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              exportToExcel(
                filteredWorks,
                [
                  { key: 'title', label: 'Titre' },
                  { key: 'work_type', label: 'Type' },
                  { key: 'status', label: 'Statut' },
                  { key: 'location', label: 'Localisation' },
                  { key: 'planned_start_date', label: 'Date début prévue' },
                  { key: 'assigned_to_name', label: 'Assigné à' },
                  { key: 'estimated_cost', label: 'Coût estimé' },
                ],
                'works',
                'Travaux'
              );
              showSuccess('Export Excel réussi !');
            }}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <Icon name="Download" className="mr-2 h-4 w-4" />
            Exporter Excel
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
                <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouveau Travail
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un nouveau travail</DialogTitle>
              </DialogHeader>
              <WorkForm onSubmit={handleCreateWork} onCancel={() => setIsDialogOpen(false)} users={users} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <DashboardCard
            title="Total Travaux"
            value={stats.total}
            iconName="Wrench"
            colorClass="bg-blue-100 text-blue-600"
          />
          <DashboardCard
            title="Planifiés"
            value={stats.planifie}
            iconName="Calendar"
            colorClass="bg-cyan-100 text-cyan-600"
          />
          <DashboardCard
            title="En Cours"
            value={stats.enCours}
            iconName="Clock"
            colorClass="bg-yellow-100 text-yellow-600"
          />
          <DashboardCard
            title="Terminés"
            value={stats.termine}
            iconName="CheckCircle2"
            colorClass="bg-green-100 text-green-600"
          />
          <DashboardCard
            title="En Pause"
            value={stats.enPause}
            iconName="Pause"
            colorClass="bg-orange-100 text-orange-600"
          />
          <DashboardCard
            title="En Retard"
            value={stats.enRetard}
            iconName="AlertTriangle"
            colorClass="bg-red-100 text-red-600"
          />
        </div>

        {/* Statistiques financières */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">Coût Estimé Total</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {stats.totalEstimatedCost.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })}
                  </p>
                </div>
                <Icon name="DollarSign" className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">Coût Réel Total</p>
                  <p className="text-2xl font-bold text-green-800">
                    {stats.totalActualCost.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })}
                  </p>
                </div>
                <Icon name="TrendingUp" className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par titre, description, localisation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WorkStatus | 'all')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as WorkType | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(workTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs"
                >
                  <Icon name="X" className="h-4 w-4 mr-1" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
          {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Icon name="Filter" className="h-4 w-4" />
              <span>
                {filteredWorks.length} travail{filteredWorks.length > 1 ? 'aux' : ''} trouvé{filteredWorks.length > 1 ? 's' : ''} 
                {filteredWorks.length !== works.length && ` sur ${works.length} total`}
              </span>
            </div>
          )}
        </div>

        {/* Tableau */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Titre</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Localisation</TableHead>
                <TableHead className="font-semibold">Priorité</TableHead>
                <TableHead className="font-semibold">Date Début</TableHead>
                <TableHead className="font-semibold">Assigné à</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorks.length > 0 ? filteredWorks.map((work) => {
                const isOverdue = work.status === 'planifié' && work.planned_start_date && isBefore(work.planned_start_date, new Date());
                
                return (
                  <TableRow 
                    key={work.id} 
                    className={isOverdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isOverdue && <Icon name="AlertTriangle" className="h-4 w-4 text-red-600" />}
                        {work.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {workTypeLabels[work.work_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{work.location || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[work.priority] || 'bg-gray-100 text-gray-700'}>
                        {work.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {work.planned_start_date ? (
                        <span className="text-sm">{format(work.planned_start_date, 'dd/MM/yyyy')}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{work.assigned_to_name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[work.status]}>
                        {statusLabels[work.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedWork(work);
                            setIsDetailsDialogOpen(true);
                          }}
                          title="Voir les détails"
                        >
                          <Icon name="Eye" className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Icon name="Wrench" className="mx-auto text-5xl text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">
                      {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                        ? 'Aucun travail ne correspond aux filtres sélectionnés.' 
                        : 'Aucun travail enregistré.'}
                    </p>
                    {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                          setTypeFilter('all');
                        }}
                        className="mt-4"
                      >
                        <Icon name="X" className="h-4 w-4 mr-1" />
                        Réinitialiser les filtres
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog de détails */}
      {selectedWork && (
        <WorkDetailsDialog
          work={selectedWork}
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false);
            setSelectedWork(null);
          }}
          onUpdate={handleUpdateWork}
          onDelete={handleDeleteWork}
          users={users}
        />
      )}
    </Card>
  );
};

// Formulaire de création/édition
const WorkForm = ({ 
  onSubmit, 
  onCancel, 
  initialData,
  users 
}: { 
  onSubmit: (data: any) => void; 
  onCancel: () => void;
  initialData?: Work;
  users?: Users;
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [workType, setWorkType] = useState<WorkType>(initialData?.work_type || 'maintenance');
  const [location, setLocation] = useState(initialData?.location || '');
  const [priority, setPriority] = useState<'faible' | 'moyenne' | 'haute' | 'critique'>(initialData?.priority || 'moyenne');
  const [status, setStatus] = useState<WorkStatus>(initialData?.status || 'planifié');
  const [assignedTo, setAssignedTo] = useState(initialData?.assigned_to || '');
  const [plannedStartDate, setPlannedStartDate] = useState(
    initialData?.planned_start_date ? format(initialData.planned_start_date, 'yyyy-MM-dd') : ''
  );
  const [plannedEndDate, setPlannedEndDate] = useState(
    initialData?.planned_end_date ? format(initialData.planned_end_date, 'yyyy-MM-dd') : ''
  );
  const [estimatedCost, setEstimatedCost] = useState(initialData?.estimated_cost?.toString() || '');
  const [supplierName, setSupplierName] = useState(initialData?.supplier_name || '');
  const [supplierContact, setSupplierContact] = useState(initialData?.supplier_contact || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const getRoleLabel = (role: string): string => {
    const roleLabels: Record<string, string> = {
      'assistante_qhse': 'Assistante QHSE',
      'technicien': 'Technicien Biomédical',
      'technicien_polyvalent': 'Technicien Polyvalent',
      'biomedical': 'Technicien Biomédical',
      'superviseur_technicien': 'Superviseur Technique',
    };
    return roleLabels[role] || role;
  };

  const availableUsers = users ? Object.values(users).filter(u => {
    const assignableRoles = [
      'assistante_qhse',
      'technicien',
      'technicien_polyvalent',
      'biomedical',
      'superviseur_technicien',
    ];
    return assignableRoles.includes(u.role);
  }) : [];

  const sortedUsers = [...availableUsers].sort((a, b) => {
    const roleOrder: Record<string, number> = {
      'assistante_qhse': 1,
      'technicien': 2,
      'technicien_polyvalent': 3,
      'biomedical': 4,
      'superviseur_technicien': 5,
    };
    return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      work_type: workType,
      location: location || null,
      priority,
      status,
      assigned_to: assignedTo && assignedTo !== 'none' ? assignedTo : null,
      planned_start_date: plannedStartDate || null,
      planned_end_date: plannedEndDate || null,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      supplier_name: supplierName || null,
      supplier_contact: supplierContact || null,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Titre *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label>Description *</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type de travail *</Label>
          <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(workTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priorité *</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="faible">🟢 Faible</SelectItem>
              <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
              <SelectItem value="haute">🟠 Haute</SelectItem>
              <SelectItem value="critique">🔴 Critique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Localisation</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Bâtiment A, 2ème étage" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date de début prévue</Label>
          <Input type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} />
        </div>
        <div>
          <Label>Date de fin prévue</Label>
          <Input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Assigné à</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un utilisateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Non assigné</SelectItem>
              {sortedUsers.map((user) => {
                const roleLabel = getRoleLabel(user.role);
                const userName = `${user.civility || ''} ${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || user.username;
                return (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{userName}</span>
                      <span className="text-xs text-gray-500">({roleLabel})</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as WorkStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Coût estimé (XAF)</Label>
          <Input 
            type="number" 
            value={estimatedCost} 
            onChange={(e) => setEstimatedCost(e.target.value)} 
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <Label>Fournisseur</Label>
          <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nom du fournisseur" />
        </div>
      </div>
      <div>
        <Label>Contact fournisseur</Label>
        <Input value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} placeholder="Téléphone / Email" />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes supplémentaires..." />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
          {initialData ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

// Dialog de détails
const WorkDetailsDialog = ({
  work,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  users,
}: {
  work: Work;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  users?: Users;
}) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Détails du Travail</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Icon name={isEditing ? "X" : "Edit"} className="h-4 w-4 mr-1" />
                {isEditing ? 'Annuler' : 'Modifier'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  onDelete(work.id);
                  onClose();
                }}
              >
                <Icon name="Trash2" className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        {isEditing ? (
          <WorkForm
            initialData={work}
            onSubmit={(data) => {
              onUpdate(work.id, data);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
            users={users}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Titre</Label>
                <p className="font-semibold">{work.title}</p>
              </div>
              <div>
                <Label className="text-gray-600">Type</Label>
                <Badge variant="outline">{workTypeLabels[work.work_type]}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-gray-600">Description</Label>
              <p className="text-sm whitespace-pre-wrap">{work.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Localisation</Label>
                <p className="text-sm">{work.location || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-600">Priorité</Label>
                <Badge className={priorityColors[work.priority]}>
                  {work.priority}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Statut</Label>
                <Badge className={statusColors[work.status]}>
                  {statusLabels[work.status]}
                </Badge>
              </div>
              <div>
                <Label className="text-gray-600">Assigné à</Label>
                <p className="text-sm">{work.assigned_to_name || 'Non assigné'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Date début prévue</Label>
                <p className="text-sm">{work.planned_start_date ? format(work.planned_start_date, 'dd/MM/yyyy') : '-'}</p>
              </div>
              <div>
                <Label className="text-gray-600">Date fin prévue</Label>
                <p className="text-sm">{work.planned_end_date ? format(work.planned_end_date, 'dd/MM/yyyy') : '-'}</p>
              </div>
            </div>
            {work.actual_start_date && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Date début réelle</Label>
                  <p className="text-sm">{format(work.actual_start_date, 'dd/MM/yyyy')}</p>
                </div>
                {work.actual_end_date && (
                  <div>
                    <Label className="text-gray-600">Date fin réelle</Label>
                    <p className="text-sm">{format(work.actual_end_date, 'dd/MM/yyyy')}</p>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Coût estimé</Label>
                <p className="text-sm font-semibold">
                  {work.estimated_cost ? work.estimated_cost.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' }) : '-'}
                </p>
              </div>
              <div>
                <Label className="text-gray-600">Coût réel</Label>
                <p className="text-sm font-semibold">
                  {work.actual_cost ? work.actual_cost.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' }) : '-'}
                </p>
              </div>
            </div>
            {work.supplier_name && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Fournisseur</Label>
                  <p className="text-sm">{work.supplier_name}</p>
                </div>
                {work.supplier_contact && (
                  <div>
                    <Label className="text-gray-600">Contact</Label>
                    <p className="text-sm">{work.supplier_contact}</p>
                  </div>
                )}
              </div>
            )}
            {work.notes && (
              <div>
                <Label className="text-gray-600">Notes</Label>
                <p className="text-sm whitespace-pre-wrap">{work.notes}</p>
              </div>
            )}
            <div className="pt-4 border-t">
              <Label className="text-gray-600">Créé le</Label>
              <p className="text-sm">{format(work.created_at, 'dd/MM/yyyy à HH:mm')}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
