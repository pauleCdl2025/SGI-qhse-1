import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { DailyRound, RoundType, RoundStatus, RoundChecklistResponse, RoundChecklistTemplate, Users } from "@/types";
import { apiClient } from "@/integrations/api/client";
import { showError } from "@/utils/toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [templates, setTemplates] = useState<RoundChecklistTemplate[]>([]);
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
      // Récupérer toutes les rondes (sans filtre technician_id)
      const biomedicalRounds = await apiClient.getDailyRounds(undefined, 'biomedical');
      const polyvalentRounds = await apiClient.getDailyRounds(undefined, 'technicien_polyvalent');
      
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

  const fetchRoundResponses = async (roundId: string, roundType: RoundType) => {
    try {
      // Charger les templates et les réponses en parallèle
      const [responses, templatesData] = await Promise.all([
        apiClient.getRoundChecklistResponses(roundId),
        apiClient.getRoundChecklistTemplates(roundType)
      ]);
      
      setRoundResponses(responses);
      setTemplates(templatesData.sort((a: RoundChecklistTemplate, b: RoundChecklistTemplate) => 
        (a.item_order || 0) - (b.item_order || 0)
      ));
    } catch (error: any) {
      showError("Erreur lors du chargement des réponses: " + error.message);
    }
  };

  const handleViewRound = async (round: DailyRound) => {
    setSelectedRound(round);
    await fetchRoundResponses(round.id, round.round_type);
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
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Icon name="ClipboardCheck" className="text-cyan-600" />
                Détails de la ronde - {format(new Date(selectedRound.round_date), "EEEE d MMMM yyyy", { locale: fr })}
              </DialogTitle>
              <DialogDescription className="text-base">
                Consultez les détails complets de cette ronde quotidienne et les réponses de la checklist.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              {/* Informations générales */}
              <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon name="Info" className="text-cyan-600" />
                    Informations Générales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Technicien</Label>
                      <p className="text-base font-medium text-gray-900">{selectedRound.technician_name || 'Non renseigné'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Type de ronde</Label>
                      <div>
                        <Badge variant="outline" className="text-sm">
                          {roundTypeLabels[selectedRound.round_type]}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Statut</Label>
                      <div>
                        <Badge className={statusColors[selectedRound.status]}>
                          {statusLabels[selectedRound.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Heure de début</Label>
                      <p className="text-base font-medium text-gray-900">
                        {selectedRound.start_time
                          ? format(new Date(selectedRound.start_time), "HH:mm", { locale: fr })
                          : "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Heure de fin</Label>
                      <p className="text-base font-medium text-gray-900">
                        {selectedRound.end_time
                          ? format(new Date(selectedRound.end_time), "HH:mm", { locale: fr })
                          : "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Durée</Label>
                      <p className="text-base font-medium text-gray-900">
                        {selectedRound.start_time && selectedRound.end_time
                          ? (() => {
                              const duration = Math.round((new Date(selectedRound.end_time).getTime() - new Date(selectedRound.start_time).getTime()) / (1000 * 60));
                              return `${Math.floor(duration / 60)}h ${duration % 60}min`;
                            })()
                          : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes générales */}
              {selectedRound.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Icon name="FileText" className="text-blue-600" />
                      Notes Générales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                      {selectedRound.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Résumé de la checklist */}
              {roundResponses.length > 0 && (() => {
                const requiredItems = roundResponses.filter(r => r.template?.is_required);
                const completedRequired = requiredItems.filter(r => 
                  r.is_checked || (r.response_value && r.response_value.trim() !== '')
                );
                const completionRate = requiredItems.length > 0 
                  ? Math.round((completedRequired.length / requiredItems.length) * 100)
                  : 100;
                
                return (
                  <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-cyan-600">{roundResponses.length}</p>
                          <p className="text-xs text-gray-600 uppercase">Total items</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{requiredItems.length}</p>
                          <p className="text-xs text-gray-600 uppercase">Items requis</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
                          <p className="text-xs text-gray-600 uppercase">Complétion</p>
                        </div>
                      </div>
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            completionRate === 100 ? 'bg-green-500' : 
                            completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon name="ClipboardList" className="text-cyan-600" />
                    Checklist ({templates.length > 0 ? templates.length : roundResponses.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {templates.length === 0 && roundResponses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Icon name="ClipboardX" className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>Aucune réponse enregistrée pour cette ronde.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(templates.length > 0 ? templates : roundResponses.map(r => r.template).filter(Boolean))
                        .map((template) => {
                          // Trouver la réponse correspondante
                          const response = roundResponses.find(r => r.template_id === template.id);
                          
                          return (
                          <Card 
                            key={template.id} 
                            className={`border-l-4 ${
                              template.is_required 
                                ? response && (response.is_checked || (response.response_value && response.response_value.trim() !== ''))
                                  ? 'border-l-green-500 bg-green-50/30' 
                                  : 'border-l-red-500 bg-red-50/30'
                                : 'border-l-cyan-600'
                            }`}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-base font-semibold text-gray-900">
                                      {template.title || 'Item'}
                                    </h4>
                                    {template.is_required && (
                                      <Badge variant="destructive" className="text-xs">Requis</Badge>
                                    )}
                                    {template.item_type && (
                                      <Badge variant="outline" className="text-xs">
                                        {template.item_type === 'checkbox' ? 'Case à cocher' :
                                         template.item_type === 'text' ? 'Texte' :
                                         template.item_type === 'number' ? 'Nombre' :
                                         template.item_type === 'select' ? 'Sélection' : ''}
                                      </Badge>
                                    )}
                                  </div>
                                  {template.description && (
                                    <p className="text-sm text-gray-600 mb-3 italic">
                                      {template.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="space-y-3 bg-white p-3 rounded-md border border-gray-200">
                                {template.item_type === 'checkbox' && (
                                  <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                      response?.is_checked ? 'bg-green-100' : 'bg-gray-100'
                                    }`}>
                                      <Icon
                                        name={response?.is_checked ? "CheckCircle2" : "Circle"}
                                        className={response?.is_checked ? "text-green-600 h-5 w-5" : "text-gray-400 h-5 w-5"}
                                      />
                                    </div>
                                    <div>
                                      <span className={`text-sm font-medium ${
                                        response?.is_checked ? "text-green-700" : "text-gray-500"
                                      }`}>
                                        {response?.is_checked ? "✓ Effectué" : "○ Non effectué"}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                {(template.item_type === 'text' || template.item_type === 'number' || template.item_type === 'select') && (
                                  <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Réponse</Label>
                                    <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border">
                                      {response?.response_value || '-'}
                                    </p>
                                  </div>
                                )}
                                
                                {response?.observation && (
                                  <div className="space-y-1 border-t pt-3">
                                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                      <Icon name="MessageSquare" className="h-3 w-3" />
                                      Observation
                                    </Label>
                                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-md border border-blue-200 whitespace-pre-wrap">
                                      {response.observation}
                                    </p>
                                  </div>
                                )}
                                
                                {!response && (
                                  <p className="text-xs text-gray-400 italic">Aucune réponse fournie</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
