import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { DailyRound, RoundType, RoundStatus, User } from "@/types";
import { apiClient } from "@/integrations/api/client";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/Loading";
import { RoundChecklistForm } from "./RoundChecklistForm";

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

interface DailyRoundsListProps {
  user: User;
  roundType: RoundType;
}

export const DailyRoundsList = ({ user, roundType }: DailyRoundsListProps) => {
  const [rounds, setRounds] = useState<DailyRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<DailyRound | null>(null);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);

  useEffect(() => {
    fetchRounds();
  }, [roundType]);

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDailyRounds(user.id, roundType);
      setRounds(data.map((round: any) => ({
        ...round,
        round_date: new Date(round.round_date),
        start_time: round.start_time ? new Date(round.start_time) : undefined,
        end_time: round.end_time ? new Date(round.end_time) : undefined,
        created_at: round.created_at ? new Date(round.created_at) : undefined,
        updated_at: round.updated_at ? new Date(round.updated_at) : undefined,
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement des rondes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRound = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const round = await apiClient.createDailyRound({
        technician_id: user.id,
        round_type: roundType,
        round_date: today.toISOString().split('T')[0],
        status: 'en_cours',
        start_time: new Date().toISOString(),
      });
      showSuccess("Ronde démarrée avec succès");
      setIsDialogOpen(false);
      setSelectedRound(round);
      setIsChecklistDialogOpen(true);
      fetchRounds();
    } catch (error: any) {
      showError("Erreur lors du démarrage de la ronde: " + error.message);
    }
  };

  const handleViewRound = (round: DailyRound) => {
    setSelectedRound(round);
    setIsChecklistDialogOpen(true);
  };

  const handleRoundComplete = () => {
    setIsChecklistDialogOpen(false);
    fetchRounds();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRound = rounds.find(r => {
    const roundDate = new Date(r.round_date);
    roundDate.setHours(0, 0, 0, 0);
    return roundDate.getTime() === today.getTime();
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="ClipboardCheck" className="text-cyan-600 mr-2" />
          Rondes Quotidiennes - {roundTypeLabels[roundType]}
        </CardTitle>
        <div className="flex gap-2">
          {!todayRound && (
            <Button
              onClick={handleStartRound}
              className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
            >
              <Icon name="Play" className="mr-2 h-4 w-4" />
              Démarrer la ronde d'aujourd'hui
            </Button>
          )}
          {todayRound && todayRound.status === 'en_cours' && (
            <Button
              onClick={() => handleViewRound(todayRound)}
              className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
            >
              <Icon name="Edit" className="mr-2 h-4 w-4" />
              Continuer la ronde
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rounds.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Icon name="ClipboardCheck" className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Aucune ronde enregistrée.</p>
            <p className="text-sm mt-2">Cliquez sur "Démarrer la ronde d'aujourd'hui" pour commencer.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Heure de début</TableHead>
                <TableHead>Heure de fin</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rounds
                .sort((a, b) => new Date(b.round_date).getTime() - new Date(a.round_date).getTime())
                .map((round) => (
                  <TableRow key={round.id}>
                    <TableCell>
                      {format(new Date(round.round_date), "EEEE d MMMM yyyy", { locale: fr })}
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
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {selectedRound && (
        <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Checklist - {format(new Date(selectedRound.round_date), "EEEE d MMMM yyyy", { locale: fr })}
              </DialogTitle>
            </DialogHeader>
            <RoundChecklistForm
              round={selectedRound}
              user={user}
              onComplete={handleRoundComplete}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
