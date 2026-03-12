import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { AES } from "@/types";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { AESFormDialog } from "./AESFormDialog";
import { AESDetailsDialog } from "./AESDetailsDialog";

interface AESListProps {
  currentUserId?: string;
}

export const AESList = ({ currentUserId }: AESListProps) => {
  const [aesList, setAesList] = useState<AES[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAES, setSelectedAES] = useState<AES | null>(null);
  const [editingAES, setEditingAES] = useState<AES | null>(null);

  useEffect(() => {
    fetchAES();
  }, []);

  const fetchAES = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('aes')
        .select('*')
        .order('date_aes', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedAES: AES[] = data.map((item: any) => ({
        ...item,
        date_aes: new Date(item.date_aes),
        date_debut_traitement: item.date_debut_traitement ? new Date(item.date_debut_traitement) : undefined,
        date_cloture: item.date_cloture ? new Date(item.date_cloture) : undefined,
        suivi_m1_date: item.suivi_m1_date ? new Date(item.suivi_m1_date) : undefined,
        suivi_m6_date: item.suivi_m6_date ? new Date(item.suivi_m6_date) : undefined,
        suivi_m9_date: item.suivi_m9_date ? new Date(item.suivi_m9_date) : undefined,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
      }));
      setAesList(formattedAES);
    } catch (error: any) {
      console.error("Error fetching AES:", error);
      showError("Erreur lors du chargement des AES.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAES(null);
    setShowFormDialog(true);
  };

  const handleEdit = (aes: AES) => {
    setEditingAES(aes);
    setShowFormDialog(true);
  };

  const handleView = (aes: AES) => {
    setSelectedAES(aes);
    setShowDetailsDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet AES ?")) {
      return;
    }
    try {
      const { error } = await supabase.from('aes').delete().eq('id', id);

      if (error) {
        throw error;
      }

      await fetchAES();
    } catch (error: any) {
      console.error("Error deleting AES:", error);
      showError("Erreur lors de la suppression de l'AES.");
    }
  };

  const handleFormClose = () => {
    setShowFormDialog(false);
    setEditingAES(null);
    fetchAES();
  };

  const handleDetailsClose = () => {
    setShowDetailsDialog(false);
    setSelectedAES(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Icon name="Droplet" className="text-red-600" />
              Gestion des Accidents d'Exposition au Sang (AES)
            </CardTitle>
            <Button onClick={handleCreate}>
              <Icon name="Plus" className="mr-2 h-4 w-4" />
              Nouvel AES
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Icon name="Loader2" className="mx-auto h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-gray-500">Chargement...</p>
            </div>
          ) : aesList.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="FileText" className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-gray-500">Aucun AES enregistré.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type d'exposition</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aesList.map((aes) => (
                  <TableRow key={aes.id}>
                    <TableCell>
                      {format(aes.date_aes, 'dd/MM/yyyy', { locale: fr })} à {aes.heure_aes}
                    </TableCell>
                    <TableCell>
                      {aes.agent_prenom} {aes.agent_nom}
                      {aes.agent_matricule && ` (${aes.agent_matricule})`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{aes.type_exposition}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={aes.dossier_cloture ? "bg-green-500" : "bg-yellow-500"}>
                        {aes.dossier_cloture ? "Clôturé" : "En cours"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(aes)}
                        >
                          <Icon name="Eye" className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(aes)}
                        >
                          <Icon name="Edit" className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(aes.id)}
                        >
                          <Icon name="Trash2" className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showFormDialog && (
        <AESFormDialog
          isOpen={showFormDialog}
          onClose={handleFormClose}
          aes={editingAES}
          currentUserId={currentUserId}
        />
      )}

      {showDetailsDialog && selectedAES && (
        <AESDetailsDialog
          isOpen={showDetailsDialog}
          onClose={handleDetailsClose}
          aes={selectedAES}
          onEdit={() => {
            setShowDetailsDialog(false);
            handleEdit(selectedAES);
          }}
        />
      )}
    </div>
  );
};
