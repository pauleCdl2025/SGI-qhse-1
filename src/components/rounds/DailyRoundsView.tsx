import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { DailyRound, RoundType, RoundStatus, RoundChecklistResponse, Users } from "@/types";
import { apiClient } from "@/integrations/api/client";
import { showError } from "@/utils/toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/Loading";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";

const statusLabels: Record<RoundStatus, string> = {
  en_cours: "En cours",
  terminée: "Terminée",
  annulée: "Annulée",
};

const statusColors: Record<RoundStatus, string> = {
  en_cours: "bg-yellow-100 text-yellow-700",
  terminée: "bg-green-100 text-green-700",
  annulée: "bg-red-100 text-red-700",
};

const roundTypeLabels: Record<RoundType, string> = {
  biomedical: "Biomédical",
  technicien_polyvalent: "Technicien Polyvalent",
};

interface DailyRoundsViewProps {
  users?: Users;
}

export const DailyRoundsView = ({ users }: DailyRoundsViewProps) => {
  const [rounds, setRounds] = useState<DailyRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<DailyRound | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [roundResponses, setRoundResponses] = useState<RoundChecklistResponse[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTechnician, setFilterTechnician] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  const { filteredData: filteredRounds, searchQuery, setSearchQuery } = useFilterAndSearch(
    rounds,
    ['technician_name', 'round_type']
  );

  useEffect(() => {
    fetchAllRounds();
  }, []);

  const fetchAllRounds = async () => {
    try {
      setLoading(true);
      // Récupérer toutes les rondes (sans filtre)
      const biomedicalRounds = await apiClient.getDailyRounds('', 'biomedical');
      const polyvalentRounds = await apiClient.getDailyRounds('', 'technicien_polyvalent');
      
      const allRounds = [
        ...biomedicalRounds.map((r: any) => ({
          ...r,
          round_date: new Date(r.round_date),
          start_time: r.start_time ? new Date(r.start_time) : undefined,
          end_time: r.end_time ? new Date(r.end_time) : undefined,
          created_at: r.created_at ? new Date(r.created_at) : undefined,
          updated_at: r.updated_at ? new Date(r.updated_at) : undefined,
        })),
        ...polyvalentRounds.map((r: any) => ({
          ...r,
          round_date: new Date(r.round_date),
          start_time: r.start_time ? new Date(r.start_time) : undefined,
          end_time: r.end_time ? new Date(r.end_time) : undefined,
          created_at: r.created_at ? new Date(r.created_at) : undefined,
          updated_at: r.updated_at ? new Date(r.updated_at) : undefined,
        })),
      ];
      
      setRounds(allRounds);
    } catch (error: any) {
      showError("Erreur lors du chargement des rondes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoundResponses = async (roundId: string) => {
    try {
      const responses = await apiClient.getRoundChecklistResponses(roundId);
      setRoundResponses(responses);
    } catch (error: any) {
      showError("Erreur lors du chargement des réponses: " + error.message);
    }
  };

  const handleViewRound = async (round: DailyRound) => {
    setSelectedRound(round);
    await fetchRoundResponses(round.id);
    setIsDetailsDialogOpen(true);
  };

  // Filtrer les rondes
  const getFilteredRounds = () => {
    let filtered = filteredRounds;

    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.round_type === filterType);
    }

    if (filterTechnician !== 'all') {
      filtered = filtered.filter(r => r.technician_id === filterTechnician);
    }

    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      filtered = filtered.filter(r => {
        const roundDate = new Date(r.round_date);
        return roundDate.toDateString() === filterDateObj.toDateString();
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.round_date).getTime();
      const dateB = new Date(b.round_date).getTime();
      return dateB - dateA;
    });
  };

  const technicians = users ? Object.values(users).filter(u => 
    u.role === 'biomedical' || u.role === 'technicien_polyvalent'
  ) : [];

  if (loading) {
    return <LoadingSpinner />;
  }

  const finalFilteredRounds = getFilteredRounds();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center">
          <Icon name="ClipboardCheck" className="text-cyan-600 mr-2" />
          Consultation des Rondes Quotidiennes
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAllRounds}>
            <Icon name="RefreshCw" className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label>Recherche</Label>
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <Label>Type de ronde</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="biomedical">Biomédical</SelectItem>
                <SelectItem value="technicien_polyvalent">Technicien Polyvalent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Technicien</Label>
            <Select value={filterTechnician} onValueChange={setFilterTechnician}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les techniciens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les techniciens</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.first_name} {tech.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </div>

        {finalFilteredRounds.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Icon name="ClipboardCheck" className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Aucune ronde trouvée.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Technicien</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Heure début</TableHead>
                <TableHead>Heure fin</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalFilteredRounds.map((round) => (
                <TableRow key={round.id}>
                  <TableCell>
                    {format(new Date(round.round_date), "dd/MM/yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {round.technician_name || 'Non renseigné'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {roundTypeLabels[round.round_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {round.start_time
                      ? format(new Date(round.start_time), "HH:mm", { locale: fr })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {round.end_time
                      ? format(new Date(round.end_time), "HH:mm", { locale: fr })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[round.status]}>
                      {statusLabels[round.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRound(round)}
                    >
                      <Icon name="Eye" className="mr-1 h-4 w-4" />
                      Voir détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog de détails */}
      {selectedRound && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Détails de la ronde - {format(new Date(selectedRound.round_date), "EEEE d MMMM yyyy", { locale: fr })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Technicien</Label>
                  <p>{selectedRound.technician_name || 'Non renseigné'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Type de ronde</Label>
                  <p>
                    <Badge variant="outline">
                      {roundTypeLabels[selectedRound.round_type]}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Heure de début</Label>
                  <p>
                    {selectedRound.start_time
                      ? format(new Date(selectedRound.start_time), "HH:mm", { locale: fr })
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Heure de fin</Label>
                  <p>
                    {selectedRound.end_time
                      ? format(new Date(selectedRound.end_time), "HH:mm", { locale: fr })
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Statut</Label>
                  <p>
                    <Badge className={statusColors[selectedRound.status]}>
                      {statusLabels[selectedRound.status]}
                    </Badge>
                  </p>
                </div>
              </div>

              {selectedRound.notes && (
                <div>
                  <Label className="text-sm font-semibold">Notes générales</Label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                    {selectedRound.notes}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold mb-2 block">Checklist</Label>
                {roundResponses.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune réponse enregistrée.</p>
                ) : (
                  <div className="space-y-3">
                    {roundResponses.map((response) => (
                      <Card key={response.id} className="border-l-4 border-l-cyan-600">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">
                              {response.template?.title || 'Item'}
                            </h4>
                            {response.template?.is_required && (
                              <Badge variant="destructive" className="text-xs">Requis</Badge>
                            )}
                          </div>
                          {response.template?.description && (
                            <p className="text-sm text-gray-600 mb-3">
                              {response.template.description}
                            </p>
                          )}
                          <div className="space-y-2">
                            {response.template?.item_type === 'checkbox' && (
                              <div className="flex items-center gap-2">
                                <Icon
                                  name={response.is_checked ? "CheckCircle2" : "Circle"}
                                  className={response.is_checked ? "text-green-600" : "text-gray-400"}
                                />
                                <span className={response.is_checked ? "text-green-700 font-medium" : "text-gray-500"}>
                                  {response.is_checked ? "Effectué" : "Non effectué"}
                                </span>
                              </div>
                            )}
                            {(response.template?.item_type === 'text' || response.template?.item_type === 'number' || response.template?.item_type === 'select') && (
                              <div>
                                <Label className="text-xs text-gray-500">Réponse</Label>
                                <p className="text-sm font-medium">{response.response_value || '-'}</p>
                              </div>
                            )}
                            {response.observation && (
                              <div>
                                <Label className="text-xs text-gray-500">Observation</Label>
                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-md">
                                  {response.observation}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
