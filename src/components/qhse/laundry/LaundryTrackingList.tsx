import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";
import { LoadingSpinner } from "@/components/shared/Loading";
import { Checkbox } from "@/components/ui/checkbox";
import { User, UserRole } from "@/types";
import { canManageLaundry } from "@/lib/permissions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, string> = {
  en_reception: "En réception",
  en_lavage: "En lavage",
  en_sechage: "En séchage",
  en_pliage: "En pliage",
  en_stockage: "En stockage",
  en_distribution: "En distribution",
  termine: "Terminé",
  non_conforme: "Non conforme",
};

const statusColors: Record<string, string> = {
  en_reception: "bg-blue-100 text-blue-700",
  en_lavage: "bg-cyan-100 text-cyan-700",
  en_sechage: "bg-yellow-100 text-yellow-700",
  en_pliage: "bg-teal-100 text-teal-700",
  en_stockage: "bg-gray-100 text-gray-700",
  en_distribution: "bg-green-100 text-green-700",
  termine: "bg-green-100 text-green-700",
  non_conforme: "bg-red-100 text-red-700",
};

const typeLingeOptions = [
  { value: 'draps', label: 'Draps' },
  { value: 'coussins', label: 'Coussins' },
  { value: 'blouses', label: 'Blouses' },
  { value: 'gants', label: 'Gants' },
  { value: 'masques', label: 'Masques' },
  { value: 'autoclave', label: 'Autoclave' },
  { value: 'autre', label: 'Autre' },
];

const typeSechageOptions = [
  { value: 'seche_linge', label: 'Sèche-linge' },
  { value: 'naturel', label: 'Naturel' },
  { value: 'autre', label: 'Autre' },
];

interface LaundryTrackingListProps {
  currentUser?: User;
}

export const LaundryTrackingList = ({ currentUser }: LaundryTrackingListProps) => {
  const [trackings, setTrackings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedTracking, setSelectedTracking] = useState<any | null>(null);
  
  // Vérifier si l'utilisateur peut modifier (seulement la buandière)
  const canModify = currentUser ? canManageLaundry(currentUser.role) : false;

  const { filteredData: filteredTrackings, searchQuery, setSearchQuery } = useFilterAndSearch(
    trackings,
    ['service_emetteur', 'service_origine', 'type_linge', 'status']
  );

  useEffect(() => {
    fetchTrackings();
  }, []);

  const fetchTrackings = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setTrackings([]);
        return;
      }

      const { data, error } = await supabase
        .from('laundry_tracking')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTrackings(data || []);
    } catch (error: any) {
      console.error("Error fetching laundry tracking:", error);
      showError("Erreur lors du chargement des suivis de linge.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTracking = async (formData: any) => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showError("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const { error } = await supabase.from('laundry_tracking').insert([
        {
          ...formData,
          created_by: user.id,
        },
      ]);

      if (error) {
        throw error;
      }

      showSuccess("Suivi de linge créé avec succès");
      setIsDialogOpen(false);
      fetchTrackings();
    } catch (error: any) {
      showError(error.message || "Erreur lors de la création du suivi");
    }
  };

  const handleUpdateTracking = async (id: string, formData: any) => {
    try {
      const { error } = await supabase
        .from('laundry_tracking')
        .update(formData)
        .eq('id', id);

      if (error) {
        throw error;
      }

      showSuccess("Suivi de linge mis à jour avec succès");
      setIsDialogOpen(false);
      setSelectedTracking(null);
      fetchTrackings();
    } catch (error: any) {
      showError(error.message || "Erreur lors de la mise à jour");
    }
  };

  const handleEdit = (tracking: any) => {
    setSelectedTracking(tracking);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('laundry_tracking').delete().eq('id', id);

      if (error) {
        throw error;
      }

      showSuccess("Suivi de linge supprimé avec succès");
      fetchTrackings();
    } catch (error: any) {
      showError(error.message || "Erreur lors de la suppression");
    }
  };

  const handleViewDetails = (tracking: any) => {
    setSelectedTracking(tracking);
    setIsDetailsDialogOpen(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <CardTitle className="flex items-center">
            <Icon name="Shirt" className="text-cyan-600 mr-2" />
            Suivi et Traçabilité du Linge à la Buanderie
          </CardTitle>
          {!canModify && (
            <p className="text-sm text-muted-foreground mt-1">
              Mode consultation uniquement - Accès en lecture seule
            </p>
          )}
        </div>
        {canModify && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 hover:from-cyan-700 hover:via-blue-700 hover:to-teal-700">
                <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouveau Suivi
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedTracking ? 'Modifier le suivi de linge' : 'Nouveau suivi de linge'}
              </DialogTitle>
              <DialogDescription>
                Formulaire de suivi et de traçabilité du linge à la buanderie
              </DialogDescription>
            </DialogHeader>
            <LaundryTrackingForm
              tracking={selectedTracking}
              onSubmit={selectedTracking ? 
                (data) => handleUpdateTracking(selectedTracking.id, data) : 
                handleCreateTracking
              }
              onCancel={() => {
                setIsDialogOpen(false);
                setSelectedTracking(null);
              }}
            />
          </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      
      {/* Dialog de détails en lecture seule */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Icon name="Eye" className="mr-2 h-5 w-5" />
              Détails du Suivi de Linge
            </DialogTitle>
            <DialogDescription>
              Consultation des informations complètes du suivi de linge
            </DialogDescription>
          </DialogHeader>
          {selectedTracking && (
            <div className="space-y-6 mt-4">
              <Tabs defaultValue="reception" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="reception">1. Réception</TabsTrigger>
                  <TabsTrigger value="lavage">2. Lavage</TabsTrigger>
                  <TabsTrigger value="sechage">3. Séchage</TabsTrigger>
                  <TabsTrigger value="distribution">4. Distribution</TabsTrigger>
                </TabsList>

                {/* Section 1: Réception */}
                <TabsContent value="reception" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Service émetteur</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.service_emetteur || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Période concernée</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.periode_concernee || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Date d'établissement</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {selectedTracking.date_etablissement ? format(new Date(selectedTracking.date_etablissement), 'dd/MM/yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Date de réception</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {selectedTracking.date_reception ? format(new Date(selectedTracking.date_reception), 'dd/MM/yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Service d'origine</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.service_origine || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Type de linge</Label>
                      <p className="text-sm text-gray-700 mt-1 capitalize">{selectedTracking.type_linge || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Poids (kg)</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.poids_kg ? `${selectedTracking.poids_kg} kg` : '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Quantité</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.quantite ? `${selectedTracking.quantite} unités` : '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="font-semibold">État du linge</Label>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedTracking.etat_linge || '-'}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Section 2: Lavage */}
                <TabsContent value="lavage" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Date de lavage</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {selectedTracking.date_lavage ? format(new Date(selectedTracking.date_lavage), 'dd/MM/yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Machine utilisée</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.machine_utilisee || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Cycle / Température</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.cycle_temperature || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Produit lessiviel utilisé</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.produit_lessiviel || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Durée du cycle (minutes)</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.duree_cycle ? `${selectedTracking.duree_cycle} min` : '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Agent de lavage</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.agent_lavage || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Contrôle visuel</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {selectedTracking.controle_visuel ? '✅ Conforme' : selectedTracking.controle_visuel === false ? '❌ Non conforme' : '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Label className="font-semibold">Observations</Label>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedTracking.observations_lavage || '-'}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Section 3: Séchage */}
                <TabsContent value="sechage" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Date de séchage</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {selectedTracking.date_sechage ? format(new Date(selectedTracking.date_sechage), 'dd/MM/yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Type de séchage</Label>
                      <p className="text-sm text-gray-700 mt-1 capitalize">
                        {selectedTracking.type_sechage ? selectedTracking.type_sechage.replace('_', ' ') : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Température (°C)</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.temperature_sechage ? `${selectedTracking.temperature_sechage} °C` : '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Durée (minutes)</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.duree_sechage ? `${selectedTracking.duree_sechage} min` : '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Repassage effectué par</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.repassage_effectue_par || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Contrôle qualité</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {selectedTracking.controle_qualite_sechage ? '✅ Conforme' : selectedTracking.controle_qualite_sechage === false ? '❌ Non conforme' : '-'}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Section 4: Distribution */}
                <TabsContent value="distribution" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Date de livraison</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {selectedTracking.date_livraison ? format(new Date(selectedTracking.date_livraison), 'dd/MM/yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-semibold">Service destinataire</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.service_destinataire || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Type / Quantité livrée</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.type_linge_livre || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Quantité livrée</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.quantite_livree ? `${selectedTracking.quantite_livree} unités` : '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">État du linge livré</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.etat_linge_livre || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Heure de livraison</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.heure_livraison || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Agent livreur</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.agent_livreur || '-'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Réceptionnaire (Nom)</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTracking.receptonnaire_nom || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="font-semibold">Statut</Label>
                      <div className="mt-1">
                        <Badge className={statusColors[selectedTracking.status] || 'bg-gray-100 text-gray-700'}>
                          {statusLabels[selectedTracking.status] || selectedTracking.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par service, type de linge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Réception</TableHead>
              <TableHead>Service Origine</TableHead>
              <TableHead>Type Linge</TableHead>
              <TableHead>Poids/Qté</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrackings.length > 0 ? filteredTrackings.map((tracking) => (
              <TableRow key={tracking.id}>
                <TableCell>{tracking.date_reception ? format(new Date(tracking.date_reception), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>{tracking.service_origine || '-'}</TableCell>
                <TableCell>{tracking.type_linge || '-'}</TableCell>
                <TableCell>
                  {tracking.poids_kg ? `${tracking.poids_kg} kg` : tracking.quantite ? `${tracking.quantite} unités` : '-'}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[tracking.status] || 'bg-gray-100 text-gray-700'}>
                    {statusLabels[tracking.status] || tracking.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleViewDetails(tracking)}
                    >
                      <Icon name="Eye" className="mr-1 h-4 w-4" /> Voir les détails
                    </Button>
                    {canModify && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(tracking)}>
                          <Icon name="Edit" className="mr-1 h-4 w-4" /> Modifier
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Icon name="Trash2" className="mr-1 h-4 w-4" /> Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer ce suivi de linge ? Cette action est irréversible.
                                <br />
                                <br />
                                <strong>Service origine :</strong> {tracking.service_origine || '-'}
                                <br />
                                <strong>Type de linge :</strong> {tracking.type_linge || '-'}
                                <br />
                                <strong>Date de réception :</strong> {tracking.date_reception ? format(new Date(tracking.date_reception), 'dd/MM/yyyy') : '-'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(tracking.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Icon name="Shirt" className="mx-auto text-4xl text-gray-300 mb-2" />
                  {searchQuery ? 'Aucun suivi ne correspond à votre recherche.' : 'Aucun suivi de linge enregistré.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const LaundryTrackingForm = ({ tracking, onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState<any>(tracking || {
    service_emetteur: '',
    periode_concernee: '',
    date_etablissement: format(new Date(), 'yyyy-MM-dd'),
    date_reception: format(new Date(), 'yyyy-MM-dd'),
    service_origine: '',
    type_linge: 'draps',
    poids_kg: '',
    quantite: '',
    etat_linge: '',
    status: 'en_reception',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="reception" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reception">1. Réception</TabsTrigger>
          <TabsTrigger value="lavage">2. Lavage</TabsTrigger>
          <TabsTrigger value="sechage">3. Séchage</TabsTrigger>
          <TabsTrigger value="distribution">4. Distribution</TabsTrigger>
        </TabsList>

        {/* Section 1: Réception */}
        <TabsContent value="reception" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Service émetteur *</Label>
              <Input
                value={formData.service_emetteur}
                onChange={(e) => updateField('service_emetteur', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Période concernée</Label>
              <Input
                value={formData.periode_concernee}
                onChange={(e) => updateField('periode_concernee', e.target.value)}
              />
            </div>
            <div>
              <Label>Date d'établissement *</Label>
              <Input
                type="date"
                value={formData.date_etablissement}
                onChange={(e) => updateField('date_etablissement', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Date de réception *</Label>
              <Input
                type="date"
                value={formData.date_reception}
                onChange={(e) => updateField('date_reception', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Service d'origine *</Label>
              <Input
                value={formData.service_origine}
                onChange={(e) => updateField('service_origine', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Type de linge *</Label>
              <Select value={formData.type_linge} onValueChange={(value) => updateField('type_linge', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeLingeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Poids (kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.poids_kg}
                onChange={(e) => updateField('poids_kg', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Quantité</Label>
              <Input
                type="number"
                value={formData.quantite}
                onChange={(e) => updateField('quantite', e.target.value || null)}
              />
            </div>
            <div className="col-span-2">
              <Label>État du linge</Label>
              <Textarea
                value={formData.etat_linge}
                onChange={(e) => updateField('etat_linge', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </TabsContent>

        {/* Section 2: Lavage */}
        <TabsContent value="lavage" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de lavage</Label>
              <Input
                type="date"
                value={formData.date_lavage || ''}
                onChange={(e) => updateField('date_lavage', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Machine utilisée</Label>
              <Input
                value={formData.machine_utilisee || ''}
                onChange={(e) => updateField('machine_utilisee', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Cycle / Température</Label>
              <Input
                value={formData.cycle_temperature || ''}
                onChange={(e) => updateField('cycle_temperature', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Produit lessiviel utilisé</Label>
              <Input
                value={formData.produit_lessiviel || ''}
                onChange={(e) => updateField('produit_lessiviel', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Durée du cycle (minutes)</Label>
              <Input
                type="number"
                value={formData.duree_cycle || ''}
                onChange={(e) => updateField('duree_cycle', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Agent de lavage</Label>
              <Input
                value={formData.agent_lavage || ''}
                onChange={(e) => updateField('agent_lavage', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Contrôle visuel</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  checked={formData.controle_visuel || false}
                  onCheckedChange={(checked) => updateField('controle_visuel', checked)}
                />
                <Label className="font-normal">Conforme</Label>
              </div>
            </div>
            <div className="col-span-2">
              <Label>Observations</Label>
              <Textarea
                value={formData.observations_lavage || ''}
                onChange={(e) => updateField('observations_lavage', e.target.value || null)}
                rows={3}
              />
            </div>
          </div>
        </TabsContent>

        {/* Section 3: Séchage */}
        <TabsContent value="sechage" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de séchage</Label>
              <Input
                type="date"
                value={formData.date_sechage || ''}
                onChange={(e) => updateField('date_sechage', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Type de séchage</Label>
              <Select value={formData.type_sechage || ''} onValueChange={(value) => updateField('type_sechage', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {typeSechageOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Température (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.temperature_sechage || ''}
                onChange={(e) => updateField('temperature_sechage', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Durée (minutes)</Label>
              <Input
                type="number"
                value={formData.duree_sechage || ''}
                onChange={(e) => updateField('duree_sechage', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Repassage effectué par</Label>
              <Input
                value={formData.repassage_effectue_par || ''}
                onChange={(e) => updateField('repassage_effectue_par', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Contrôle qualité</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  checked={formData.controle_qualite_sechage || false}
                  onCheckedChange={(checked) => updateField('controle_qualite_sechage', checked)}
                />
                <Label className="font-normal">Conforme</Label>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Section 4: Distribution */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de livraison</Label>
              <Input
                type="date"
                value={formData.date_livraison || ''}
                onChange={(e) => updateField('date_livraison', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Service destinataire</Label>
              <Input
                value={formData.service_destinataire || ''}
                onChange={(e) => updateField('service_destinataire', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Type / Quantité livrée</Label>
              <Input
                value={formData.type_linge_livre || ''}
                onChange={(e) => updateField('type_linge_livre', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Quantité livrée</Label>
              <Input
                type="number"
                value={formData.quantite_livree || ''}
                onChange={(e) => updateField('quantite_livree', e.target.value || null)}
              />
            </div>
            <div>
              <Label>État du linge livré</Label>
              <Input
                value={formData.etat_linge_livre || ''}
                onChange={(e) => updateField('etat_linge_livre', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Heure de livraison</Label>
              <Input
                type="time"
                value={formData.heure_livraison || ''}
                onChange={(e) => updateField('heure_livraison', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Agent livreur</Label>
              <Input
                value={formData.agent_livreur || ''}
                onChange={(e) => updateField('agent_livreur', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Réceptionnaire (Nom)</Label>
              <Input
                value={formData.receptonnaire_nom || ''}
                onChange={(e) => updateField('receptonnaire_nom', e.target.value || null)}
              />
            </div>
            <div className="col-span-2">
              <Label>Statut</Label>
              <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
          {tracking ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};






