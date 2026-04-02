import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { MedicalWaste, WasteType, WasteStatus, WasteUnit } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";
import { LoadingSpinner } from "@/components/shared/Loading";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/shared/ImageUpload";

const wasteTypeLabels: Record<WasteType, string> = {
  DASRI: "DASRI",
  médicamenteux: "Médicamenteux",
  chimique: "Chimique",
  radioactif: "Radioactif",
  autre: "Autre",
};

const statusLabels: Record<WasteStatus, string> = {
  collecté: "Collecté",
  stocké: "Stocké",
  traité: "Traité",
  éliminé: "Éliminé",
};

const statusColors: Record<WasteStatus, string> = {
  collecté: "bg-blue-100 text-blue-700",
  stocké: "bg-yellow-100 text-yellow-700",
  traité: "bg-green-100 text-green-700",
  éliminé: "bg-gray-100 text-gray-700",
};

export const MedicalWasteList = () => {
  const [waste, setWaste] = useState<MedicalWaste[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWaste, setSelectedWaste] = useState<MedicalWaste | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  const { filteredData: filteredWaste, searchQuery, setSearchQuery } = useFilterAndSearch(
    waste,
    ['waste_type', 'category', 'collection_location', 'tracking_number']
  );

  useEffect(() => {
    fetchWaste();
  }, []);

  const getPhotoUrl = (url: string): string => {
    if (!url) return '';
    // Si l'URL est déjà absolue, la retourner telle quelle
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Si l'URL commence par /uploads, ajouter le base URL
    if (url.startsWith('/uploads')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      return `${apiBaseUrl}${url}`;
    }
    // Si l'URL commence par uploads (sans slash), ajouter le base URL avec slash
    if (url.startsWith('uploads')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      return `${apiBaseUrl}/${url}`;
    }
    return url;
  };

  const fetchWaste = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medical_waste')
        .select('*')
        .order('collection_date', { ascending: false });

      if (error) {
        throw error;
      }

      setWaste(data.map((w: any) => {
        const photoUrls = w.photo_urls ? (Array.isArray(w.photo_urls) ? w.photo_urls : JSON.parse(w.photo_urls)) : [];
        return {
          ...w,
          collection_date: new Date(w.collection_date),
          treatment_date: w.treatment_date ? new Date(w.treatment_date) : undefined,
          created_at: new Date(w.created_at),
          updated_at: new Date(w.updated_at),
          photo_urls: photoUrls.map((url: string) => getPhotoUrl(url)),
        };
      }));
    } catch (error: any) {
      showError("Erreur lors du chargement des déchets: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWaste = async (wasteData: any, photoFiles: File[] = []) => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Utilisateur non authentifié");

      let photoUrls: string[] = [];
      
      // Upload des photos si elles existent
      if (photoFiles.length > 0) {
        try {
          // TODO: remplacer par Supabase Storage si besoin
          const uploadResult = await supabase
            .storage
            .from('medical-waste')
            .upload(`waste/${Date.now()}-${photoFiles[0].name}`, photoFiles[0]);

          if (uploadResult.error) {
            throw uploadResult.error;
          }

          const { data: publicUrlData } = supabase
            .storage
            .from('medical-waste')
            .getPublicUrl(uploadResult.data.path);

          photoUrls = publicUrlData?.publicUrl ? [publicUrlData.publicUrl] : [];
        } catch (uploadError: any) {
          showError("Erreur lors de l'upload des photos: " + uploadError.message);
          return;
        }
      }
      
      // Créer le déchet avec les URLs des photos
      const newId =
        typeof globalThis.crypto !== "undefined" &&
        "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const { id: _ignoredId, registered_by: _ignoredRegisteredBy, ...rest } =
        wasteData ?? {};

      const { error } = await supabase.from('medical_waste').insert([
        {
          ...rest,
          id: newId,
          registered_by: user.id,
          photo_urls: photoUrls,
        },
      ]);

      if (error) {
        throw error;
      }
      showSuccess("Déchet enregistré avec succès");
      setIsDialogOpen(false);
      fetchWaste();
    } catch (error: any) {
      showError("Erreur lors de l'enregistrement: " + error.message);
    }
  };

  const handleViewWaste = (w: MedicalWaste) => {
    setSelectedWaste(w);
    setIsDetailsDialogOpen(true);
  };

  const handleUpdateWaste = async (wasteId: string, data: any) => {
    try {
      const { error } = await supabase
        .from('medical_waste')
        .update(data)
        .eq('id', wasteId);

      if (error) {
        throw error;
      }
      showSuccess("Déchet mis à jour avec succès");
      setIsDetailsDialogOpen(false);
      fetchWaste();
    } catch (error: any) {
      showError("Erreur lors de la mise à jour: " + error.message);
    }
  };

  const handleDeleteWaste = async (wasteId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce déchet ?")) {
      return;
    }
    try {
      const { error } = await supabase.from('medical_waste').delete().eq('id', wasteId);

      if (error) {
        throw error;
      }
      showSuccess("Déchet supprimé avec succès");
      setIsDetailsDialogOpen(false);
      fetchWaste();
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
          <Icon name="Trash2" className="text-cyan-600 mr-2" />
          Suivi des Déchets Médicaux
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
              <Icon name="Plus" className="mr-2 h-4 w-4" /> Enregistrer Déchet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enregistrer un nouveau déchet</DialogTitle>
            </DialogHeader>
            <WasteForm onSubmit={handleCreateWaste} onCancel={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par type, lieu, numéro de suivi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Lieu de collecte</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Numéro de suivi</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWaste.length > 0 ? filteredWaste.map((w) => (
              <TableRow key={w.id}>
                <TableCell>
                  <Badge>{wasteTypeLabels[w.waste_type]}</Badge>
                </TableCell>
                <TableCell>{w.quantity} {w.unit}</TableCell>
                <TableCell>{w.collection_location}</TableCell>
                <TableCell>{format(w.collection_date, 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-mono text-sm">{w.tracking_number || '-'}</TableCell>
                <TableCell>
                  <Badge className={statusColors[w.status]}>
                    {statusLabels[w.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {w.photo_urls && w.photo_urls.length > 0 ? (
                    <div className="flex gap-1">
                      {w.photo_urls.slice(0, 3).map((photoUrl, index) => (
                        <img
                          key={index}
                          src={photoUrl}
                          alt={`Photo ${index + 1}`}
                          className="w-10 h-10 object-cover rounded cursor-pointer border border-gray-200 hover:border-cyan-600 transition"
                          onClick={() => {
                            setSelectedPhoto(photoUrl);
                            setIsPhotoDialogOpen(true);
                          }}
                        />
                      ))}
                      {w.photo_urls.length > 3 && (
                        <div
                          className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition"
                          onClick={() => {
                            setSelectedPhoto(w.photo_urls![0]);
                            setIsPhotoDialogOpen(true);
                          }}
                        >
                          +{w.photo_urls.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewWaste(w)}
                  >
                    <Icon name="Eye" className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Icon name="Trash2" className="mx-auto text-4xl text-gray-300 mb-2" />
                  {searchQuery ? 'Aucun déchet ne correspond à votre recherche.' : 'Aucun déchet enregistré.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Dialog de détails du déchet */}
      {selectedWaste && (
        <WasteDetailsDialog
          waste={selectedWaste}
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false);
            setSelectedWaste(null);
          }}
          onUpdate={handleUpdateWaste}
          onDelete={handleDeleteWaste}
        />
      )}

      {/* Dialog pour afficher la photo en grand */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Photo du déchet</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="flex justify-center">
              <img
                src={selectedPhoto}
                alt="Photo du déchet"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const WasteForm = ({ onSubmit, onCancel }: { onSubmit: (data: any, photoFiles: File[]) => void; onCancel: () => void }) => {
  const [wasteType, setWasteType] = useState<WasteType>('DASRI');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'kg' | 'litre' | 'unité'>('kg');
  const [collectionDate, setCollectionDate] = useState('');
  const [collectionLocation, setCollectionLocation] = useState('');
  const [wasteCode, setWasteCode] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      waste_type: wasteType,
      category: category || null,
      quantity: parseFloat(quantity),
      unit,
      collection_date: collectionDate,
      collection_location: collectionLocation,
      waste_code: wasteCode || null,
    }, photos);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type de déchet *</Label>
          <Select value={wasteType} onValueChange={(v) => setWasteType(v as WasteType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(wasteTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Catégorie</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quantité *</Label>
          <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div>
          <Label>Unité *</Label>
          <Select value={unit} onValueChange={(v) => setUnit(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="litre">Litre</SelectItem>
              <SelectItem value="unité">Unité</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Lieu de collecte *</Label>
        <Input value={collectionLocation} onChange={(e) => setCollectionLocation(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date de collecte *</Label>
          <Input type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} required />
        </div>
        <div>
          <Label>Code déchet</Label>
          <Input value={wasteCode} onChange={(e) => setWasteCode(e.target.value)} />
        </div>
      </div>
      
      <ImageUpload onFilesChange={setPhotos} label="Photos du déchet" />
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">Enregistrer</Button>
      </div>
    </form>
  );
};

// Dialog de détails du déchet médical
interface WasteDetailsDialogProps {
  waste: MedicalWaste;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (wasteId: string, data: any) => void;
  onDelete: (wasteId: string) => void;
}

const WasteDetailsDialog = ({ waste, isOpen, onClose, onUpdate, onDelete }: WasteDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [wasteType, setWasteType] = useState<WasteType>(waste.waste_type);
  const [category, setCategory] = useState(waste.category || '');
  const [quantity, setQuantity] = useState(waste.quantity.toString());
  const [unit, setUnit] = useState<WasteUnit>(waste.unit);
  const [collectionDate, setCollectionDate] = useState(format(waste.collection_date, 'yyyy-MM-dd'));
  const [collectionLocation, setCollectionLocation] = useState(waste.collection_location);
  const [producerService, setProducerService] = useState(waste.producer_service || '');
  const [wasteCode, setWasteCode] = useState(waste.waste_code || '');
  const [treatmentMethod, setTreatmentMethod] = useState(waste.treatment_method || '');
  const [treatmentCompany, setTreatmentCompany] = useState(waste.treatment_company || '');
  const [treatmentDate, setTreatmentDate] = useState(waste.treatment_date ? format(waste.treatment_date, 'yyyy-MM-dd') : '');
  const [trackingNumber, setTrackingNumber] = useState(waste.tracking_number || '');
  const [certificateNumber, setCertificateNumber] = useState(waste.certificate_number || '');
  const [status, setStatus] = useState<WasteStatus>(waste.status);
  const [notes, setNotes] = useState(waste.notes || '');

  useEffect(() => {
    if (!isEditing) {
      setWasteType(waste.waste_type);
      setCategory(waste.category || '');
      setQuantity(waste.quantity.toString());
      setUnit(waste.unit);
      setCollectionDate(format(waste.collection_date, 'yyyy-MM-dd'));
      setCollectionLocation(waste.collection_location);
      setProducerService(waste.producer_service || '');
      setWasteCode(waste.waste_code || '');
      setTreatmentMethod(waste.treatment_method || '');
      setTreatmentCompany(waste.treatment_company || '');
      setTreatmentDate(waste.treatment_date ? format(waste.treatment_date, 'yyyy-MM-dd') : '');
      setTrackingNumber(waste.tracking_number || '');
      setCertificateNumber(waste.certificate_number || '');
      setStatus(waste.status);
      setNotes(waste.notes || '');
    }
  }, [waste, isEditing]);

  const handleSave = () => {
    onUpdate(waste.id, {
      waste_type: wasteType,
      category: category || null,
      quantity: parseFloat(quantity),
      unit,
      collection_date: collectionDate,
      collection_location: collectionLocation,
      producer_service: producerService || null,
      waste_code: wasteCode || null,
      treatment_method: treatmentMethod || null,
      treatment_company: treatmentCompany || null,
      treatment_date: treatmentDate || null,
      tracking_number: trackingNumber || null,
      certificate_number: certificateNumber || null,
      status,
      notes: notes || null,
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Détails du Déchet Médical</span>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Icon name="Edit" className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => onDelete(waste.id)}
                  >
                    <Icon name="Trash2" className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Annuler
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
                    onClick={handleSave}
                  >
                    Enregistrer
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations de base */}
          <div className="border-b pb-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Informations de Base</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Type de déchet</Label>
                {isEditing ? (
                  <Select value={wasteType} onValueChange={(v) => setWasteType(v as WasteType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(wasteTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge>{wasteTypeLabels[waste.waste_type]}</Badge>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Quantité</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="flex-1" />
                    <Select value={unit} onValueChange={(v) => setUnit(v as any)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="litre">Litre</SelectItem>
                        <SelectItem value="unité">Unité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p>{waste.quantity} {waste.unit}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Statut</Label>
                {isEditing ? (
                  <Select value={status} onValueChange={(v) => setStatus(v as WasteStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={statusColors[waste.status]}>
                    {statusLabels[waste.status]}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Collecte */}
          <div className="border-b pb-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Collecte</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Date de collecte</Label>
                {isEditing ? (
                  <Input type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} />
                ) : (
                  <p>{format(waste.collection_date, 'dd/MM/yyyy')}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Lieu de collecte</Label>
                {isEditing ? (
                  <Input value={collectionLocation} onChange={(e) => setCollectionLocation(e.target.value)} />
                ) : (
                  <p>{waste.collection_location}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Service producteur</Label>
                {isEditing ? (
                  <Input value={producerService} onChange={(e) => setProducerService(e.target.value)} />
                ) : (
                  <p>{waste.producer_service || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Code déchet</Label>
                {isEditing ? (
                  <Input value={wasteCode} onChange={(e) => setWasteCode(e.target.value)} />
                ) : (
                  <p className="font-mono">{waste.waste_code || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Traitement */}
          <div className="border-b pb-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Traitement et Élimination</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Méthode de traitement</Label>
                {isEditing ? (
                  <Input value={treatmentMethod} onChange={(e) => setTreatmentMethod(e.target.value)} />
                ) : (
                  <p>{waste.treatment_method || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Entreprise de traitement</Label>
                {isEditing ? (
                  <Input value={treatmentCompany} onChange={(e) => setTreatmentCompany(e.target.value)} />
                ) : (
                  <p>{waste.treatment_company || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Date de traitement</Label>
                {isEditing ? (
                  <Input type="date" value={treatmentDate} onChange={(e) => setTreatmentDate(e.target.value)} />
                ) : (
                  <p>{waste.treatment_date ? format(waste.treatment_date, 'dd/MM/yyyy') : '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Traçabilité */}
          <div className="border-b pb-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Traçabilité</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Numéro de suivi</Label>
                {isEditing ? (
                  <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                ) : (
                  <p className="font-mono">{waste.tracking_number || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Numéro de certificat</Label>
                {isEditing ? (
                  <Input value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} />
                ) : (
                  <p className="font-mono">{waste.certificate_number || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Notes</Label>
            {isEditing ? (
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{waste.notes || 'Aucune note'}</p>
            )}
          </div>

          {/* Photos */}
          {waste.photo_urls && waste.photo_urls.length > 0 && (
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Photos</Label>
              <div className="grid grid-cols-3 gap-4">
                {waste.photo_urls.map((photoUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photoUrl}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:border-cyan-600 transition"
                      onClick={() => {
                        // Ouvrir la photo en grand dans une nouvelle fenêtre ou un dialog
                        window.open(photoUrl, '_blank');
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};







