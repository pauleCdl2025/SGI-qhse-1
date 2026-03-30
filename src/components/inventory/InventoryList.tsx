import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/shared/Loading";
import { Icon } from "@/components/Icon";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type AssetStatus = "operationnel" | "en_maintenance" | "hors_service" | "retire";
type AssetCategory = "biomedical" | "reseau" | "informatique" | "mobilier" | "autre";

interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  tag_code?: string | null;
  is_fixed: boolean;
  current_location?: string | null;
  status: AssetStatus;
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

interface AssetLocationEvent {
  id: string;
  asset_id: string;
  from_location?: string | null;
  to_location?: string | null;
  moved_at: Date;
  reason?: string | null;
}

const statusLabels: Record<AssetStatus, string> = {
  operationnel: "Opérationnel",
  en_maintenance: "En maintenance",
  hors_service: "Hors service",
  retire: "Retiré",
};

const statusColors: Record<AssetStatus, string> = {
  operationnel: "bg-green-100 text-green-700",
  en_maintenance: "bg-yellow-100 text-yellow-700",
  hors_service: "bg-red-100 text-red-700",
  retire: "bg-slate-100 text-slate-700",
};

const categoryLabels: Record<AssetCategory, string> = {
  biomedical: "Biomédical",
  reseau: "Réseau",
  informatique: "Informatique",
  mobilier: "Mobilier",
  autre: "Autre",
};

export const InventoryList = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [events, setEvents] = useState<AssetLocationEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const stats = useMemo(() => ({
    total: assets.length,
    fixed: assets.filter(a => a.is_fixed).length,
    moved: assets.filter(a => !a.is_fixed).length,
  }), [assets]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setAssets((data || []).map((a: any) => ({
        ...a,
        created_at: new Date(a.created_at),
        updated_at: new Date(a.updated_at),
      })));
    } catch (e: any) {
      showError("Erreur lors du chargement de l'inventaire: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (assetId: string) => {
    try {
      setEventsLoading(true);
      const { data, error } = await supabase
        .from("asset_location_events")
        .select("*")
        .eq("asset_id", assetId)
        .order("moved_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setEvents((data || []).map((ev: any) => ({
        ...ev,
        moved_at: new Date(ev.moved_at),
      })));
    } catch (e: any) {
      showError("Erreur lors du chargement de l'historique: " + (e?.message || e));
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const openDetails = async (asset: Asset) => {
    setSelected(asset);
    setIsDetailsOpen(true);
    await fetchEvents(asset.id);
  };

  const handleCreate = async (payload: any) => {
    try {
      const { error } = await supabase.from("assets").insert([payload]);
      if (error) throw error;
      showSuccess("Appareil ajouté à l'inventaire");
      setIsCreateOpen(false);
      fetchAssets();
    } catch (e: any) {
      showError("Erreur lors de la création: " + (e?.message || e));
    }
  };

  const handleMove = async (asset: Asset, toLocation: string, reason?: string) => {
    try {
      const { error: updError } = await supabase
        .from("assets")
        .update({ current_location: toLocation })
        .eq("id", asset.id);
      if (updError) throw updError;

      // Optionnel: enregistrer un motif explicite (le trigger enregistre déjà un event "Déplacement")
      if (reason && reason.trim().length > 0) {
        await supabase.from("asset_location_events").insert([{
          asset_id: asset.id,
          from_location: asset.current_location ?? null,
          to_location: toLocation,
          reason: reason.trim(),
        }]);
      }

      showSuccess("Localisation mise à jour");
      await fetchAssets();
      const refreshed = assets.find(a => a.id === asset.id) ?? asset;
      setSelected({ ...refreshed, current_location: toLocation, updated_at: new Date() });
      await fetchEvents(asset.id);
    } catch (e: any) {
      showError("Erreur lors du déplacement: " + (e?.message || e));
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Icon name="PackageSearch" className="text-cyan-600" />
          Inventaire des appareils
        </CardTitle>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
              <Icon name="Plus" className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un appareil</DialogTitle>
            </DialogHeader>
            <AssetForm onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total" value={stats.total} icon="PackageSearch" />
          <StatCard label="Fixes" value={stats.fixed} icon="Anchor" />
          <StatCard label="Non marqués fixes" value={stats.moved} icon="MapPin" />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Code / Série</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Fixe</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length > 0 ? assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoryLabels[a.category] || a.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div>{a.tag_code ? <span className="font-mono">{a.tag_code}</span> : <span>-</span>}</div>
                    <div>{a.serial_number ? <span className="font-mono">{a.serial_number}</span> : <span className="text-slate-400">S/N -</span>}</div>
                  </TableCell>
                  <TableCell>{a.current_location || "-"}</TableCell>
                  <TableCell>
                    <Badge className={a.is_fixed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                      {a.is_fixed ? "Oui" : "Non"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[a.status]}>{statusLabels[a.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openDetails(a)}>
                      <Icon name="Eye" className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Aucun appareil dans l'inventaire.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails & localisation</DialogTitle>
            </DialogHeader>
            {selected && (
              <AssetDetails
                asset={selected}
                events={events}
                eventsLoading={eventsLoading}
                onMove={handleMove}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const StatCard = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
  <Card className="border border-slate-200">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-3xl font-semibold text-slate-800">{value}</p>
      </div>
      <div className="h-10 w-10 rounded-lg bg-cyan-50 flex items-center justify-center">
        <Icon name={icon as any} className="text-cyan-600" />
      </div>
    </CardContent>
  </Card>
);

const AssetDetails = ({
  asset,
  events,
  eventsLoading,
  onMove,
}: {
  asset: Asset;
  events: AssetLocationEvent[];
  eventsLoading: boolean;
  onMove: (asset: Asset, toLocation: string, reason?: string) => void;
}) => {
  const [toLocation, setToLocation] = useState(asset.current_location || "");
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold text-gray-700">Nom</Label>
          <p className="text-gray-900">{asset.name}</p>
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-700">Localisation actuelle</Label>
          <p className="text-gray-900">{asset.current_location || "-"}</p>
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-700">Catégorie</Label>
          <p className="text-gray-900">{categoryLabels[asset.category] || asset.category}</p>
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-700">Fixe</Label>
          <p className="text-gray-900">{asset.is_fixed ? "Oui" : "Non"}</p>
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-700">Code inventaire</Label>
          <p className="text-gray-900 font-mono">{asset.tag_code || "-"}</p>
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-700">N° série</Label>
          <p className="text-gray-900 font-mono">{asset.serial_number || "-"}</p>
        </div>
      </div>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon name="MapPin" className="text-cyan-600" />
            Déplacer / localiser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Nouvelle localisation</Label>
            <Input value={toLocation} onChange={(e) => setToLocation(e.target.value)} placeholder="Ex: Bâtiment A, Salle 2, Armoire 1" />
          </div>
          <div>
            <Label>Motif (optionnel)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Ex: déplacement temporaire pour maintenance" />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => onMove(asset, toLocation, reason)}
              className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
              disabled={!toLocation || toLocation.trim().length === 0}
            >
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon name="History" className="text-cyan-600" />
            Historique de localisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="py-6"><LoadingSpinner /></div>
          ) : events.length === 0 ? (
            <div className="text-sm text-slate-500">Aucun historique.</div>
          ) : (
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-700">
                      <span className="font-semibold">{ev.to_location || "-"}</span>
                      {ev.from_location !== undefined && (
                        <span className="text-slate-500"> (depuis {ev.from_location || "-"})</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{format(ev.moved_at, "dd/MM/yyyy HH:mm")}</div>
                  </div>
                  {ev.reason && (
                    <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{ev.reason}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AssetForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory>("autre");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [tagCode, setTagCode] = useState("");
  const [isFixed, setIsFixed] = useState(true);
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<AssetStatus>("operationnel");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      category,
      brand: brand || null,
      model: model || null,
      serial_number: serialNumber || null,
      tag_code: tagCode || null,
      is_fixed: isFixed,
      current_location: location || null,
      status,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nom *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Catégorie *</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as AssetCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut *</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as AssetStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Marque</Label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div>
          <Label>Modèle</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Code inventaire (étiquette)</Label>
          <Input value={tagCode} onChange={(e) => setTagCode(e.target.value)} placeholder="Ex: INV-000123" />
        </div>
        <div>
          <Label>Numéro de série</Label>
          <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Localisation</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Bloc A - Salle 2" />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Appareil fixe</p>
          <p className="text-xs text-slate-500">Si l'appareil bouge, tu peux le re-localiser et l'historique gardera une trace.</p>
        </div>
        <Button type="button" variant={isFixed ? "default" : "outline"} onClick={() => setIsFixed(v => !v)}>
          {isFixed ? "Fixe: Oui" : "Fixe: Non"}
        </Button>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">Créer</Button>
      </div>
    </form>
  );
};

