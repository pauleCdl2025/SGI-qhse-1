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
import { supabase } from "@/integrations/supabase/client";

const statusCycleLabels: Record<string, string> = {
  en_cours: "En cours",
  terminé: "Terminé",
  échoué: "Échoué",
  interrompu: "Interrompu",
};

const statusCycleColors: Record<string, string> = {
  en_cours: "bg-yellow-100 text-yellow-700",
  terminé: "bg-green-100 text-green-700",
  échoué: "bg-red-100 text-red-700",
  interrompu: "bg-orange-100 text-orange-700",
};

const methodeSterilisationOptions = [
  { value: 'vapeur', label: 'Vapeur' },
  { value: 'chaleur_seche', label: 'Chaleur Sèche' },
  { value: 'ethylene_oxyde', label: 'Éthylène Oxyde' },
  { value: 'plasma_hydrogene', label: 'Plasma Hydrogène' },
  { value: 'autre', label: 'Autre' },
];

const resultatTestOptions = [
  { value: 'conforme', label: 'Conforme' },
  { value: 'non_conforme', label: 'Non Conforme' },
  { value: 'en_attente', label: 'En Attente' },
];

export const SterilizationRegisterList = () => {
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<any | null>(null);

  const { filteredData: filteredRegisters, searchQuery, setSearchQuery } = useFilterAndSearch(
    registers,
    ['service_concerne', 'operateur_nom', 'type_materiel', 'numero_cycle', 'status_cycle']
  );

  useEffect(() => {
    fetchRegisters();
  }, []);

  const fetchRegisters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sterilization_register')
        .select('*')
        .order('date_cycle', { ascending: false });

      if (error) {
        throw error;
      }

      setRegisters(data || []);
    } catch (error: any) {
      console.error("Error fetching sterilization register:", error);
      showError("Erreur lors du chargement du registre de stérilisation.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRegister = async (formData: any) => {
    try {
      const { error } = await supabase.from('sterilization_register').insert([formData]);

      if (error) {
        throw error;
      }

      showSuccess("Registre de stérilisation créé avec succès");
      setIsDialogOpen(false);
      fetchRegisters();
    } catch (error: any) {
      showError(error.message || "Erreur lors de la création du registre");
    }
  };

  const handleUpdateRegister = async (id: string, formData: any) => {
    try {
      const { error } = await supabase
        .from('sterilization_register')
        .update(formData)
        .eq('id', id);

      if (error) {
        throw error;
      }

      showSuccess("Registre mis à jour avec succès");
      setIsDialogOpen(false);
      setSelectedRegister(null);
      fetchRegisters();
    } catch (error: any) {
      showError(error.message || "Erreur lors de la mise à jour");
    }
  };

  const handleEdit = (register: any) => {
    setSelectedRegister(register);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="Droplet" className="text-cyan-600 mr-2" />
          Registre de Traçabilité de la Stérilisation
          <span className="ml-2 text-sm text-gray-500">(EN-STE-001-CDL)</span>
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 hover:from-cyan-700 hover:via-blue-700 hover:to-teal-700">
              <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouveau Registre
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedRegister ? 'Modifier le registre' : 'Nouveau registre de stérilisation'}
              </DialogTitle>
              <DialogDescription>
                Registre de Traçabilité de la Stérilisation des Équipements Médicaux
              </DialogDescription>
            </DialogHeader>
            <SterilizationRegisterForm
              register={selectedRegister}
              onSubmit={selectedRegister ? 
                (data) => handleUpdateRegister(selectedRegister.id, data) : 
                handleCreateRegister
              }
              onCancel={() => {
                setIsDialogOpen(false);
                setSelectedRegister(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par service, opérateur, type de matériel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Cycle</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Opérateur</TableHead>
              <TableHead>Type Matériel</TableHead>
              <TableHead>N° Cycle</TableHead>
              <TableHead>Méthode</TableHead>
              <TableHead>Résultat</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRegisters.length > 0 ? filteredRegisters.map((register) => (
              <TableRow key={register.id}>
                <TableCell>{register.date_cycle ? format(new Date(register.date_cycle), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>{register.service_concerne || '-'}</TableCell>
                <TableCell>{register.operateur_nom || '-'}</TableCell>
                <TableCell>{register.type_materiel || '-'}</TableCell>
                <TableCell>{register.numero_cycle || '-'}</TableCell>
                <TableCell>{register.methode_sterilisation || '-'}</TableCell>
                <TableCell>
                  <Badge className={
                    register.resultat_test_controle === 'conforme' ? 'bg-green-100 text-green-700' :
                    register.resultat_test_controle === 'non_conforme' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }>
                    {resultatTestOptions.find(o => o.value === register.resultat_test_controle)?.label || register.resultat_test_controle || '-'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={statusCycleColors[register.status_cycle] || 'bg-gray-100 text-gray-700'}>
                    {statusCycleLabels[register.status_cycle] || register.status_cycle || '-'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(register)}>
                    <Icon name="Edit" className="mr-1 h-4 w-4" /> Modifier
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Icon name="Droplet" className="mx-auto text-4xl text-gray-300 mb-2" />
                  {searchQuery ? 'Aucun registre ne correspond à votre recherche.' : 'Aucun registre de stérilisation enregistré.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const SterilizationRegisterForm = ({ register, onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState<any>(register || {
    code_document: 'EN-STE-001-CDL',
    version: 'AA',
    date_cycle: format(new Date(), 'yyyy-MM-dd'),
    service_concerne: '',
    operateur_nom: '',
    type_materiel: '',
    methode_sterilisation: 'vapeur',
    status_cycle: 'en_cours',
    resultat_test_controle: 'en_attente',
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
      <Tabs defaultValue="info-generale" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="info-generale">1. Infos Générales</TabsTrigger>
          <TabsTrigger value="controle">2. Contrôle Charges</TabsTrigger>
          <TabsTrigger value="liberation">3. Libération</TabsTrigger>
          <TabsTrigger value="maintenance">4. Maintenance</TabsTrigger>
          <TabsTrigger value="non-conformites">5. Non-conformités</TabsTrigger>
          <TabsTrigger value="validation">6. Validation</TabsTrigger>
        </TabsList>

        {/* Section 1: Informations Générales */}
        <TabsContent value="info-generale" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Code Document</Label>
              <Input
                value={formData.code_document || 'EN-STE-001-CDL'}
                onChange={(e) => updateField('code_document', e.target.value)}
                disabled
              />
            </div>
            <div>
              <Label>Version</Label>
              <Input
                value={formData.version || 'AA'}
                onChange={(e) => updateField('version', e.target.value)}
                disabled
              />
            </div>
            <div>
              <Label>Date du cycle *</Label>
              <Input
                type="date"
                value={formData.date_cycle}
                onChange={(e) => updateField('date_cycle', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Service concerné *</Label>
              <Input
                value={formData.service_concerne}
                onChange={(e) => updateField('service_concerne', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Nom de l'opérateur *</Label>
              <Input
                value={formData.operateur_nom}
                onChange={(e) => updateField('operateur_nom', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Type de matériel *</Label>
              <Input
                value={formData.type_materiel}
                onChange={(e) => updateField('type_materiel', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>N° de lot / Code traçabilité</Label>
              <Input
                value={formData.numero_lot || ''}
                onChange={(e) => updateField('numero_lot', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Méthode de stérilisation *</Label>
              <Select value={formData.methode_sterilisation} onValueChange={(value) => updateField('methode_sterilisation', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methodeSterilisationOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>N° cycle / Programme</Label>
              <Input
                value={formData.numero_cycle || ''}
                onChange={(e) => updateField('numero_cycle', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Programme</Label>
              <Input
                value={formData.programme || ''}
                onChange={(e) => updateField('programme', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Température (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.temperature || ''}
                onChange={(e) => updateField('temperature', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Durée (minutes)</Label>
              <Input
                type="number"
                value={formData.duree_cycle || ''}
                onChange={(e) => updateField('duree_cycle', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Résultat du test de contrôle</Label>
              <Select value={formData.resultat_test_controle} onValueChange={(value) => updateField('resultat_test_controle', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resultatTestOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut du cycle</Label>
              <Select value={formData.status_cycle} onValueChange={(value) => updateField('status_cycle', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusCycleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observation / Action corrective</Label>
              <Textarea
                value={formData.observation_action_corrective || ''}
                onChange={(e) => updateField('observation_action_corrective', e.target.value || null)}
                rows={3}
              />
            </div>
          </div>
        </TabsContent>

        {/* Section 2: Contrôle des Charges */}
        <TabsContent value="controle" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de contrôle</Label>
              <Input
                type="date"
                value={formData.date_controle || ''}
                onChange={(e) => updateField('date_controle', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Type de charge</Label>
              <Input
                value={formData.type_charge || ''}
                onChange={(e) => updateField('type_charge', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Nombre d'unités</Label>
              <Input
                type="number"
                value={formData.nombre_unites || ''}
                onChange={(e) => updateField('nombre_unites', e.target.value || null)}
              />
            </div>
            <div>
              <Label>N° cycle</Label>
              <Input
                value={formData.numero_cycle_controle || ''}
                onChange={(e) => updateField('numero_cycle_controle', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Résultat du contrôle</Label>
              <Select value={formData.resultat_controle || ''} onValueChange={(value) => updateField('resultat_controle', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acceptee">Acceptée</SelectItem>
                  <SelectItem value="rejetee">Rejetée</SelectItem>
                  <SelectItem value="en_attente">En Attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={formData.statut_charge || ''} onValueChange={(value) => updateField('statut_charge', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acceptee">Acceptée</SelectItem>
                  <SelectItem value="rejetee">Rejetée</SelectItem>
                  <SelectItem value="en_attente">En Attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* Section 3: Libération */}
        <TabsContent value="liberation" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de libération</Label>
              <Input
                type="date"
                value={formData.date_liberation || ''}
                onChange={(e) => updateField('date_liberation', e.target.value || null)}
              />
            </div>
            <div>
              <Label>N° de lot / Charge</Label>
              <Input
                value={formData.numero_lot_charge || ''}
                onChange={(e) => updateField('numero_lot_charge', e.target.value || null)}
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
              <Label>Délai de validité</Label>
              <Input
                type="date"
                value={formData.delai_validite || ''}
                onChange={(e) => updateField('delai_validite', e.target.value || null)}
              />
            </div>
            <div className="col-span-2">
              <Label>Observations</Label>
              <Textarea
                value={formData.observations_liberation || ''}
                onChange={(e) => updateField('observations_liberation', e.target.value || null)}
                rows={3}
              />
            </div>
          </div>
        </TabsContent>

        {/* Section 4: Maintenance */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de maintenance</Label>
              <Input
                type="date"
                value={formData.date_maintenance || ''}
                onChange={(e) => updateField('date_maintenance', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Type d'opération</Label>
              <Input
                value={formData.type_operation_maintenance || ''}
                onChange={(e) => updateField('type_operation_maintenance', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Nom du technicien</Label>
              <Input
                value={formData.nom_technicien || ''}
                onChange={(e) => updateField('nom_technicien', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Résultat du contrôle</Label>
              <Select value={formData.resultat_controle_maintenance || ''} onValueChange={(value) => updateField('resultat_controle_maintenance', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {resultatTestOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observations</Label>
              <Textarea
                value={formData.observations_maintenance || ''}
                onChange={(e) => updateField('observations_maintenance', e.target.value || null)}
                rows={3}
              />
            </div>
          </div>
        </TabsContent>

        {/* Section 5: Non-conformités */}
        <TabsContent value="non-conformites" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Observations générales</Label>
              <Textarea
                value={formData.observations_generales || ''}
                onChange={(e) => updateField('observations_generales', e.target.value || null)}
                rows={4}
              />
            </div>
            <div>
              <Label>Non-conformités relevées</Label>
              <Textarea
                value={formData.non_conformites || ''}
                onChange={(e) => updateField('non_conformites', e.target.value || null)}
                rows={4}
                placeholder="Exemple : cycle interrompu, indicateur viré partiellement, fuite sur joint d'autoclave, maintenance préventive, etc."
              />
            </div>
          </div>
        </TabsContent>

        {/* Section 6: Validation */}
        <TabsContent value="validation" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsable de la stérilisation</Label>
              <Input
                value={formData.responsable_sterilisation || ''}
                onChange={(e) => updateField('responsable_sterilisation', e.target.value || null)}
              />
            </div>
            <div>
              <Label>Date de validation</Label>
              <Input
                type="date"
                value={formData.date_validation || ''}
                onChange={(e) => updateField('date_validation', e.target.value || null)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
          {register ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};









