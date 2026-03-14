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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/shared/Loading";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { exportToExcel } from "@/utils/excelExport";

interface NetworkInventoryItem {
  id: string;
  item_name: string;
  category: 'cable' | 'connecteur' | 'antenne' | 'boitier' | 'autre';
  brand?: string;
  model?: string;
  quantity: number;
  unit: 'unite' | 'metre' | 'lot';
  location?: string;
  supplier?: string;
  purchase_date?: Date;
  purchase_cost?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const categoryLabels: Record<string, string> = {
  cable: "Câble",
  connecteur: "Connecteur",
  antenne: "Antenne",
  boitier: "Boîtier",
  autre: "Autre",
};

const unitLabels: Record<string, string> = {
  unite: "Unité",
  metre: "Mètre",
  lot: "Lot",
};

interface NetworkInventoryListProps {
  user: User;
}

export const NetworkInventoryList = ({ user }: NetworkInventoryListProps) => {
  const [inventory, setInventory] = useState<NetworkInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NetworkInventoryItem | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('network_inventory')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInventory((data || []).map((item: any) => ({
        ...item,
        purchase_date: item.purchase_date ? new Date(item.purchase_date) : undefined,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement: " + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (data: any) => {
    try {
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { error } = await supabase.from('network_inventory').insert([{ ...data, id }]);
      if (error) throw error;
      showSuccess("Article créé avec succès");
      setIsDialogOpen(false);
      fetchInventory();
    } catch (error: any) {
      showError("Erreur: " + (error?.message || error));
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = {
    total: inventory.length,
    totalItems: inventory.reduce((sum, item) => sum + item.quantity, 0),
    categories: new Set(inventory.map(i => i.category)).size,
    totalValue: inventory.reduce((sum, item) => sum + ((item.purchase_cost || 0) * item.quantity), 0),
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="Package" className="text-blue-600 mr-2" />
          Inventaire Réseau
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              exportToExcel(
                inventory,
                [
                  { key: 'item_name', label: 'Nom' },
                  { key: 'category', label: 'Catégorie' },
                  { key: 'quantity', label: 'Quantité' },
                  { key: 'location', label: 'Localisation' },
                  { key: 'supplier', label: 'Fournisseur' },
                ],
                'network-inventory',
                'Inventaire Réseau'
              );
              showSuccess('Export Excel réussi !');
            }}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <Icon name="Download" className="mr-2 h-4 w-4" />
            Exporter Excel
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600" onClick={() => setIsDialogOpen(true)}>
            <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouvel Article
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <DashboardCard title="Articles" value={stats.total} iconName="Package" colorClass="bg-blue-100 text-blue-600" />
          <DashboardCard title="Total Unités" value={stats.totalItems} iconName="Box" colorClass="bg-green-100 text-green-600" />
          <DashboardCard title="Catégories" value={stats.categories} iconName="Tags" colorClass="bg-purple-100 text-purple-600" />
          <DashboardCard 
            title="Valeur Totale" 
            value={stats.totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })} 
            iconName="DollarSign" 
            colorClass="bg-yellow-100 text-yellow-600" 
          />
        </div>

        {/* Tableau */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Marque/Modèle</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length > 0 ? inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoryLabels[item.category] || item.category}</Badge>
                  </TableCell>
                  <TableCell>{item.brand && item.model ? `${item.brand} ${item.model}` : item.brand || item.model || '-'}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{item.quantity}</span>
                    <span className="text-xs text-gray-500 ml-1">({unitLabels[item.unit] || item.unit})</span>
                  </TableCell>
                  <TableCell>{item.location || '-'}</TableCell>
                  <TableCell>{item.supplier || '-'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                      <Icon name="Eye" className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Icon name="Package" className="mx-auto text-4xl text-gray-300 mb-2" />
                    <p className="text-gray-500">Aucun article enregistré</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog formulaire */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un article à l'inventaire</DialogTitle>
          </DialogHeader>
          <NetworkInventoryForm onSubmit={handleCreateItem} onCancel={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const NetworkInventoryForm = ({ onSubmit, onCancel, initialData }: { onSubmit: (data: any) => void; onCancel: () => void; initialData?: NetworkInventoryItem }) => {
  const [itemName, setItemName] = useState(initialData?.item_name || '');
  const [category, setCategory] = useState<'cable' | 'connecteur' | 'antenne' | 'boitier' | 'autre'>(initialData?.category || 'cable');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [model, setModel] = useState(initialData?.model || '');
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '1');
  const [unit, setUnit] = useState<'unite' | 'metre' | 'lot'>(initialData?.unit || 'unite');
  const [location, setLocation] = useState(initialData?.location || '');
  const [supplier, setSupplier] = useState(initialData?.supplier || '');
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchase_date ? format(initialData.purchase_date, 'yyyy-MM-dd') : '');
  const [purchaseCost, setPurchaseCost] = useState(initialData?.purchase_cost?.toString() || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      item_name: itemName,
      category,
      brand: brand || null,
      model: model || null,
      quantity: parseInt(quantity) || 1,
      unit,
      location: location || null,
      supplier: supplier || null,
      purchase_date: purchaseDate || null,
      purchase_cost: purchaseCost ? parseFloat(purchaseCost) : null,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nom de l'article *</Label>
        <Input value={itemName} onChange={(e) => setItemName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Catégorie *</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Unité *</Label>
          <Select value={unit} onValueChange={(v) => setUnit(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(unitLabels).map(([value, label]) => (
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
          <Label>Quantité *</Label>
          <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1" />
        </div>
        <div>
          <Label>Coût d'achat (XAF)</Label>
          <Input type="number" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} min="0" step="0.01" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Localisation</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <Label>Fournisseur</Label>
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Date d'achat</Label>
        <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-blue-600 to-cyan-600">
          {initialData ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};
