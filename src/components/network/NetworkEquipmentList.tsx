import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { User } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/shared/Loading";
import { DashboardCard } from "@/components/shared/DashboardCard";

interface NetworkEquipment {
  id: string;
  name: string;
  type: 'routeur' | 'switch' | 'point_acces' | 'serveur' | 'firewall' | 'autre';
  brand?: string;
  model?: string;
  serial_number?: string;
  ip_address?: string;
  mac_address?: string;
  location?: string;
  status: 'operationnel' | 'en_maintenance' | 'hors_service';
  installation_date?: Date;
  warranty_expiry?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const equipmentTypeLabels: Record<string, string> = {
  routeur: "Routeur",
  switch: "Switch",
  point_acces: "Point d'accès",
  serveur: "Serveur",
  firewall: "Firewall",
  autre: "Autre",
};

const statusLabels: Record<string, string> = {
  operationnel: "Opérationnel",
  en_maintenance: "En maintenance",
  hors_service: "Hors service",
};

const statusColors: Record<string, string> = {
  operationnel: "bg-green-100 text-green-700",
  en_maintenance: "bg-yellow-100 text-yellow-700",
  hors_service: "bg-red-100 text-red-700",
};

interface NetworkEquipmentListProps {
  user: User;
}

export const NetworkEquipmentList = ({ user }: NetworkEquipmentListProps) => {
  const [equipment, setEquipment] = useState<NetworkEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<NetworkEquipment | null>(null);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('network_equipment')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEquipment((data || []).map((eq: any) => ({
        ...eq,
        installation_date: eq.installation_date ? new Date(eq.installation_date) : undefined,
        warranty_expiry: eq.warranty_expiry ? new Date(eq.warranty_expiry) : undefined,
        created_at: new Date(eq.created_at),
        updated_at: new Date(eq.updated_at),
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement: " + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEquipment = async (data: any) => {
    try {
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { error } = await supabase.from('network_equipment').insert([{ ...data, id }]);
      if (error) throw error;
      showSuccess("Équipement créé avec succès");
      setIsDialogOpen(false);
      fetchEquipment();
    } catch (error: any) {
      showError("Erreur: " + (error?.message || error));
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = {
    total: equipment.length,
    operationnel: equipment.filter(e => e.status === 'operationnel').length,
    en_maintenance: equipment.filter(e => e.status === 'en_maintenance').length,
    hors_service: equipment.filter(e => e.status === 'hors_service').length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="Server" className="text-indigo-600 mr-2" />
          Matériel Réseau
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
              <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouvel Équipement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un équipement réseau</DialogTitle>
            </DialogHeader>
            <NetworkEquipmentForm onSubmit={handleCreateEquipment} onCancel={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <DashboardCard title="Total" value={stats.total} iconName="Server" colorClass="bg-blue-100 text-blue-600" />
          <DashboardCard title="Opérationnel" value={stats.operationnel} iconName="CheckCircle" colorClass="bg-green-100 text-green-600" />
          <DashboardCard title="En Maintenance" value={stats.en_maintenance} iconName="Clock" colorClass="bg-yellow-100 text-yellow-600" />
          <DashboardCard title="Hors Service" value={stats.hors_service} iconName="XCircle" colorClass="bg-red-100 text-red-600" />
        </div>

        {/* Tableau */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Marque/Modèle</TableHead>
                <TableHead>Adresse IP</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.length > 0 ? equipment.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-medium">{eq.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{equipmentTypeLabels[eq.type] || eq.type}</Badge>
                  </TableCell>
                  <TableCell>{eq.brand && eq.model ? `${eq.brand} ${eq.model}` : eq.brand || eq.model || '-'}</TableCell>
                  <TableCell>{eq.ip_address || '-'}</TableCell>
                  <TableCell>{eq.location || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[eq.status]}>
                      {statusLabels[eq.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setSelectedEquipment(eq);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Icon name="Eye" className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Icon name="Server" className="mx-auto text-4xl text-gray-300 mb-2" />
                    <p className="text-gray-500">Aucun équipement enregistré</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog pour voir les détails */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Icon name="Server" className="mr-2 h-5 w-5" />
              Détails de l'équipement
            </DialogTitle>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Nom</Label>
                  <p className="text-gray-900">{selectedEquipment.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Type</Label>
                  <p className="text-gray-900">
                    <Badge variant="outline">{equipmentTypeLabels[selectedEquipment.type] || selectedEquipment.type}</Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Statut</Label>
                  <p className="text-gray-900">
                    <Badge className={statusColors[selectedEquipment.status]}>
                      {statusLabels[selectedEquipment.status]}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Localisation</Label>
                  <p className="text-gray-900">{selectedEquipment.location || '-'}</p>
                </div>
                {selectedEquipment.brand && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Marque</Label>
                    <p className="text-gray-900">{selectedEquipment.brand}</p>
                  </div>
                )}
                {selectedEquipment.model && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Modèle</Label>
                    <p className="text-gray-900">{selectedEquipment.model}</p>
                  </div>
                )}
                {selectedEquipment.serial_number && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Numéro de série</Label>
                    <p className="text-gray-900">{selectedEquipment.serial_number}</p>
                  </div>
                )}
                {selectedEquipment.ip_address && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Adresse IP</Label>
                    <p className="text-gray-900 font-mono">{selectedEquipment.ip_address}</p>
                  </div>
                )}
                {selectedEquipment.mac_address && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Adresse MAC</Label>
                    <p className="text-gray-900 font-mono">{selectedEquipment.mac_address}</p>
                  </div>
                )}
                {selectedEquipment.installation_date && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Date d'installation</Label>
                    <p className="text-gray-900">{format(selectedEquipment.installation_date, 'dd/MM/yyyy')}</p>
                  </div>
                )}
                {selectedEquipment.warranty_expiry && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Fin de garantie</Label>
                    <p className="text-gray-900">{format(selectedEquipment.warranty_expiry, 'dd/MM/yyyy')}</p>
                  </div>
                )}
              </div>
              {selectedEquipment.notes && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Notes</Label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedEquipment.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Date de création</Label>
                  <p className="text-gray-600 text-sm">{format(selectedEquipment.created_at, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Dernière modification</Label>
                  <p className="text-gray-600 text-sm">{format(selectedEquipment.updated_at, 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const NetworkEquipmentForm = ({ onSubmit, onCancel, initialData }: { onSubmit: (data: any) => void; onCancel: () => void; initialData?: NetworkEquipment }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<'routeur' | 'switch' | 'point_acces' | 'serveur' | 'firewall' | 'autre'>(initialData?.type || 'routeur');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [model, setModel] = useState(initialData?.model || '');
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number || '');
  const [ipAddress, setIpAddress] = useState(initialData?.ip_address || '');
  const [macAddress, setMacAddress] = useState(initialData?.mac_address || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [status, setStatus] = useState<'operationnel' | 'en_maintenance' | 'hors_service'>(initialData?.status || 'operationnel');
  const [installationDate, setInstallationDate] = useState(initialData?.installation_date ? format(initialData.installation_date, 'yyyy-MM-dd') : '');
  const [warrantyExpiry, setWarrantyExpiry] = useState(initialData?.warranty_expiry ? format(initialData.warranty_expiry, 'yyyy-MM-dd') : '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      brand: brand || null,
      model: model || null,
      serial_number: serialNumber || null,
      ip_address: ipAddress || null,
      mac_address: macAddress || null,
      location: location || null,
      status,
      installation_date: installationDate || null,
      warranty_expiry: warrantyExpiry || null,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nom de l'équipement *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type *</Label>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(equipmentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut *</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
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
          <Label>Marque</Label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div>
          <Label>Modèle</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Adresse IP</Label>
          <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="192.168.1.1" />
        </div>
        <div>
          <Label>Adresse MAC</Label>
          <Input value={macAddress} onChange={(e) => setMacAddress(e.target.value)} placeholder="00:11:22:33:44:55" />
        </div>
      </div>
      <div>
        <Label>Numéro de série</Label>
        <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
      </div>
      <div>
        <Label>Localisation</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Bâtiment A, Salle serveur" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date d'installation</Label>
          <Input type="date" value={installationDate} onChange={(e) => setInstallationDate(e.target.value)} />
        </div>
        <div>
          <Label>Fin de garantie</Label>
          <Input type="date" value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          {initialData ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};
